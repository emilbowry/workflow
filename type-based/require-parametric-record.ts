import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TCheckNode,
    TCreate,
    THandler,
    TLintMeta,
    TMakeHandler,
} from "./type-based.types";

import {
    AST_NODE_TYPES,
    ESLintUtils,
} from "@typescript-eslint/utils";

import {
    field,
    lintMetaToMsg,
} from "./type-based.types";

export const LINT_META: TLintMeta = {
    rule:
        "local/" +
        "require-parametric-record",
    flags: field(
        "flags",
        "Record or mapped type " +
            "without dependent " +
            "product structure " +
            "(value type does not " +
            "reference key type " +
            "parameter)",
    ),
    fix: field(
        "fix",
        "Add type parameter: " +
            "type TFoo<T extends " +
            "X> = Record<T, " +
            "TBar<T>>. For mapped " +
            "types: {[K in T]: " +
            "F<K>}. Or replace with" +
            " tuple if no parametric" +
            " relationship exists",
    ),
    pitfalls: field(
        "pitfalls",
        "Record check is regex-" +
            "based on source text. " +
            "Mapped type check uses" +
            " AST. Complex " +
            "formatting may not " +
            "match regex. Value " +
            "must be wrapped in a " +
            "named type for Records",
    ),
    avoid: field(
        "avoid",
        "Non-parametric Records" +
            " like Record<string, " +
            "number>. Degenerate " +
            "mapped types like " +
            "{[K in T]: string} " +
            "where value ignores " +
            "the index",
    ),
    related: field(
        "related",
        "enforce-record-type, " +
            "valid-generics, " +
            "no-duplicate-type-" +
            "structure",
    ),
    philosophy: field(
        "philosophy",
        "Products indexed by a" +
            " finite domain must " +
            "be dependent — the " +
            "value must reference " +
            "the index. Both " +
            "Record<T, F<T>> and " +
            "{[K in T]: F<K>} are " +
            "dependent products. " +
            "Degenerate forms " +
            "collapse to constant " +
            "families",
    ),
};

const MSG: string = lintMetaToMsg(LINT_META);

const MAPPED_MSG: string =
    lintMetaToMsg(LINT_META) +
    " (degenerate mapped type)";

const DESC: string =
    "Require Record types and " +
    "mapped types to be dependent " +
    "products with backreferenced " +
    "key parameter.";

type TRule = ESLintUtils.RuleModule<
    | "nonParametricRecord"
    | "degenerateMappedType"
>;

const PARAMETRIC: RegExp =
    /type\s+\w+<(\w+)\s+extends\s+[^>]+>\s*=\s*Record<\1,\s*\w+<\1>>/;

type TIsValid = (
    ...args: [src: string]
) => boolean;

const isValid: TIsValid = (src) =>
    PARAMETRIC.test(src);

type TContainsRef = (
    ...args: [
        node: TSESTree.TypeNode,
        name: string,
    ]
) => boolean;

const containsRef: TContainsRef = (
    node,
    name,
) =>
    tryRefMatch(node, name) ??
    tryUnionMatch(node, name) ??
    tryIntersectionMatch(node, name) ??
    tryArrayMatch(node, name) ??
    tryTupleMatch(node, name) ??
    tryFnMatch(node, name) ??
    false;

type TTryMatch = (
    ...args: [
        node: TSESTree.TypeNode,
        name: string,
    ]
) => boolean | undefined;

const tryRefMatch: TTryMatch = (node, name) =>
    node.type !==
    AST_NODE_TYPES.TSTypeReference
        ? undefined
        : tryRefName(node, name) ??
          tryRefArgs(node, name);

type TRefNameCheck = (
    ...args: [
        node: TSESTree.TSTypeReference,
        name: string,
    ]
) => boolean | undefined;

const tryRefName: TRefNameCheck = (
    node,
    name,
) =>
    node.typeName.type ===
        AST_NODE_TYPES.Identifier &&
    node.typeName.name === name
        ? true
        : undefined;

const tryRefArgs: TRefNameCheck = (
    node,
    name,
) =>
    node.typeArguments !== undefined &&
    node.typeArguments.params.some(
        (p: TSESTree.TypeNode) =>
            containsRef(p, name),
    )
        ? true
        : undefined;

const tryUnionMatch: TTryMatch = (
    node,
    name,
) =>
    node.type !== AST_NODE_TYPES.TSUnionType
        ? undefined
        : node.types.some(
                (t: TSESTree.TypeNode) =>
                    containsRef(t, name),
            );

const tryIntersectionMatch: TTryMatch = (
    node,
    name,
) =>
    node.type !==
    AST_NODE_TYPES.TSIntersectionType
        ? undefined
        : node.types.some(
                (t: TSESTree.TypeNode) =>
                    containsRef(t, name),
            );

const tryArrayMatch: TTryMatch = (
    node,
    name,
) =>
    node.type !== AST_NODE_TYPES.TSArrayType
        ? undefined
        : containsRef(
              node.elementType,
              name,
          );

const tryTupleMatch: TTryMatch = (
    node,
    name,
) =>
    node.type !== AST_NODE_TYPES.TSTupleType
        ? undefined
        : node.elementTypes.some(
                (t: TSESTree.TypeNode) =>
                    containsRef(t, name),
            );

const tryFnMatch: TTryMatch = (node, name) =>
    node.type !==
    AST_NODE_TYPES.TSFunctionType
        ? undefined
        : node.returnType !== undefined &&
              containsRef(
                  node.returnType
                      .typeAnnotation,
                  name,
              );

type TIsMapped = (
    node: TSESTree.TypeNode,
) => node is TSESTree.TSMappedType;

const isMappedType: TIsMapped = (
    node,
): node is TSESTree.TSMappedType =>
    node.type ===
    AST_NODE_TYPES.TSMappedType;

type TGetMappedKeyName = (
    ...args: [
        mapped: TSESTree.TSMappedType,
    ]
) => string;

const getMappedKeyName: TGetMappedKeyName = (
    mapped,
) => mapped.key.name;

type TGetMappedValue = (
    ...args: [
        mapped: TSESTree.TSMappedType,
    ]
) => TSESTree.TypeNode | undefined;

const getMappedValue: TGetMappedValue = (
    mapped,
) => mapped.typeAnnotation ?? undefined;

type TCheckMapped = (
    ...args: [
        context: Parameters<
            TRule["create"]
        >[0],
        node: TSESTree.TSTypeAliasDeclaration,
    ]
) => void;

const checkMapped: TCheckMapped = (
    context,
    node,
) => {
    const body: TSESTree.TypeNode =
        node.typeAnnotation;
    if (!isMappedType(body)) {
        return;
    }
    const keyName: string =
        getMappedKeyName(body);
    const valueNode: TSESTree.TypeNode | undefined =
        getMappedValue(body);
    if (valueNode === undefined) {
        return;
    }
    if (!containsRef(valueNode, keyName)) {
        context.report({
            messageId:
                "degenerateMappedType",
            node,
        });
    }
};

const checkNode: TCheckNode<TRule> = (
    context,
    node,
) => {
    const src: string =
        context.sourceCode.getText(node);
    if (
        src.includes("Record<") &&
        !isValid(src)
    ) {
        context.report({
            messageId: "nonParametricRecord",
            node,
        });
    }
    checkMapped(context, node);
};

const makeHandler: TMakeHandler<TRule> = (
    checkNode,
    context,
) =>
    (
        () => (
            node: TSESTree.TSTypeAliasDeclaration,
        ) => checkNode(context, node)
    )();

const create: TCreate<TRule> = (context) => {
    const handler: THandler = makeHandler(
        checkNode,
        context,
    );
    return {
        TSTypeAliasDeclaration: handler,
    };
};

const rule: TRule =
    ESLintUtils.RuleCreator.withoutDocs({
        create,
        meta: {
            docs: { description: DESC },
            messages: {
                nonParametricRecord: MSG,
                degenerateMappedType:
                    MAPPED_MSG,
            },
            schema: [],
            type: "suggestion",
        },
    });

export default rule;
