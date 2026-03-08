import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync, writeFileSync } from "fs";

const execAsync = promisify(exec);
import type {
    TEslintError,
    TPlan,
    TPostMortemEntry,
    TTriageResult,
    TWorkerResult,
} from "./types.ts";
import { scanFile } from "./scan.ts";
import { invokeAnalyser, invokePlanner, invokeImplementor } from "./agents.ts";
import {
    errorsToXml,
    fileToXml,
    postMortemToXml,
    planOptionToXml,
    targetRuleToXml,
} from "./xml.ts";
import { composeCommitMessage, commitFile } from "./commit.ts";

const MAX_RETRIES_ERROR: number = 5;
const MAX_RETRIES_WARNING: number = 1;

type TRunWorker = (
    filePath: string,
    rulesXml: string,
) => Promise<TWorkerResult>;

type TGetDiff = (filePath: string) => Promise<string>;

const getDiff: TGetDiff = async (filePath) => {
    try {
        const result = await execAsync(
            "git diff -- " + JSON.stringify(filePath),
        );
        return result.stdout;
    } catch {
        return "";
    }
};

type TBuildPlan = (
    filePath: string,
    original: string,
    triage: TTriageResult,
    errors: ReadonlyArray<TEslintError>,
    rulesXml: string,
    postMortem: ReadonlyArray<TPostMortemEntry>,
) => Promise<TPlan>;

const buildPlan: TBuildPlan = async (
    filePath,
    original,
    triage,
    errors,
    rulesXml,
    postMortem,
) => {
    const targetXml: string = targetRuleToXml(triage);
    const errXml: string = errorsToXml(errors);
    const fXml: string = fileToXml(filePath, original);
    const pmXml: string = postMortemToXml(postMortem);
    return invokePlanner(targetXml, errXml, fXml, rulesXml, pmXml);
};

type TApplyFix = (
    filePath: string,
    errors: ReadonlyArray<TEslintError>,
    original: string,
    plan: TPlan,
) => Promise<string>;

const applyFix: TApplyFix = async (filePath, errors, original, plan) => {
    const chosen = plan.options.find((o) => o.id === plan.chosen_option);
    if (!chosen) return original;
    const optXml: string = planOptionToXml(chosen);
    const errXml: string = errorsToXml(errors);
    const fXml: string = fileToXml(filePath, original);
    return invokeImplementor(optXml, errXml, fXml);
};

type TVerifyResult = {
    passed: boolean;
    remaining: ReadonlyArray<TEslintError>;
};

type TVerifyFix = (filePath: string, rule: string) => Promise<TVerifyResult>;

const verifyFix: TVerifyFix = async (filePath, rule) => {
    const newErrors = await scanFile(filePath);
    const remaining = newErrors.filter((e) => e.ruleId === rule);
    return {
        passed: remaining.length === 0,
        remaining,
    };
};

type TDoCommit = (
    filePath: string,
    triage: TTriageResult,
    plan: TPlan,
    postMortem: ReadonlyArray<TPostMortemEntry>,
) => Promise<void>;

const doCommit: TDoCommit = async (filePath, triage, plan, postMortem) => {
    const msg: string = composeCommitMessage({
        rule: triage.rule,
        filePath,
        plan,
        postMortem,
    });
    await commitFile(filePath, msg);
};

type TTryFix = (
    filePath: string,
    triage: TTriageResult,
    errors: ReadonlyArray<TEslintError>,
    rulesXml: string,
    postMortem: Array<TPostMortemEntry>,
    attempt: number,
) => Promise<boolean>;

const tryFix: TTryFix = async (
    filePath,
    triage,
    errors,
    rulesXml,
    postMortem,
    attempt,
) => {
    const original: string = readFileSync(filePath, "utf-8");
    const plan: TPlan = await buildPlan(
        filePath,
        original,
        triage,
        errors,
        rulesXml,
        postMortem,
    );
    const fixed: string = await applyFix(filePath, errors, original, plan);
    writeFileSync(filePath, fixed, "utf-8");
    const result: TVerifyResult = await verifyFix(filePath, triage.rule);
    if (result.passed) {
        await doCommit(filePath, triage, plan, postMortem);
        return true;
    }
    const diff: string = await getDiff(filePath);
    postMortem.push({
        attempt,
        plan,
        diff,
        remaining_errors: result.remaining,
    });
    writeFileSync(filePath, original, "utf-8");
    return false;
};

type TRunInnerLoop = (
    filePath: string,
    triage: TTriageResult,
    errors: ReadonlyArray<TEslintError>,
    rulesXml: string,
    maxRetries: number,
) => Promise<boolean>;

const runInnerLoop: TRunInnerLoop = async (
    filePath,
    triage,
    errors,
    rulesXml,
    maxRetries,
) => {
    const postMortem: Array<TPostMortemEntry> = [];
    for (let attempt: number = 1; attempt <= maxRetries; attempt++) {
        const ok: boolean = await tryFix(
            filePath,
            triage,
            errors,
            rulesXml,
            postMortem,
            attempt,
        );
        if (ok) return true;
    }
    return false;
};

type TTriageFile = (
    filePath: string,
    errors: ReadonlyArray<TEslintError>,
) => Promise<TTriageResult>;

const triageFile: TTriageFile = async (filePath, errors) => {
    const content: string = readFileSync(filePath, "utf-8");
    return invokeAnalyser(errorsToXml(errors), fileToXml(filePath, content));
};

const runWorker: TRunWorker = async (filePath, rulesXml) => {
    let commits: number = 0;
    const skipped: Array<string> = [];
    let errors = await scanFile(filePath);
    while (errors.length > 0) {
        const triage: TTriageResult = await triageFile(filePath, errors);
        const isWarning: boolean = errors
            .filter((e) => e.ruleId === triage.rule)
            .every((e) => e.severity === 1);
        const maxRetries: number = isWarning
            ? MAX_RETRIES_WARNING
            : MAX_RETRIES_ERROR;
        const fixed: boolean = await runInnerLoop(
            filePath,
            triage,
            errors,
            rulesXml,
            maxRetries,
        );
        if (fixed) {
            commits++;
        } else {
            skipped.push(triage.rule);
        }
        errors = await scanFile(filePath);
        if (!fixed) {
            errors = errors.filter((e) => e.ruleId !== triage.rule);
        }
    }
    return { filePath, commits, skipped };
};

export { runWorker };
