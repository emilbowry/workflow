/**
 * Test: JSON to XML transforms produce valid XML.
 * Imports from ../scripts/lint-fix/xml.ts
 */

import {
    errorsToXml,
    fileToXml,
    postMortemToXml,
    planOptionToXml,
} from "../scripts/lint-fix/xml.ts";

import type {
    TEslintError,
    TPostMortem,
    TPlanOption,
} from "../scripts/lint-fix/types.ts";

type TTestRunner = () => void;

const sampleErrors: ReadonlyArray<TEslintError> =
    [
        {
            ruleId: "no-let",
            line: 10,
            column: 5,
            message: "Use const instead",
            filePath: "src/foo.ts",
        },
        {
            ruleId: "max-len",
            line: 20,
            column: 1,
            message: "Line too long",
            filePath: "src/foo.ts",
        },
    ];

const testErrorsToXml: TTestRunner = () => {
    const xml: string = errorsToXml(sampleErrors);
    const hasRoot: boolean =
        xml.startsWith("<errors>")
        && xml.endsWith("</errors>");
    if (!hasRoot) {
        throw new Error(
            "errorsToXml: missing <errors> root",
        );
    }
    const hasRule: boolean =
        xml.includes('rule="no-let"');
    if (!hasRule) {
        throw new Error(
            "errorsToXml: missing rule attr",
        );
    }
    const hasLine: boolean =
        xml.includes('line="10"');
    if (!hasLine) {
        throw new Error(
            "errorsToXml: missing line attr",
        );
    }
    const errorCount: number =
        (xml.match(/<error /g) ?? []).length;
    if (errorCount !== 2) {
        throw new Error(
            "errorsToXml: expected 2 errors,"
            + " got " + String(errorCount),
        );
    }
    console.log("PASS: errorsToXml");
};

const testFileToXml: TTestRunner = () => {
    const xml: string = fileToXml(
        "src/bar.ts",
        "<inner />",
    );
    const hasOpen: boolean =
        xml.includes('<file path="src/bar.ts">');
    if (!hasOpen) {
        throw new Error(
            "fileToXml: missing <file> open tag",
        );
    }
    const hasClose: boolean =
        xml.endsWith("</file>");
    if (!hasClose) {
        throw new Error(
            "fileToXml: missing </file> close",
        );
    }
    const hasContent: boolean =
        xml.includes("<inner />");
    if (!hasContent) {
        throw new Error(
            "fileToXml: content not wrapped",
        );
    }
    console.log("PASS: fileToXml");
};

const testPostMortemToXml: TTestRunner = () => {
    const pm: TPostMortem = [
        {
            attempt: 1,
            plan: {
                options: [
                    {
                        id: 1,
                        description: "Fix A",
                        solves_error_because:
                            "reason",
                        regression_risk: "low",
                        emergent_risk: "none",
                        differs_from_previous:
                            null,
                    },
                ],
                chosen_option: 1,
                chosen_reason: "best fit",
            },
            diff: "--- a\n+++ b\n@@ -1 +1 @@",
            remaining_errors: [
                {
                    ruleId: "no-let",
                    line: 5,
                    column: 1,
                    message: "Use const",
                    filePath: "src/x.ts",
                },
            ],
        },
    ];
    const xml: string = postMortemToXml(pm);
    const hasRoot: boolean =
        xml.startsWith("<post_mortem>")
        && xml.endsWith("</post_mortem>");
    if (!hasRoot) {
        throw new Error(
            "postMortemToXml: missing root",
        );
    }
    const hasCdata: boolean =
        xml.includes("<![CDATA[");
    if (!hasCdata) {
        throw new Error(
            "postMortemToXml: missing CDATA",
        );
    }
    const hasAttempt: boolean =
        xml.includes('attempt n="1"');
    if (!hasAttempt) {
        throw new Error(
            "postMortemToXml: missing attempt",
        );
    }
    const hasPlan: boolean =
        xml.includes('plan chosen="1"');
    if (!hasPlan) {
        throw new Error(
            "postMortemToXml: missing plan",
        );
    }
    console.log("PASS: postMortemToXml");
};

const testPlanOptionToXml: TTestRunner = () => {
    const option: TPlanOption = {
        id: 3,
        description: "Refactor module",
        solves_error_because: "reduces depth",
        regression_risk: "medium",
        emergent_risk: "low",
        differs_from_previous: null,
    };
    const xml: string = planOptionToXml(option);
    const hasRoot: boolean =
        xml.startsWith('<chosen_option id="3">')
        && xml.endsWith("</chosen_option>");
    if (!hasRoot) {
        throw new Error(
            "planOptionToXml: missing root",
        );
    }
    const hasDesc: boolean =
        xml.includes(
            "<description>"
            + "Refactor module"
            + "</description>",
        );
    if (!hasDesc) {
        throw new Error(
            "planOptionToXml: missing desc",
        );
    }
    const hasSolves: boolean =
        xml.includes("<solves_error_because>");
    if (!hasSolves) {
        throw new Error(
            "planOptionToXml: missing solves",
        );
    }
    const hasRegression: boolean =
        xml.includes("<regression_risk>");
    if (!hasRegression) {
        throw new Error(
            "planOptionToXml: missing risk",
        );
    }
    const hasDiffers: boolean =
        xml.includes(
            "<differs_from_previous>"
            + "null"
            + "</differs_from_previous>",
        );
    if (!hasDiffers) {
        throw new Error(
            "planOptionToXml: null not handled",
        );
    }
    console.log("PASS: planOptionToXml");
};

testErrorsToXml();
testFileToXml();
testPostMortemToXml();
testPlanOptionToXml();

console.log(
    "\nAll XML transform tests passed.",
);
