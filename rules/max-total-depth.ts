import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TContext,
    TCreate,
    TLintMeta,
    TMeta,
    TSchema,
} from "../type-based/type-based.types";

import { ESLintUtils } from "@typescript-eslint/utils";

import { field, lintMetaToMsg } from "../type-based/type-based.types";

export const LINT_META: TLintMeta = {
    rule: "local/max-total-depth",
    avoid: field(
        "avoid",
        "Nested ternaries beyond 3 " +
            "branches. Deep if-chains. " +
            "Inline JSX nesting",
    ),
    fix: field(
        "fix",
        "Extract deeply indented " +
            "blocks into separate " +
            "functions at module scope",
    ),
    flags: field(
        "flags",
        "Indentation deeper than " +
            "configured maximum " +
            "(default 3 levels)",
    ),
    philosophy: field(
        "philosophy",
        "Bounds structural complexity " +
            "per generation. Shallow code " +
            "is locally verifiable — each " +
            "function readable in one pass " +
            "without holding nesting " +
            "context",
    ),
    pitfalls: field(
        "pitfalls",
        "Indent auto-formatting on " +
            "ternary chains cascades " +
            "into new depth violations." +
            " Nested ternaries beyond " +
            "3 branches will always " +
            "exceed the depth limit",
    ),
    related: field(
        "related",
        "restrict-return-count, " +
            "complexity, " +
            "no-nested-function, " +
            "max-lines-per-function",
    ),
};

const INDENT_SIZE: number = 4;
const MSG: string = lintMetaToMsg(LINT_META) + " depth={{depth}} max={{max}}";

const DESC: string = "Enforce a maximum indentation " + "depth for all code.";

export type TRule = ESLintUtils.RuleModule<"tooDeep", [number]>;

type TMatch = null | RegExpMatchArray;

type TSourceCode = TContext<TRule>["sourceCode"];

type TTextInputArgs = [input: string];

type TStringToNumber = (...args: TTextInputArgs) => number;

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

type TReportData = [string, string];

type TNumberPairArgs = [first: number, second: number];

type TMakeData = (...args: TNumberPairArgs) => TReportData;

const makeData: TMakeData = (depth, max) => [String(depth), String(max)];

type TLoc = TSESTree.SourceLocation;

type TMakeLoc = (...args: TNumberPairArgs) => TLoc;

const makeLoc: TMakeLoc = (lineNum, len) => ({
    end: { column: len, line: lineNum },
    start: { column: 0, line: lineNum },
});

type TGetLeading = (...args: TTextInputArgs) => string;

const getLeading: TGetLeading = (line) => {
    const match: TMatch = line.match(/^(\s*)/);
    const empty: string = "";
    return match === null ? empty : match[1];
};

type TCheckLineArgs = [
    context: TContext<TRule>,
    node: TSESTree.Program,
    max: number,
    line: string,
    idx: number,
];

type TCheckLine = (...args: TCheckLineArgs) => void;

const checkLine: TCheckLine = (context, node, max, line, idx) => {
    const hasContent: boolean = line.trim() !== "";
    const leading: string = getLeading(line);
    const depth: number = getDepth(leading);
    const tooDeep: boolean = hasContent && depth > max;
    if (tooDeep) {
        const pair: TReportData = makeData(depth, max);
        context.report({
            data: { depth: pair[0], max: pair[1] },
            loc: makeLoc(idx + 1, line.length),
            messageId: "tooDeep",
            node,
        });
    }
};

type TLineHandlerArgs = [line: string, idx: number];

type TLineHandler = (...args: TLineHandlerArgs) => void;

type TMakeLineHandlerArgs = [
    checkLine: TCheckLine,
    context: TContext<TRule>,
    node: TSESTree.Program,
    max: number,
];

type TMakeLineHandler = (...args: TMakeLineHandlerArgs) => TLineHandler;

const makeLineHandler: TMakeLineHandler = (checkLine, context, node, max) =>
    (
        () => (line: string, idx: number) =>
            checkLine(context, node, max, line, idx)
    )();

type TCheckLinesArgs = [
    context: TContext<TRule>,
    node: TSESTree.Program,
    max: number,
];

type TCheckLines = (...args: TCheckLinesArgs) => void;

const checkLines: TCheckLines = (context, node, max) => {
    const sourceCode: TSourceCode = context.sourceCode;
    const text: string = sourceCode.getText();
    const lines: Array<string> = text.split("\n");
    const handler: TLineHandler = makeLineHandler(
        checkLine,
        context,
        node,
        max,
    );
    lines.forEach(handler);
};

type TProgramHandlerArgs = [node: TSESTree.Program];

type TProgramHandler = (...args: TProgramHandlerArgs) => void;

type TMakeProgramHandlerArgs = [
    checkLines: TCheckLines,
    context: TContext<TRule>,
    max: number,
];

type TMakeProgramHandler = (
    ...args: TMakeProgramHandlerArgs
) => TProgramHandler;

const makeProgramHandler: TMakeProgramHandler = (checkLines, context, max) =>
    (
        () => (node: TSESTree.Program) =>
            checkLines(context, node, max)
    )();

const create: TCreate<TRule> = (context) => {
    const max: number = context.options[0];
    const handler: TProgramHandler = makeProgramHandler(
        checkLines,
        context,
        max,
    );
    return { "Program:exit": handler };
};

const schema: TSchema<TRule> = [{ minimum: 1, type: "integer" }];

const meta: TMeta<TRule> = {
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
