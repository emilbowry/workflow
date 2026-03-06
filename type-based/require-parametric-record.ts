import type { TSESTree } from "@typescript-eslint/utils";

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

type TContext = Parameters<TRule["create"]>[0];

type THandler = {
    (node: TSESTree.TSTypeAliasDeclaration): void;
};

type TMakeHandler = {
    (context: TContext): THandler;
};

const makeHandler: TMakeHandler =
    (context) => (node) => {
        const src: string =
            context.sourceCode.getText(node);
        if (!src.includes("Record<")) {
            return;
        }
        context.report({
            messageId: "nonParametricRecord",
            node,
        });
    };

type TCreate = TRule["create"];

const create: TCreate = (context) => {
    const handler: THandler =
        makeHandler(context);
    return {
        TSTypeAliasDeclaration: handler,
    };
};

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
