import type { TSESTree } from "@typescript-eslint/utils";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

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

type TNodePredicate = {
    (node: TSESTree.TSTypeAliasDeclaration): boolean;
};

const hasTypeParams: TNodePredicate = (node) =>
    node.typeParameters !== undefined && node.typeParameters.params.length > 0;

type TGetParamName = {
    (params: ReadonlyArray<TSESTree.TSTypeParameter>): string;
};

const getParamName: TGetParamName = (params) =>
    params.length === 1 ? params[0].name.name : "";

type TGetRefName = {
    (body: TSESTree.TypeNode): string;
};

type TRefIdentName = {
    (ref: TSESTree.TSTypeReference): string;
};

const refIdentName: TRefIdentName = (ref) =>
    ref.typeName.type === AST_NODE_TYPES.Identifier ? ref.typeName.name : "";

const getRefName: TGetRefName = (body) =>
    body.type === AST_NODE_TYPES.TSTypeReference ? refIdentName(body) : "";

const isDegenerate: TNodePredicate = (node) => {
    const params: ReadonlyArray<TSESTree.TSTypeParameter> =
        node.typeParameters?.params ?? [];
    const firstParam: string = getParamName(params);
    const refName: string = getRefName(node.typeAnnotation);
    return firstParam !== "" && refName === firstParam;
};

type TGetTypeArgNames = {
    (ref: TSESTree.TSTypeReference): ReadonlyArray<string>;
};

const getTypeArgNames: TGetTypeArgNames = (ref) =>
    (ref.typeArguments?.params ?? []).map((arg: TSESTree.TypeNode) =>
        arg.type === AST_NODE_TYPES.TSTypeReference &&
        arg.typeName.type === AST_NODE_TYPES.Identifier
            ? arg.typeName.name
            : "",
    );

type TGetParamNames = {
    (node: TSESTree.TSTypeAliasDeclaration): ReadonlyArray<string>;
};

const getParamNames: TGetParamNames = (node) =>
    (node.typeParameters?.params ?? []).map(
        (param: TSESTree.TSTypeParameter) => param.name.name,
    );

type TParamsMatch = {
    (
        paramNames: ReadonlyArray<string>,
        argNames: ReadonlyArray<string>,
    ): boolean;
};

const paramsMatch: TParamsMatch = (paramNames, argNames) =>
    paramNames.length > 0 &&
    paramNames.length === argNames.length &&
    paramNames.every((name: string, idx: number) => name === argNames[idx]);

const isHomogeneous: TNodePredicate = (node) => {
    const body: TSESTree.TypeNode = node.typeAnnotation;
    const paramNames: ReadonlyArray<string> = getParamNames(node);
    const argNames: ReadonlyArray<string> =
        body.type === AST_NODE_TYPES.TSTypeReference
            ? getTypeArgNames(body)
            : [];
    return paramsMatch(paramNames, argNames);
};

const checkNode: TCheckNode = (context, node) => {
    if (hasTypeParams(node) && isDegenerate(node)) {
        context.report({
            messageId: "degenerateGeneric",
            node,
        });
    }
    if (hasTypeParams(node) && isHomogeneous(node)) {
        context.report({
            messageId: "homogeneousGeneric",
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
