import type { TSESTree } from "@typescript-eslint/utils";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

const MSG: string =
    "Function has {{count}} return " +
    "statements. Maximum allowed " +
    "is {{max}}.";

const DESC: string = "Enforce a maximum number " + "of return statements.";

const EARLY_MSG: string =
    "Early return statement. " +
    "Return only at the end " +
    "of the function body.";

type TRule = ESLintUtils.RuleModule<"earlyReturn" | "tooManyReturns", [number]>;

type TContext = Parameters<TRule["create"]>[0];

type TStackOp = (stack: Array<number>) => void;

const increment: TStackOp = (stack) => {
    if (stack.length === 0) {
        return;
    }
    stack[stack.length - 1]++;
};

const push: TStackOp = (stack) => {
    stack.push(0);
};

type TMaybeCount = number | undefined;

type TReportTuple = readonly [string, string];

type TMakeData = (count: number, max: number) => TReportTuple;

const makeData: TMakeData = (count, max) =>
    [String(count), String(max)] as const;

type TReportIfExceeded = (
    context: TContext,
    node: TSESTree.Node,
    count: number,
    max: number,
) => void;

const reportIfExceeded: TReportIfExceeded = (context, node, count, max) => {
    if (count <= max) {
        return;
    }
    const reportData: TReportTuple = makeData(count, max);
    context.report({
        data: { count: reportData[0], max: reportData[1] },
        messageId: "tooManyReturns",
        node,
    });
};

type TPop = (
    stack: Array<number>,
    context: TContext,
    node: TSESTree.Node,
    max: number,
) => void;

const pop: TPop = (stack, context, node, max) => {
    const count: TMaybeCount = stack.pop();
    if (count === undefined) {
        return;
    }
    reportIfExceeded(context, node, count, max);
};

type TNodeHandler = (node: TSESTree.Node) => void;

type TFunctionNodeTypes = Set<string>;

const FUNCTION_TYPES: TFunctionNodeTypes = new Set([
    AST_NODE_TYPES.ArrowFunctionExpression,
    AST_NODE_TYPES.FunctionDeclaration,
    AST_NODE_TYPES.FunctionExpression,
]);

type TIsFinalReturn = (node: TSESTree.ReturnStatement) => boolean;

const isFinalReturn: TIsFinalReturn = (node) => {
    const parent: TSESTree.Node = node.parent;
    if (parent.type !== AST_NODE_TYPES.BlockStatement) {
        return false;
    }
    if (!FUNCTION_TYPES.has(parent.parent.type)) {
        return false;
    }
    return parent.body[parent.body.length - 1] === node;
};

type TReportEarly = (context: TContext, node: TSESTree.ReturnStatement) => void;

const reportEarlyReturn: TReportEarly = (context, node) => {
    if (isFinalReturn(node)) {
        return;
    }
    context.report({
        messageId: "earlyReturn",
        node,
    });
};

type TReturnHandler = (node: TSESTree.ReturnStatement) => void;

type TCreate = TRule["create"];

const create: TCreate = (context) => {
    const max: number = context.options[0];
    const stack: Array<number> = [];

    const onEnter: TNodeHandler = () => push(stack);

    const onExit: TNodeHandler = (node) => pop(stack, context, node, max);

    const onReturn: TReturnHandler = (node) => {
        increment(stack);
        reportEarlyReturn(context, node);
    };

    return {
        ArrowFunctionExpression: onEnter,
        "ArrowFunctionExpression:exit": onExit,
        FunctionDeclaration: onEnter,
        "FunctionDeclaration:exit": onExit,
        FunctionExpression: onEnter,
        "FunctionExpression:exit": onExit,
        ReturnStatement: onReturn,
    };
};

type TSchemaKey = "minimum" | "type";

type TSchemaValue<T extends TSchemaKey> = T extends "minimum" ? number : string;

type TSchema = { [K in TSchemaKey]: TSchemaValue<K> };

const SCHEMA: Array<TSchema> = [{ minimum: 1, type: "integer" }];

type TMeta = TRule["meta"];

const META: TMeta = {
    docs: { description: DESC },
    messages: { earlyReturn: EARLY_MSG, tooManyReturns: MSG },
    schema: SCHEMA,
    type: "suggestion",
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    defaultOptions: [1],
    meta: META,
});

export default rule;
