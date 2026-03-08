import type { TSESTree } from "@typescript-eslint/utils";
import type { TRule } from "../rules/max-total-depth";
import type {
    TContext,
    TMeta,
    TNodeHandler,
    TLintMeta,
    TReportFn,
} from "./type-based.types";

import { ESLintUtils } from "@typescript-eslint/utils";

export const LINT_META: TLintMeta = {
    flags:
        "More than 1 nested type " +
        "construct (TSTypeLiteral or " +
        "TSTupleType) in a type alias",
    fix:
        "Extract inner type literals " +
        "and tuples into named type " +
        "aliases",
    pitfalls:
        "Counts occurrences, not " +
        "depth. Two sibling type " +
        "literals at the same level " +
        "both increment the counter",
    avoid:
        "Inline anonymous type " +
        "structures within type " +
        "aliases",
    related:
        "require-extracted-types, " +
        "no-duplicate-type-structure," +
        " no-single-field-type",
    philosophy:
        "Flat named types are " +
        "independently comparable, " +
        "composable, and visible as " +
        "nodes in the type graph. " +
        "Inline structures are " +
        "invisible to structural " +
        "comparison",
};

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

type TStack = Array<number>; // a little insane, what caused this

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

type TEnter = (state: TState) => void;

const enter: TEnter = (state) => {
    state[1] = push(state[1]);
};

const exit: TEnter = (state) => {
    state[1] = pop(state[1]);
};

const report: TReportFn<TRule> = (ctx, node, count, max) => {
    ctx.report({
        data: {
            count: String(count),
            max: String(max),
        },
        messageId: "tooDeep",
        node,
    });
};

type TCheck = (
    state: TState,
    ctx: TContext<TRule>,
    node: TSESTree.Node,
) => void;

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

type TMakeHandler = (
    check: TCheck,
    state: TState,
    ctx: TContext<TRule>,
) => TNodeHandler;

const makeHandler: TMakeHandler = (check, state, ctx) =>
    (
        () => (node: TSESTree.Node) =>
            check(state, ctx, node)
    )();

const meta: TMeta<TRule> = {
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
