import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TCheckNode,
    TCreate,
    THandler,
    TMakeHandler,
    TLintMeta,
    TTypeNodePredicate,
} from "./type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

import { lintMetaToMsg } from "./type-based.types";

export const LINT_META: TLintMeta = {
    flags:
        "Type alias body is an object " +
        "literal type (TSTypeLiteral)",
    fix:
        "Rewrite { key: T } as " +
        "Record<K, V> or restructure",
    pitfalls:
        "Fires on all type literals " +
        "including call/index/method " +
        "signatures. Call signatures " +
        "should use prefer-call-" +
        "signature form instead",
    avoid:
        "Object literal types " +
        "{ key: T }. Use Record<K, V>" +
        " for keyed structures",
    related:
        "no-single-field-type, " +
        "prefer-call-signature, " +
        "no-duplicate-type-structure",
    philosophy:
        "Records make structural " +
        "comparison obvious. Two " +
        "Records with identical K,V " +
        "are visibly the same; two " +
        "object literals with " +
        "different property names " +
        "hide structural identity " +
        "behind labels",
};

const MSG: string = lintMetaToMsg(LINT_META);

const DESC: string =
    "Enforce Record for all " + "object-literal type definitions.";

type TRule = ESLintUtils.RuleModule<"objectLiteral">;

const isTypeLiteral: TTypeNodePredicate = (node) =>
    node.type === AST_NODE_TYPES.TSTypeLiteral;

const checkNode: TCheckNode<TRule> = (context, node) => {
    if (isTypeLiteral(node.typeAnnotation)) {
        context.report({
            messageId: "objectLiteral",
            node: node.typeAnnotation,
        });
    }
};

const makeHandler: TMakeHandler<TRule> = (checkNode, context) =>
    (
        () => (node: TSESTree.TSTypeAliasDeclaration) =>
            checkNode(context, node)
    )();

const create: TCreate<TRule> = (context) => {
    const handler: THandler = makeHandler(checkNode, context);
    return {
        TSTypeAliasDeclaration: handler,
    };
};

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
