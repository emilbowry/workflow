/*
    The only valid nested function shape is trivial
    partial application:

    const fn = (otherFn, ...params) => () => otherFn(...params);

    Since T is unconstrained, otherFn(...params) can itself
    be B → C, so () → (B → C) ≅ B → C by the unit
    isomorphism. The thunk form is therefore fully general.

    This rule flags a parameterized function only when its
    nearest enclosing function is also parameterized. A
    thunk layer between them is a valid PA boundary.
    An IIFE thunk collapses by 1 → T ≅ T.

    const collapse =
    <A extends unknown[], R>( f: (...args: A) => () => R ):
        (...args: A) => R => (...args) => f(...args)();
*/

import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TContext,
    TCreate,
    TLintMeta,
    TMeta,
} from "../type-based/type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

import { lintMetaToMsg } from "../type-based/type-based.types";

export const LINT_META: TLintMeta = {
    avoid:
        "Closures that capture mutable " +
        "outer scope. Nested arrow " +
        "chains beyond the PA boundary",
    fix:
        "Three solutions: (1) Extract " +
        "inner function to module " +
        "scope with explicit " +
        "parameters, (2) Nullary PA: " +
        "(fn, ...params) => () => " +
        "fn(...params), (3) IIFE " +
        "thunk: (() => (node) => " +
        "work)()",
    flags:
        "Parameterized function " +
        "defined inside another " +
        "parameterized function",
    philosophy:
        "Lambda lifting makes all " +
        "dependencies explicit " +
        "parameters in the type " +
        "signature. No hidden " +
        "wiring — the signature IS " +
        "the specification of what " +
        "the function touches",
    pitfalls:
        "Object literal method " +
        "shorthands are NOT exempt " +
        "— ESLint create() handler " +
        "methods close over context " +
        "and trigger the rule. The " +
        "makeHandler(fn, ctx)() " +
        "anti-pattern is a no-op " +
        "(1 -> T ≅ T) — put the " +
        "IIFE inside makeHandler " +
        "instead",
    related:
        "max-lines-per-function, " +
        "func-style, " +
        "prefer-arrow-callback",
};

const MSG: string = lintMetaToMsg(LINT_META);

const DESC: string =
    "Disallow function definitions " +
    "nested inside other functions " +
    "without a thunk PA boundary.";

type TRule = ESLintUtils.RuleModule<"nestedFunction">;

type TFunctionNode =
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression;

type TMaybeNode = TSESTree.Node | undefined;

type TFnParamCount = (node: TSESTree.Node) => number;

const fnParamCount: TFnParamCount = (node) =>
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.FunctionDeclaration ||
    node.type === AST_NODE_TYPES.FunctionExpression
        ? node.params.length
        : -1;

type TParentIsParameterized = (node: TSESTree.Node) => boolean;

type TFindParentParamCount = (node: TMaybeNode) => number;

const findParentParamCount: TFindParentParamCount = (node) =>
    !node
        ? -1
        : fnParamCount(node) >= 0
            ? fnParamCount(node)
            : findParentParamCount(node.parent);

const parentIsParameterized: TParentIsParameterized = (node) =>
    findParentParamCount(node.parent) > 0;

type TFunctionPredicate = (node: TFunctionNode) => boolean;

const shouldReport: TFunctionPredicate = (node) =>
    node.params.length > 0 && parentIsParameterized(node);

type TCheckNode = (
    context: TContext<TRule>,
    node: TFunctionNode,
) => void;

const checkNode: TCheckNode = (context, node) => {
    if (shouldReport(node)) {
        context.report({
            messageId: "nestedFunction",
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
    const handler: THandler = makeHandler(checkNode, context);
    return {
        ArrowFunctionExpression: handler,
        FunctionDeclaration: handler,
        FunctionExpression: handler,
    };
};

const META: TMeta<TRule> = {
    docs: { description: DESC },
    messages: { nestedFunction: MSG },
    schema: [],
    type: "suggestion",
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta: META,
});

export default rule;
