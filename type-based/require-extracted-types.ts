import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TContext,
    TCreate,
    TTypeNodePredicate,
} from "./type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

const MSG: string = "Inline type must be extracted " + "to a named type alias.";

const DESC: string =
    "Require type annotations to be " + "keywords or named references.";

const isAllowed: TTypeNodePredicate = (node) =>
    node.type === AST_NODE_TYPES.TSTypeReference ||
    node.type.endsWith("Keyword");

type TRule = ESLintUtils.RuleModule<"extractType">;

type TReport = (node: TSESTree.TSTypeAnnotation) => void;

type TCheckNode = (
    context: TContext<TRule>,
    node: TSESTree.TSTypeAnnotation,
) => void;

const checkNode: TCheckNode = (context, node) => {
    const inner: TSESTree.TypeNode = node.typeAnnotation;
    if (!isAllowed(inner)) {
        context.report({
            messageId: "extractType",
            node,
        });
    }
};

type TMakeReport = (checkFn: TCheckNode, context: TContext<TRule>) => TReport;

const makeReport: TMakeReport = (checkFn, context) =>
    (
        () => (node: TSESTree.TSTypeAnnotation) =>
            checkFn(context, node)
    )();

const create: TCreate<TRule> = (context) => {
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
