import type { TSESTree } from "@typescript-eslint/utils";

import { ESLintUtils } from "@typescript-eslint/utils";

const MSG: string =
    "Type alias contains " +
    "{{count}} nested type " +
    "constructs, maximum " +
    "allowed is {{max}}. " +
    "Extract to named types.";

const DESC: string =
    "Enforce a maximum number " +
    "of nested type constructs " +
    "(literals and tuples) per " +
    "type alias declaration.";

type TRule = ESLintUtils.RuleModule<"tooDeep", [number]>;

type TStack = Array<number>;

type TStackOp = (stack: TStack) => TStack;

const push: TStackOp = (stack) => [...stack, 0];

const pop: TStackOp = (stack) => stack.slice(0, -1);

const increment: TStackOp = (stack) => {
    const last: number = stack.length - 1;
    const copy: TStack = [...stack];
    copy[last] = copy[last] + 1;
    return copy;
};

type TState = [number, TStack];

type TContext = Parameters<TRule["create"]>[0];

type TEnter = (state: TState) => void;

const enter: TEnter = (state) => {
    state[1] = push(state[1]);
};

const exit: TEnter = (state) => {
    state[1] = pop(state[1]);
};

type TReport = (
    ctx: TContext,
    node: TSESTree.Node,
    count: number,
    max: number,
) => void;

const report: TReport = (ctx, node, count, max) => {
    ctx.report({
        data: {
            count: String(count),
            max: String(max),
        },
        messageId: "tooDeep",
        node,
    });
};

type TCheck = (state: TState, ctx: TContext, node: TSESTree.Node) => void;

const check: TCheck = (state, ctx, node) => {
    if (state[1].length > 0) {
        state[1] = increment(state[1]);
        const last: number = state[1].length - 1;
        const count: number = state[1][last];
        if (count > state[0]) {
            report(ctx, node, count, state[0]);
        }
    }
};

type TNodeHandler = (node: TSESTree.Node) => void;

type TMakeHandler = (
    check: TCheck,
    state: TState,
    ctx: TContext,
) => TNodeHandler;

const makeHandler: TMakeHandler = (check, state, ctx) =>
    (
        () => (node: TSESTree.Node) =>
            check(state, ctx, node)
    )();

type TMeta = TRule["meta"];

const meta: TMeta = {
    docs: {
        description: DESC,
    },
    messages: {
        tooDeep: MSG,
    },
    schema: [
        {
            minimum: 1,
            type: "integer",
        },
    ],
    type: "suggestion",
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create(context) {
        const state: TState = [context.options[0], []];
        const handler: TNodeHandler = makeHandler(check, state, context);
        return {
            TSTypeAliasDeclaration: () => enter(state),
            "TSTypeAliasDeclaration:exit": () => exit(state),
            TSTypeLiteral: handler,
            TSTupleType: handler,
        };
    },
    defaultOptions: [1],
    meta,
});

export default rule;
