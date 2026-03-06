import { ESLintUtils } from "@typescript-eslint/utils";

const MSG: string =
    "Record must be parametric. " +
    "Use type TFoo<T extends X> = " +
    "Record<T, TBar<T>>.";

const DESC: string =
    "Require Record types to be " +
    "parametric with backreferenced " +
    "type parameter.";

type TRule = ESLintUtils.RuleModule<"nonParametricRecord">;

type TCreate = TRule["create"];

const create: TCreate = () => ({});

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta: {
        docs: { description: DESC },
        messages: {
            nonParametricRecord: MSG,
        },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
