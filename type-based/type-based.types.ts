import type { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

type TBaseRule = ESLintUtils.RuleModule<string, ReadonlyArray<unknown>>;

export type TContext<TRule extends TBaseRule> = Parameters<TRule["create"]>[0];

export type TCreate<TRule extends TBaseRule> = TRule["create"];

export type TMeta<TRule extends TBaseRule> = TRule["meta"];

export type THandler = (node: TSESTree.TSTypeAliasDeclaration) => void;

export type TNodeHandler = (node: TSESTree.Node) => void;

export type TCheckNode<TRule extends TBaseRule> = (
    ctx: TContext<TRule>,
    node: TSESTree.TSTypeAliasDeclaration,
) => void;

export type TMakeHandler<TRule extends TBaseRule> = (
    checkNode: TCheckNode<TRule>,
    context: TContext<TRule>,
) => THandler;

export type TSchema<TRule extends TBaseRule> = TMeta<TRule>["schema"];

export type TReportFn<TRule extends TBaseRule> = (
    ctx: TContext<TRule>,
    node: TSESTree.Node,
    count: number,
    max: number,
) => void;

export type TCanonical = (node: TSESTree.TypeNode) => string;

export type TRefIdentName = (ref: TSESTree.TSTypeReference) => string;

export type TTypeNodePredicate = (node: TSESTree.TypeNode) => boolean;

export type TLintKey =
    | "flags"
    | "fix"
    | "pitfalls"
    | "avoid"
    | "related"
    | "philosophy";

type TLintKeyMap = (key: TLintKey) => TLintKey;

export type TLintValue<T extends TLintKey> = `<${T}>${string}</${T}>`;

export type TLintMeta = {
    [K in TLintKey]: TLintValue<K>;
} & {
    readonly rule: string;
};

type TField = <T extends TLintKey>(
    ...args: [tag: T, value: string]
) => TLintValue<T>;

export const field: TField = (tag, value) => `<${tag}>${value}</${tag}>`;

type TLintMetaToMsg = (...args: [meta: TLintMeta]) => string;

export const lintMetaToMsg: TLintMetaToMsg = (meta) =>
    "<lint_meta>" +
    meta.flags +
    meta.fix +
    meta.pitfalls +
    meta.avoid +
    meta.related +
    meta.philosophy +
    "</lint_meta>";
