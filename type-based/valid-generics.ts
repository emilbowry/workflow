import type { TSESTree } from "@typescript-eslint/utils";

import { ESLintUtils } from "@typescript-eslint/utils";

const DEGENERATE_MSG: string =
    "Degenerate generic: type alias " + "body is just the type parameter.";

const HOMOGENEOUS_MSG: string =
    "Homogeneous generic: type alias " +
    "passes type parameters straight " +
    "through to another generic.";

const DESC: string =
    "Disallow degenerate and " + "homogeneous generic type aliases.";

type TRule = ESLintUtils.RuleModule<"degenerateGeneric" | "homogeneousGeneric">;

type TContext = Parameters<TRule["create"]>[0];

type THandler = {
    (node: TSESTree.TSTypeAliasDeclaration): void;
};

type TCheckNode = {
    (context: TContext, node: TSESTree.TSTypeAliasDeclaration): void;
};

type THasTypeParams = {
    (node: TSESTree.TSTypeAliasDeclaration): boolean;
};

const hasTypeParams: THasTypeParams = (node) =>
    node.typeParameters !== undefined && node.typeParameters.params.length > 0;

const checkNode: TCheckNode = (context, node) => {
    if (hasTypeParams(node)) {
        context.report({
            messageId: "degenerateGeneric",
            node,
        });
    }
};

type TMakeHandler = {
    (check: TCheckNode, context: TContext): THandler;
};

const makeHandler: TMakeHandler = (check, context) =>
    (
        () => (node: TSESTree.TSTypeAliasDeclaration) =>
            check(context, node)
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
        messages: {
            degenerateGeneric: DEGENERATE_MSG,
            homogeneousGeneric: HOMOGENEOUS_MSG,
        },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
