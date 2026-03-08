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

type TIsLiteralType = (node: TSESTree.TypeNode) => boolean;

const isLiteralType: TIsLiteralType = (node) =>
    node.type === AST_NODE_TYPES.TSLiteralType;

type TIsLiteralUnion = (node: TSESTree.TypeNode) => boolean;

const isLiteralUnion: TIsLiteralUnion = (node) =>
    node.type === AST_NODE_TYPES.TSUnionType &&
    node.types.length > 0 &&
    node.types.every(isLiteralType);

type TIsFiniteDomain = (node: TSESTree.TypeNode) => boolean;

const isFiniteDomain: TIsFiniteDomain = (node) =>
    isLiteralType(node) || isLiteralUnion(node);

type TIsBareString = (node: TSESTree.TypeNode) => boolean;

const isBareString: TIsBareString = (node) =>
    node.type === AST_NODE_TYPES.TSStringKeyword;

type TGetReturnType = (
    node: TSESTree.TSFunctionType,
) => TSESTree.TypeNode | undefined;

const getReturnType: TGetReturnType = (node) => node.returnType?.typeAnnotation;

type THasFiniteParam = (params: ReadonlyArray<TSESTree.Parameter>) => boolean;

const getParamAnnotation: (
    param: TSESTree.Parameter,
) => TSESTree.TypeNode | undefined = (param) =>
    param.type === AST_NODE_TYPES.Identifier
        ? param.typeAnnotation?.typeAnnotation
        : param.type === AST_NODE_TYPES.RestElement && param.typeAnnotation
            ? param.typeAnnotation.typeAnnotation
            : undefined;

const hasFiniteParam: THasFiniteParam = (params) =>
    params.some((param: TSESTree.Parameter) => {
        const ann: TSESTree.TypeNode | undefined = getParamAnnotation(param);
        return ann !== undefined && isFiniteDomain(ann);
    });

type TIsFunctionType = (
    node: TSESTree.TypeNode,
) => node is TSESTree.TSFunctionType;

const isFunctionType: TIsFunctionType = (
    node,
): node is TSESTree.TSFunctionType =>
    node.type === AST_NODE_TYPES.TSFunctionType;

const checkNode: TCheckNode<TRule> = (context, node) => {
    const body: TSESTree.TypeNode = node.typeAnnotation;
    if (!isFunctionType(body)) {
        return;
    }
    const ret: TSESTree.TypeNode | undefined = getReturnType(body);
    if (ret === undefined) {
        return;
    }
    if (hasFiniteParam(body.params) && isBareString(ret)) {
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
