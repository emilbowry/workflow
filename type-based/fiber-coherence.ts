import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TContext,
    TCreate,
    THandler,
    TLintMeta,
    TMeta,
} from "./type-based.types";
import type { TTransportGraph } from "./transport-graph";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

import { field, lintMetaToMsg } from "./type-based.types";

import { buildTransportGraph, classifyEdge } from "./transport-graph";

export const LINT_META: TLintMeta = {
    rule: "local/fiber-coherence",
    avoid: field(
        "avoid",
        "Isomorphic edges between " +
            "types with mismatched " +
            "cardinalities — a bijection " +
            "between sets of different " +
            "size is a contradiction",
    ),
    fix: field(
        "fix",
        "Either adjust the types to " +
            "have matching cardinalities " +
            "(same number of variants/" +
            "fields/elements) or reclassify " +
            "the edge as a section",
    ),
    flags: field(
        "flags",
        "Two types connected by an " +
            "isomorphic edge in the " +
            "transport graph that have " +
            "different cardinalities",
    ),
    philosophy: field(
        "philosophy",
        "Structural promises must be " +
            "backed by cardinality " +
            "evidence. An isomorphism " +
            "between a 3-variant union " +
            "and a 5-variant union is a " +
            "proof obligation that cannot " +
            "be satisfied",
    ),
    pitfalls: field(
        "pitfalls",
        "Depends on transport-graph " +
            "exports. Duplicates several " +
            "helpers (TAliasEntry, " +
            "isLiteralType, findConnected, " +
            "etc.) — should extract to " +
            "shared module",
    ),
    related: field(
        "related",
        "transport-graph, " +
            "cardinality-isomorphic-families, " +
            "type-distance",
    ),
};

const MSG: string = lintMetaToMsg(LINT_META) + " Types: {{left}}, {{right}}";

const DESC: string =
    "Ensure fiber members connected " +
    "by isomorphic edges have " +
    "matching cardinalities.";

type TRule = ESLintUtils.RuleModule<"fiberCoherence">;

type TAliasEntry = {
    readonly name: string;
    readonly node: TSESTree.TSTypeAliasDeclaration;
    readonly annotation: TSESTree.TypeNode;
};

type TMakeAliasEntry = (node: TSESTree.TSTypeAliasDeclaration) => TAliasEntry;

const makeAliasEntry: TMakeAliasEntry = (node) => ({
    annotation: node.typeAnnotation,
    name: node.id.name,
    node,
});

type TIsFunctionType = (node: TSESTree.TypeNode) => boolean;

const isFunctionType: TIsFunctionType = (node) =>
    node.type === AST_NODE_TYPES.TSFunctionType;

type TComputeCardinality = (node: TSESTree.TypeNode) => number;

const computeCardinality: TComputeCardinality = (node) =>
    node.type === AST_NODE_TYPES.TSUnionType
        ? node.types.length
        : node.type === AST_NODE_TYPES.TSTypeLiteral
            ? node.members.length
            : node.type === AST_NODE_TYPES.TSTupleType
                ? node.elementTypes.length
                : node.type === AST_NODE_TYPES.TSIntersectionType
                    ? node.types.length
                    : 1;

type TCardinalityMap = ReadonlyMap<string, number>;

type TBuildCardinalityMap = (
    entries: ReadonlyArray<TAliasEntry>,
) => TCardinalityMap;

const buildCardinalityMap: TBuildCardinalityMap = (entries) =>
    new Map(
        entries.map((e) => [e.name, computeCardinality(e.annotation)] as const),
    );

type TFindConnected = (
    start: string,
    adjacency: ReadonlyMap<string, ReadonlyArray<string>>,
) => ReadonlySet<string>;

const findConnected: TFindConnected = (start, adjacency) => {
    const visit: (
        queue: ReadonlyArray<string>,
        visited: ReadonlySet<string>,
    ) => ReadonlySet<string> = (queue, visited) => {
        if (queue.length === 0) {
            return visited;
        }
        const head: string = queue[0];
        const tail: ReadonlyArray<string> = queue.slice(1);
        if (visited.has(head)) {
            return visit(tail, visited);
        }
        const next: ReadonlySet<string> = new Set([...visited, head]);
        const neighbors: ReadonlyArray<string> = adjacency.get(head) ?? [];
        const newQueue: ReadonlyArray<string> = [...tail, ...neighbors];
        return visit(newQueue, next);
    };
    return visit([start], new Set());
};

type TFindComponents = (
    graph: TTransportGraph,
) => ReadonlyArray<ReadonlySet<string>>;

const findComponents: TFindComponents = (graph) =>
    graph.nodes.reduce<ReadonlyArray<ReadonlySet<string>>>((acc, node) => {
        const alreadySeen: boolean = acc.some((cmp) => cmp.has(node));
        if (alreadySeen) {
            return acc;
        }
        const component: ReadonlySet<string> = findConnected(
            node,
            graph.adjacency,
        );
        return [...acc, component];
    }, []);

type TEdge = {
    readonly domain: string;
    readonly codomain: string;
};

type TIsIsoEdge = (
    edge: TEdge,
    fnEntries: ReadonlyArray<TAliasEntry>,
) => boolean;

const isIsoEdge: TIsIsoEdge = (edge, fnEntries) =>
    classifyEdge(edge.domain, edge.codomain, fnEntries) === "isomorphism";

type TMismatch = {
    readonly left: string;
    readonly right: string;
};

type TCollectMismatches = (
    graph: TTransportGraph,
    cardinalities: TCardinalityMap,
    fnEntries: ReadonlyArray<TAliasEntry>,
) => ReadonlyArray<TMismatch>;

const collectMismatches: TCollectMismatches = (
    graph,
    cardinalities,
    fnEntries,
) =>
    graph.edges.reduce<ReadonlyArray<TMismatch>>((acc, edge) => {
        if (!isIsoEdge(edge, fnEntries)) {
            return acc;
        }
        const leftCard: number = cardinalities.get(edge.domain) ?? 1;
        const rightCard: number = cardinalities.get(edge.codomain) ?? 1;
        return leftCard === rightCard
            ? acc
            : [
                ...acc,
                {
                    left: edge.domain,
                    right: edge.codomain,
                },
            ];
    }, []);

type TEntryMap = ReadonlyMap<string, TAliasEntry>;

type TBuildEntryMap = (entries: ReadonlyArray<TAliasEntry>) => TEntryMap;

const buildEntryMap: TBuildEntryMap = (entries) =>
    new Map(entries.map((e) => [e.name, e] as const));

type TIsLiteralType = (node: TSESTree.TypeNode) => boolean;

const isLiteralType: TIsLiteralType = (node) =>
    node.type === AST_NODE_TYPES.TSLiteralType;

type TIsLiteralUnion = (node: TSESTree.TypeNode) => boolean;

const isLiteralUnion: TIsLiteralUnion = (node) =>
    node.type === AST_NODE_TYPES.TSUnionType &&
    node.types.length > 0 &&
    node.types.every(isLiteralType);

type TGetConstraint = (
    param: TSESTree.TSTypeParameter,
) => TSESTree.TypeNode | undefined;

const getConstraint: TGetConstraint = (param) => param.constraint ?? undefined;

type THasFiniteConstraint = (param: TSESTree.TSTypeParameter) => boolean;

const hasFiniteConstraint: THasFiniteConstraint = (param) => {
    const con: TSESTree.TypeNode | undefined = getConstraint(param);
    return con !== undefined && (isLiteralUnion(con) || isLiteralType(con));
};

type TIsConstrainedGeneric = (node: TSESTree.TSTypeAliasDeclaration) => boolean;

const isConstrainedGeneric: TIsConstrainedGeneric = (node) => {
    const params: ReadonlyArray<TSESTree.TSTypeParameter> =
        node.typeParameters?.params ?? [];
    return params.length > 0 && params.every(hasFiniteConstraint);
};

type TIsDiscriminated = (entry: TAliasEntry) => boolean;

const isDiscriminated: TIsDiscriminated = (entry) =>
    isLiteralUnion(entry.annotation) || isConstrainedGeneric(entry.node);

type TReportMismatches = (
    context: TContext<TRule>,
    mismatches: ReadonlyArray<TMismatch>,
    entryMap: TEntryMap,
) => void;

const reportMismatches: TReportMismatches = (context, mismatches, entryMap) => {
    for (const mismatch of mismatches) {
        const entry: TAliasEntry | undefined = entryMap.get(mismatch.left);
        if (entry !== undefined) {
            context.report({
                data: {
                    left: mismatch.left,
                    right: mismatch.right,
                },
                messageId: "fiberCoherence",
                node: entry.node,
            });
        }
    }
};

type TExitHandler = () => void;

type TMakeExitHandler = (
    context: TContext<TRule>,
    aliases: ReadonlyArray<TAliasEntry>,
) => TExitHandler;

const makeExitHandler: TMakeExitHandler = (context, aliases) =>
    (() => () => {
        const discriminated: ReadonlyArray<TAliasEntry> =
            aliases.filter(isDiscriminated);
        const fnEntries: ReadonlyArray<TAliasEntry> = aliases.filter((e) =>
            isFunctionType(e.annotation),
        );
        const graph: TTransportGraph = buildTransportGraph(
            discriminated,
            fnEntries,
        );
        findComponents(graph);
        const cardinalities: TCardinalityMap =
            buildCardinalityMap(discriminated);
        const mismatches: ReadonlyArray<TMismatch> = collectMismatches(
            graph,
            cardinalities,
            fnEntries,
        );
        const entryMap: TEntryMap = buildEntryMap(discriminated);
        reportMismatches(context, mismatches, entryMap);
    })();

const create: TCreate<TRule> = (context) => {
    const aliases: Array<TAliasEntry> = [];
    const aliasHandler: THandler = (
        () => (node: TSESTree.TSTypeAliasDeclaration) => {
            aliases.push(makeAliasEntry(node));
        }
    )();
    const exitHandler: TExitHandler = makeExitHandler(context, aliases);
    return {
        "Program:exit": exitHandler,
        TSTypeAliasDeclaration: aliasHandler,
    };
};

const meta: TMeta<TRule> = {
    docs: { description: DESC },
    messages: {
        fiberCoherence: MSG,
    },
    schema: [],
    type: "suggestion",
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta,
});

export default rule;
