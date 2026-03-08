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

type TCleanEnv = () => NodeJS.ProcessEnv;

const STRIP_KEYS: ReadonlyArray<string> = [
    "CLAUDE_CODE_REMOTE",
    "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_CODE_REMOTE_SESSION_ID",
    "CLAUDE_CODE_CONTAINER_ID",
    "CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR",
    "CLAUDE_CODE_DEBUG",
    "CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES",
    "CLAUDE_CODE_DIAGNOSTICS_FILE",
    "CLAUDE_CODE_ENTRYPOINT",
    "CLAUDE_CODE_VERSION",
    "CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION",
    "CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE",
    "CLAUDE_CODE_REMOTE_SEND_KEEPALIVES",
    "CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2",
    "CLAUDE_CODE_PROXY_RESOLVES_HOSTS",
    "CLAUDE_CODE_BASE_REF",
    "CLAUDE_AUTO_BACKGROUND_TASKS",
    "CLAUDE_AFTER_LAST_COMPACT",
    "CLAUDE_ENABLE_STREAM_WATCHDOG",
    "CLAUDECODE",
    "GLOBAL_AGENT_HTTP_PROXY",
    "GLOBAL_AGENT_HTTPS_PROXY",
];

const cleanEnv: TCleanEnv = () => {
    const env: NodeJS.ProcessEnv = { ...process.env };
    STRIP_KEYS.forEach((key) => {
        delete env[key];
    });
    return env;
};

const AGENT_TIMEOUT_MS: number = 300_000;

const invokeAgent: TInvokeAgent = async (config) => {
    const cmd: string =
        "claude --print" +
        " --model " +
        config.model +
        " --system-prompt " +
        JSON.stringify(config.systemPrompt) +
        " " +
        JSON.stringify(config.userPrompt);
    try {
        const result = await execAsync(cmd, {
            maxBuffer: 10 * 1024 * 1024,
            timeout: AGENT_TIMEOUT_MS,
            env: cleanEnv(),
        });
        const raw: string = result.stdout;
        return {
            success: raw.length > 0,
            content: raw.trim(),
        };
    } catch (err: unknown) {
        const execErr = err as {
            killed?: boolean;
            signal?: string;
            stderr?: string;
            message?: string;
        };
        if (execErr.killed || execErr.signal === "SIGTERM") {
            console.error(
                "  [timeout] claude --print timed out after " +
                    String(AGENT_TIMEOUT_MS / 1000) +
                    "s (model: " +
                    config.model +
                    ")",
            );
        } else {
            const detail: string = (
                execErr.stderr ??
                execErr.message ??
                "unknown error"
            )
                .trim()
                .slice(0, 300);
            console.error(
                "  [agent] claude --print failed (model: " +
                    config.model +
                    "): " +
                    detail,
            );
        }
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
    console.log("    [agent] invoking analyser (haiku)...");
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
    if (!response.success || response.content.length === 0) {
        throw new Error("[agent] analyser (haiku) returned empty response");
    }
    const jsonStr: string = extractJson(response.content);
    if (jsonStr.length === 0 || jsonStr[0] !== "{") {
        throw new Error(
            "[agent] analyser (haiku) returned non-JSON: " +
                response.content.slice(0, 200),
        );
    }
    const parsed: TTriageResult = JSON.parse(jsonStr) as TTriageResult;
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
    console.log("    [agent] invoking planner (opus)...");
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
    if (!response.success || response.content.length === 0) {
        throw new Error("[agent] planner (opus) returned empty response");
    }
    const jsonStr: string = extractJson(response.content);
    if (jsonStr.length === 0 || jsonStr[0] !== "{") {
        throw new Error(
            "[agent] planner (opus) returned non-JSON: " +
                response.content.slice(0, 200),
        );
    }
    const outer = JSON.parse(jsonStr) as { plan?: TPlan };
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
    console.log("    [agent] invoking implementor (sonnet)...");
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
    if (!response.success || response.content.length === 0) {
        throw new Error("[agent] implementor (sonnet) returned empty response");
    }
    const jsonStr: string = extractJson(response.content);
    if (jsonStr.length === 0 || jsonStr[0] !== "{") {
        throw new Error(
            "[agent] implementor (sonnet) returned non-JSON: " +
                response.content.slice(0, 200),
        );
    }
    const parsed = JSON.parse(jsonStr) as {
        fixed_file: string;
    };
    return parsed.fixed_file;
};

export { invokeAgent, invokeAnalyser, invokePlanner, invokeImplementor };
