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

type TStackOp = (stack: Array<number>) => Array<number>;

const push: TStackOp = (stack) => [...stack, 0];

const pop: TStackOp = (stack) => stack.slice(0, -1);

const increment: TStackOp = (stack) => {
    const last: number = stack.length - 1;
    const copy: Array<number> = [...stack];
    copy[last] = copy[last] + 1;
    return copy;
};

type TState = [number, Array<number>];

type TContext = Parameters<TRule["create"]>[0];

type TEnter = (state: TState) => void;

const enter: TEnter = (state) => {
    state[1] = push(state[1]);
};

const exit: TEnter = (state) => {
    state[1] = pop(state[1]);
};

// prettier-ignore
type TReport = (
        ctx: TContext,
        node: TSESTree.Node,
        count: number,
        max: number,
    ) => void;

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

type TCheck = (state: TState, context: TContext, node: TSESTree.Node) => void;

const check: TCheck = (state, context, node) => {
    if (state[1].length > 0) {
        state[1] = increment(state[1]);
        const count: number = state[1][state[1].length - 1];
        if (count > state[0]) {
            report(context, node, count, state[0]);
        }
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
        const state: TState = [context.options[0], []];
        return {
            TSTypeAliasDeclaration: () => enter(state),
            "TSTypeAliasDeclaration:exit": () => exit(state),
            TSTypeLiteral: check.bind(null, state, context),
            TSTupleType: check.bind(null, state, context),
        };
    },
    defaultOptions: [1],
    meta,
});

export default rule;
