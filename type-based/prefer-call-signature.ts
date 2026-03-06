import type { TSESTree } from "@typescript-eslint/utils";
import type { TContext, TCreate, THandler, TMeta } from "./type-based.types";

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

type TNode = TSESTree.TSTypeAliasDeclaration;

type TCheck = (context: TContext<TRule>, node: TNode) => void;

const check: TCheck = (context, node) => {
    const isFn: boolean =
        node.typeAnnotation.type === AST_NODE_TYPES.TSFunctionType;
    if (isFn) {
        context.report({
            messageId: "useCallSignature",
            node: node.typeAnnotation,
        });
    }
};

type TMakeHandler = (checkFn: TCheck, context: TContext<TRule>) => THandler;

const makeHandler: TMakeHandler = (checkFn, context) =>
    (
        () => (node: TNode) =>
            checkFn(context, node)
    )();

const create: TCreate<TRule> = (context) => {
    const handler: THandler = makeHandler(check, context);
    return {
        TSTypeAliasDeclaration: handler,
    };
};

const meta: TMeta<TRule> = {
    docs: { description: DESC },
    messages: {
        useCallSignature: MSG,
    },
    schema: [],
    type: "suggestion",
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta,
});

export default rule;
