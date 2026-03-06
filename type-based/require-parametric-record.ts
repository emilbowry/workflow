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

const PARAMETRIC: RegExp =
    /type\s+\w+<(\w+)\s+extends\s+[^>]+>\s*=\s*Record<\1,\s*\w+<\1>>/;

type TIsValid = {
    (src: string): boolean;
};

const isValid: TIsValid = (src) => PARAMETRIC.test(src);

type TCheckNode = {
    (context: TContext, node: TSESTree.TSTypeAliasDeclaration): void;
};

const checkNode: TCheckNode = (context, node) => {
    const src: string = context.sourceCode.getText(node);
    if (src.includes("Record<") && !isValid(src)) {
        context.report({
            messageId: "nonParametricRecord",
            node,
        });
    }
};

type THandler = {
    (node: TSESTree.TSTypeAliasDeclaration): void;
};

type TMakeHandler = {
    (checkNode: TCheckNode, context: TContext): THandler;
};

const makeHandler: TMakeHandler = (checkNode, context) =>
    (
        () => (node: TSESTree.TSTypeAliasDeclaration) =>
            checkNode(context, node)
    )();

type TCreate = TRule["create"];

const create: TCreate = (context) => {
    const handler: THandler = makeHandler(checkNode, context);
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
