import {
    AST_NODE_TYPES,
    ESLintUtils,
} from "@typescript-eslint/utils";
import type {
    TSESTree,
} from "@typescript-eslint/utils";

type TRecord = Record<string, unknown>;

type TIsRecord =
    (val: unknown) => val is TRecord;

type TPredicate =
    (val: unknown) => boolean;

type TCollect = (
    node: unknown,
    refs: Array<unknown>,
) => void;

type TVisitRecord = (
    node: TRecord,
    refs: Array<unknown>,
) => void;

type THasType = (
    node: TSESTree.TSFunctionType,
) => boolean;

type TCheckAnnotation = (
    ann: TSESTree.TypeNode,
) => boolean;

const SKIP_KEYS: Set<string> = new Set([
    "parent", "loc", "range",
    "start", "end",
]);

const MSG: string =
    "Inline function type must be " +
    "extracted to a named type alias.";

const DESC: string =
    "Require inline TSFunctionType " +
    "annotations to be extracted " +
    "as named type aliases.";

const isRecord: TIsRecord =
    (val): val is TRecord =>
        typeof val === "object" &&
        val !== null &&
        !Array.isArray(val);

const isTSType: TPredicate = (type) =>
    typeof type === "string" &&
    type.startsWith("TS");

const isVisitable: TPredicate = (val) =>
    val !== null &&
    val !== undefined &&
    typeof val === "object";

const visitKeys: TVisitRecord = (
    node,
    refs,
) => {
    for (const key of Object.keys(node)) {
        if (SKIP_KEYS.has(key)) continue;
        const val: unknown = node[key];
        if (isVisitable(val)) {
            collectTypeNodes(val, refs);
        }
    }
};

const collectTypeNodes: TCollect = (
    node,
    refs,
) => {
    if (isRecord(node)) {
        if (isTSType(node["type"])) {
            refs.push(node);
        }
        visitKeys(node, refs);
    } else if (Array.isArray(node)) {
        for (const item of node) {
            collectTypeNodes(item, refs);
        }
    }
};

const hasAnyType: THasType = (
    funcTypeNode,
) => {
    const refs: Array<unknown> = [];
    collectTypeNodes(funcTypeNode, refs);
    return refs.length > 0;
};

const shouldExtract: TCheckAnnotation =
    (ann) =>
        ann.type ===
            AST_NODE_TYPES
                .TSFunctionType &&
        hasAnyType(ann);

type TRule =
    ESLintUtils.RuleModule<"extractType">;

const rule: TRule =
    ESLintUtils.RuleCreator.withoutDocs({
        meta: {
            type: "suggestion",
            docs: { description: DESC },
            schema: [],
            messages: { extractType: MSG },
        },
        create(context) {
            return {
                VariableDeclarator(
                    node,
                ): void {
                    const wrapper:
                        | TSESTree.TSTypeAnnotation
                        | undefined =
                        node.id
                            .typeAnnotation;
                    if (
                        wrapper &&
                        shouldExtract(
                            wrapper
                                .typeAnnotation,
                        )
                    ) {
                        context.report({
                            node: wrapper,
                            messageId:
                                "extractType",
                        });
                    }
                },
            };
        },
    });

export default rule;
