import type { TSESTree } from "@typescript-eslint/utils";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

const MSG: string = "Types {{names}} are " + "structurally identical.";

const DESC: string =
    "Disallow multiple type " +
    "aliases with identical " +
    "structure across the project.";

type TCanonical = {
    (node: TSESTree.TypeNode): string;
};

type TCanonicalParam = {
    (param: TSESTree.Parameter): string;
};

const canonicalParam: TCanonicalParam = (param) => {
    if (param.type === AST_NODE_TYPES.Identifier) {
        const ann: TSESTree.TSTypeAnnotation | undefined = param.typeAnnotation;
        if (ann) {
            return canonical(ann.typeAnnotation);
        }
        return "any";
    }
    if (param.type === AST_NODE_TYPES.RestElement) {
        const ann: TSESTree.TSTypeAnnotation | undefined = param.typeAnnotation;
        if (ann) {
            return "..." + canonical(ann.typeAnnotation);
        }
        return "...any";
    }
    return param.type;
};

type TCanonicalMember = {
    (member: TSESTree.TypeElement): string;
};

const canonicalMember: TCanonicalMember = (member) => {
    if (member.type === AST_NODE_TYPES.TSPropertySignature) {
        const key: string =
            member.key.type === AST_NODE_TYPES.Identifier ?
                member.key.name
            :   String((member.key as TSESTree.Literal).value);
        const opt: string = member.optional ? "?" : "";
        if (member.typeAnnotation) {
            return (
                key +
                opt +
                ":" +
                canonical(member.typeAnnotation.typeAnnotation)
            );
        }
        return key + opt;
    }
    if (member.type === AST_NODE_TYPES.TSCallSignatureDeclaration) {
        const params: string = member.params.map(canonicalParam).join(",");
        const ret: string =
            member.returnType ?
                canonical(member.returnType.typeAnnotation)
            :   "void";
        return "(" + params + "):" + ret;
    }
    if (member.type === AST_NODE_TYPES.TSIndexSignature) {
        const params: string = member.parameters
            .map((p) => {
                const ann: TSESTree.TSTypeAnnotation | undefined =
                    p.typeAnnotation;
                if (ann) {
                    return canonical(ann.typeAnnotation);
                }
                return "any";
            })
            .join(",");
        const val: string =
            member.typeAnnotation ?
                canonical(member.typeAnnotation.typeAnnotation)
            :   "any";
        return "[" + params + "]:" + val;
    }
    if (member.type === AST_NODE_TYPES.TSMethodSignature) {
        const key: string =
            member.key.type === AST_NODE_TYPES.Identifier ?
                member.key.name
            :   String((member.key as TSESTree.Literal).value);
        const params: string = member.params.map(canonicalParam).join(",");
        const ret: string =
            member.returnType ?
                canonical(member.returnType.typeAnnotation)
            :   "void";
        return key + "(" + params + "):" + ret;
    }
    if (member.type === AST_NODE_TYPES.TSConstructSignatureDeclaration) {
        const params: string = member.params.map(canonicalParam).join(",");
        const ret: string =
            member.returnType ?
                canonical(member.returnType.typeAnnotation)
            :   "void";
        return "new(" + params + "):" + ret;
    }
    return member.type;
};

const canonical: TCanonical = (node) => {
    if (node.type === AST_NODE_TYPES.TSTypeLiteral) {
        const members: string = node.members.map(canonicalMember).join(";");
        return "{" + members + "}";
    }
    if (node.type === AST_NODE_TYPES.TSUnionType) {
        return node.types.map(canonical).join("|");
    }
    if (node.type === AST_NODE_TYPES.TSIntersectionType) {
        return node.types.map(canonical).join("&");
    }
    if (node.type === AST_NODE_TYPES.TSTypeReference) {
        const name: string =
            node.typeName.type === AST_NODE_TYPES.Identifier ? node.typeName.name
            : node.typeName.left.type === AST_NODE_TYPES.Identifier ?
                node.typeName.left.name + "." + node.typeName.right.name
            :   node.typeName.type;
        if (node.typeArguments && node.typeArguments.params.length > 0) {
            const args: string = node.typeArguments.params
                .map(canonical)
                .join(",");
            return name + "<" + args + ">";
        }
        return name;
    }
    if (node.type === AST_NODE_TYPES.TSFunctionType) {
        const params: string = node.params.map(canonicalParam).join(",");
        const ret: string =
            node.returnType ?
                canonical(node.returnType.typeAnnotation)
            :   "void";
        return "(" + params + ")=>" + ret;
    }
    if (node.type === AST_NODE_TYPES.TSStringKeyword) {
        return "string";
    }
    if (node.type === AST_NODE_TYPES.TSNumberKeyword) {
        return "number";
    }
    if (node.type === AST_NODE_TYPES.TSBooleanKeyword) {
        return "boolean";
    }
    if (node.type === AST_NODE_TYPES.TSVoidKeyword) {
        return "void";
    }
    if (node.type === AST_NODE_TYPES.TSNullKeyword) {
        return "null";
    }
    if (node.type === AST_NODE_TYPES.TSUndefinedKeyword) {
        return "undefined";
    }
    if (node.type === AST_NODE_TYPES.TSAnyKeyword) {
        return "any";
    }
    if (node.type === AST_NODE_TYPES.TSUnknownKeyword) {
        return "unknown";
    }
    if (node.type === AST_NODE_TYPES.TSNeverKeyword) {
        return "never";
    }
    if (node.type === AST_NODE_TYPES.TSBigIntKeyword) {
        return "bigint";
    }
    if (node.type === AST_NODE_TYPES.TSSymbolKeyword) {
        return "symbol";
    }
    if (node.type === AST_NODE_TYPES.TSObjectKeyword) {
        return "object";
    }
    if (node.type === AST_NODE_TYPES.TSArrayType) {
        return canonical(node.elementType) + "[]";
    }
    if (node.type === AST_NODE_TYPES.TSTypeOperator) {
        return (
            node.operator +
            " " +
            canonical(node.typeAnnotation as TSESTree.TypeNode)
        );
    }
    if (node.type === AST_NODE_TYPES.TSLiteralType) {
        if (node.literal.type === AST_NODE_TYPES.Literal) {
            return String(node.literal.value);
        }
        if (node.literal.type === AST_NODE_TYPES.UnaryExpression) {
            return (
                node.literal.operator +
                String((node.literal.argument as TSESTree.Literal).value)
            );
        }
        if (node.literal.type === AST_NODE_TYPES.TemplateLiteral) {
            return "template";
        }
        return String(node.literal.type);
    }
    if (node.type === AST_NODE_TYPES.TSTupleType) {
        const elems: string = node.elementTypes.map(canonical).join(",");
        return "[" + elems + "]";
    }
    if (node.type === AST_NODE_TYPES.TSIndexedAccessType) {
        return (
            canonical(node.objectType) + "[" + canonical(node.indexType) + "]"
        );
    }
    if (node.type === AST_NODE_TYPES.TSTypeQuery) {
        const name: string =
            node.exprName.type === AST_NODE_TYPES.Identifier ?
                node.exprName.name
            :   node.exprName.type;
        return "typeof " + name;
    }
    if (node.type === AST_NODE_TYPES.TSConditionalType) {
        return (
            canonical(node.checkType) +
            " extends " +
            canonical(node.extendsType) +
            "?" +
            canonical(node.trueType) +
            ":" +
            canonical(node.falseType)
        );
    }
    if (node.type === AST_NODE_TYPES.TSMappedType) {
        return (
            "{[" +
            (node.typeParameter.name.name ?? "k") +
            " in " +
            canonical(node.typeParameter.constraint as TSESTree.TypeNode) +
            "]:" +
            (node.typeAnnotation ? canonical(node.typeAnnotation) : "any") +
            "}"
        );
    }
    if (node.type === AST_NODE_TYPES.TSInferType) {
        return "infer " + node.typeParameter.name.name;
    }
    return node.type;
};

type TEntry = {
    file: string;
    name: string;
    node: TSESTree.TSTypeAliasDeclaration;
};

type TRule = ESLintUtils.RuleModule<"duplicateStructure">;

const seen: Map<string, Array<TEntry>> = new Map();

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create(context) {
        const file: string = context.filename;

        return {
            "Program:exit"(): void {
                for (const entries of seen.values()) {
                    if (entries.length < 2) {
                        continue;
                    }
                    const names: string = entries
                        .map((e) => e.name + " (" + e.file + ")")
                        .join(", ");
                    for (const entry of entries) {
                        if (entry.file !== file) {
                            continue;
                        }
                        context.report({
                            data: {
                                names,
                            },
                            messageId: "duplicateStructure",
                            node: entry.node,
                        });
                    }
                }
            },
            TSTypeAliasDeclaration(node): void {
                const key: string = canonical(node.typeAnnotation);
                const name: string = node.id.name;
                const existing: Array<TEntry> | undefined = seen.get(key);
                if (existing) {
                    existing.push({
                        file,
                        name,
                        node,
                    });
                } else {
                    seen.set(key, [
                        {
                            file,
                            name,
                            node,
                        },
                    ]);
                }
            },
        };
    },
    meta: {
        docs: {
            description: DESC,
        },
        messages: {
            duplicateStructure: MSG,
        },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
