import type { TSESTree } from "@typescript-eslint/utils";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

const MSG: string =
    "Use call-signature syntax " +
    "{ (...): T } instead of " +
    "function type (...) => T.";

const DESC: string =
    "Require call-signature syntax " +
    "in type aliases instead of " +
    "function type syntax.";

type TRule = ESLintUtils.RuleModule<"useCallSignature">;

type TContext = Parameters<TRule["create"]>[0];

type TNode = TSESTree.TSTypeAliasDeclaration;

type TCheck = {
    (context: TContext, node: TNode): void;
};

const check: TCheck = (context, node) => {
    const isFn: boolean =
        node.typeAnnotation.type === AST_NODE_TYPES.TSFunctionType;
    if (!isFn) {
        return;
    }
    context.report({
        messageId: "useCallSignature",
        node: node.typeAnnotation,
    });
};

type TCreate = TRule["create"];

const create: TCreate = (context) => ({
    TSTypeAliasDeclaration(node): void {
        check(context, node);
    },
});

type TMeta = TRule["meta"];

const meta: TMeta = {
    docs: { description: DESC },
    messages: {
        useCallSignature: MSG,
    },
    schema: [],
    type: "suggestion",
};
const collapse =
    <A extends Array<unknown>, R>(f: (...args: A) => () => R): ((...args: A) => R) =>
        (...args) =>
            f(...args)();
const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta,
});

export default rule;
