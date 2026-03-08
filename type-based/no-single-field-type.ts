import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TCheckNode,
    TContext,
    TCreate,
    THandler,
    TTypeNodePredicate,
} from "./type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

const MSG: string =
    "Type alias has only one " +
    "field. Combine with other " +
    "fields or use the type directly.";

const DESC: string = "Disallow type aliases with " + "a single property field.";

type TRule = ESLintUtils.RuleModule<"singleField">;

const shouldReport: TTypeNodePredicate = (node) =>
    node.type === AST_NODE_TYPES.TSTypeLiteral &&
    node.members.length === 1 &&
    node.members[0].type !== AST_NODE_TYPES.TSCallSignatureDeclaration;

type TMakeHandler = (context: TContext<TRule>) => THandler;

const handleNode: TCheckNode<TRule> = (context, node) => {
    const ann: TSESTree.TypeNode = node.typeAnnotation;
    if (shouldReport(ann)) {
        context.report({
            messageId: "singleField",
            node: ann,
        });
    }
};

const makeHandler: TMakeHandler = (context) => handleNode.bind(null, context);

const create: TCreate<TRule> = (context) => {
    const handler: THandler = makeHandler(context);
    return {
        TSTypeAliasDeclaration: handler,
    };
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta: {
        docs: { description: DESC },
        messages: { singleField: MSG },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
