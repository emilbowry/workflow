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
    rule: "local/" + "require-parametric-record",
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
    lintMetaToMsg(LINT_META) + " (degenerate mapped type)";

const DESC: string =
    "Require Record types and " +
    "mapped types to be dependent " +
    "products with backreferenced " +
    "key parameter.";

type TRule = ESLintUtils.RuleModule<
    "nonParametricRecord" | "degenerateMappedType"
>;

const PARAMETRIC: RegExp =
    /type\s+\w+<(\w+)\s+extends\s+[^>]+>\s*=\s*Record<\1,\s*\w+<\1>>/;

type TSingleStringArg = [string];

type TIsValid = (...args: TSingleStringArg) => boolean;

const isValid: TIsValid = (src) => PARAMETRIC.test(src);

type TParamPredicateArgs = [TSESTree.TypeNode];

type TParamPredicate = (...args: TParamPredicateArgs) => boolean;

type TMakePredicate = (...args: TSingleStringArg) => TParamPredicate;

const makePredicate: TMakePredicate = (name) =>
    (
        () => (param: TSESTree.TypeNode) =>
            param.type === AST_NODE_TYPES.TSTypeReference &&
            param.typeName.type === AST_NODE_TYPES.Identifier &&
            param.typeName.name === name
    )();

type TIsRefWithArgArgs = [TSESTree.TypeNode, string];

type TIsRefWithArg = (...args: TIsRefWithArgArgs) => boolean;

const isRefWithArg: TIsRefWithArg = (node, name) =>
    node.type === AST_NODE_TYPES.TSTypeReference &&
    node.typeArguments !== undefined &&
    node.typeArguments.params.some(makePredicate(name));

type TMappedArgs = [TSESTree.TSMappedType];

type TGetMappedKeyName = (...args: TMappedArgs) => string;

const getMappedKeyName: TGetMappedKeyName = (mapped) => mapped.key.name;

type TMappedValueNode = TSESTree.TypeNode | undefined;

type TGetMappedValue = (...args: TMappedArgs) => TMappedValueNode;

const getMappedValue: TGetMappedValue = (mapped) =>
    mapped.typeAnnotation ?? undefined;

type THasNonRefValueArgs = [TMappedValueNode, string];

type THasNonRefValue = (...args: THasNonRefValueArgs) => boolean;

const hasNonRefValue: THasNonRefValue = (node, name) =>
    node !== undefined && !isRefWithArg(node, name);

type TShouldReportArgs = [TSESTree.TSTypeAliasDeclaration];

type TShouldReportMapped = (...args: TShouldReportArgs) => boolean;

const shouldReportMapped: TShouldReportMapped = (node) =>
    node.typeAnnotation.type === AST_NODE_TYPES.TSMappedType &&
    hasNonRefValue(
        getMappedValue(node.typeAnnotation),
        getMappedKeyName(node.typeAnnotation),
    );

type TCheckMappedArgs = [
    Parameters<TRule["create"]>[0],
    TSESTree.TSTypeAliasDeclaration,
];

type TCheckMapped = (...args: TCheckMappedArgs) => void;

const checkMapped: TCheckMapped = (context, node) =>
    shouldReportMapped(node)
        ? context.report({
            messageId: "degenerateMappedType",
            node,
        })
        : undefined;

const checkNode: TCheckNode<TRule> = (context, node) => {
    const src: string = context.sourceCode.getText(node);
    if (src.includes("Record<") && !isValid(src)) {
        context.report({
            messageId: "nonParametricRecord",
            node,
        });
    }
    checkMapped(context, node);
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
        messages: {
            nonParametricRecord: MSG,
            degenerateMappedType: MAPPED_MSG,
        },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
