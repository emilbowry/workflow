import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TCheckNode,
    TCreate,
    THandler,
    TLintMeta,
    TMakeHandler,
} from "./type-based.types";

import { ESLintUtils } from "@typescript-eslint/utils";

import { lintMetaToMsg } from "./type-based.types";

export const LINT_META: TLintMeta = {
    flags:
        "Record type without " +
        "parametric key-value " +
        "relationship (type " +
        "parameter as key " +
        "backreferenced in value)",
    fix:
        "Add type parameter: type " +
        "TFoo<T extends X> = " +
        "Record<T, TBar<T>>. Or " +
        "replace with tuple/mapped" +
        " type if no parametric " +
        "relationship exists",
    pitfalls:
        "Regex-based check — " +
        "operates on source text " +
        "not AST. Complex " +
        "formatting or multi-line " +
        "params may not match. " +
        "Value must be wrapped in " +
        "a named type " +
        "(Record<T, Array<T>> " +
        "matches but " +
        "Record<T, T> does not)",
    avoid:
        "Non-parametric Records " +
        "like Record<string, " +
        "number>. Use tuple or " +
        "mapped type instead",
    related:
        "enforce-record-type, " +
        "valid-generics, " +
        "no-duplicate-type-" +
        "structure",
    philosophy:
        "A parametric Record " +
        "witnesses that value " +
        "depends on key — a typed " +
        "map with structure. Non-" +
        "parametric Records are " +
        "untyped bags with no " +
        "trackable key-value " +
        "relationship",
};

const MSG: string = lintMetaToMsg(LINT_META);

const DESC: string =
    "Require Record types to be " +
    "parametric with backreferenced " +
    "type parameter.";

type TRule = ESLintUtils.RuleModule<"nonParametricRecord">;

const PARAMETRIC: RegExp =
    /type\s+\w+<(\w+)\s+extends\s+[^>]+>\s*=\s*Record<\1,\s*\w+<\1>>/;

type TIsValid = (src: string) => boolean;

const isValid: TIsValid = (src) => PARAMETRIC.test(src);

const checkNode: TCheckNode<TRule> = (context, node) => {
    const src: string = context.sourceCode.getText(node);
    if (src.includes("Record<") && !isValid(src)) {
        context.report({
            messageId: "nonParametricRecord",
            node,
        });
    }
};

const makeHandler: TMakeHandler<TRule> = (checkNode, context) =>
    (
        () => (node: TSESTree.TSTypeAliasDeclaration) =>
            checkNode(context, node)
    )();

const create: TCreate<TRule> = (context) => {
    const handler: THandler = makeHandler(checkNode, context);
    return {
        TSTypeAliasDeclaration: handler,
    };
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta: {
        docs: { description: DESC },
        messages: {
            nonParametricRecord: MSG,
        },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
