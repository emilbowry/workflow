import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TCheckNode,
    TCreate,
    THandler,
    TLintMeta,
    TMakeHandler,
} from "./type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

import { field, lintMetaToMsg } from "./type-based.types";

export const LINT_META: TLintMeta = {
    rule: "local/finite-domain-return-widening",
    avoid: field(
        "avoid",
        "Returning bare string from " +
            "functions whose input is a " +
            "finite domain (literal or " +
            "literal union)",
    ),
    fix: field(
        "fix",
        "Replace bare string return " +
            "with a literal union that " +
            "maps each input variant to " +
            "a specific output. The " +
            "function becomes a lookup " +
            "table",
    ),
    flags: field(
        "flags",
        "Function from finite domain " +
            "returns bare 'string' — " +
            "prefer a literal union " +
            "return type",
    ),
    philosophy: field(
        "philosophy",
        "Finite domains should " +
            "propagate. If the input " +
            "space is enumerable, the " +
            "output space should be too. " +
            "Makes the function decidable " +
            "and exhaustively testable",
    ),
    pitfalls: field(
        "pitfalls",
        "Only checks TSFunctionType " +
            "inside TSTypeAliasDeclaration. " +
            "Does not check implementation " +
            "return values, only type-level " +
            "annotations",
    ),
    related: field(
        "related",
        "require-rest-params-tuple, " + "transport-graph, " + "valid-generics",
    ),
};

const MSG: string = lintMetaToMsg(LINT_META);

const DESC: string =
    "Functions from finite domains " +
    "must return literal unions, " +
    "not bare string.";

type TRule = ESLintUtils.RuleModule<"finiteReturnWidening">;

type TTypeNodeArgs = [TSESTree.TypeNode];
type TTypeNodePredicate = (...args: TTypeNodeArgs) => boolean;

const isLiteralType: TTypeNodePredicate = (node) =>
    node.type === AST_NODE_TYPES.TSLiteralType;

const isLiteralUnion: TTypeNodePredicate = (node) =>
    node.type === AST_NODE_TYPES.TSUnionType &&
    node.types.length > 0 &&
    node.types.every(isLiteralType);

const isFiniteDomain: TTypeNodePredicate = (node) =>
    isLiteralType(node) || isLiteralUnion(node);

const isBareString: TTypeNodePredicate = (node) =>
    node.type === AST_NODE_TYPES.TSStringKeyword;

type TOptionalTypeNode = TSESTree.TypeNode | undefined;

type TGetReturnTypeArgs = [TSESTree.TSFunctionType];
type TGetReturnType = (...args: TGetReturnTypeArgs) => TOptionalTypeNode;

const getReturnType: TGetReturnType = (node) => node.returnType?.typeAnnotation;

type THasFiniteParamArgs = [ReadonlyArray<TSESTree.Parameter>];
type THasFiniteParam = (...args: THasFiniteParamArgs) => boolean;

type TGetParamAnnotationArgs = [TSESTree.Parameter];
type TGetParamAnnotation = (
    ...args: TGetParamAnnotationArgs
) => TOptionalTypeNode;

const getParamAnnotation: TGetParamAnnotation = (param) =>
    param.type === AST_NODE_TYPES.Identifier
        ? param.typeAnnotation?.typeAnnotation
        : param.type === AST_NODE_TYPES.RestElement && param.typeAnnotation
            ? param.typeAnnotation.typeAnnotation
            : undefined;

type TParamHasFiniteDomain = (...args: TGetParamAnnotationArgs) => boolean;

const paramHasFiniteDomain: TParamHasFiniteDomain = (param) => {
    const ann: TOptionalTypeNode = getParamAnnotation(param);
    return ann !== undefined && isFiniteDomain(ann);
};

const hasFiniteParam: THasFiniteParam = (params) =>
    params.some(paramHasFiniteDomain);

type TRetIsBareStringArgs = [TOptionalTypeNode];
type TRetIsBareString = (...args: TRetIsBareStringArgs) => boolean;

const retIsBareString: TRetIsBareString = (ret) => {
    const isBare: boolean = ret !== undefined && isBareString(ret);
    return isBare;
};

const checkNode: TCheckNode<TRule> = (context, node) => {
    const body: TSESTree.TypeNode = node.typeAnnotation;
    if (
        body.type === AST_NODE_TYPES.TSFunctionType &&
        hasFiniteParam(body.params) &&
        retIsBareString(getReturnType(body))
    ) {
        context.report({
            messageId: "finiteReturnWidening",
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
            finiteReturnWidening: MSG,
        },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
