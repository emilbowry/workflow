import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TContext,
    TCreate,
    THandler,
    TMeta,
} from "./type-based.types";

import {
    AST_NODE_TYPES,
    ESLintUtils,
} from "@typescript-eslint/utils";

const MSG: string =
    "Generic types '{{first}}' and " +
    "'{{second}}' are cardinality-" +
    "isomorphic over their shared " +
    "domain and may be unifiable.";

const DESC: string =
    "Detect generic type families " +
    "over the same finite domain " +
    "whose fibers are pointwise " +
    "cardinality-equal.";

type TRule = ESLintUtils.RuleModule<
    "isomorphicFamilies"
>;

type TEntry = readonly [
    string,
    string,
    string,
    ReadonlyArray<number>,
    TSESTree.TSTypeAliasDeclaration,
];

type TCollected = Array<TEntry>;

type TConstraintKey = (
    param: TSESTree.TSTypeParameter,
) => string;

type TCanonicalConstraint = (
    node: TSESTree.TypeNode,
) => string;

const canonicalConstraint: TCanonicalConstraint =
    (node) =>
        node.type ===
            AST_NODE_TYPES.TSTypeReference &&
        node.typeName.type ===
            AST_NODE_TYPES.Identifier
            ? node.typeName.name
            : node.type;

const constraintKey: TConstraintKey = (param) =>
    param.constraint
        ? canonicalConstraint(param.constraint)
        : "";

type TCountCardinality = (
    node: TSESTree.TypeNode,
) => number;

const countUnionMembers: TCountCardinality =
    (node) =>
        node.type === AST_NODE_TYPES.TSUnionType
            ? node.types.length
            : 0;

const countRecordFields: TCountCardinality =
    (node) =>
        node.type ===
        AST_NODE_TYPES.TSTypeLiteral
            ? node.members.length
            : 0;

const countTupleElements: TCountCardinality =
    (node) =>
        node.type === AST_NODE_TYPES.TSTupleType
            ? node.elementTypes.length
            : 0;

type TBodyCardinality = (
    body: TSESTree.TypeNode,
) => ReadonlyArray<number>;

const bodyCardinality: TBodyCardinality =
    (body) => [
        countUnionMembers(body),
        countRecordFields(body),
        countTupleElements(body),
    ];

type TProfileKey = (
    profile: ReadonlyArray<number>,
) => string;

const SEP: string = ":";

const profileKey: TProfileKey = (profile) =>
    profile.join(SEP);

type THasTypeParams = (
    node: TSESTree.TSTypeAliasDeclaration,
) => boolean;

const hasTypeParams: THasTypeParams = (node) =>
    node.typeParameters !== undefined &&
    node.typeParameters.params.length > 0;

type TGetConstraintGroup = (
    node: TSESTree.TSTypeAliasDeclaration,
) => string;

const getConstraintGroup: TGetConstraintGroup =
    (node) =>
        hasTypeParams(node)
            ? constraintKey(
                  node.typeParameters!.params[0],
              )
            : "";

type TGroupMap = Map<string, Array<TEntry>>;

type TBuildGroups = (
    items: TCollected,
) => TGroupMap;

const buildGroups: TBuildGroups = (items) => {
    const groups: TGroupMap = new Map();
    for (const entry of items) {
        const key: string = entry[2];
        const existing:
            | Array<TEntry>
            | undefined = groups.get(key);
        if (existing) {
            existing.push(entry);
        } else {
            groups.set(key, [entry]);
        }
    }
    return groups;
};

type TPair = readonly [TEntry, TEntry];

type TFindPairs = (
    entries: ReadonlyArray<TEntry>,
) => ReadonlyArray<TPair>;

const findIsomorphicPairs: TFindPairs =
    (entries) => {
        const pairs: Array<TPair> = [];
        for (const [i, a] of entries.entries()) {
            for (const b of entries.slice(i + 1)) {
                const kA: string =
                    profileKey(a[3]);
                const kB: string =
                    profileKey(b[3]);
                if (kA === kB) {
                    pairs.push([a, b]);
                }
            }
        }
        return pairs;
    };

type TReportPair = (
    context: TContext<TRule>,
    file: string,
    pair: TPair,
) => void;

const reportPair: TReportPair = (
    context,
    file,
    pair,
) => {
    const firstName: string = pair[0][1];
    const secondName: string = pair[1][1];
    if (pair[0][0] === file) {
        context.report({
            data: {
                first: firstName,
                second: secondName,
            },
            messageId: "isomorphicFamilies",
            node: pair[0][4],
        });
    }
    if (pair[1][0] === file) {
        context.report({
            data: {
                first: firstName,
                second: secondName,
            },
            messageId: "isomorphicFamilies",
            node: pair[1][4],
        });
    }
};

type TReportGroups = (
    context: TContext<TRule>,
    file: string,
    groups: TGroupMap,
) => void;

const reportGroups: TReportGroups = (
    context,
    file,
    groups,
) => {
    for (const entries of groups.values()) {
        if (entries.length < 2) {
            continue;
        }
        const pairs: ReadonlyArray<TPair> =
            findIsomorphicPairs(entries);
        for (const pair of pairs) {
            reportPair(context, file, pair);
        }
    }
};

const collected: TCollected = [];

type TExitHandler = () => void;

type TMakeExitHandler = (
    context: TContext<TRule>,
    file: string,
) => TExitHandler;

const makeExitHandler: TMakeExitHandler = (
    context,
    file,
) =>
    (
        () => () => {
            const groups: TGroupMap =
                buildGroups(collected);
            reportGroups(
                context,
                file,
                groups,
            );
        }
    )();

type TRecordGeneric = (
    file: string,
    node: TSESTree.TSTypeAliasDeclaration,
) => void;

const recordGeneric: TRecordGeneric = (
    file,
    node,
) => {
    if (!hasTypeParams(node)) {
        return;
    }
    const name: string = node.id.name;
    const group: string =
        getConstraintGroup(node);
    const profile: ReadonlyArray<number> =
        bodyCardinality(node.typeAnnotation);
    const entry: TEntry =
        [file, name, group, profile, node];
    collected.push(entry);
};

type TMakeAliasHandler = (
    file: string,
) => THandler;

const makeAliasHandler: TMakeAliasHandler =
    (file) =>
        (
            () => (
                node: TSESTree.TSTypeAliasDeclaration,
            ) =>
                recordGeneric(file, node)
        )();

type TEntryPredicate = (e: TEntry) => boolean;

type TMakeFileFilter = (
    file: string,
) => TEntryPredicate;

const makeFileFilter: TMakeFileFilter = (file) =>
    (
        () => (e: TEntry) =>
            e[0] !== file
    )();

type TClearFile = (file: string) => void;

const clearFile: TClearFile = (file) => {
    const keep: TEntryPredicate =
        makeFileFilter(file);
    const kept: TCollected =
        collected.filter(keep);
    collected.length = 0;
    for (const entry of kept) {
        collected.push(entry);
    }
};

const create: TCreate<TRule> = (context) => {
    const file: string = context.filename;
    clearFile(file);
    const exitHandler: TExitHandler =
        makeExitHandler(context, file);
    const aliasHandler: THandler =
        makeAliasHandler(file);
    return {
        "Program:exit": exitHandler,
        TSTypeAliasDeclaration: aliasHandler,
    };
};

const meta: TMeta<TRule> = {
    docs: { description: DESC },
    messages: { isomorphicFamilies: MSG },
    schema: [],
    type: "suggestion",
};

const rule: TRule =
    ESLintUtils.RuleCreator.withoutDocs({
        create,
        meta,
    });

export default rule;
