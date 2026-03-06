import type { TSESTree } from "@typescript-eslint/utils";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

const MSG: string = "Use Record<K, V> instead of " + "an object literal type.";

const DESC: string =
    "Enforce Record for all " + "object-literal type definitions.";

type TRule = ESLintUtils.RuleModule<"objectLiteral">;

type TContext = Parameters<TRule["create"]>[0];

type TIsTypeLiteral = (node: TSESTree.TypeNode) => boolean;

const isTypeLiteral: TIsTypeLiteral = (node) =>
    node.type === AST_NODE_TYPES.TSTypeLiteral;

// prettier-ignore
type TCheckNode = (ctx: TContext, n: TSESTree.TSTypeAliasDeclaration) => void;

const checkNode: TCheckNode = (context, node) => {
    if (isTypeLiteral(node.typeAnnotation)) {
        context.report({
            messageId: "objectLiteral",
            node: node.typeAnnotation,
        });
    }
};

type THandler = (node: TSESTree.TSTypeAliasDeclaration) => void;

type TMakeHandler = (checkNode: TCheckNode, context: TContext) => THandler;

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
        messages: { objectLiteral: MSG },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
