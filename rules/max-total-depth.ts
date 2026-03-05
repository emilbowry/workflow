import type { TSESTree } from "@typescript-eslint/utils";

import { ESLintUtils } from "@typescript-eslint/utils";

const INDENT_SIZE: number = 4;
const MSG: string =
    "Indentation depth ({{depth}}) " +
    "exceeds maximum of {{max}}. " +
    "Extract into a separate " +
    "component or function.";

const DESC: string = "Enforce a maximum indentation " + "depth for all code.";

type TRule = ESLintUtils.RuleModule<"tooDeep", [number]>;

type TContext = Parameters<TRule["create"]>[0];

type TMatch = null | RegExpMatchArray;

type TSourceCode = TContext["sourceCode"];

type TStringToNumber = {
    (input: string): number;
};

const getTabDepth: TStringToNumber = (leading) => {
    const matches: TMatch = leading.match(/\t/g);
    const fallback: Array<string> = [];
    const result: Array<string> = matches ?? fallback;
    return result.length;
};

const getDepth: TStringToNumber = (leading) => {
    const hasTab: boolean = leading.includes("\t");
    const spaceDepth: number = Math.floor(leading.length / INDENT_SIZE);
    return hasTab ? getTabDepth(leading) : spaceDepth;
};

type TReportData = {
    depth: string;
    max: string;
};

type TMakeData = {
    (depth: number, max: number): TReportData;
};

const makeData: TMakeData = (depth, max) => ({
    depth: String(depth),
    max: String(max),
});

type TPosition = {
    column: number;
    line: number;
};

type TLoc = {
    end: TPosition;
    start: TPosition;
};

type TMakeLoc = {
    (lineNum: number, len: number): TLoc;
};

const makeLoc: TMakeLoc = (lineNum, len) => ({
    end: { column: len, line: lineNum },
    start: { column: 0, line: lineNum },
});

type TGetLeading = {
    (line: string): string;
};

const getLeading: TGetLeading = (line) => {
    const match: TMatch = line.match(/^(\s*)/);
    const empty: string = "";
    return match === null ? empty : match[1];
};

type TCheckLine = {
    (
        context: TContext,
        node: TSESTree.Program,
        max: number,
        line: string,
        idx: number,
    ): void;
};

const reportIfTooDeep: TCheckLine = (context, node, max, line, idx) => {
    const leading: string = getLeading(line);
    const depth: number = getDepth(leading);
    const tooDeep: boolean = depth > max;
    if (tooDeep) {
        context.report({
            data: makeData(depth, max),
            loc: makeLoc(idx + 1, line.length),
            messageId: "tooDeep",
            node,
        });
    }
};

const checkLine: TCheckLine = (context, node, max, line, idx) => {
    const isEmpty: boolean = line.trim() === "";
    if (!isEmpty) {
        reportIfTooDeep(context, node, max, line, idx);
    }
};

type TLineCallback = {
    (line: string, idx: number): void;
};

type TMakeLineCallback = {
    (context: TContext, node: TSESTree.Program, max: number): TLineCallback;
};

const makeLineCallback: TMakeLineCallback = (context, node, max) =>
    checkLine.bind(null, context, node, max);

type TCheckLines = {
    (context: TContext, node: TSESTree.Program, max: number): void;
};

const checkLines: TCheckLines = (context, node, max) => {
    const sourceCode: TSourceCode = context.sourceCode;
    const text: string = sourceCode.getText();
    const lines: Array<string> = text.split("\n");
    const callback: TLineCallback = makeLineCallback(context, node, max);
    lines.forEach(callback);
};

type TProgramExit = {
    (context: TContext, max: number, node: TSESTree.Program): void;
};

const programExit: TProgramExit = (context, max, node) => {
    checkLines(context, node, max);
};

type TProgramExitHandler = {
    (node: TSESTree.Program): void;
};

type TMakeHandler = {
    (context: TContext, max: number): TProgramExitHandler;
};

const makeHandler: TMakeHandler = (context, max) =>
    programExit.bind(null, context, max);

type TCreate = TRule["create"];

const create: TCreate = (context) => {
    const max: number = context.options[0];
    const handler: TProgramExitHandler = makeHandler(context, max);
    return {
        "Program:exit": handler,
    };
};

type TSchemaType = "integer" | "number";

type TSchema = {
    minimum: number;
    type: TSchemaType;
};

const schema: Array<TSchema> = [{ minimum: 1, type: "integer" }];

type TMeta = TRule["meta"];

const meta: TMeta = {
    docs: { description: DESC },
    messages: { tooDeep: MSG },
    schema,
    type: "suggestion",
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    defaultOptions: [3],
    meta,
});

export default rule;
