import type {
    TEslintError,
    TPostMortem,
    TPlanOption,
    TTriageResult,
} from "./types.ts";

type TEscaper = (text: string) => string;

const escapeXml: TEscaper = (text) =>
    text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

type TErrorsToXml = (errors: ReadonlyArray<TEslintError>) => string;

const errorsToXml: TErrorsToXml = (errors) => {
    const inner: string = errors
        .map(
            (err) =>
                "  <error" +
                ' rule="' +
                escapeXml(err.ruleId) +
                '"' +
                ' severity="' +
                String(err.severity) +
                '"' +
                ' line="' +
                String(err.line) +
                '"' +
                ' col="' +
                String(err.column) +
                '"' +
                ' message="' +
                escapeXml(err.message) +
                '" />',
        )
        .join("\n");
    return "<errors>\n" + inner + "\n</errors>";
};

type TFileToXml = (path: string, content: string) => string;

const fileToXml: TFileToXml = (path, content) =>
    '<file path="' + escapeXml(path) + '">\n' + content + "\n</file>";

type TPostMortemToXml = (pm: TPostMortem) => string;

const postMortemToXml: TPostMortemToXml = (pm) => {
    const entries: string = pm
        .map((entry) => {
            const opts: string = entry.plan.options
                .map(
                    (opt) =>
                        '    <option id="' +
                        String(opt.id) +
                        '">' +
                        escapeXml(opt.description) +
                        "</option>",
                )
                .join("\n");
            const plan: string =
                '    <plan chosen="' +
                String(entry.plan.chosen_option) +
                '" reason="' +
                escapeXml(entry.plan.chosen_reason) +
                '">\n' +
                opts +
                "\n    </plan>";
            const diff: string =
                "    <diff><![CDATA[" + entry.diff + "]]></diff>";
            const remaining: string = entry.remaining_errors
                .map(
                    (err) =>
                        '      <error rule="' +
                        escapeXml(err.ruleId) +
                        '" line="' +
                        String(err.line) +
                        '" message="' +
                        escapeXml(err.message) +
                        '" />',
                )
                .join("\n");
            return (
                '  <attempt n="' +
                String(entry.attempt) +
                '">\n' +
                plan +
                "\n" +
                diff +
                "\n" +
                "    <remaining>\n" +
                remaining +
                "\n" +
                "    </remaining>\n" +
                "  </attempt>"
            );
        })
        .join("\n");
    return "<post_mortem>\n" + entries + "\n" + "</post_mortem>";
};

type TPlanOptionToXml = (option: TPlanOption) => string;

const planOptionToXml: TPlanOptionToXml = (option) => {
    const id: string = String(option.id);
    const desc: string =
        "  <description>" + escapeXml(option.description) + "</description>";
    const solves: string =
        "  <solves_error_because>" +
        escapeXml(option.solves_error_because) +
        "</solves_error_because>";
    const regression: string =
        "  <regression_risk>" +
        escapeXml(option.regression_risk) +
        "</regression_risk>";
    const emergent: string =
        "  <emergent_risk>" +
        escapeXml(option.emergent_risk) +
        "</emergent_risk>";
    const differs: string =
        "  <differs_from_previous>" +
        (option.differs_from_previous === null
            ? "null"
            : escapeXml(option.differs_from_previous)) +
        "</differs_from_previous>";
    return (
        '<chosen_option id="' +
        id +
        '">\n' +
        desc +
        "\n" +
        solves +
        "\n" +
        regression +
        "\n" +
        emergent +
        "\n" +
        differs +
        "\n" +
        "</chosen_option>"
    );
};

type TTargetRuleToXml = (triage: TTriageResult) => string;

const targetRuleToXml: TTargetRuleToXml = (triage) => {
    const locs: string = triage.locations
        .map((loc) => '    <location line="' + loc + '" />')
        .join("\n");
    const rule: string =
        '  <rule name="' +
        escapeXml(triage.rule) +
        '" count="' +
        String(triage.count) +
        '">\n' +
        locs +
        "\n  </rule>";
    const approach: string =
        "  <suggested_approach>" +
        escapeXml(triage.suggested_approach) +
        "</suggested_approach>";
    return "<target_rule>\n" + rule + "\n" + approach + "\n" + "</target_rule>";
};

export {
    escapeXml,
    errorsToXml,
    fileToXml,
    postMortemToXml,
    planOptionToXml,
    targetRuleToXml,
};
