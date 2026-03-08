import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type {
    TEslintError,
    TErrorMap,
    TWorkerResult,
    TWorkflowSummary,
} from "./types.ts";
import { scanFile, groupByFile } from
    "./scan.ts";
import {
    createWorktree,
    removeWorktree,
    mergeWorktree,
} from "./worktree.ts";
import { runWorker } from "./worker.ts";

type TGetRulesXml = () => string;

const getRulesXml: TGetRulesXml = () => {
    const thisDir: string = dirname(
        fileURLToPath(import.meta.url),
    );
    const xmlPath: string = resolve(
        thisDir,
        "prompts",
        "lint-rules.xml",
    );
    return readFileSync(xmlPath, "utf-8");
};

type TScanAll = (
    paths: ReadonlyArray<string>,
) => Promise<TErrorMap>;

const scanAll: TScanAll = async (paths) => {
    const allErrors: Array<TEslintError> = [];
    for (const filePath of paths) {
        const errors = await scanFile(filePath);
        allErrors.push(...errors);
    }
    return groupByFile(allErrors);
};

type TProcessFile = (
    filePath: string,
    rulesXml: string,
    mainBranch: string,
) => Promise<TWorkerResult>;

const processFile: TProcessFile = async (
    filePath,
    rulesXml,
    mainBranch,
) => {
    const info = await createWorktree(filePath);
    const worktreeFile: string = resolve(
        info.path,
        filePath,
    );
    try {
        const result: TWorkerResult =
            await runWorker(
                worktreeFile, rulesXml,
            );
        await mergeWorktree(info, mainBranch);
        return result;
    } finally {
        await removeWorktree(info);
    }
};

type TPrintSummary = (
    summary: TWorkflowSummary,
) => void;

const printSummary: TPrintSummary =
    (summary) => {
        console.log(
            "\n=== Lint-Fix Summary ===",
        );
        console.log(
            "Files processed: "
            + String(summary.filesProcessed),
        );
        console.log(
            "Total commits: "
            + String(summary.totalCommits),
        );
        if (
            summary.skippedRules.length > 0
        ) {
            console.log(
                "Skipped rules: "
                + summary.skippedRules
                    .join(", "),
            );
        }
    };

type TGetBranch = () => string;

const getCurrentBranch: TGetBranch = () => {
    const { execSync } = require(
        "child_process",
    );
    return execSync(
        "git branch --show-current",
        { stdio: "pipe" },
    ).toString().trim();
};

type TMain = (
    paths: ReadonlyArray<string>,
) => Promise<void>;

const main: TMain = async (paths) => {
    if (paths.length === 0) {
        console.log(
            "Usage: npx tsx "
            + "scripts/lint-fix/index.ts "
            + "<paths...>",
        );
        return;
    }
    console.log(
        "Scanning " + String(paths.length)
        + " path(s)...",
    );
    const rulesXml: string = getRulesXml();
    const mainBranch: string =
        getCurrentBranch();
    const errorMap: TErrorMap =
        await scanAll(paths);
    if (errorMap.size === 0) {
        console.log("No errors found.");
        return;
    }
    console.log(
        "Found errors in "
        + String(errorMap.size)
        + " file(s). Dispatching "
        + "workers...",
    );
    const files: ReadonlyArray<string> =
        Array.from(errorMap.keys());
    const results: ReadonlyArray<
        TWorkerResult
    > = await Promise.all(
        files.map(
            (f) => processFile(
                f, rulesXml, mainBranch,
            ),
        ),
    );
    const totalCommits: number = results
        .reduce(
            (acc, r) => acc + r.commits, 0,
        );
    const skippedRules: ReadonlyArray<
        string
    > = results.flatMap((r) => r.skipped);
    printSummary({
        filesProcessed: results.length,
        totalCommits,
        skippedRules,
    });
};

const args: ReadonlyArray<string> =
    process.argv.slice(2);

main(args).catch((err) => {
    console.error("Workflow failed:", err);
    process.exit(1);
});
