import { execSync } from "child_process";
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
    readFileSync(
        resolve(promptsDir, name),
        "utf-8",
    );

type TInvokeAgent = (
    config: TAgentConfig,
) => Promise<TAgentResponse>;

const invokeAgent: TInvokeAgent = async (
    config,
) => {
    const raw: string = (() => {
        try {
            return execSync(
                "claude --print"
                + " -m " + config.model
                + " --system-prompt "
                + JSON.stringify(
                      config.systemPrompt,
                  )
                + " "
                + JSON.stringify(
                      config.userPrompt,
                  ),
                {
                    stdio: "pipe",
                    maxBuffer:
                        10 * 1024 * 1024,
                },
            ).toString();
        } catch {
            return "";
        }
    })();
    return {
        success: raw.length > 0,
        content: raw.trim(),
    };
};

type TExtractJson = (text: string) => string;

const extractJson: TExtractJson = (text) => {
    const start: number = text.indexOf("{");
    const end: number = text.lastIndexOf("}");
    return start >= 0 && end > start
        ? text.slice(start, end + 1)
        : text;
};

type TInvokeAnalyser = (
    errorsXml: string,
    fileXml: string,
) => Promise<TTriageResult>;

const invokeAnalyser: TInvokeAnalyser = async (
    errorsXml,
    fileXml,
) => {
    const system: string = readPrompt(
        "lint-analyser.md",
    );
    const user: string =
        errorsXml + "\n\n" + fileXml;
    const response: TAgentResponse =
        await invokeAgent({
            model: "haiku",
            systemPrompt: system,
            userPrompt: user,
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
    const system: string = readPrompt(
        "fix-planner.md",
    );
    const user: string =
        targetXml
        + "\n\n"
        + errorsXml
        + "\n\n"
        + fileXml
        + "\n\n"
        + rulesXml
        + "\n\n"
        + postMortemXml;
    const response: TAgentResponse =
        await invokeAgent({
            model: "opus",
            systemPrompt: system,
            userPrompt: user,
        });
    const outer = JSON.parse(
        extractJson(response.content),
    ) as { plan?: TPlan };
    const plan: TPlan = outer.plan
        ? outer.plan
        : (outer as unknown as TPlan);
    return plan;
};

type TInvokeImplementor = (
    optionXml: string,
    errorsXml: string,
    fileXml: string,
) => Promise<string>;

const invokeImplementor: TInvokeImplementor =
    async (optionXml, errorsXml, fileXml) => {
        const system: string = readPrompt(
            "fix-implementor.md",
        );
        const user: string =
            optionXml
            + "\n\n"
            + errorsXml
            + "\n\n"
            + fileXml;
        const response: TAgentResponse =
            await invokeAgent({
                model: "sonnet",
                systemPrompt: system,
                userPrompt: user,
            });
        const parsed = JSON.parse(
            extractJson(response.content),
        ) as { fixed_file: string };
        return parsed.fixed_file;
    };

export {
    invokeAgent,
    invokeAnalyser,
    invokePlanner,
    invokeImplementor,
};
