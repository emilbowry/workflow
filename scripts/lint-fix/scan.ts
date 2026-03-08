import { execSync } from "child_process";
import type {
    TEslintError,
    TErrorMap,
} from "./types.ts";

type TRunPrettier = (
    filePath: string,
) => Promise<void>;

const runPrettier: TRunPrettier = async (
    filePath,
) => {
    execSync(
        "npx prettier --write "
        + JSON.stringify(filePath),
        { stdio: "pipe" },
    );
};

type TEslintRawMessage = {
    ruleId: string | null;
    line: number;
    column: number;
    message: string;
};

type TEslintRawResult = {
    filePath: string;
    messages: ReadonlyArray<TEslintRawMessage>;
};

type TRunEslint = (
    filePath: string,
) => Promise<ReadonlyArray<TEslintError>>;

const runEslint: TRunEslint = async (filePath) => {
    const raw: string = (() => {
        try {
            return execSync(
                "npx eslint --fix"
                + " --format json "
                + JSON.stringify(filePath),
                { stdio: "pipe" },
            ).toString();
        } catch (err: unknown) {
            const execErr = err as {
                stdout?: Buffer;
            };
            return execErr.stdout
                ? execErr.stdout.toString()
                : "[]";
        }
    })();
    const results: ReadonlyArray<TEslintRawResult> =
        JSON.parse(raw) as ReadonlyArray<
            TEslintRawResult
        >;
    const errors: ReadonlyArray<TEslintError> =
        results.flatMap((result) =>
            result.messages
                .filter(
                    (msg): msg is TEslintRawMessage &
                        { ruleId: string } =>
                        msg.ruleId !== null,
                )
                .map((msg) => ({
                    ruleId: msg.ruleId,
                    line: msg.line,
                    column: msg.column,
                    message: msg.message,
                    filePath: result.filePath,
                })),
        );
    return errors;
};

const EXCLUDED_RULE: string =
    "no-duplicate-type-structure";

type TScanFile = (
    filePath: string,
) => Promise<ReadonlyArray<TEslintError>>;

const scanFile: TScanFile = async (filePath) => {
    await runPrettier(filePath);
    const errors: ReadonlyArray<TEslintError> =
        await runEslint(filePath);
    return errors.filter(
        (err) => err.ruleId !== EXCLUDED_RULE,
    );
};

type TGroupByFile = (
    errors: ReadonlyArray<TEslintError>,
) => TErrorMap;

const groupByFile: TGroupByFile = (errors) => {
    const result: TErrorMap = new Map();
    errors.forEach((err) => {
        const existing: ReadonlyArray<TEslintError> =
            result.get(err.filePath) ?? [];
        result.set(
            err.filePath,
            [...existing, err],
        );
    });
    return result;
};

export {
    runPrettier,
    runEslint,
    scanFile,
    groupByFile,
};
