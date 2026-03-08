import type { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

type TBaseRule = ESLintUtils.RuleModule<string, ReadonlyArray<unknown>>;

export type TContext<TRule extends TBaseRule> = Parameters<TRule["create"]>[0];

export type TCreate<TRule extends TBaseRule> = TRule["create"];

export type TMeta<TRule extends TBaseRule> = TRule["meta"];

type THandlerArgs = [node: TSESTree.TSTypeAliasDeclaration];

export type THandler = (...args: THandlerArgs) => void;

type TNodeHandlerArgs = [node: TSESTree.Node];

export type TNodeHandler = (...args: TNodeHandlerArgs) => void;

type TCheckNodeArgs<TRule extends TBaseRule> = [
    ctx: TContext<TRule>,
    node: TSESTree.TSTypeAliasDeclaration,
];

export type TCheckNode<TRule extends TBaseRule> = (
    ...args: TCheckNodeArgs<TRule>
) => void;

type TMakeHandlerArgs<TRule extends TBaseRule> = [
    checkNode: TCheckNode<TRule>,
    context: TContext<TRule>,
];

export type TMakeHandler<TRule extends TBaseRule> = (
    ...args: TMakeHandlerArgs<TRule>
) => THandler;

export type TSchema<TRule extends TBaseRule> = TMeta<TRule>["schema"];

type TReportFnArgs<TRule extends TBaseRule> = [
    ctx: TContext<TRule>,
    node: TSESTree.Node,
    count: number,
    max: number,
];

export type TReportFn<TRule extends TBaseRule> = (
    ...args: TReportFnArgs<TRule>
) => void;

type TTypeNodeArgs = [node: TSESTree.TypeNode];

export type TCanonical = (...args: TTypeNodeArgs) => string;

type TRefIdentNameArgs = [ref: TSESTree.TSTypeReference];

export type TRefIdentName = (...args: TRefIdentNameArgs) => string;

export type TTypeNodePredicate = (...args: TTypeNodeArgs) => boolean;

type TLintKeys = readonly [
    "flags",
    "fix",
    "pitfalls",
    "avoid",
    "related",
    "philosophy",
];

export type TLintKey = TLintKeys[number];

export type TLintValue<T extends TLintKey> = `<${T}>${string}</${T}>`;

export type TLintMeta = {
    [K in TLintKey]: TLintValue<K>;
} & {
    readonly rule: string;
};

type TFieldArgs<T extends TLintKey> = [tag: T, value: string];

type TField = <T extends TLintKey>(...args: TFieldArgs<T>) => TLintValue<T>;

export const field: TField = (tag, value) => `<${tag}>${value}</${tag}>`;

type TLintMetaToMsgArgs = [meta: TLintMeta];

type TLintMetaToMsg = (...args: TLintMetaToMsgArgs) => string;

export const lintMetaToMsg: TLintMetaToMsg = (meta) =>
    "<lint_meta>" +
    meta.flags +
    meta.fix +
    meta.pitfalls +
    meta.avoid +
    meta.related +
    meta.philosophy +
    "</lint_meta>";
