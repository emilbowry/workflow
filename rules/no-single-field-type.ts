import type { TSESTree } from "@typescript-eslint/utils";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

const MSG: string =
    "Type alias has only one " +
    "field. Combine with other " +
    "fields or use the type directly.";

const DESC: string = "Disallow type aliases with " + "a single property field.";

type TRule = ESLintUtils.RuleModule<"singleField">;

type TContext = Parameters<TRule["create"]>[0];

type TShouldReport = {
    (node: TSESTree.TypeNode): boolean;
};

const shouldReport: TShouldReport = (node) =>
    node.type === AST_NODE_TYPES.TSTypeLiteral &&
    node.members.length === 1 &&
    node.members[0].type !== AST_NODE_TYPES.TSCallSignatureDeclaration;

type THandler = {
    (node: TSESTree.TSTypeAliasDeclaration): void;
};

type TMakeHandler = {
    (context: TContext): THandler;
};

type THandleNode = {
    (context: TContext, node: TSESTree.TSTypeAliasDeclaration): void;
};

const handleNode: THandleNode = (context, node) => {
    const ann: TSESTree.TypeNode = node.typeAnnotation;
    if (shouldReport(ann)) {
        context.report({
            messageId: "singleField",
            node: ann,
        });
    }
};

const makeHandler: TMakeHandler = (context) =>
    (
        () => (node: TSESTree.TSTypeAliasDeclaration) =>
            handleNode(context, node)
    )();

type TCreate = TRule["create"];

const create: TCreate = (context) => {
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
