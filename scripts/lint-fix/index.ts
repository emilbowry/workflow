import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import type {
    TEslintError,
    TErrorMap,
    TWorkerResult,
    TWorkflowSummary,
} from "./types.ts";
import { scanBatch, groupByFile } from "./scan.ts";
import { createWorktree, removeWorktree, mergeWorktree } from "./worktree.ts";
import { runWorker } from "./worker.ts";

type TGetRulesXml = () => string;

const getRulesXml: TGetRulesXml = () => {
    const thisDir: string = dirname(fileURLToPath(import.meta.url));
    const xmlPath: string = resolve(thisDir, "prompts", "lint-rules.xml");
    return readFileSync(xmlPath, "utf-8");
};

type TScanAll = (paths: ReadonlyArray<string>) => Promise<TErrorMap>;

const scanAll: TScanAll = async (paths) => {
    const allErrors: ReadonlyArray<TEslintError> = scanBatch(paths);
    return groupByFile(allErrors);
};

type TInstallDeps = () => void;

const installDeps: TInstallDeps = () => {
    console.log("[setup] Installing dependencies...");
    try {
        execSync("npm install --legacy-peer-deps", {
            stdio: "inherit",
            timeout: 120_000,
        });
    } catch (err: unknown) {
        console.error("[setup] npm install failed, retrying without cache...");
        execSync("npm cache clean --force && npm install --legacy-peer-deps", {
            stdio: "inherit",
            timeout: 120_000,
        });
    }
    console.log("[setup] Dependencies installed.");
};

type TCheckPrereqs = () => void;

type TCheckBin = (name: string, localPath: string) => void;

const checkBin: TCheckBin = (name, localPath) => {
    try {
        execSync(localPath + " --version", { stdio: "pipe", timeout: 30_000 });
        console.log("[setup] " + name + " OK (local)");
        return;
    } catch {
        /* fall through to global */
    }
    try {
        execSync(name + " --version", { stdio: "pipe", timeout: 30_000 });
        console.log("[setup] " + name + " OK (global)");
    } catch {
        throw new Error("[setup] " + name + " not found locally or globally.");
    }
};

const checkPrereqs: TCheckPrereqs = () => {
    const localBin: string = resolve("node_modules", ".bin");
    checkBin("eslint", resolve(localBin, "eslint"));
    checkBin("prettier", resolve(localBin, "prettier"));
    const requiredModules: ReadonlyArray<string> = [
        "jiti",
        "typescript-eslint",
    ];
    for (const mod of requiredModules) {
        const modPath: string = resolve("node_modules", mod, "package.json");
        try {
            readFileSync(modPath);
            console.log("[setup] " + mod + " OK");
        } catch {
            throw new Error(
                "[setup] " +
                    mod +
                    " not found in node_modules. npm install may have failed.",
            );
        }
    }
    try {
        execSync("claude --version", { stdio: "pipe", timeout: 10_000 });
        console.log("[setup] claude CLI OK");
    } catch {
        throw new Error(
            "[setup] claude CLI not found. Install with: npm i -g @anthropic-ai/claude-code",
        );
    }
};

import type { TWorktreeInfo } from "./types.ts";

type TWorkerOutput = {
    result: TWorkerResult;
    info: TWorktreeInfo;
};

type TProcessFile = (
    filePath: string,
    rulesXml: string,
) => Promise<TWorkerOutput>;

const processFile: TProcessFile = async (filePath, rulesXml) => {
    const info: TWorktreeInfo = await createWorktree(filePath);
    const worktreeFile: string = resolve(info.path, filePath);
    const result: TWorkerResult = await runWorker(worktreeFile, rulesXml);
    return { result, info };
};

type TPrintSummary = (summary: TWorkflowSummary) => void;

const printSummary: TPrintSummary = (summary) => {
    console.log("\n=== Lint-Fix Summary ===");
    console.log("Files processed: " + String(summary.filesProcessed));
    console.log("Total commits: " + String(summary.totalCommits));
    if (summary.skippedRules.length > 0) {
        console.log("Skipped rules: " + summary.skippedRules.join(", "));
    }
};

type TGetBranch = () => string;

const getCurrentBranch: TGetBranch = () => {
    return execSync("git branch --show-current", { stdio: "pipe" })
        .toString()
        .trim();
};

type TMain = (paths: ReadonlyArray<string>) => Promise<void>;

const main: TMain = async (paths) => {
    if (paths.length === 0) {
        console.log(
            "Usage: npx tsx " + "scripts/lint-fix/index.ts " + "<paths...>",
        );
        return;
    }
    installDeps();
    checkPrereqs();
    console.log("[scan] Scanning " + String(paths.length) + " path(s)...");
    const rulesXml: string = getRulesXml();
    const mainBranch: string = getCurrentBranch();
    const errorMap: TErrorMap = await scanAll(paths);
    if (errorMap.size === 0) {
        console.log("[scan] No errors found.");
        return;
    }
    console.log(
        "[scan] Found errors in " +
            String(errorMap.size) +
            " file(s). Dispatching workers...",
    );
    const files: ReadonlyArray<string> = Array.from(errorMap.keys());
    const outputs: ReadonlyArray<TWorkerOutput> = await Promise.all(
        files.map((f) => processFile(f, rulesXml)),
    );
    console.log("[merge] Workers done. Merging results...");
    for (const output of outputs) {
        if (output.result.commits > 0) {
            await mergeWorktree(output.info, mainBranch);
        }
        await removeWorktree(output.info);
    }
    const results: ReadonlyArray<TWorkerResult> = outputs.map((o) => o.result);
    const totalCommits: number = results.reduce((acc, r) => acc + r.commits, 0);
    const skippedRules: ReadonlyArray<string> = results.flatMap(
        (r) => r.skipped,
    );
    printSummary({
        filesProcessed: results.length,
        totalCommits,
        skippedRules,
    });
};

const args: ReadonlyArray<string> = process.argv.slice(2);

main(args).catch((err) => {
    console.error("Workflow failed:", err);
    process.exit(1);
});
