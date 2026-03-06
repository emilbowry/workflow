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

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

const MSG: string =
    "Nested function definition. " +
    "Extract to a top-level " +
    "function or use partial " +
    "application: " +
    "(fn, ...p) => () => fn(...p) " +
    "or IIFE (() => (x) => work)()";

const DESC: string =
    "Disallow function definitions " +
    "nested inside other functions " +
    "without a thunk PA boundary.";

type TRule = ESLintUtils.RuleModule<"nestedFunction">;

type TContext = Parameters<TRule["create"]>[0];

type TFunctionNode =
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression;

type TMaybeNode = TSESTree.Node | undefined;

type TFnParamCount = (node: TSESTree.Node) => number;

const fnParamCount: TFnParamCount = (node) => {
    let count: number = -1;
    switch (node.type) {
        case AST_NODE_TYPES.ArrowFunctionExpression:
        case AST_NODE_TYPES.FunctionDeclaration:
        case AST_NODE_TYPES.FunctionExpression:
            count = node.params.length;
            break;
    }
    return count;
};

type TParentIsParameterized = (node: TSESTree.Node) => boolean;

const parentIsParameterized: TParentIsParameterized = (node) => {
    let current: TMaybeNode = node.parent;
    let result: number = -1;
    while (current && result < 0) {
        result = fnParamCount(current);
        current = current.parent;
    }
    return result > 0;
};

type TFunctionPredicate = (node: TFunctionNode) => boolean;

const shouldReport: TFunctionPredicate = (node) =>
    node.params.length > 0 && parentIsParameterized(node);

type TCheckNode = (context: TContext, node: TFunctionNode) => void;

const checkNode: TCheckNode = (context, node) => {
    if (shouldReport(node)) {
        context.report({
            messageId: "nestedFunction",
            node,
        });
    }
};

type THandler = (node: TFunctionNode) => void;

type TMakeHandler = (checkNode: TCheckNode, context: TContext) => THandler;

const makeHandler: TMakeHandler = (checkNode, context) =>
    (
        () => (node: TFunctionNode) =>
            checkNode(context, node)
    )();

type TCreate = TRule["create"];

const create: TCreate = (context) => {
    const handler: THandler = makeHandler(checkNode, context);
    return {
        ArrowFunctionExpression: handler,
        FunctionDeclaration: handler,
        FunctionExpression: handler,
    };
};

type TMeta = TRule["meta"];

const META: TMeta = {
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
