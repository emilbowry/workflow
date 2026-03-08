/**
 * Test: composeCommitMessage produces correctly
 * formatted commit messages.
 */

import {
    composeCommitMessage,
} from "../scripts/lint-fix/commit.ts";

import type {
    TCommitData,
    TPlan,
    TPostMortem,
    TPlanOption,
} from "../scripts/lint-fix/types.ts";

type TTestRunner = () => void;

const sampleOption: TPlanOption = {
    id: 1,
    description: "Extract helper function",
    solves_error_because: "reduces nesting",
    regression_risk: "low",
    emergent_risk: "none",
    differs_from_previous: null,
};

const sampleOptionB: TPlanOption = {
    id: 2,
    description: "Inline the conditional",
    solves_error_because: "removes branch",
    regression_risk: "medium",
    emergent_risk: "low",
    differs_from_previous: "different approach",
};

const samplePlan: TPlan = {
    options: [sampleOption, sampleOptionB],
    chosen_option: 1,
    chosen_reason: "Safer refactor",
};

const samplePostMortem: TPostMortem = [
    {
        attempt: 1,
        plan: samplePlan,
        diff: "--- a\n+++ b",
        remaining_errors: [],
    },
];

const sampleData: TCommitData = {
    rule: "max-total-depth",
    filePath: "src/utils/parser.ts",
    plan: samplePlan,
    postMortem: samplePostMortem,
};

const testSubjectLine: TTestRunner = () => {
    const msg: string =
        composeCommitMessage(sampleData);
    const subject: string =
        msg.split("\n")[0];
    const expected: string =
        "fix(max-total-depth):"
        + " src/utils/parser.ts";
    if (subject !== expected) {
        throw new Error(
            "Subject line mismatch:"
            + "\n  got: " + subject
            + "\n  expected: " + expected,
        );
    }
    console.log("PASS: subject line");
};

const testChosenReason: TTestRunner = () => {
    const msg: string =
        composeCommitMessage(sampleData);
    const hasChosen: boolean = msg.includes(
        "Chosen approach: Safer refactor",
    );
    if (!hasChosen) {
        throw new Error(
            "Missing chosen approach line",
        );
    }
    console.log("PASS: chosen reason");
};

const testOptionsListed: TTestRunner = () => {
    const msg: string =
        composeCommitMessage(sampleData);
    const hasOpt1: boolean = msg.includes(
        "1. Extract helper function",
    );
    const hasOpt2: boolean = msg.includes(
        "2. Inline the conditional",
    );
    if (!hasOpt1 || !hasOpt2) {
        throw new Error(
            "Options not listed correctly",
        );
    }
    const hasHeader: boolean = msg.includes(
        "Options considered:",
    );
    if (!hasHeader) {
        throw new Error(
            "Missing 'Options considered' hdr",
        );
    }
    console.log("PASS: options listed");
};

const testAttemptCount: TTestRunner = () => {
    const msg: string =
        composeCommitMessage(sampleData);
    const hasAttempts: boolean =
        msg.includes("Attempts: 2");
    if (!hasAttempts) {
        throw new Error(
            "Attempt count should be"
            + " postMortem.length + 1 = 2",
        );
    }
    console.log("PASS: attempt count");
};

const testRegressionInOptions: TTestRunner =
    () => {
        const msg: string =
            composeCommitMessage(sampleData);
        const hasRisk: boolean =
            msg.includes(" — low");
        if (!hasRisk) {
            throw new Error(
                "Regression risk not shown"
                + " in options",
            );
        }
        console.log(
            "PASS: regression in options",
        );
    };

testSubjectLine();
testChosenReason();
testOptionsListed();
testAttemptCount();
testRegressionInOptions();

console.log(
    "\nAll commit message tests passed.",
);
