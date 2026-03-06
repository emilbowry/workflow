import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TCanonical,
    TCheckNode,
    TCreate,
    THandler,
    TMakeHandler,
    TRefIdentName,
} from "./type-based.types";

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

type TNodePredicate = (node: TSESTree.TSTypeAliasDeclaration) => boolean;

const hasTypeParams: TNodePredicate = (node) =>
    node.typeParameters !== undefined && node.typeParameters.params.length > 0;

type TIsBodyAParam = (
    paramNames: ReadonlyArray<string>,
    bodyName: string,
) => boolean;

const isBodyAParam: TIsBodyAParam = (paramNames, bodyName) =>
    bodyName !== "" && paramNames.includes(bodyName);

const refIdentName: TRefIdentName = (ref) =>
    ref.typeName.type === AST_NODE_TYPES.Identifier ? ref.typeName.name : "";

const getRefName: TCanonical = (body) =>
    body.type === AST_NODE_TYPES.TSTypeReference ? refIdentName(body) : "";

type TGetParamNames = (
    node: TSESTree.TSTypeAliasDeclaration,
) => ReadonlyArray<string>;

type TParamToName = (param: TSESTree.TSTypeParameter) => string;

const paramToName: TParamToName = (param) => param.name.name;

const getParamNames: TGetParamNames = (node) =>
    (node.typeParameters?.params ?? []).map(paramToName);

const isDegenerate: TNodePredicate = (node) => {
    const paramNames: ReadonlyArray<string> = getParamNames(node);
    const bodyName: string = getRefName(node.typeAnnotation);
    return isBodyAParam(paramNames, bodyName);
};

const argToName: TCanonical = (arg) =>
    arg.type === AST_NODE_TYPES.TSTypeReference &&
    arg.typeName.type === AST_NODE_TYPES.Identifier
        ? arg.typeName.name
        : "";

type TGetTypeArgNames = (
    ref: TSESTree.TSTypeReference,
) => ReadonlyArray<string>;

const getTypeArgNames: TGetTypeArgNames = (ref) =>
    (ref.typeArguments?.params ?? []).map(argToName);

type TParamsMatch = (
    paramNames: ReadonlyArray<string>,
    argNames: ReadonlyArray<string>,
) => boolean;

const SEP: string = "\0";

const paramsMatch: TParamsMatch = (paramNames, argNames) =>
    paramNames.length > 0 &&
    paramNames.length === argNames.length &&
    paramNames.join(SEP) === argNames.join(SEP);

const isHomogeneous: TNodePredicate = (node) => {
    const body: TSESTree.TypeNode = node.typeAnnotation;
    const paramNames: ReadonlyArray<string> = getParamNames(node);
    const argNames: ReadonlyArray<string> =
        body.type === AST_NODE_TYPES.TSTypeReference
            ? getTypeArgNames(body)
            : [];
    return paramsMatch(paramNames, argNames);
};

const checkNode: TCheckNode<TRule> = (context, node) => {
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

const makeHandler: TMakeHandler<TRule> = (check, context) =>
    (
        () => (node: TSESTree.TSTypeAliasDeclaration) =>
            check(context, node)
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
        messages: {
            degenerateGeneric: DEGENERATE_MSG,
            homogeneousGeneric: HOMOGENEOUS_MSG,
        },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
