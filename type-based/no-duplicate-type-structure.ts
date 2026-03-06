import type { TSESTree } from "@typescript-eslint/utils";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

const MSG: string = "Types {{names}} are " + "structurally identical.";

const DESC: string =
    "Disallow multiple type " +
    "aliases with identical " +
    "structure across the project.";

type TCanonical = (node: TSESTree.TypeNode) => string;

type TMaybeAnn = TSESTree.TSTypeAnnotation | undefined;

type TAnnotationToString = (ann: TMaybeAnn, fallback: string) => string;

const annotationToString: TAnnotationToString = (ann, fallback) =>
    ann ? canonical(ann.typeAnnotation) : fallback;

type TReturnTypeToString = (ret: TMaybeAnn) => string;

const returnTypeToString: TReturnTypeToString = (ret) =>
    annotationToString(ret, "void");

type TParamsToString = (params: Array<TSESTree.Parameter>) => string;

const paramsToString: TParamsToString = (params) =>
    params.map(canonicalParam).join(",");

type TKeyName = (key: TSESTree.PropertyName) => string;

const keyName: TKeyName = (key) =>
    key.type === AST_NODE_TYPES.Identifier
        ? key.name
        : key.type === AST_NODE_TYPES.Literal
            ? String(key.value)
            : key.type;

type THandleIdentifierParam = (param: TSESTree.Identifier) => string;

const handleIdentifierParam: THandleIdentifierParam = (param) =>
    annotationToString(param.typeAnnotation, "any");

type THandleRestParam = (param: TSESTree.RestElement) => string;

const handleRestParam: THandleRestParam = (param) =>
    "..." + annotationToString(param.typeAnnotation, "any");

type TCanonicalParam = (param: TSESTree.Parameter) => string;

const canonicalParam: TCanonicalParam = (param) =>
    param.type === AST_NODE_TYPES.Identifier
        ? handleIdentifierParam(param)
        : param.type === AST_NODE_TYPES.RestElement
            ? handleRestParam(param)
            : param.type;

type THandleProperty = (member: TSESTree.TSPropertySignature) => string;

const handlePropertySignature: THandleProperty = (member) => {
    const key: string = keyName(member.key);
    const opt: string = member.optional ? "?" : "";
    const ann: string = annotationToString(member.typeAnnotation, "");
    const sep: string = ann ? ":" : "";
    return key + opt + sep + ann;
};

type THandleCallSig = (member: TSESTree.TSCallSignatureDeclaration) => string;

const handleCallSignature: THandleCallSig = (member) => {
    const params: string = paramsToString(member.params);
    const ret: string = returnTypeToString(member.returnType);
    return "(" + params + "):" + ret;
};

type TIndexParam = TSESTree.TSIndexSignature["parameters"][0];

type THandleIndexParam = (param: TIndexParam) => string;

const handleIndexParam: THandleIndexParam = (param) =>
    param.type === AST_NODE_TYPES.Identifier
        ? annotationToString(param.typeAnnotation, "any")
        : "any";

type THandleIndexSig = (member: TSESTree.TSIndexSignature) => string;

const handleIndexSignature: THandleIndexSig = (member) => {
    const params: string = member.parameters.map(handleIndexParam).join(",");
    const val: string = annotationToString(member.typeAnnotation, "any");
    return "[" + params + "]:" + val;
};

type THandleMethodSig = (member: TSESTree.TSMethodSignature) => string;

const handleMethodSignature: THandleMethodSig = (member) => {
    const key: string = keyName(member.key);
    const params: string = paramsToString(member.params);
    const ret: string = returnTypeToString(member.returnType);
    return key + "(" + params + "):" + ret;
};

type THandleConstructSig = (
    member: TSESTree.TSConstructSignatureDeclaration,
) => string;

const handleConstructSignature: THandleConstructSig = (member) => {
    const params: string = paramsToString(member.params);
    const ret: string = returnTypeToString(member.returnType);
    return "new(" + params + "):" + ret;
};

type TCanonicalMember = (member: TSESTree.TypeElement) => string;

const canonicalMember: TCanonicalMember = (member) => {
    switch (member.type) {
        case AST_NODE_TYPES.TSPropertySignature:
            return handlePropertySignature(member);
        case AST_NODE_TYPES.TSCallSignatureDeclaration:
            return handleCallSignature(member);
        case AST_NODE_TYPES.TSIndexSignature:
            return handleIndexSignature(member);
        case AST_NODE_TYPES.TSMethodSignature:
            return handleMethodSignature(member);
        default:
            return handleConstructSignature(member);
    }
};

type TKeywordMap = Map<string, string>;

const KEYWORD_MAP: TKeywordMap = new Map([
    [AST_NODE_TYPES.TSAnyKeyword, "any"],
    [AST_NODE_TYPES.TSBigIntKeyword, "bigint"],
    [AST_NODE_TYPES.TSBooleanKeyword, "boolean"],
    [AST_NODE_TYPES.TSNeverKeyword, "never"],
    [AST_NODE_TYPES.TSNullKeyword, "null"],
    [AST_NODE_TYPES.TSNumberKeyword, "number"],
    [AST_NODE_TYPES.TSObjectKeyword, "object"],
    [AST_NODE_TYPES.TSStringKeyword, "string"],
    [AST_NODE_TYPES.TSSymbolKeyword, "symbol"],
    [AST_NODE_TYPES.TSUndefinedKeyword, "undefined"],
    [AST_NODE_TYPES.TSUnknownKeyword, "unknown"],
    [AST_NODE_TYPES.TSVoidKeyword, "void"],
]);

type THandleTypeLiteral = (node: TSESTree.TSTypeLiteral) => string;

const handleTypeLiteral: THandleTypeLiteral = (node) => {
    const members: string = node.members.map(canonicalMember).join(";");
    return "{" + members + "}";
};

type THandleUnion = (node: TSESTree.TSUnionType) => string;

const handleUnionType: THandleUnion = (node) =>
    node.types.map(canonical).join("|");

type THandleIntersection = (node: TSESTree.TSIntersectionType) => string;

const handleIntersectionType: THandleIntersection = (node) =>
    node.types.map(canonical).join("&");

type TTypeName = TSESTree.TSTypeReference["typeName"];

type TTypeNameToString = (typeName: TTypeName) => string;

type TQualifiedToString = (node: TSESTree.TSQualifiedName) => string;

const qualifiedToString: TQualifiedToString = (node) =>
    node.left.type === AST_NODE_TYPES.Identifier
        ? node.left.name + "." + node.right.name
        : node.type;

const typeNameToString: TTypeNameToString = (typeName) =>
    typeName.type === AST_NODE_TYPES.Identifier
        ? typeName.name
        : typeName.type === AST_NODE_TYPES.TSQualifiedName
            ? qualifiedToString(typeName)
            : typeName.type;

type THandleTypeRef = (node: TSESTree.TSTypeReference) => string;

const handleTypeReference: THandleTypeRef = (node) => {
    const name: string = typeNameToString(node.typeName);
    const args: string =
        node.typeArguments && node.typeArguments.params.length > 0
            ? node.typeArguments.params.map(canonical).join(",")
            : "";
    return args ? name + "<" + args + ">" : name;
};

type THandleFnType = (node: TSESTree.TSFunctionType) => string;

const handleFunctionType: THandleFnType = (node) => {
    const params: string = paramsToString(node.params);
    const ret: string = returnTypeToString(node.returnType);
    return "(" + params + ")=>" + ret;
};

type THandleArrayType = (node: TSESTree.TSArrayType) => string;

const handleArrayType: THandleArrayType = (node) =>
    canonical(node.elementType) + "[]";

type THandleTypeOp = (node: TSESTree.TSTypeOperator) => string;

const handleTypeOperator: THandleTypeOp = (node) =>
    node.typeAnnotation
        ? node.operator + " " + canonical(node.typeAnnotation)
        : node.operator;

type TLiteralNode = TSESTree.TSLiteralType["literal"];

type TUnaryArgValue = (arg: TSESTree.Expression) => string;

const unaryArgValue: TUnaryArgValue = (arg) =>
    arg.type === AST_NODE_TYPES.Literal ? String(arg.value) : "unknown";

type THandleLiteralValue = (literal: TLiteralNode) => string;

const handleLiteralValue: THandleLiteralValue = (literal) =>
    literal.type === AST_NODE_TYPES.Literal
        ? String(literal.value)
        : literal.type === AST_NODE_TYPES.UnaryExpression
            ? literal.operator + unaryArgValue(literal.argument)
            : "template";

type THandleLiteralType = (node: TSESTree.TSLiteralType) => string;

const handleLiteralType: THandleLiteralType = (node) =>
    handleLiteralValue(node.literal);

type THandleTupleType = (node: TSESTree.TSTupleType) => string;

const handleTupleType: THandleTupleType = (node) => {
    const elems: string = node.elementTypes.map(canonical).join(",");
    return "[" + elems + "]";
};

type THandleIndexAccess = (node: TSESTree.TSIndexedAccessType) => string;

const handleIndexedAccessType: THandleIndexAccess = (node) =>
    canonical(node.objectType) + "[" + canonical(node.indexType) + "]";

type THandleTypeQuery = (node: TSESTree.TSTypeQuery) => string;

const handleTypeQuery: THandleTypeQuery = (node) => {
    const name: string =
        node.exprName.type === AST_NODE_TYPES.Identifier
            ? node.exprName.name
            : node.exprName.type;
    return "typeof " + name;
};

type THandleConditional = (node: TSESTree.TSConditionalType) => string;

const handleConditionalType: THandleConditional = (node) =>
    canonical(node.checkType) +
    " extends " +
    canonical(node.extendsType) +
    "?" +
    canonical(node.trueType) +
    ":" +
    canonical(node.falseType);

type THandleMapped = (node: TSESTree.TSMappedType) => string;

const handleMappedType: THandleMapped = (node) => {
    const paramName: string = node.key.name;
    const constraint: string = canonical(node.constraint);
    const val: string = node.typeAnnotation
        ? canonical(node.typeAnnotation)
        : "any";
    return "{[" + paramName + " in " + constraint + "]:" + val + "}";
};

type THandleInfer = (node: TSESTree.TSInferType) => string;

const handleInferType: THandleInfer = (node) =>
    "infer " + node.typeParameter.name.name;

type TMaybeString = string | undefined;

type TTryDispatch = (node: TSESTree.TypeNode) => TMaybeString;

/*
    To me the only reason this was used was to bypass the complexity issue

    They all are structurely identical and the type is identical
*/
const tryComposite: TTryDispatch = (node) => {
    switch (node.type) {
        case AST_NODE_TYPES.TSTypeLiteral:
            return handleTypeLiteral(node);
        case AST_NODE_TYPES.TSUnionType:
            return handleUnionType(node);
        case AST_NODE_TYPES.TSIntersectionType:
            return handleIntersectionType(node);
        default:
            return undefined;
    }
};

const tryReference: TTryDispatch = (node) => {
    switch (node.type) {
        case AST_NODE_TYPES.TSTypeReference:
            return handleTypeReference(node);
        case AST_NODE_TYPES.TSFunctionType:
            return handleFunctionType(node);
        case AST_NODE_TYPES.TSArrayType:
            return handleArrayType(node);
        case AST_NODE_TYPES.TSTypeOperator:
            return handleTypeOperator(node);
        default:
            return undefined;
    }
};

const tryLiteral: TTryDispatch = (node) => {
    switch (node.type) {
        case AST_NODE_TYPES.TSLiteralType:
            return handleLiteralType(node);
        case AST_NODE_TYPES.TSTupleType:
            return handleTupleType(node);
        case AST_NODE_TYPES.TSIndexedAccessType:
            return handleIndexedAccessType(node);
        default:
            return undefined;
    }
};

const tryAdvanced: TTryDispatch = (node) => {
    switch (node.type) {
        case AST_NODE_TYPES.TSTypeQuery:
            return handleTypeQuery(node);
        case AST_NODE_TYPES.TSConditionalType:
            return handleConditionalType(node);
        case AST_NODE_TYPES.TSMappedType:
            return handleMappedType(node);
        case AST_NODE_TYPES.TSInferType:
            return handleInferType(node);
        default:
            return undefined;
    }
};

// conveniantly exactly has a cyclomatic complexity of 5
const dispatchNode: TCanonical = (node) =>
    tryComposite(node) ??
    tryReference(node) ??
    tryLiteral(node) ??
    tryAdvanced(node) ??
    node.type;

const canonical: TCanonical = (node) => {
    const keyword: TMaybeString = KEYWORD_MAP.get(node.type);
    return keyword ?? dispatchNode(node);
};

type TEntry = {
    file: string;
    name: string;
    node: TSESTree.TSTypeAliasDeclaration;
};

type TRule = ESLintUtils.RuleModule<"duplicateStructure">;

type TContext = Parameters<TRule["create"]>[0];

const seen: Map<string, Array<TEntry>> = new Map();

type TFormatNames = (entries: Array<TEntry>) => string;

const formatNames: TFormatNames = (entries) =>
    entries.map((entry) => entry.name + " (" + entry.file + ")").join(", ");
// unhapy with this, why is it not extracted

type TReportEntry = (
    context: TContext,
    file: string,
    entry: TEntry,
    names: string,
) => void;

const reportEntry: TReportEntry = (context, file, entry, names) => {
    if (entry.file === file) {
        context.report({
            data: { names },
            messageId: "duplicateStructure",
            node: entry.node,
        });
    }
};

type TReportDuplicates = (context: TContext, file: string) => void;

const reportDuplicates: TReportDuplicates = (context, file) => {
    for (const entries of seen.values()) {
        if (entries.length < 2) {
            continue;
        }
        const names: string = formatNames(entries);
        for (const entry of entries) {
            reportEntry(context, file, entry, names);
        }
    }
};

type TMaybeEntries = Array<TEntry> | undefined;

type TRecordAlias = (
    file: string,
    node: TSESTree.TSTypeAliasDeclaration,
) => void;

const recordAlias: TRecordAlias = (file, node) => {
    const key: string = canonical(node.typeAnnotation);
    const name: string = node.id.name;
    const newEntry: TEntry = { file, name, node };
    const existing: TMaybeEntries = seen.get(key);
    if (existing) {
        existing.push(newEntry);
    } else {
        seen.set(key, [newEntry]);
    }
};

type TClearFile = (file: string) => void;

const clearFile: TClearFile = (file) => {
    for (const [key, entries] of seen) {
        const kept: Array<TEntry> = entries.filter((e) => e.file !== file);
        if (kept.length === 0) {
            seen.delete(key);
        } else {
            seen.set(key, kept);
        }
    }
};

type TCreate = TRule["create"];

const create: TCreate = (context) => {
    const file: string = context.filename;
    clearFile(file);
    return {
        "Program:exit"(): void {
            reportDuplicates(context, file);
        },
        TSTypeAliasDeclaration(node): void {
            recordAlias(file, node);
        },
    };
};

type TMeta = TRule["meta"];

const meta: TMeta = {
    docs: { description: DESC },
    messages: { duplicateStructure: MSG },
    schema: [],
    type: "suggestion",
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta,
});

export default rule;
