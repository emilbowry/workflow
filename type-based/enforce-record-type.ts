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

import {
    field,
    lintMetaToMsg,
} from "./type-based.types";

export const LINT_META: TLintMeta = {
    rule:
        "local/enforce-record-type",
    flags: field(
        "flags",
        "Type alias body is an object " + "literal type (TSTypeLiteral)",
    ),
    fix: field(
        "fix",
        "Rewrite { key: T } as " + "Record<K, V> or restructure",
    ),
    pitfalls: field(
        "pitfalls",
        "Fires on all type literals " +
            "including call/index/method " +
            "signatures. For lookup " +
            "tables needing T|undefined" +
            " use try-dispatch — " +
            "Record access never " +
            "returns undefined",
    ),
    avoid: field(
        "avoid",
        "Object literal types " +
            "{ key: T }. Use Record<K, V>" +
            " for keyed structures",
    ),
    related: field(
        "related",
        "no-single-field-type, " +
            "no-duplicate-type-" +
            "structure, " +
            "require-parametric-record",
    ),
    philosophy: field(
        "philosophy",
        "Records make structural " +
            "comparison obvious. Two " +
            "Records with identical K,V " +
            "are visibly the same; two " +
            "object literals with " +
            "different property names " +
            "hide structural identity " +
            "behind labels",
    ),
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
