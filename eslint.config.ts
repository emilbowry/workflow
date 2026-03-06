import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";
import maxTotalDepth from "./rules/max-total-depth.js";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import restrictReturnCount from "./rules/restrict-return-count.js";
import requireSeperateFunctionType from "./type-based/require-extracted-types.ts";
// import preferCallSignature from "./type-based/prefer-call-signature.ts";
import maxTypeNesting from "./type-based/max-type-nesting.ts";
import noSingleFieldType from "./type-based/no-single-field-type.ts";
import noDuplicateTypeStructure from "./type-based/no-duplicate-type-structure.ts";
import noNestedFunction from "./rules/no-nested-function.ts";
import requireParametricRecord from "./type-based/require-parametric-record.ts";
import validGenerics from "./type-based/valid-generics.ts";
import enforceRecordType from "./type-based/enforce-record-type.ts";
import functional from "eslint-plugin-functional";

export default defineConfig(
    {
        ignores: [
            "dist/",
            "vite.config.ts",
            "eslint.config.ts",
            "wf.ts",
            "src/tr.ts",
        ],
    },

    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,

    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "react-hooks": reactHooks,
            react: react,
            local: {
                rules: {
                    "max-total-depth": maxTotalDepth,
                    "restrict-return-count": restrictReturnCount,
                    "require-extracted-function-type":
                        requireSeperateFunctionType,
                    // "prefer-call-signature": preferCallSignature,
                    "max-type-nesting": maxTypeNesting,
                    "no-single-field-type": noSingleFieldType,
                    "no-duplicate-type-structure": noDuplicateTypeStructure,
                    "no-nested-function": noNestedFunction,
                    "require-parametric-record": requireParametricRecord,
                    "valid-generics": validGenerics,
                    "enforce-record-type": enforceRecordType,
                },
            },
            "eslint-comments": eslintComments,
            functional: functional,
        },
        rules: {
            "@typescript-eslint/ban-ts-comment": "error",
            "@typescript-eslint/consistent-generic-constructors": [
                "error",
                "type-annotation",
            ],
            "@typescript-eslint/prefer-function-type": "error",

            "@typescript-eslint/array-type": [
                "error",
                {
                    default: "generic", // still allows tuples
                },
            ],
            // "@typescript-eslint/consistent-indexed-object-style": [
            //     "error",
            //     "record",
            // ], // maybe add
            "@typescript-eslint/ban-tslint-comment": "error",
            // "@typescript-eslint/consistent-type-assertions": [
            //     "error",
            //     {
            //         assertionStyle: "as",
            //         objectLiteralTypeAssertions: "never",
            //     },
            // ],
            "@typescript-eslint/consistent-type-imports": [
                "error",
                {
                    prefer: "type-imports",
                },
            ],
            "max-params": "off",
            // "@typescript-eslint/max-params": [ // would prefer min params as 2 not max
            //   "error",
            //   {
            //     "countVoidThis": false,
            //     "max": 1
            //   }
            // ]

            // "@typescript-eslint/naming-convention": [
            //     "error",
            //     // {
            //     //     selector: "typeParameter",
            //     //     format: ["PascalCase"],
            //     //     prefix: ["T"],
            //     // },
            //     {
            //         selector: "type",
            //         format: ["PascalCase"],
            //         custom: {
            //             regex: "T[A-Z]",
            //             match: false,
            //         },
            //     },
            //     {
            //         selector: "interface",
            //         format: ["PascalCase"],
            //         custom: {
            //             regex: "^I[A-Z]",
            //             match: false,
            //         },
            //     },
            //     {
            //         selector: "enum",
            //         format: ["PascalCase"],
            //         custom: {
            //             regex: "^E[A-Z]",
            //             match: false,
            //         },
            //     },
            //     {
            //         selector: "variable",
            //         types: ["boolean"],
            //         format: ["camelCase"], // eh violates my snake_case rule for variables
            //         prefix: ["is"],
            //     },
            //     // typeAlias is a selector, we can ban it here
            // ],
            "@typescript-eslint/no-deprecated": "error",
            // "@typescript-eslint/naming-convention": [
            //     "error",

            // ],
            "@typescript-eslint/no-duplicate-type-constituents": "error",
            "@typescript-eslint/method-signature-style": ["error", "property"],
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/consistent-type-exports": "error",
            "@typescript-eslint/consistent-type-definitions": ["error", "type"],
            "eslint-comments/no-use": ["error", { allow: [] }],
            "arrow-body-style": ["error", "as-needed"],
            "@typescript-eslint/array-type": [
                "error",
                {
                    default: "generic",
                },
            ],
            "@typescript-eslint/no-explicit-any": [
                "error",
                {
                    ignoreRestArgs: true,
                },
            ],
            //  "@typescript-eslint/no-redundant-type-constituents": "error",

            /* 

            Explain no-shadow

            "no-shadow": "off",
                "@typescript-eslint/no-shadow": "error",

            */
            "@typescript-eslint/no-unnecessary-condition": "error",
            "local/restrict-return-count": ["error", 1],
            indent: ["error", 4, { SwitchCase: 1 }],
            "local/max-total-depth": ["error", 3],
            "local/require-extracted-function-type": "error",
            // "local/prefer-call-signature": "error",
            "local/max-type-nesting": ["error", 1],
            "local/no-single-field-type": "error",
            "local/no-duplicate-type-structure": "error",
            "local/no-nested-function": "error",
            "local/require-parametric-record": "error",
            "local/valid-generics": "error",
            "functional/no-let": "error",
            "max-len": [
                "error",
                {
                    code: 80,
                    ignoreUrls: true,
                    ignoreStrings: false,
                    ignoreTemplateLiterals: false,
                    ignoreRegExpLiterals: false,
                },
            ],
            "max-lines-per-function": [
                "error",
                {
                    max: 40,
                    skipBlankLines: false,
                    skipComments: false,
                },
            ],
            complexity: ["error", 5],
            "@typescript-eslint/typedef": [
                "error",
                {
                    variableDeclaration: true,
                },
            ],
            "func-style": ["error", "expression"],
            "prefer-arrow-callback": "error",
            "@typescript-eslint/consistent-type-assertions": [
                "error",
                {
                    assertionStyle: "never",
                },
            ],
            "@typescript-eslint/no-unsafe-type-assertion": "error",
            "no-restricted-syntax": [
                "error",
                {
                    selector: "TSTypePredicate",
                    message: "Type predicates (is) are not allowed.",
                },
            ],
            "@typescript-eslint/no-confusing-void-expression": [
                "error",
                {
                    ignoreArrowShorthand: true,
                },
            ],
            "id-length": [
                "error",
                {
                    min: 3,
                    exceptions: [
                        "id",
                        "i",
                        "j",
                        "k",
                        "x",
                        "y",
                        "z",
                        "_",
                        "fs",
                        "db",
                        "ui",
                        "el",
                        "e",
                    ],
                    properties: "never",
                },
            ],
        },
    },

    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        ...reactHooks.configs.flat.recommended,
    },
);
