/**
 * Test: worker loop mock.
 * Validates type imports and data flow
 * structure. Creates mock triage, plan,
 * and implement results to verify the
 * pipeline compiles with correct types.
 */

import type {
    TEslintError,
    TTriageResult,
    TPlan,
    TPlanOption,
    TPostMortem,
    TPostMortemEntry,
    TWorkerResult,
    TWorkflowSummary,
    TCommitData,
    TAgentConfig,
    TAgentResponse,
    TWorktreeInfo,
    TErrorMap,
} from "../scripts/lint-fix/types.ts";

type TTestRunner = () => void;

const mockErrors: ReadonlyArray<TEslintError> =
    [
        {
            ruleId: "max-total-depth",
            line: 15,
            column: 9,
            message: "Too deeply nested",
            filePath: "src/deep.ts",
        },
        {
            ruleId: "max-total-depth",
            line: 30,
            column: 13,
            message: "Too deeply nested",
            filePath: "src/deep.ts",
        },
    ];

const mockTriage: TTriageResult = {
    rule: "max-total-depth",
    count: 2,
    effort_rank: "medium",
    reasoning: "Extract nested logic",
    locations: ["15:9", "30:13"],
    suggested_approach:
        "Extract inner blocks to helpers",
};

const mockOption: TPlanOption = {
    id: 1,
    description: "Extract to helper",
    solves_error_because:
        "reduces nesting depth",
    regression_risk: "low",
    emergent_risk: "none",
    differs_from_previous: null,
};

const mockPlan: TPlan = {
    options: [mockOption],
    chosen_option: 1,
    chosen_reason: "Simplest approach",
};

const mockPostMortemEntry: TPostMortemEntry = {
    attempt: 1,
    plan: mockPlan,
    diff: "--- a/src/deep.ts\n"
        + "+++ b/src/deep.ts\n"
        + "@@ -15,5 +15,3 @@",
    remaining_errors: [],
};

const mockPostMortem: TPostMortem = [
    mockPostMortemEntry,
];

const mockWorktree: TWorktreeInfo = {
    path: ".worktrees/abc123",
    branch: "lint-fix/deep.ts",
    fileHash: "abc123",
};

const mockAgentConfig: TAgentConfig = {
    model: "sonnet",
    systemPrompt: "You are a linter.",
    userPrompt: "Fix the depth issue.",
};

const mockAgentResponse: TAgentResponse = {
    success: true,
    content: "Fixed the nesting.",
};

const testTriageStructure: TTestRunner = () => {
    const ruleOk: boolean =
        mockTriage.rule
        === "max-total-depth";
    if (!ruleOk) {
        throw new Error(
            "Triage rule mismatch",
        );
    }
    const locsOk: boolean =
        mockTriage.locations.length === 2;
    if (!locsOk) {
        throw new Error(
            "Triage locations count wrong",
        );
    }
    const countOk: boolean =
        mockTriage.count === 2;
    if (!countOk) {
        throw new Error(
            "Triage count mismatch",
        );
    }
    console.log("PASS: triage structure");
};

const testPlanStructure: TTestRunner = () => {
    const optLen: boolean =
        mockPlan.options.length === 1;
    if (!optLen) {
        throw new Error(
            "Plan should have 1 option",
        );
    }
    const chosenOk: boolean =
        mockPlan.chosen_option === 1;
    if (!chosenOk) {
        throw new Error(
            "Plan chosen_option mismatch",
        );
    }
    const optId: number =
        mockPlan.options[0].id;
    if (optId !== 1) {
        throw new Error(
            "Option id mismatch",
        );
    }
    const differsNull: boolean =
        mockOption.differs_from_previous
        === null;
    if (!differsNull) {
        throw new Error(
            "Option differs should be null",
        );
    }
    console.log("PASS: plan structure");
};

const testPostMortemPipeline: TTestRunner =
    () => {
        const entry: TPostMortemEntry =
            mockPostMortem[0];
        const hasDiff: boolean =
            entry.diff.includes("deep.ts");
        if (!hasDiff) {
            throw new Error(
                "PostMortem diff missing file",
            );
        }
        const noRemaining: boolean =
            entry.remaining_errors.length === 0;
        if (!noRemaining) {
            throw new Error(
                "PostMortem should have"
                + " no remaining errors",
            );
        }
        const attemptOk: boolean =
            entry.attempt === 1;
        if (!attemptOk) {
            throw new Error(
                "PostMortem attempt mismatch",
            );
        }
        console.log(
            "PASS: post mortem pipeline",
        );
    };

const testCommitDataAssembly: TTestRunner =
    () => {
        const commitData: TCommitData = {
            rule: mockTriage.rule,
            filePath: mockErrors[0].filePath,
            plan: mockPlan,
            postMortem: mockPostMortem,
        };
        const ruleOk: boolean =
            commitData.rule
            === "max-total-depth";
        if (!ruleOk) {
            throw new Error(
                "CommitData rule mismatch",
            );
        }
        const pathOk: boolean =
            commitData.filePath
            === "src/deep.ts";
        if (!pathOk) {
            throw new Error(
                "CommitData filePath mismatch",
            );
        }
        const planRef: boolean =
            commitData.plan === mockPlan;
        if (!planRef) {
            throw new Error(
                "CommitData plan ref broken",
            );
        }
        console.log(
            "PASS: commit data assembly",
        );
    };

const testWorkerResultShape: TTestRunner =
    () => {
        const result: TWorkerResult = {
            filePath: "src/deep.ts",
            commits: 1,
            skipped: [],
        };
        const pathOk: boolean =
            result.filePath === "src/deep.ts";
        if (!pathOk) {
            throw new Error(
                "WorkerResult path mismatch",
            );
        }
        const commitsOk: boolean =
            result.commits === 1;
        if (!commitsOk) {
            throw new Error(
                "WorkerResult commits wrong",
            );
        }
        const skippedOk: boolean =
            result.skipped.length === 0;
        if (!skippedOk) {
            throw new Error(
                "WorkerResult skipped wrong",
            );
        }
        console.log(
            "PASS: worker result shape",
        );
    };

const testWorkflowSummary: TTestRunner = () => {
    const results: ReadonlyArray<TWorkerResult> =
        [
            {
                filePath: "src/deep.ts",
                commits: 1,
                skipped: [],
            },
            {
                filePath: "src/other.ts",
                commits: 2,
                skipped: ["no-let"],
            },
        ];
    const summary: TWorkflowSummary = {
        filesProcessed: results.length,
        totalCommits: results.reduce(
            (sum, r) => sum + r.commits,
            0,
        ),
        skippedRules: results.flatMap(
            (r) => r.skipped,
        ),
    };
    const filesOk: boolean =
        summary.filesProcessed === 2;
    if (!filesOk) {
        throw new Error(
            "Summary filesProcessed wrong",
        );
    }
    const commitsOk: boolean =
        summary.totalCommits === 3;
    if (!commitsOk) {
        throw new Error(
            "Summary totalCommits wrong",
        );
    }
    const skippedOk: boolean =
        summary.skippedRules.length === 1
        && summary.skippedRules[0] === "no-let";
    if (!skippedOk) {
        throw new Error(
            "Summary skippedRules wrong",
        );
    }
    console.log("PASS: workflow summary");
};

const testErrorMapFlow: TTestRunner = () => {
    const errorMap: TErrorMap = new Map();
    errorMap.set(
        "src/deep.ts",
        mockErrors,
    );
    const retrieved =
        errorMap.get("src/deep.ts") ?? [];
    const countOk: boolean =
        retrieved.length === 2;
    if (!countOk) {
        throw new Error(
            "ErrorMap retrieval failed",
        );
    }
    const ruleOk: boolean =
        retrieved[0].ruleId
        === "max-total-depth";
    if (!ruleOk) {
        throw new Error(
            "ErrorMap rule mismatch",
        );
    }
    console.log("PASS: error map flow");
};

const testAgentConfigTypes: TTestRunner =
    () => {
        const modelOk: boolean =
            mockAgentConfig.model === "sonnet";
        if (!modelOk) {
            throw new Error(
                "AgentConfig model wrong",
            );
        }
        const responseOk: boolean =
            mockAgentResponse.success === true;
        if (!responseOk) {
            throw new Error(
                "AgentResponse success wrong",
            );
        }
        const worktreeOk: boolean =
            mockWorktree.branch
            === "lint-fix/deep.ts";
        if (!worktreeOk) {
            throw new Error(
                "WorktreeInfo branch wrong",
            );
        }
        const hashOk: boolean =
            mockWorktree.fileHash === "abc123";
        if (!hashOk) {
            throw new Error(
                "WorktreeInfo hash wrong",
            );
        }
        console.log(
            "PASS: agent config types",
        );
    };

testTriageStructure();
testPlanStructure();
testPostMortemPipeline();
testCommitDataAssembly();
testWorkerResultShape();
testWorkflowSummary();
testErrorMapFlow();
testAgentConfigTypes();

console.log(
    "\nAll worker mock tests passed.",
);
