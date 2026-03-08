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

type TStripLintMeta = (message: string) => string;

const stripLintMeta: TStripLintMeta = (message) =>
    message.replace(/<lint_meta>[\s\S]*?<\/lint_meta>\s*/g, "").trim();

type TErrorsToXml = (errors: ReadonlyArray<TEslintError>) => string;

const errorsToXml: TErrorsToXml = (errors) => {
    const byRule: Map<string, ReadonlyArray<TEslintError>> = new Map();
    errors.forEach((err) => {
        const existing: ReadonlyArray<TEslintError> =
            byRule.get(err.ruleId) ?? [];
        byRule.set(err.ruleId, [...existing, err]);
    });
    const groups: string = Array.from(byRule.entries())
        .map(([rule, errs]) => {
            const locs: string = errs
                .map(
                    (e) =>
                        '    <location line="' +
                        String(e.line) +
                        '" col="' +
                        String(e.column) +
                        '" message="' +
                        escapeXml(stripLintMeta(e.message)) +
                        '" />',
                )
                .join("\n");
            return (
                '  <rule name="' +
                escapeXml(rule) +
                '" severity="' +
                String(errs[0].severity) +
                '" count="' +
                String(errs.length) +
                '">\n' +
                locs +
                "\n  </rule>"
            );
        })
        .join("\n");
    return "<errors>\n" + groups + "\n</errors>";
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
                        escapeXml(stripLintMeta(err.message)) +
                        '" />',
                )
                .join("\n");
            const regressionsStr: string = entry.regressions
                .map(
                    (reg) =>
                        '      <regression rule="' +
                        escapeXml(reg.rule) +
                        '" count="' +
                        String(reg.count) +
                        '" flags="' +
                        escapeXml(reg.flags) +
                        '" fix="' +
                        escapeXml(reg.fix) +
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
                "    <regressions>\n" +
                regressionsStr +
                "\n" +
                "    </regressions>\n" +
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

type TLintMetaFields = {
    flags: string;
    fix: string;
    pitfalls: string;
    avoid: string;
    related: string;
    philosophy: string;
} | undefined;

type TTargetRuleToXml = (triage: TTriageResult, meta: TLintMetaFields) => string;

const targetRuleToXml: TTargetRuleToXml = (triage, meta) => {
    const locs: string = triage.locations
        .map((loc) => '    <location line="' + loc + '" />')
        .join("\n");
    const metaXml: string = meta
        ? "  <lint_meta>\n" +
              "    <flags>" + escapeXml(meta.flags) + "</flags>\n" +
              "    <fix>" + escapeXml(meta.fix) + "</fix>\n" +
              "    <pitfalls>" + escapeXml(meta.pitfalls) + "</pitfalls>\n" +
              "    <avoid>" + escapeXml(meta.avoid) + "</avoid>\n" +
              "    <related>" + escapeXml(meta.related) + "</related>\n" +
              "    <philosophy>" + escapeXml(meta.philosophy) + "</philosophy>\n" +
              "  </lint_meta>"
        : "";
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
    return (
        "<target_rule>\n" +
        rule +
        "\n" +
        metaXml +
        "\n" +
        approach +
        "\n" +
        "</target_rule>"
    );
};

export {
    escapeXml,
    errorsToXml,
    fileToXml,
    postMortemToXml,
    planOptionToXml,
    targetRuleToXml,
};
