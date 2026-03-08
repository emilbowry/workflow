import { execSync, exec } from "child_process";
import { promisify } from "util";
import { resolve } from "path";
import type { TEslintError, TErrorMap } from "./types.ts";

const execAsync = promisify(exec);

const LOCAL_ESLINT: string = resolve("node_modules", ".bin", "eslint");
const LOCAL_PRETTIER: string = resolve("node_modules", ".bin", "prettier");

type TResolveBin = (localPath: string, name: string) => string;

const resolveBin: TResolveBin = (localPath, name) => {
    try {
        execSync(localPath + " --version", { stdio: "pipe" });
        return localPath;
    } catch {
        return name;
    }
};

const ESLINT_BIN: string = resolveBin(LOCAL_ESLINT, "eslint");
const PRETTIER_BIN: string = resolveBin(LOCAL_PRETTIER, "prettier");

type TRunPrettier = (filePath: string) => Promise<void>;

const runPrettier: TRunPrettier = async (filePath) => {
    await execAsync(PRETTIER_BIN + " --write " + JSON.stringify(filePath));
};

type TEslintRawMessage = {
    ruleId: string | null;
    severity: 1 | 2;
    line: number;
    column: number;
    message: string;
};

type TEslintRawResult = {
    filePath: string;
    messages: ReadonlyArray<TEslintRawMessage>;
};

type TRunEslint = (filePath: string) => Promise<ReadonlyArray<TEslintError>>;

const runEslint: TRunEslint = async (filePath) => {
    const raw: string = await (async () => {
        try {
            const result = await execAsync(
                ESLINT_BIN +
                    " --fix" +
                    " --format json " +
                    JSON.stringify(filePath),
                { maxBuffer: 10 * 1024 * 1024 },
            );
            return result.stdout;
        } catch (err: unknown) {
            const execErr = err as {
                stdout?: string;
            };
            const out = execErr.stdout ? execErr.stdout.trim() : "";
            return out.length > 0 ? out : "[]";
        }
    })();
    const results: ReadonlyArray<TEslintRawResult> = JSON.parse(
        raw,
    ) as ReadonlyArray<TEslintRawResult>;
    const errors: ReadonlyArray<TEslintError> = results.flatMap((result) =>
        result.messages
            .filter(
                (msg): msg is TEslintRawMessage & { ruleId: string } =>
                    msg.ruleId !== null,
            )
            .map((msg) => ({
                ruleId: msg.ruleId,
                severity: msg.severity,
                line: msg.line,
                column: msg.column,
                message: msg.message,
                filePath: result.filePath,
            })),
    );
    return errors;
};

const EXCLUDED_RULE: string = "no-duplicate-type-structure";

type TScanFile = (filePath: string) => Promise<ReadonlyArray<TEslintError>>;

const scanFile: TScanFile = async (filePath) => {
    await runPrettier(filePath);
    const errors: ReadonlyArray<TEslintError> = await runEslint(filePath);
    return errors.filter((err) => err.ruleId !== EXCLUDED_RULE);
};

type TGroupByFile = (errors: ReadonlyArray<TEslintError>) => TErrorMap;

const groupByFile: TGroupByFile = (errors) => {
    const result: TErrorMap = new Map();
    errors.forEach((err) => {
        const existing: ReadonlyArray<TEslintError> =
            result.get(err.filePath) ?? [];
        result.set(err.filePath, [...existing, err]);
    });
    return result;
};

type TRunPrettierBatch = (filePaths: ReadonlyArray<string>) => void;

const runPrettierBatch: TRunPrettierBatch = (filePaths) => {
    const quoted: string = filePaths.map((fp) => JSON.stringify(fp)).join(" ");
    execSync(PRETTIER_BIN + " --write " + quoted, {
        stdio: "pipe",
    });
};

type TRunEslintBatch = (
    filePaths: ReadonlyArray<string>,
) => ReadonlyArray<TEslintError>;

const runEslintBatch: TRunEslintBatch = (filePaths) => {
    const quoted: string = filePaths.map((fp) => JSON.stringify(fp)).join(" ");
    const raw: string = (() => {
        try {
            return execSync(ESLINT_BIN + " --fix --format json " + quoted, {
                stdio: "pipe",
                maxBuffer: 10 * 1024 * 1024,
            }).toString();
        } catch (err: unknown) {
            const execErr = err as { stdout?: Buffer };
            const out = execErr.stdout ? execErr.stdout.toString().trim() : "";
            return out.length > 0 ? out : "[]";
        }
    })();
    const results: ReadonlyArray<TEslintRawResult> = JSON.parse(
        raw,
    ) as ReadonlyArray<TEslintRawResult>;
    return results.flatMap((result) =>
        result.messages
            .filter(
                (msg): msg is TEslintRawMessage & { ruleId: string } =>
                    msg.ruleId !== null,
            )
            .map((msg) => ({
                ruleId: msg.ruleId,
                severity: msg.severity,
                line: msg.line,
                column: msg.column,
                message: msg.message,
                filePath: result.filePath,
            })),
    );
};

type TScanBatch = (
    filePaths: ReadonlyArray<string>,
) => ReadonlyArray<TEslintError>;

const scanBatch: TScanBatch = (filePaths) => {
    runPrettierBatch(filePaths);
    const errors: ReadonlyArray<TEslintError> = runEslintBatch(filePaths);
    return errors.filter((err) => err.ruleId !== EXCLUDED_RULE);
};

export { runPrettier, runEslint, scanFile, scanBatch, groupByFile };
