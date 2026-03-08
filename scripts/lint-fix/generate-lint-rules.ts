import type { TLintMeta } from
    "../../type-based/type-based.types";

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { LINT_META as maxTotalDepth } from
    "../../rules/max-total-depth";
import { LINT_META as noNestedFunction } from
    "../../rules/no-nested-function";
import { LINT_META as restrictReturnCount } from
    "../../rules/restrict-return-count";
import { LINT_META as enforceRecordType } from
    "../../type-based/enforce-record-type";
import { LINT_META as maxTypeNesting } from
    "../../type-based/max-type-nesting";
// eslint config name: no-duplicate-type-structure
import {
    LINT_META as noDuplicateTypeStructure,
} from "../../type-based/no-duplicate-type-structure";
import { LINT_META as noSingleFieldType } from
    "../../type-based/no-single-field-type";
import { LINT_META as preferCallSignature } from
    "../../type-based/prefer-call-signature";
import {
    LINT_META as requireExtractedTypes,
} from "../../type-based/require-extracted-types";
import {
    LINT_META as requireParametricRecord,
} from "../../type-based/require-parametric-record";
import { LINT_META as validGenerics } from
    "../../type-based/valid-generics";
import { LINT_META as requireRestParamsTuple } from
    "../../rules/require-rest-params-tuple";
import {
    LINT_META as finiteDomainReturnWidening,
} from "../../type-based/finite-domain-return-widening";
import { LINT_META as typeDistance } from
    "../../type-based/type-distance";
import {
    LINT_META as cardinalityIsomorphicFamilies,
} from "../../type-based/cardinality-isomorphic-families";
import { LINT_META as transportGraph } from
    "../../type-based/transport-graph";
import { LINT_META as fiberCoherence } from
    "../../type-based/fiber-coherence";

import externalRegistry from "./external-rules";

type TRuleEntry = readonly [string, TLintMeta];

type TEscaper = (text: string) => string;

const escapeXml: TEscaper = (text) =>
    text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const customRules: ReadonlyArray<TRuleEntry> = [
    [
        "local/max-total-depth",
        maxTotalDepth,
    ],
    [
        "local/no-nested-function",
        noNestedFunction,
    ],
    [
        "local/restrict-return-count",
        restrictReturnCount,
    ],
    [
        "local/enforce-record-type",
        enforceRecordType,
    ],
    [
        "local/max-type-nesting",
        maxTypeNesting,
    ],
    [
        "local/no-duplicate-type-structure",
        noDuplicateTypeStructure,
    ],
    [
        "local/no-single-field-type",
        noSingleFieldType,
    ],
    [
        "local/prefer-call-signature",
        preferCallSignature,
    ],
    [
        "local/require-extracted-function-type",
        requireExtractedTypes,
    ],
    [
        "local/require-parametric-record",
        requireParametricRecord,
    ],
    [
        "local/valid-generics",
        validGenerics,
    ],
    [
        "local/require-rest-params-tuple",
        requireRestParamsTuple,
    ],
    [
        "local/finite-domain-return-widening",
        finiteDomainReturnWidening,
    ],
    [
        "local/type-distance",
        typeDistance,
    ],
    [
        "local/cardinality-isomorphic-families",
        cardinalityIsomorphicFamilies,
    ],
    [
        "local/transport-graph",
        transportGraph,
    ],
    [
        "local/fiber-coherence",
        fiberCoherence,
    ],
];

type TRuleXmlBuilder = (
    entry: TRuleEntry,
) => string;

const buildRuleXml: TRuleXmlBuilder = (
    entry,
) => {
    const [name, meta]: TRuleEntry = entry;
    const flags: string =
        "    <flags>"
        + escapeXml(meta.flags)
        + "</flags>";
    const fix: string =
        "    <fix>"
        + escapeXml(meta.fix)
        + "</fix>";
    return '  <rule name="'
        + escapeXml(name)
        + '">\n'
        + flags
        + "\n"
        + fix
        + "\n"
        + "  </rule>";
};

type TXmlBuilder = () => string;

const buildLintRulesSection: TXmlBuilder = () => {
    const externalEntries: ReadonlyArray<
        TRuleEntry
    > = Array.from(externalRegistry.entries());
    const allEntries: ReadonlyArray<TRuleEntry> =
        [
            ...customRules,
            ...externalEntries,
        ];
    const rules: string = allEntries
        .map(buildRuleXml)
        .join("\n");
    return "<lint_rules>\n"
        + rules
        + "\n</lint_rules>";
};

const RULE_INTERACTIONS: string =
    "<rule_interactions>\n"
    + "  <interaction>\n"
    + "    indent --fix + ternary chains"
    + " → cascading"
    + " max-total-depth violations.\n"
    + "    Prettier reformats ternaries;"
    + " --fix re-indents;"
    + " depth exceeds 3.\n"
    + "    Solution: use switch+let"
    + " for 4+ branches.\n"
    + "  </interaction>\n"
    + "  <interaction>\n"
    + "    restrict-return-count +"
    + " if-chains → multiple returns.\n"
    + "    Solution: ternary (2-3 branches)"
    + " or switch+let+single-return"
    + " (4+).\n"
    + "  </interaction>\n"
    + "  <interaction>\n"
    + "    consistent-type-assertions:never"
    + " + Map-based dispatch"
    + " → cannot cast.\n"
    + "    Solution: switch dispatch with"
    + " type narrowing in each case.\n"
    + "  </interaction>\n"
    + "  <interaction>\n"
    + "    functional/no-let +"
    + " switch dispatch → tension.\n"
    + "    Known: switch+let is the only"
    + " pattern satisfying\n"
    + "    return-count + depth +"
    + " assertions simultaneously."
    + " Accepted trade-off.\n"
    + "  </interaction>\n"
    + "  <interaction>\n"
    + "    Record access +"
    + " no-unnecessary-condition"
    + " → ?? flagged.\n"
    + "    Record&lt;K,V&gt;[k] returns V"
    + " (never undefined),"
    + " so ?? is unnecessary.\n"
    + "    Solution: use Map for lookups"
    + " needing T|undefined.\n"
    + "  </interaction>\n"
    + "  <interaction>\n"
    + "    prettier ternary formatting +"
    + " indent → permanent"
    + " incompatibility\n"
    + "    on deep ternaries. No prettier"
    + " config fixes this.\n"
    + "    Solution: max 3 ternary"
    + " branches.\n"
    + "  </interaction>\n"
    + "  <interaction>\n"
    + "    no-nested-function + ESLint"
    + " handler pattern → need"
    + " PA boundary.\n"
    + "    Solution: IIFE"
    + " (() => (node) => work)()"
    + " or .bind(null, context).\n"
    + "  </interaction>\n"
    + "</rule_interactions>";

const CANONICAL_PATTERNS: string =
    "<canonical_patterns>\n"
    + '  <pattern name="try-dispatch">\n'
    + "    For T|undefined returns:"
    + " tryX(node) ?? tryY(node)"
    + " ?? fallback.\n"
    + "    Each tryX returns"
    + " T|undefined.\n"
    + "    Satisfies: single return,"
    + " no let, no depth issues.\n"
    + "  </pattern>\n"
    + '  <pattern name="switch-dispatch">\n'
    + "    For mandatory returns:\n"
    + "    let result: T; switch(x)"
    + " { case A: result = f(x);"
    + " break; } return result;\n"
    + "    Satisfies: single return,"
    + " depth ≤3, type narrowing"
    + " in cases.\n"
    + "    Violates: no-let"
    + " (accepted trade-off).\n"
    + "  </pattern>\n"
    + '  <pattern name="pa-thunk">\n'
    + "    IIFE:"
    + " (() => (node: T) => work)()\n"
    + "    Or .bind():"
    + " handler.bind(null, context)\n"
    + "    Both valid PA boundaries"
    + " for no-nested-function.\n"
    + "  </pattern>\n"
    + '  <pattern name="string-concat">\n'
    + '    Use "a" + "b" over template'
    + " literals for long strings.\n"
    + "    Template literals cannot be"
    + " broken across lines under"
    + " max-len: 80.\n"
    + "  </pattern>\n"
    + '  <pattern name="type-first">\n'
    + "    Define type alias before"
    + " every const:\n"
    + "    type TFoo = (x: A) => B;\n"
    + "    const foo: TFoo = (x) => ...;\n"
    + "    Satisfies: typedef,"
    + " explicit-function-return-type,\n"
    + "    require-extracted-function"
    + "-type.\n"
    + "  </pattern>\n"
    + "</canonical_patterns>";

type TMain = () => void;

const main: TMain = () => {
    const thisDir: string = dirname(
        fileURLToPath(import.meta.url),
    );
    const outPath: string = resolve(
        thisDir,
        "prompts",
        "lint-rules.xml",
    );
    const xml: string =
        buildLintRulesSection()
        + "\n\n"
        + RULE_INTERACTIONS
        + "\n\n"
        + CANONICAL_PATTERNS
        + "\n";
    writeFileSync(outPath, xml, "utf-8");
};

main();
