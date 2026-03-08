import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TCheckNode,
    TCreate,
    THandler,
    TMakeHandler,
} from "./type-based.types";

import { ESLintUtils } from "@typescript-eslint/utils";

const MSG: string =
    "Record must be parametric. " +
    "Use type TFoo<T extends X> = " +
    "Record<T, TBar<T>>. " +
    "If the generic key parameter " +
    "cannot be constructed, there " +
    "is no structural reasoning " +
    "for key-value pairs — use a " +
    "tuple instead. Otherwise the " +
    "type is constructable.";

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
