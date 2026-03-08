/**
 * Test: every active rule in eslint.config.ts
 * has LINT_META coverage.
 */

import { validate } from
    "../scripts/lint-fix/validate.ts";

import registry from
    "../scripts/lint-fix/external-rules.ts";

import { resolve } from "path";

type TTestRunner = () => Promise<void>;

const testLintMetaCoverage: TTestRunner =
    async () => {
        const configPath: string = resolve(
            "eslint.config.ts",
        );
        const result = await validate(
            configPath,
            registry,
        );
        if (result.missing.length > 0) {
            throw new Error(
                "Missing LINT_META for rules: "
                + result.missing.join(", "),
            );
        }
        console.log(
            "PASS: all "
            + String(result.total)
            + " rules have LINT_META"
            + " coverage ("
            + String(result.covered)
            + " covered)",
        );
    };

testLintMetaCoverage()
    .then(() => {
        console.log(
            "\nLint meta coverage test"
            + " passed.",
        );
    })
    .catch((err: unknown) => {
        console.error(
            "FAIL:",
            err instanceof Error
                ? err.message
                : String(err),
        );
        process.exit(1);
    });
