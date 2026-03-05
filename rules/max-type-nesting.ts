import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";

const MSG: string =
    "Type alias contains " +
    "{{count}} type literals, " +
    "maximum allowed is " +
    "{{max}}. Extract to " +
    "named types.";

const DESC: string =
    "Enforce a maximum number " +
    "of type literals per " +
    "type alias declaration.";

type TRule = ESLintUtils.RuleModule<"tooDeep", [number]>;

type TStackOp = {
    (stack: Array<number>): Array<number>;
};

const push: TStackOp = (stack) => [...stack, 0];

const pop: TStackOp = (stack) => stack.slice(0, -1);

const increment: TStackOp = (stack) => {
    const last: number = stack.length - 1;
    const copy: Array<number> = [...stack];
    copy[last] = copy[last] + 1;
    return copy;
};

type TState = {
    max: number;
    stack: Array<number>;
};

type TContext = Parameters<TRule["create"]>[0];

type TEnter = {
    (state: TState): void;
};

const enter: TEnter = (state) => {
    state.stack = push(state.stack);
};

const exit: TEnter = (state) => {
    state.stack = pop(state.stack);
};

type TReport = {
    (context: TContext, node: TSESTree.Node, count: number, max: number): void;
};

const report: TReport = (context, node, count, max) => {
    context.report({
        data: {
            count: String(count),
            max: String(max),
        },
        messageId: "tooDeep",
        node,
    });
};

type TCheck = {
    (state: TState, context: TContext, node: TSESTree.Node): void;
};

const check: TCheck = (state, context, node) => {
    if (state.stack.length === 0) {
        return;
    }
    state.stack = increment(state.stack);
    const count: number = state.stack[state.stack.length - 1];
    if (count > state.max) {
        report(context, node, count, state.max);
    }
};

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
        const state: TState = {
            max: context.options[0],
            stack: [],
        };
        return {
            TSTypeAliasDeclaration: () => enter(state),
            "TSTypeAliasDeclaration:exit": () => exit(state),
            TSTypeLiteral: (node) => check(state, context, node),
        };
    },
    defaultOptions: [1],
    meta,
});

export default rule;
