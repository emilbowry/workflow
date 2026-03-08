import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TContext,
    TCreate,
    TLintMeta,
    TMeta,
} from "../type-based/type-based.types";

import { field, lintMetaToMsg } from "../type-based/type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

export const LINT_META: TLintMeta = {
    rule: "local/require-rest-params-tuple",
    avoid: field(
        "avoid",
        "Inline positional parameters " +
            "in type-level function " +
            "signatures. Named individual " +
            "params like (a: A, b: B)",
    ),
    fix: field(
        "fix",
        "Wrap parameters in a named " +
            "tuple type and spread: " +
            "type TArgs = [a: A, b: B]; " +
            "type TFn = (...args: TArgs)" +
            " => R",
    ),
    flags: field(
        "flags",
        "Type-level function signature " +
            "with positional parameters " +
            "instead of rest-params tuple",
    ),
    philosophy: field(
        "philosophy",
        "Every function is an arrow " +
            "A -> B between named types. " +
            "Rest-params tuple makes the " +
            "input a single named product, " +
            "enabling mechanical comparison " +
            "and transport graph edges",
    ),
    pitfalls: field(
        "pitfalls",
        "Zero-param signatures () => R " +
            "are valid and not flagged. " +
            "Currently type-level only — " +
            "runtime signatures commented " +
            "out. Extracting structurally " +
            "identical tuples for different " +
            "functions triggers no-duplicate" +
            "-type-structure — share one " +
            "tuple when param signatures " +
            "match. Inline tuples are " +
            "TSTupleType not TSTypeReference" +
            " — rule rejects them, must " +
            "extract to named type alias. " +
            "Type predicates (node is T) " +
            "incompatible — no named param " +
            "in rest-params form. Delete " +
            "predicate, inline discriminant " +
            "check instead. .bind() typing " +
            "unreliable with rest-params " +
            "tuples — TS may infer any[]. " +
            "Use IIFE thunk instead. " +
            "Single-element tuples are safe" +
            " from no-single-field-type — " +
            "that rule only checks " +
            "TSTypeLiteral not TSTupleType",
    ),
    related: field(
        "related",
        "require-extracted-types, " +
            "transport-graph, " +
            "valid-generics, " +
            "no-duplicate-type-structure, " +
            "no-single-field-type, " +
            "enforce-record-type",
    ),
};

const MSG: string = lintMetaToMsg(LINT_META);

const DESC: string =
    "Require all function signatures " +
    "to use rest-params tuple form " +
    "with a named tuple type.";

type TRule = ESLintUtils.RuleModule<"nonTupleParams">;

type TFunctionNode =
    // | TSESTree.ArrowFunctionExpression
    // | TSESTree.FunctionDeclaration
    // | TSESTree.FunctionExpression
    TSESTree.TSFunctionType | TSESTree.TSCallSignatureDeclaration;

type TFunctionNodeArgs = [node: TFunctionNode];
type TIsValidSignature = (...args: TFunctionNodeArgs) => boolean;

const isValidSignature: TIsValidSignature = (node) =>
    node.params.length === 0 ||
    (node.params.length === 1 &&
        node.params[0].type === AST_NODE_TYPES.RestElement &&
        node.params[0].typeAnnotation?.typeAnnotation.type ===
            AST_NODE_TYPES.TSTypeReference);

type TCheckNodeArgs = [context: TContext<TRule>, node: TFunctionNode];
type TCheckNode = (...args: TCheckNodeArgs) => void;

const checkNode: TCheckNode = (context, node) => {
    if (!isValidSignature(node)) {
        context.report({
            messageId: "nonTupleParams",
            node,
        });
    }
};

type THandler = (...args: TFunctionNodeArgs) => void;

const create: TCreate<TRule> = (context) => {
    const handler: THandler = (
        () => (node: TFunctionNode) =>
            checkNode(context, node)
    )();
    return {
        // ArrowFunctionExpression: handler,
        // FunctionDeclaration: handler,
        // FunctionExpression: handler,
        TSCallSignatureDeclaration: handler,
        TSFunctionType: handler,
    };
};

const META: TMeta<TRule> = {
    docs: { description: DESC },
    messages: { nonTupleParams: MSG },
    schema: [],
    type: "suggestion",
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta: META,
});

export default rule;
