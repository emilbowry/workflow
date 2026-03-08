import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TContext,
    TCreate,
    THandler,
    TLintMeta,
    TMeta,
} from "./type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

import { field, lintMetaToMsg } from "./type-based.types";

export const LINT_META: TLintMeta = {
    rule: "local/type-distance",
    avoid: field(
        "avoid",
        "Near-duplicate type aliases " +
            "with high Jaccard similarity " +
            "that should be unified or " +
            "made explicitly different",
    ),
    fix: field(
        "fix",
        "Merge the two types into one " +
            "if they represent the same " +
            "concept, or add/remove fields " +
            "to make the structural " +
            "difference explicit",
    ),
    flags: field(
        "flags",
        "Two type aliases with " +
            "structural similarity " +
            ">= 0.75 (Jaccard " +
            "similarity on keys " +
            "and values)",
    ),
    philosophy: field(
        "philosophy",
        "The type namespace is a set — " +
            "no two names should describe " +
            "the same shape. Near-duplicates " +
            "indicate concept drift that " +
            "should be resolved",
    ),
    pitfalls: field(
        "pitfalls",
        "Uses module-level mutable " +
            "array for cross-type " +
            "comparison. Exact duplicates " +
            "(canonical match) are " +
            "excluded — use no-duplicate-" +
            "type-structure for those",
    ),
    related: field(
        "related",
        "no-duplicate-type-structure, " +
            "cardinality-isomorphic-families, " +
            "no-single-field-type",
    ),
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

type TKeyValuePair = readonly [key: string, value: string];

type TMemberToPairOpt = (
    member: TSESTree.TypeElement,
) => ReadonlyArray<TKeyValuePair>;

const memberToPairOpt: TMemberToPairOpt = (member) =>
    member.type === AST_NODE_TYPES.TSPropertySignature ? [toPair(member)] : [];

type TExtractPairs = (node: TSESTree.TypeNode) => ReadonlyArray<TKeyValuePair>;

const extractPairs: TExtractPairs = (node) =>
    node.type === AST_NODE_TYPES.TSTypeLiteral
        ? node.members.flatMap(memberToPairOpt)
        : [];

type TToPair = (member: TSESTree.TSPropertySignature) => TKeyValuePair;

const toPair: TToPair = (member) => [
    keyName(member.key),
    annotationStr(member.typeAnnotation, "any"),
];

type TKeysOf = (pairs: ReadonlyArray<TKeyValuePair>) => ReadonlySet<string>;

const keysOf: TKeysOf = (pairs) =>
    new Set(pairs.map((pair: TKeyValuePair) => pair[0]));

type TJaccardSimilarity = (
    a: ReadonlySet<string>,
    b: ReadonlySet<string>,
) => number;

const jaccardSimilarity: TJaccardSimilarity = (setA, setB) => {
    const union: Set<string> = new Set([...setA, ...setB]);
    const unionSize: number = union.size;
    if (unionSize === 0) {
        return 1;
    }
    const intersectionSize: number = [...setA].filter((k: string) =>
        setB.has(k),
    ).length;
    return intersectionSize / unionSize;
};

type TValueMap = ReadonlyMap<string, string>;

type TValueMapEntry = [string, string];

type TToValueMap = (pairs: ReadonlyArray<TKeyValuePair>) => TValueMap;

const toValueMap: TToValueMap = (pairs) =>
    new Map(
        pairs.map((pair: TKeyValuePair): TValueMapEntry => [pair[0], pair[1]]),
    );

type TValueSimilarity = (
    a: TValueMap,
    b: TValueMap,
    shared: ReadonlyArray<string>,
) => number;

const valueSimilarity: TValueSimilarity = (mapA, mapB, shared) => {
    if (shared.length === 0) {
        return 0;
    }
    const matching: number = shared.filter(
        (k: string) => mapA.get(k) === mapB.get(k),
    ).length;
    return matching / shared.length;
};

type TSharedKeys = (
    a: ReadonlySet<string>,
    b: ReadonlySet<string>,
) => ReadonlyArray<string>;

const sharedKeys: TSharedKeys = (setA, setB) =>
    [...setA].filter((k: string) => setB.has(k));

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

type TEntryField = "canonical" | "file" | "name" | "node" | "pairs";

type TEntryLookup<K extends TEntryField> = K extends "pairs"
    ? ReadonlyArray<TKeyValuePair>
    : K extends "node"
      ? TSESTree.TSTypeAliasDeclaration
      : string;

type TEntry = { readonly [K in TEntryField]: TEntryLookup<K> };

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

const isSimilarPair: TIsSimilarPair = (entryA, entryB) => {
    if (entryA.canonical === entryB.canonical) {
        return false;
    }
    if (entryA.pairs.length === 0 && entryB.pairs.length === 0) {
        return false;
    }
    const dist: number = computeDistance(entryA.pairs, entryB.pairs);
    return dist >= THRESHOLD;
};

type TReportPair = (
    context: TContext<TRule>,
    file: string,
    a: TEntry,
    b: TEntry,
) => void;

const reportPair: TReportPair = (context, file, entryA, entryB) => {
    if (entryA.file === file) {
        context.report({
            data: { nameA: entryA.name, nameB: entryB.name },
            messageId: "typeDistance",
            node: entryA.node,
        });
    }
    if (entryB.file === file) {
        context.report({
            data: { nameA: entryA.name, nameB: entryB.name },
            messageId: "typeDistance",
            node: entryB.node,
        });
    }
};

type TCheckPairs = (context: TContext<TRule>, file: string) => void;

const checkPairs: TCheckPairs = (context, file) => {
    for (const [i, entryA] of entries.entries()) {
        for (const entryB of entries.slice(i + 1)) {
            if (isSimilarPair(entryA, entryB)) {
                reportPair(context, file, entryA, entryB);
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
