import { exec } from "child_process";
import { promisify } from "util";
import { createHash } from "crypto";
import { basename } from "path";
import type { TWorktreeInfo } from "./types.ts";

const execAsync = promisify(exec);

type TCreateWorktree = (filePath: string) => Promise<TWorktreeInfo>;

const createWorktree: TCreateWorktree = async (filePath) => {
    const fileHash: string = createHash("sha256")
        .update(filePath)
        .digest("hex")
        .slice(0, 12);
    const worktreePath: string = ".worktrees/" + fileHash;
    const fileName: string = basename(filePath);
    const branch: string = "lint-fix/" + fileName;
    try {
        await execAsync(
            "git worktree remove " +
                JSON.stringify(worktreePath) +
                " --force",
        );
    } catch {
        /* worktree may not exist yet */
    }
    try {
        await execAsync("git branch -D " + JSON.stringify(branch));
    } catch {
        /* branch may not exist yet */
    }
    await execAsync(
        "git worktree add " +
            JSON.stringify(worktreePath) +
            " -b " +
            JSON.stringify(branch),
    );
    return {
        path: worktreePath,
        branch,
        fileHash,
    };
};

type TRemoveWorktree = (info: TWorktreeInfo) => Promise<void>;

const removeWorktree: TRemoveWorktree = async (info) => {
    await execAsync(
        "git worktree remove " + JSON.stringify(info.path) + " --force",
    );
    await execAsync("git branch -D " + JSON.stringify(info.branch));
};

type TMergeWorktree = (
    info: TWorktreeInfo,
    targetBranch: string,
) => Promise<void>;

const mergeWorktree: TMergeWorktree = async (info, targetBranch) => {
    await execAsync("git checkout " + JSON.stringify(targetBranch));
    await execAsync("git merge " + JSON.stringify(info.branch) + " --no-edit");
};

export { createWorktree, removeWorktree, mergeWorktree };
