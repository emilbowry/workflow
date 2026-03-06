import type { ESLintUtils } from "@typescript-eslint/utils";

type TRule = ESLintUtils.RuleModule<string, Array<unknown>>;

export type TContext = Parameters<TRule["create"]>[0];

export type TCreate = TRule["create"];

export type TMeta = TRule["meta"];
