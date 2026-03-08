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
        "Discriminated types (literal " +
        "unions or constrained generics) " +
        "that exist without any function " +
        "signature connecting them",
    fix:
        "Define a function type that " +
        "uses the isolated type as " +
        "domain or codomain: " +
        "type TFn = (x: TIsolated)" +
        " => TTarget",
    flags:
        "Discriminated type with no " +
        "edges in the transport graph " +
        "— not used as domain or " +
        "codomain of any function " +
        "signature",
    philosophy:
        "Types are nodes, functions " +
        "are edges. The type graph " +
        "must be connected — every " +
        "type participates in the " +
        "computation graph. Isolated " +
        "nodes are dead types",
    pitfalls:
        "Only checks within a single " +
        "file. Exports buildTransport" +
        "Graph and classifyEdge for " +
        "fiber-coherence. Uses " +
        "as const assertions " +
        "(currently banned)",
    related:
        "fiber-coherence, " +
        "require-rest-params-tuple, " +
        "require-extracted-function-type",
};

const MSG: string =
    lintMetaToMsg(LINT_META)
    + " Type: {{name}}";

const DESC: string =
    "Ensure all discriminated " +
    "types participate in the " +
    "transport graph via " +
    "function signatures.";

type TRule = ESLintUtils.RuleModule<
    "disconnectedType"
>;

type TEdgeCardinality =
    | "isomorphism"
    | "retraction"
    | "section";

type TEdge = {
    readonly cardinality: TEdgeCardinality;
    readonly domain: string;
    readonly codomain: string;
};

export type TTransportGraph = {
    readonly nodes: ReadonlyArray<string>;
    readonly edges: ReadonlyArray<TEdge>;
    readonly adjacency: ReadonlyMap<
        string,
        ReadonlyArray<string>
    >;
};

type TAliasEntry = {
    readonly name: string;
    readonly node: TSESTree.TSTypeAliasDeclaration;
    readonly annotation: TSESTree.TypeNode;
};

type TTypeName = TSESTree.TSTypeReference["typeName"];

type TTypeNameStr = (t: TTypeName) => string;

const typeNameStr: TTypeNameStr = (t) =>
    t.type === AST_NODE_TYPES.Identifier
        ? t.name
        : "";

type TIsLiteralType = (
    node: TSESTree.TypeNode,
) => boolean;

const isLiteralType: TIsLiteralType = (node) =>
    node.type === AST_NODE_TYPES.TSLiteralType;

type TIsLiteralUnion = (
    node: TSESTree.TypeNode,
) => boolean;

const isLiteralUnion: TIsLiteralUnion = (node) =>
    node.type === AST_NODE_TYPES.TSUnionType &&
    node.types.length > 0 &&
    node.types.every(isLiteralType);

type TGetConstraint = (
    param: TSESTree.TSTypeParameter,
) => TSESTree.TypeNode | undefined;

const getConstraint: TGetConstraint = (param) =>
    param.constraint ?? undefined;

type THasFiniteConstraint = (
    param: TSESTree.TSTypeParameter,
) => boolean;

const hasFiniteConstraint: THasFiniteConstraint =
    (param) => {
        const c: TSESTree.TypeNode | undefined =
            getConstraint(param);
        return c !== undefined && (
            isLiteralUnion(c) ||
            isLiteralType(c)
        );
    };

type TIsConstrainedGeneric = (
    node: TSESTree.TSTypeAliasDeclaration,
) => boolean;

const isConstrainedGeneric: TIsConstrainedGeneric =
    (node) => {
        const params: ReadonlyArray<
            TSESTree.TSTypeParameter
        > = node.typeParameters?.params ?? [];
        return params.length > 0 &&
            params.every(hasFiniteConstraint);
    };

type TIsDiscriminated = (
    entry: TAliasEntry,
) => boolean;

const isDiscriminated: TIsDiscriminated =
    (entry) =>
        isLiteralUnion(entry.annotation) ||
        isConstrainedGeneric(entry.node);

type TExtractDomain = (
    node: TSESTree.TSFunctionType,
) => string | undefined;

const extractParamRef: TExtractDomain = (node) => {
    const first: TSESTree.Parameter | undefined =
        node.params[0];
    if (first === undefined) {
        return undefined;
    }
    if (first.type !== AST_NODE_TYPES.Identifier) {
        return undefined;
    }
    const ann: TSESTree.TSTypeAnnotation | undefined =
        first.typeAnnotation;
    if (ann === undefined) {
        return undefined;
    }
    const t: TSESTree.TypeNode = ann.typeAnnotation;
    return t.type === AST_NODE_TYPES.TSTypeReference
        ? typeNameStr(t.typeName)
        : undefined;
};

type TExtractCodomain = (
    node: TSESTree.TSFunctionType,
) => string | undefined;

const extractCodomain: TExtractCodomain = (node) => {
    const ret: TSESTree.TSTypeAnnotation | undefined =
        node.returnType;
    if (ret === undefined) {
        return undefined;
    }
    const t: TSESTree.TypeNode = ret.typeAnnotation;
    return t.type === AST_NODE_TYPES.TSTypeReference
        ? typeNameStr(t.typeName)
        : undefined;
};

type TIsFunctionType = (
    node: TSESTree.TypeNode,
) => node is TSESTree.TSFunctionType;

const isFunctionType: TIsFunctionType = (
    node,
): node is TSESTree.TSFunctionType =>
    node.type === AST_NODE_TYPES.TSFunctionType;

type TClassifyCardinality = (
    domain: string,
    codomain: string,
    fnEntries: ReadonlyArray<TAliasEntry>,
) => TEdgeCardinality;

const hasReverse: (
    domain: string,
    codomain: string,
    fnEntries: ReadonlyArray<TAliasEntry>,
) => boolean = (domain, codomain, fnEntries) =>
    fnEntries.some((e) => {
        if (!isFunctionType(e.annotation)) {
            return false;
        }
        const d: string | undefined =
            extractParamRef(e.annotation);
        const c: string | undefined =
            extractCodomain(e.annotation);
        return d === codomain && c === domain;
    });

export const classifyEdge: TClassifyCardinality =
    (domain, codomain, fnEntries) =>
        domain === codomain
            ? "isomorphism"
            : hasReverse(
                domain,
                codomain,
                fnEntries,
            )
                ? "isomorphism"
                : "section";

type TCollectEdges = (
    nodeNames: ReadonlySet<string>,
    fnEntries: ReadonlyArray<TAliasEntry>,
) => ReadonlyArray<TEdge>;

const collectEdges: TCollectEdges =
    (nodeNames, fnEntries) =>
        fnEntries.reduce<ReadonlyArray<TEdge>>(
            (acc, entry) => {
                if (!isFunctionType(entry.annotation)) {
                    return acc;
                }
                const d: string | undefined =
                    extractParamRef(entry.annotation);
                const c: string | undefined =
                    extractCodomain(entry.annotation);
                if (
                    d === undefined ||
                    c === undefined
                ) {
                    return acc;
                }
                if (
                    !nodeNames.has(d) ||
                    !nodeNames.has(c)
                ) {
                    return acc;
                }
                const edge: TEdge = {
                    cardinality: classifyEdge(
                        d,
                        c,
                        fnEntries,
                    ),
                    codomain: c,
                    domain: d,
                };
                return [...acc, edge];
            },
            [],
        );

type TBuildAdjacency = (
    nodes: ReadonlyArray<string>,
    edges: ReadonlyArray<TEdge>,
) => ReadonlyMap<string, ReadonlyArray<string>>;

const buildAdjacency: TBuildAdjacency =
    (nodes, edges) => {
        const base: ReadonlyArray<
            readonly [string, ReadonlyArray<string>]
        > = nodes.map(
            (n) => [n, []] as const,
        );
        const initial: Map<
            string,
            ReadonlyArray<string>
        > = new Map(base);
        return edges.reduce(
            (acc, edge) => {
                const existing: ReadonlyArray<
                    string
                > = acc.get(edge.domain) ?? [];
                const updated: Map<
                    string,
                    ReadonlyArray<string>
                > = new Map(acc);
                updated.set(
                    edge.domain,
                    [...existing, edge.codomain],
                );
                const revExisting: ReadonlyArray<
                    string
                > = updated.get(edge.codomain) ?? [];
                updated.set(
                    edge.codomain,
                    [...revExisting, edge.domain],
                );
                return updated;
            },
            initial,
        );
    };

export const buildTransportGraph: (
    discriminated: ReadonlyArray<TAliasEntry>,
    fnEntries: ReadonlyArray<TAliasEntry>,
) => TTransportGraph =
    (discriminated, fnEntries) => {
        const nodes: ReadonlyArray<string> =
            discriminated.map((e) => e.name);
        const nodeNames: ReadonlySet<string> =
            new Set(nodes);
        const edges: ReadonlyArray<TEdge> =
            collectEdges(nodeNames, fnEntries);
        const adjacency: ReadonlyMap<
            string,
            ReadonlyArray<string>
        > = buildAdjacency(nodes, edges);
        return { adjacency, edges, nodes };
    };

type TFindConnected = (
    start: string,
    adjacency: ReadonlyMap<
        string,
        ReadonlyArray<string>
    >,
) => ReadonlySet<string>;

const findConnected: TFindConnected =
    (start, adjacency) => {
        const visit: (
            queue: ReadonlyArray<string>,
            visited: ReadonlySet<string>,
        ) => ReadonlySet<string> =
            (queue, visited) => {
                if (queue.length === 0) {
                    return visited;
                }
                const [head, ...tail]:
                    readonly [
                        string,
                        ...ReadonlyArray<string>,
                    ] = queue as [
                        string,
                        ...ReadonlyArray<string>,
                    ];
                if (visited.has(head)) {
                    return visit(tail, visited);
                }
                const next: ReadonlySet<string> =
                    new Set([...visited, head]);
                const neighbors: ReadonlyArray<
                    string
                > = adjacency.get(head) ?? [];
                const newQueue: ReadonlyArray<
                    string
                > = [...tail, ...neighbors];
                return visit(newQueue, next);
            };
        return visit([start], new Set());
    };

type TFindComponents = (
    graph: TTransportGraph,
) => ReadonlyArray<ReadonlySet<string>>;

const findComponents: TFindComponents =
    (graph) =>
        graph.nodes.reduce<
            ReadonlyArray<ReadonlySet<string>>
        >(
            (acc, node) => {
                const alreadySeen: boolean =
                    acc.some((c) => c.has(node));
                if (alreadySeen) {
                    return acc;
                }
                const component: ReadonlySet<
                    string
                > = findConnected(
                    node,
                    graph.adjacency,
                );
                return [...acc, component];
            },
            [],
        );

type TIsIsolated = (
    node: string,
    graph: TTransportGraph,
) => boolean;

const isIsolated: TIsIsolated = (node, graph) => {
    const neighbors: ReadonlyArray<string> =
        graph.adjacency.get(node) ?? [];
    return neighbors.length === 0;
};

type TEntryMap = ReadonlyMap<
    string,
    TAliasEntry
>;

type TBuildEntryMap = (
    entries: ReadonlyArray<TAliasEntry>,
) => TEntryMap;

const buildEntryMap: TBuildEntryMap = (entries) =>
    new Map(entries.map((e) => [e.name, e]));

type TReportIsolated = (
    context: TContext<TRule>,
    graph: TTransportGraph,
    entryMap: TEntryMap,
) => void;

const reportIsolated: TReportIsolated =
    (context, graph, entryMap) => {
        const isolated: ReadonlyArray<string> =
            graph.nodes.filter(
                (n) => isIsolated(n, graph),
            );
        for (const name of isolated) {
            const entry: TAliasEntry | undefined =
                entryMap.get(name);
            if (entry !== undefined) {
                context.report({
                    data: { name },
                    messageId: "disconnectedType",
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

const makeExitHandler: TMakeExitHandler =
    (context, aliases) =>
        (
            () => () => {
                const discriminated: ReadonlyArray<
                    TAliasEntry
                > = aliases.filter(isDiscriminated);
                const fnEntries: ReadonlyArray<
                    TAliasEntry
                > = aliases.filter(
                    (e) => isFunctionType(e.annotation),
                );
                const graph: TTransportGraph =
                    buildTransportGraph(
                        discriminated,
                        fnEntries,
                    );
                const entryMap: TEntryMap =
                    buildEntryMap(discriminated);
                findComponents(graph);
                reportIsolated(
                    context,
                    graph,
                    entryMap,
                );
            }
        )();

type TMakeAliasEntry = (
    node: TSESTree.TSTypeAliasDeclaration,
) => TAliasEntry;

const makeAliasEntry: TMakeAliasEntry = (node) => ({
    annotation: node.typeAnnotation,
    name: node.id.name,
    node,
});

const create: TCreate<TRule> = (context) => {
    const aliases: Array<TAliasEntry> = [];
    const aliasHandler: THandler = (
        () => (
            node: TSESTree.TSTypeAliasDeclaration,
        ) => {
            aliases.push(makeAliasEntry(node));
        }
    )();
    const exitHandler: TExitHandler =
        makeExitHandler(context, aliases);
    return {
        "Program:exit": exitHandler,
        TSTypeAliasDeclaration: aliasHandler,
    };
};

const meta: TMeta<TRule> = {
    docs: { description: DESC },
    messages: {
        disconnectedType: MSG,
    },
    schema: [],
    type: "suggestion",
};

const rule: TRule =
    ESLintUtils.RuleCreator.withoutDocs({
        create,
        meta,
    });

export default rule;
