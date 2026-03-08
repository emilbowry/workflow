/**
 * Test: groupByFile correctly groups errors
 * by file path.
 */

import {
    groupByFile,
} from "../scripts/lint-fix/scan.ts";

import type {
    TEslintError,
    TErrorMap,
} from "../scripts/lint-fix/types.ts";

type TTestRunner = () => void;

const sampleErrors: ReadonlyArray<TEslintError> =
    [
        {
            ruleId: "no-let",
            line: 1,
            column: 1,
            message: "Use const",
            filePath: "src/alpha.ts",
        },
        {
            ruleId: "max-len",
            line: 5,
            column: 1,
            message: "Line too long",
            filePath: "src/alpha.ts",
        },
        {
            ruleId: "no-let",
            line: 3,
            column: 1,
            message: "Use const",
            filePath: "src/beta.ts",
        },
        {
            ruleId: "indent",
            line: 10,
            column: 1,
            message: "Bad indent",
            filePath: "src/gamma.ts",
        },
    ];

const testGroupByFileKeys: TTestRunner = () => {
    const grouped: TErrorMap =
        groupByFile(sampleErrors);
    const keys: ReadonlyArray<string> = [
        ...grouped.keys(),
    ];
    const expectedKeys: ReadonlyArray<string> = [
        "src/alpha.ts",
        "src/beta.ts",
        "src/gamma.ts",
    ];
    if (keys.length !== 3) {
        throw new Error(
            "groupByFile: expected 3 keys,"
            + " got " + String(keys.length),
        );
    }
    expectedKeys.forEach((key) => {
        if (!grouped.has(key)) {
            throw new Error(
                "groupByFile: missing key "
                + key,
            );
        }
    });
    console.log("PASS: groupByFile keys");
};

const testGroupByFileValues: TTestRunner = () => {
    const grouped: TErrorMap =
        groupByFile(sampleErrors);
    const alphaErrors =
        grouped.get("src/alpha.ts") ?? [];
    if (alphaErrors.length !== 2) {
        throw new Error(
            "groupByFile: alpha should have"
            + " 2 errors, got "
            + String(alphaErrors.length),
        );
    }
    const betaErrors =
        grouped.get("src/beta.ts") ?? [];
    if (betaErrors.length !== 1) {
        throw new Error(
            "groupByFile: beta should have"
            + " 1 error, got "
            + String(betaErrors.length),
        );
    }
    const gammaErrors =
        grouped.get("src/gamma.ts") ?? [];
    if (gammaErrors.length !== 1) {
        throw new Error(
            "groupByFile: gamma should have"
            + " 1 error, got "
            + String(gammaErrors.length),
        );
    }
    console.log("PASS: groupByFile values");
};

const testGroupByFileRuleIds: TTestRunner =
    () => {
        const grouped: TErrorMap =
            groupByFile(sampleErrors);
        const alphaRules: ReadonlyArray<string> =
            (grouped.get("src/alpha.ts") ?? [])
                .map((err) => err.ruleId);
        const hasNoLet: boolean =
            alphaRules.includes("no-let");
        const hasMaxLen: boolean =
            alphaRules.includes("max-len");
        if (!hasNoLet || !hasMaxLen) {
            throw new Error(
                "groupByFile: alpha rules"
                + " incorrect",
            );
        }
        console.log(
            "PASS: groupByFile rule ids",
        );
    };

const testGroupByFileEmpty: TTestRunner = () => {
    const grouped: TErrorMap = groupByFile([]);
    if (grouped.size !== 0) {
        throw new Error(
            "groupByFile: empty input should"
            + " produce empty map",
        );
    }
    console.log("PASS: groupByFile empty");
};

testGroupByFileKeys();
testGroupByFileValues();
testGroupByFileRuleIds();
testGroupByFileEmpty();

console.log(
    "\nAll scan grouping tests passed.",
);
