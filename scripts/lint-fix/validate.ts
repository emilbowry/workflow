import type { TLintMeta } from "../../type-based/type-based.types";

import { readFileSync } from "fs";
import { resolve } from "path";

type TRuleEntry = {
    id: string;
    hasLintMeta: boolean;
};

type TValidationResult = {
    total: number;
    covered: number;
    missing: ReadonlyArray<string>;
};

type TExtractRuleIds = (configText: string) => ReadonlyArray<string>;

const RULE_PATTERN: RegExp = /["']([a-zA-Z@/\-]+)["']\s*:\s*\[?\s*"error"/g;

const extractRuleIds: TExtractRuleIds = (configText) => {
    const matches: ReadonlyArray<RegExpMatchArray> = [
        ...configText.matchAll(RULE_PATTERN),
    ];
    return matches.map((match) => match[1]);
};

type TIsCustomRule = (id: string) => boolean;

const isCustomRule: TIsCustomRule = (id) => id.startsWith("local/");

type TCheckCustomRule = (id: string) => Promise<boolean>;

const checkCustomRule: TCheckCustomRule = async (id) => {
    const name: string = id.replace("local/", "");
    const rulesPath: string = resolve("rules", name + ".ts");
    const typeBasedPath: string = resolve("type-based", name + ".ts");
    const tryPath: string =
        (await tryReadLintMeta(rulesPath)) ||
        (await tryReadLintMeta(typeBasedPath))
            ? id
            : "";
    return tryPath !== "";
};

type TTryRead = (path: string) => Promise<boolean>;

const tryReadLintMeta: TTryRead = async (path) => {
    try {
        const content: string = readFileSync(path, "utf-8");
        return content.includes("LINT_META");
    } catch {
        return false;
    }
};

type TCheckExternalRule = (
    id: string,
    registry: Map<string, TLintMeta>,
) => boolean;

const checkExternalRule: TCheckExternalRule = (id, registry) =>
    registry.has(id);

type TValidate = (
    configPath: string,
    registry: Map<string, TLintMeta>,
) => Promise<TValidationResult>;

const validate: TValidate = async (configPath, registry) => {
    const configText: string = readFileSync(configPath, "utf-8");
    const ruleIds: ReadonlyArray<string> = extractRuleIds(configText);
    const missing: Array<string> = [];
    for (const id of ruleIds) {
        const covered: boolean = isCustomRule(id)
            ? await checkCustomRule(id)
            : checkExternalRule(id, registry);
        if (!covered) {
            missing.push(id);
        }
    }
    return {
        total: ruleIds.length,
        covered: ruleIds.length - missing.length,
        missing,
    };
};

export { validate };
export type { TValidationResult, TRuleEntry };
