export type TEslintError = {
    ruleId: string;
    line: number;
    column: number;
    message: string;
    filePath: string;
};

export type TEslintFileResult = {
    filePath: string;
    errors: ReadonlyArray<TEslintError>;
};

export type TErrorMap = Map<
    string,
    ReadonlyArray<TEslintError>
>;

export type TPlanOption = {
    id: number;
    description: string;
    solves_error_because: string;
    regression_risk: string;
    emergent_risk: string;
    differs_from_previous: string | null;
};

export type TPlan = {
    options: ReadonlyArray<TPlanOption>;
    chosen_option: number;
    chosen_reason: string;
};

export type TPostMortemEntry = {
    attempt: number;
    plan: TPlan;
    diff: string;
    remaining_errors: ReadonlyArray<TEslintError>;
};

export type TPostMortem =
    ReadonlyArray<TPostMortemEntry>;

export type TTriageResult = {
    rule: string;
    count: number;
    effort_rank: string;
    reasoning: string;
    locations: ReadonlyArray<string>;
    suggested_approach: string;
};

export type TWorkerResult = {
    filePath: string;
    commits: number;
    skipped: ReadonlyArray<string>;
};

export type TWorkflowSummary = {
    filesProcessed: number;
    totalCommits: number;
    skippedRules: ReadonlyArray<string>;
};

type TAgentModel =
    | "haiku"
    | "sonnet"
    | "opus";

export type TAgentConfig = {
    model: TAgentModel;
    systemPrompt: string;
    userPrompt: string;
};

export type TAgentResponse = {
    success: boolean;
    content: string;
};

export type TWorktreeInfo = {
    path: string;
    branch: string;
    fileHash: string;
};

export type TCommitData = {
    rule: string;
    filePath: string;
    plan: TPlan;
    postMortem: TPostMortem;
};
