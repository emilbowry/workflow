import { exec } from "child_process";
import { promisify } from "util";
import type { TCommitData } from "./types.ts";

const execAsync = promisify(exec);

type TComposeCommitMessage = (data: TCommitData) => string;

const composeCommitMessage: TComposeCommitMessage = (data) => {
    const subject: string = "fix(" + data.rule + "): " + data.filePath;
    const chosen: string = "Chosen approach: " + data.plan.chosen_reason;
    const options: string = data.plan.options
        .map(
            (opt) =>
                "  " +
                String(opt.id) +
                ". " +
                opt.description +
                " — " +
                opt.regression_risk,
        )
        .join("\n");
    const attempts: string = "Attempts: " + String(data.postMortem.length + 1);
    return (
        subject +
        "\n\n" +
        chosen +
        "\n\n" +
        "Options considered:\n" +
        options +
        "\n\n" +
        attempts
    );
};

type TCommitFile = (filePath: string, message: string) => Promise<void>;

const commitFile: TCommitFile = async (filePath, message) => {
    await execAsync("git add " + JSON.stringify(filePath));
    await execAsync("git commit -m " + JSON.stringify(message));
};

export { composeCommitMessage, commitFile };
