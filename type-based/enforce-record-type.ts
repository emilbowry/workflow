import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TCheckNode,
    TCreate,
    THandler,
    TMakeHandler,
    TTypeNodePredicate,
} from "./type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

const MSG: string = "Use Record<K, V> instead of " + "an object literal type.";

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
