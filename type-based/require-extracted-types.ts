import type { TSESTree } from "@typescript-eslint/utils";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

const MSG: string = "Inline type must be extracted " + "to a named type alias.";

const DESC: string =
    "Require type annotations to be " + "keywords or named references.";

type TIsAllowed = (node: TSESTree.TypeNode) => boolean;

const isAllowed: TIsAllowed = (node) =>
    node.type === AST_NODE_TYPES.TSTypeReference ||
    node.type.endsWith("Keyword");

type TRule = ESLintUtils.RuleModule<"extractType">;

type TReport = (node: TSESTree.TSTypeAnnotation) => void;

type TContext = Parameters<TRule["create"]>[0];

type TCheckNode = (context: TContext, node: TSESTree.TSTypeAnnotation) => void;

const checkNode: TCheckNode = (context, node) => {
    const inner: TSESTree.TypeNode = node.typeAnnotation;
    if (!isAllowed(inner)) {
        context.report({
            messageId: "extractType",
            node,
        });
    }
};

type TMakeReport = (checkFn: TCheckNode, context: TContext) => TReport;

const makeReport: TMakeReport = (checkFn, context) =>
    (
        () => (node: TSESTree.TSTypeAnnotation) =>
            checkFn(context, node)
    )();

type TCreate = TRule["create"];

const create: TCreate = (context) => {
    const handler: TReport = makeReport(checkNode, context);
    return {
        TSTypeAnnotation: handler,
    };
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta: {
        docs: { description: DESC },
        messages: { extractType: MSG },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
