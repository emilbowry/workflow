import { ESLintUtils } from "@typescript-eslint/utils";

const MSG: string = "Use Record<K, V> instead of " + "an object literal type.";

const DESC: string =
    "Enforce Record for all " + "object-literal type definitions.";

type TRule = ESLintUtils.RuleModule<"objectLiteral">;

type TCreate = TRule["create"];

const create: TCreate = () => ({});

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta: {
        docs: { description: DESC },
        messages: { objectLiteral: MSG },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
