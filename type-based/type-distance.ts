import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TContext,
    TCreate,
    THandler,
    TLintMeta,
    TMeta,
} from "./type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

import { lintMetaToMsg } from "./type-based.types";

export const LINT_META: TLintMeta = {
    avoid:
        "Near-duplicate type aliases " +
        "with high Jaccard similarity " +
        "that should be unified or " +
        "made explicitly different",
    fix:
        "Merge the two types into one " +
        "if they represent the same " +
        "concept, or add/remove fields " +
        "to make the structural " +
        "difference explicit",
    flags:
        "Two type aliases with " +
        "structural similarity " +
        ">= 0.75 (Jaccard " +
        "similarity on keys " +
        "and values)",
    philosophy:
        "The type namespace is a set — " +
        "no two names should describe " +
        "the same shape. Near-duplicates " +
        "indicate concept drift that " +
        "should be resolved",
    pitfalls:
        "Uses module-level mutable " +
        "array for cross-type " +
        "comparison. Exact duplicates " +
        "(canonical match) are " +
        "excluded — use no-duplicate-" +
        "type-structure for those",
    related:
        "no-duplicate-type-structure, " +
        "cardinality-isomorphic-families, " +
        "no-single-field-type",
};

const MSG: string = lintMetaToMsg(LINT_META) + " Types: {{nameA}}, {{nameB}}";

const DESC: string =
    "Detect type aliases with " +
    "suspiciously similar structure " +
    "that could be unified.";

const THRESHOLD: number = 0.75;

type TRule = ESLintUtils.RuleModule<"typeDistance">;

type TMaybeAnn = TSESTree.TSTypeAnnotation | undefined;

type TAnnotationStr = (ann: TMaybeAnn, fallback: string) => string;

const annotationStr: TAnnotationStr = (ann, fallback) =>
    ann ? canonicalType(ann.typeAnnotation) : fallback;

type TKeyName = (key: TSESTree.PropertyName) => string;

const keyName: TKeyName = (key) =>
    key.type === AST_NODE_TYPES.Identifier
        ? key.name
        : key.type === AST_NODE_TYPES.Literal
            ? String(key.value)
            : key.type;

type TCanonicalType = (node: TSESTree.TypeNode) => string;

const canonicalType: TCanonicalType = (node) =>
    node.type === AST_NODE_TYPES.TSTypeLiteral
        ? handleTypeLiteral(node)
        : node.type === AST_NODE_TYPES.TSUnionType
            ? node.types.map(canonicalType).join("|")
            : node.type === AST_NODE_TYPES.TSIntersectionType
                ? node.types.map(canonicalType).join("&")
                : node.type;

type THandleTypeLiteral = (node: TSESTree.TSTypeLiteral) => string;

const handleTypeLiteral: THandleTypeLiteral = (node) => {
    const members: string = node.members.map(canonicalMember).join(";");
    return "{" + members + "}";
};

type TCanonicalMember = (member: TSESTree.TypeElement) => string;

const canonicalMember: TCanonicalMember = (member) =>
    member.type === AST_NODE_TYPES.TSPropertySignature
        ? handlePropSig(member)
        : member.type;

type THandlePropSig = (member: TSESTree.TSPropertySignature) => string;

const handlePropSig: THandlePropSig = (member) => {
    const key: string = keyName(member.key);
    const opt: string = member.optional ? "?" : "";
    const ann: string = annotationStr(member.typeAnnotation, "");
    const sep: string = ann ? ":" : "";
    return key + opt + sep + ann;
};

type TKeyValuePair = {
    readonly key: string;
    readonly value: string;
};

type TExtractPairs = (node: TSESTree.TypeNode) => ReadonlyArray<TKeyValuePair>;

const extractPairs: TExtractPairs = (node) =>
    node.type === AST_NODE_TYPES.TSTypeLiteral
        ? node.members.filter(isPropSig).map(toPair)
        : [];

type TIsPropSig = (
    member: TSESTree.TypeElement,
) => member is TSESTree.TSPropertySignature;

const isPropSig: TIsPropSig = (
    member,
): member is TSESTree.TSPropertySignature =>
    member.type === AST_NODE_TYPES.TSPropertySignature;

type TToPair = (member: TSESTree.TSPropertySignature) => TKeyValuePair;

const toPair: TToPair = (member) => ({
    key: keyName(member.key),
    value: annotationStr(member.typeAnnotation, "any"),
});

type TKeysOf = (pairs: ReadonlyArray<TKeyValuePair>) => ReadonlySet<string>;

const keysOf: TKeysOf = (pairs) =>
    new Set(pairs.map((p: TKeyValuePair) => p.key));

type TJaccardSimilarity = (
    a: ReadonlySet<string>,
    b: ReadonlySet<string>,
) => number;

const jaccardSimilarity: TJaccardSimilarity = (a, b) => {
    const union: Set<string> = new Set([...a, ...b]);
    const unionSize: number = union.size;
    if (unionSize === 0) {
        return 1;
    }
    const intersectionSize: number = [...a].filter((k: string) =>
        b.has(k),
    ).length;
    return intersectionSize / unionSize;
};

type TValueMap = ReadonlyMap<string, string>;

type TToValueMap = (pairs: ReadonlyArray<TKeyValuePair>) => TValueMap;

const toValueMap: TToValueMap = (pairs) =>
    new Map(
        pairs.map((p: TKeyValuePair): [string, string] => [p.key, p.value]),
    );

type TValueSimilarity = (
    a: TValueMap,
    b: TValueMap,
    shared: ReadonlyArray<string>,
) => number;

const valueSimilarity: TValueSimilarity = (a, b, shared) => {
    if (shared.length === 0) {
        return 0;
    }
    const matching: number = shared.filter(
        (k: string) => a.get(k) === b.get(k),
    ).length;
    return matching / shared.length;
};

type TSharedKeys = (
    a: ReadonlySet<string>,
    b: ReadonlySet<string>,
) => ReadonlyArray<string>;

const sharedKeys: TSharedKeys = (a, b) =>
    [...a].filter((k: string) => b.has(k));

type TComputeDistance = (
    pairsA: ReadonlyArray<TKeyValuePair>,
    pairsB: ReadonlyArray<TKeyValuePair>,
) => number;

const computeDistance: TComputeDistance = (pairsA, pairsB) => {
    const keysA: ReadonlySet<string> = keysOf(pairsA);
    const keysB: ReadonlySet<string> = keysOf(pairsB);
    const keySim: number = jaccardSimilarity(keysA, keysB);
    const shared: ReadonlyArray<string> = sharedKeys(keysA, keysB);
    const valMapA: TValueMap = toValueMap(pairsA);
    const valMapB: TValueMap = toValueMap(pairsB);
    const valSim: number = valueSimilarity(valMapA, valMapB, shared);
    return (keySim + valSim) / 2;
};

type TEntry = {
    readonly name: string;
    readonly pairs: ReadonlyArray<TKeyValuePair>;
    readonly canonical: string;
    readonly node: TSESTree.TSTypeAliasDeclaration;
    readonly file: string;
};

type TEntries = Array<TEntry>;

const entries: TEntries = [];

type TRecordAlias = (
    file: string,
    node: TSESTree.TSTypeAliasDeclaration,
) => void;

const recordAlias: TRecordAlias = (file, node) => {
    const pairs: ReadonlyArray<TKeyValuePair> = extractPairs(
        node.typeAnnotation,
    );
    const canon: string = canonicalType(node.typeAnnotation);
    const entry: TEntry = {
        canonical: canon,
        file,
        name: node.id.name,
        node,
        pairs,
    };
    entries.push(entry);
};

type TIsSimilarPair = (a: TEntry, b: TEntry) => boolean;

const isSimilarPair: TIsSimilarPair = (a, b) => {
    if (a.canonical === b.canonical) {
        return false;
    }
    if (a.pairs.length === 0 && b.pairs.length === 0) {
        return false;
    }
    const dist: number = computeDistance(a.pairs, b.pairs);
    return dist >= THRESHOLD;
};

type TReportPair = (
    context: TContext<TRule>,
    file: string,
    a: TEntry,
    b: TEntry,
) => void;

const reportPair: TReportPair = (context, file, a, b) => {
    if (a.file === file) {
        context.report({
            data: { nameA: a.name, nameB: b.name },
            messageId: "typeDistance",
            node: a.node,
        });
    }
    if (b.file === file) {
        context.report({
            data: { nameA: a.name, nameB: b.name },
            messageId: "typeDistance",
            node: b.node,
        });
    }
};

type TCheckPairs = (context: TContext<TRule>, file: string) => void;

const checkPairs: TCheckPairs = (context, file) => {
    for (const [i, a] of entries.entries()) {
        for (const b of entries.slice(i + 1)) {
            if (isSimilarPair(a, b)) {
                reportPair(context, file, a, b);
            }
        }
    }
};

type TEntryPredicate = (e: TEntry) => boolean;

type TMakeFileFilter = (file: string) => TEntryPredicate;

const makeFileFilter: TMakeFileFilter = (file) =>
    (
        () => (e: TEntry) =>
            e.file !== file
    )();

type TClearFile = (file: string) => void;

const clearFile: TClearFile = (file) => {
    const keep: TEntryPredicate = makeFileFilter(file);
    const kept: TEntries = entries.filter(keep);
    entries.length = 0;
    kept.forEach((e: TEntry) => entries.push(e));
};

type TExitHandler = () => void;

type TMakeExitHandler = (
    context: TContext<TRule>,
    file: string,
) => TExitHandler;

const makeExitHandler: TMakeExitHandler = (context, file) =>
    (
        () => () =>
            checkPairs(context, file)
    )();

type TMakeAliasHandler = (file: string) => THandler;

const makeAliasHandler: TMakeAliasHandler = (file) =>
    (
        () => (node: TSESTree.TSTypeAliasDeclaration) =>
            recordAlias(file, node)
    )();

const create: TCreate<TRule> = (context) => {
    const file: string = context.filename;
    clearFile(file);
    const exitHandler: TExitHandler = makeExitHandler(context, file);
    const aliasHandler: THandler = makeAliasHandler(file);
    return {
        "Program:exit": exitHandler,
        TSTypeAliasDeclaration: aliasHandler,
    };
};

const meta: TMeta<TRule> = {
    docs: { description: DESC },
    messages: { typeDistance: MSG },
    schema: [],
    type: "suggestion",
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta,
});

export default rule;
