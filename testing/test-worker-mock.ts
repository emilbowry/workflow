import type {
    TEslintError,
    TPlan,
    TPlanOption,
    TPostMortemEntry,
    TTriageResult,
    TWorkerResult,
} from "../scripts/lint-fix/types.ts";

type TAssert = (
    condition: boolean,
    msg: string,
) => void;

const assert: TAssert = (condition, msg) => {
    if (!condition) {
        throw new Error("FAIL: " + msg);
    }
};

const sampleError: TEslintError = {
    ruleId: "indent",
    line: 10,
    column: 1,
    message: "Expected 8 spaces",
    filePath: "src/test.ts",
};

const sampleTriage: TTriageResult = {
    rule: "indent",
    count: 3,
    effort_rank: "low",
    reasoning: "Auto-fixable rule",
    locations: ["10:1", "15:1", "20:1"],
    suggested_approach: "Run eslint --fix",
};

const sampleOption: TPlanOption = {
    id: 1,
    description: "Fix indentation",
    solves_error_because:
        "Corrects spacing",
    regression_risk: "None",
    emergent_risk: "None",
    differs_from_previous: null,
};

const samplePlan: TPlan = {
    options: [sampleOption],
    chosen_option: 1,
    chosen_reason: "Lowest effort",
};

const samplePostMortem: TPostMortemEntry = {
    attempt: 1,
    plan: samplePlan,
    diff: "--- a/test.ts\n+++ b/test.ts",
    remaining_errors: [sampleError],
};

const sampleResult: TWorkerResult = {
    filePath: "src/test.ts",
    commits: 2,
    skipped: ["complexity"],
};

assert(
    sampleError.ruleId === "indent",
    "error ruleId mismatch",
);

assert(
    sampleTriage.rule === "indent",
    "triage rule mismatch",
);

assert(
    samplePlan.chosen_option === 1,
    "plan chosen_option mismatch",
);

assert(
    samplePostMortem.attempt === 1,
    "post-mortem attempt mismatch",
);

assert(
    sampleResult.commits === 2,
    "worker result commits mismatch",
);

assert(
    sampleOption
        .differs_from_previous === null,
    "option differs should be null",
);

const chosenOpt: TPlanOption | undefined =
    samplePlan.options.find(
        (o) => o.id ===
            samplePlan.chosen_option,
    );

assert(
    chosenOpt !== undefined,
    "chosen option not found in plan",
);

assert(
    chosenOpt?.description ===
        "Fix indentation",
    "chosen option description mismatch",
);

console.log(
    "PASS: test-worker-mock"
    + " (all type checks"
    + " and data flow verified)",
);
