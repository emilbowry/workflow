import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";
import maxTotalDepth from "./rules/max-total-depth.js";
import eslintComments
    from "@eslint-community/eslint-plugin-eslint-comments";
import restrictReturnCount
    from "./rules/restrict-return-count.js";
import requireSeperateFunctionType
    from "./rules/require-extracted-function-type.js";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    //   ...tseslint.configs.recommended,

    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir:
                    import.meta.dirname,
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
                },
            },
            "eslint-comments": eslintComments,
        },
        rules: {
            // ── Complexity / readability ──
            // "max-depth": ["error", 3],
            "eslint-comments/no-use": ["error", { allow: [] }],
            "arrow-body-style": ["error", "as-needed"],
            // ignoreRestArgs: ["error", true],
            "@typescript-eslint/no-explicit-any": [
                "error",
                {
                    ignoreRestArgs: true,
                },
            ],
            "local/restrict-return-count": ["error", 1],
            "local/max-total-depth": ["error", 3],
            "local/require-extracted-function-type": "error",
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
                { max: 40, skipBlankLines: false, skipComments: false },
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
            // "@typescript-eslint/prefer-function-type": "error",
            "@typescript-eslint/no-confusing-void-expression": [
                "error",
                {
                    // ignoreVoidOperator: true,
                    ignoreArrowShorthand: true,
                },
            ],
            "id-length": [
                "error",
                {
                    min: 3,
                    // Common exceptions for loops/math/standard libs
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
                    // Don't enforce on property names
                    // from APIs you don't control
                    properties: "never",
                },
            ],
        },
    },

    {
        ignores: [
            "dist/",
            "rules/",
            "vite.config.ts",
            "eslint.config.ts",
        ],
    },
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        ...reactHooks.configs.flat.recommended,
    },
);
