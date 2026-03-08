import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TContext,
    TCreate,
    TLintMeta,
    TMeta,
} from "../type-based/type-based.types";

import { lintMetaToMsg } from "../type-based/type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

export const LINT_META: TLintMeta = {
    avoid:
        "Inline positional parameters " +
        "in type-level function " +
        "signatures. Named individual " +
        "params like (a: A, b: B)",
    fix:
        "Wrap parameters in a named " +
        "tuple type and spread: " +
        "type TArgs = [a: A, b: B]; " +
        "type TFn = (...args: TArgs)" +
        " => R",
    flags:
        "Type-level function signature " +
        "with positional parameters " +
        "instead of rest-params tuple",
    philosophy:
        "Every function is an arrow " +
        "A -> B between named types. " +
        "Rest-params tuple makes the " +
        "input a single named product, " +
        "enabling mechanical comparison " +
        "and transport graph edges",
    pitfalls:
        "Zero-param signatures () => R " +
        "are valid and not flagged. " +
        "Currently type-level only — " +
        "runtime signatures commented out",
    related:
        "require-extracted-types, " +
        "transport-graph, " +
        "valid-generics",
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
    | TSESTree.TSFunctionType
    | TSESTree.TSCallSignatureDeclaration;

type TIsRestWithTypeRef = (
    param: TSESTree.Parameter,
) => boolean;

const isRestWithTypeRef: TIsRestWithTypeRef = (param) =>
    param.type === AST_NODE_TYPES.RestElement &&
    param.typeAnnotation?.typeAnnotation.type ===
        AST_NODE_TYPES.TSTypeReference;

type TIsValidSignature = (
    node: TFunctionNode,
) => boolean;

const isValidSignature: TIsValidSignature = (node) =>
    node.params.length === 0 ||
    (
        node.params.length === 1 &&
        isRestWithTypeRef(node.params[0])
    );

type TCheckNode = (
    context: TContext<TRule>,
    node: TFunctionNode,
) => void;

const checkNode: TCheckNode = (context, node) => {
    if (!isValidSignature(node)) {
        context.report({
            messageId: "nonTupleParams",
            node,
        });
    }
};

type THandler = (node: TFunctionNode) => void;

type TMakeHandler = (
    checkNode: TCheckNode,
    context: TContext<TRule>,
) => THandler;

const makeHandler: TMakeHandler = (checkNode, context) =>
    (
        () => (node: TFunctionNode) =>
            checkNode(context, node)
    )();

const create: TCreate<TRule> = (context) => {
    const handler: THandler =
        makeHandler(checkNode, context);
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
