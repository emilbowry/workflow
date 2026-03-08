import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
import { readFileSync } from "fs";
import { resolve } from "path";
import type {
    TAgentConfig,
    TAgentResponse,
    TTriageResult,
    TPlan,
} from "./types.ts";

type TPromptsDir = string;

const promptsDir: TPromptsDir = resolve(
    import.meta.dirname ?? __dirname,
    "prompts",
);

type TReadPrompt = (name: string) => string;

const readPrompt: TReadPrompt = (name) =>
    readFileSync(resolve(promptsDir, name), "utf-8");

type TSlotMap = Record<string, string>;

type TInjectSlots = (template: string, slots: TSlotMap) => string;

const injectSlots: TInjectSlots = (template, slots) =>
    Object.entries(slots).reduce(
        (acc: string, [key, val]: [string, string]) =>
            acc.replace("{{" + key + "}}", val),
        template,
    );

type TTemplateParts = {
    system: string;
    user: string;
};

type TSplitTemplate = (filled: string) => TTemplateParts;

const splitTemplate: TSplitTemplate = (filled) => {
    const openTag: string = "<system>";
    const closeTag: string = "</system>";
    const start: number = filled.indexOf(openTag) + openTag.length;
    const end: number = filled.indexOf(closeTag);
    const system: string = filled.slice(start, end).trim();
    const user: string = (
        filled.slice(0, filled.indexOf(openTag)) +
        filled.slice(end + closeTag.length)
    ).trim();
    return { system, user };
};

type TInvokeAgent = (config: TAgentConfig) => Promise<TAgentResponse>;

const invokeAgent: TInvokeAgent = async (config) => {
    const cmd: string =
        "claude --print" +
        " -m " +
        config.model +
        " --system-prompt " +
        JSON.stringify(config.systemPrompt) +
        " " +
        JSON.stringify(config.userPrompt);
    try {
        const result = await execAsync(cmd, {
            maxBuffer: 10 * 1024 * 1024,
        });
        const raw: string = result.stdout;
        return {
            success: raw.length > 0,
            content: raw.trim(),
        };
    } catch {
        return {
            success: false,
            content: "",
        };
    }
};

type TExtractJson = (text: string) => string;

const extractJson: TExtractJson = (text) => {
    const start: number = text.indexOf("{");
    const end: number = text.lastIndexOf("}");
    return start >= 0 && end > start ? text.slice(start, end + 1) : text;
};

type TInvokeAnalyser = (
    errorsXml: string,
    fileXml: string,
) => Promise<TTriageResult>;

const invokeAnalyser: TInvokeAnalyser = async (errorsXml, fileXml) => {
    const template: string = readPrompt("lint-analyser.xml");
    const filled: string = injectSlots(template, {
        ERRORS: errorsXml,
        FILE: fileXml,
    });
    const parts: TTemplateParts = splitTemplate(filled);
    const response: TAgentResponse = await invokeAgent({
        model: "haiku",
        systemPrompt: parts.system,
        userPrompt: parts.user,
    });
    const parsed: TTriageResult = JSON.parse(
        extractJson(response.content),
    ) as TTriageResult;
    return parsed;
};

type TInvokePlanner = (
    targetXml: string,
    errorsXml: string,
    fileXml: string,
    rulesXml: string,
    postMortemXml: string,
) => Promise<TPlan>;

const invokePlanner: TInvokePlanner = async (
    targetXml,
    errorsXml,
    fileXml,
    rulesXml,
    postMortemXml,
) => {
    const template: string = readPrompt("fix-planner.xml");
    const filled: string = injectSlots(template, {
        TARGET_RULE: targetXml,
        ALL_ERRORS: errorsXml,
        FILE: fileXml,
        LINT_RULES: rulesXml,
        POST_MORTEM: postMortemXml,
    });
    const parts: TTemplateParts = splitTemplate(filled);
    const response: TAgentResponse = await invokeAgent({
        model: "opus",
        systemPrompt: parts.system,
        userPrompt: parts.user,
    });
    const outer = JSON.parse(extractJson(response.content)) as { plan?: TPlan };
    const plan: TPlan = outer.plan ? outer.plan : (outer as unknown as TPlan);
    return plan;
};

type TInvokeImplementor = (
    optionXml: string,
    errorsXml: string,
    fileXml: string,
) => Promise<string>;

const invokeImplementor: TInvokeImplementor = async (
    optionXml,
    errorsXml,
    fileXml,
) => {
    const template: string = readPrompt("fix-implementor.xml");
    const filled: string = injectSlots(template, {
        CHOSEN_OPTION: optionXml,
        TARGET_ERRORS: errorsXml,
        FILE: fileXml,
    });
    const parts: TTemplateParts = splitTemplate(filled);
    const response: TAgentResponse = await invokeAgent({
        model: "sonnet",
        systemPrompt: parts.system,
        userPrompt: parts.user,
    });
    const parsed = JSON.parse(extractJson(response.content)) as {
        fixed_file: string;
    };
    return parsed.fixed_file;
};

export { invokeAgent, invokeAnalyser, invokePlanner, invokeImplementor };
