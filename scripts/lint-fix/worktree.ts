import { execSync } from "child_process";
import { createHash } from "crypto";
import { basename } from "path";
import type { TWorktreeInfo } from "./types.ts";

type TCreateWorktree = (
    filePath: string,
) => Promise<TWorktreeInfo>;

const createWorktree: TCreateWorktree = async (
    filePath,
) => {
    const fileHash: string = createHash("sha256")
        .update(filePath)
        .digest("hex")
        .slice(0, 12);
    const worktreePath: string =
        ".worktrees/" + fileHash;
    const fileName: string = basename(filePath);
    const branch: string =
        "lint-fix/" + fileName;
    execSync(
        "git worktree add "
        + JSON.stringify(worktreePath)
        + " -b "
        + JSON.stringify(branch),
        { stdio: "pipe" },
    );
    return {
        path: worktreePath,
        branch,
        fileHash,
    };
};

type TRemoveWorktree = (
    info: TWorktreeInfo,
) => Promise<void>;

const removeWorktree: TRemoveWorktree = async (
    info,
) => {
    execSync(
        "git worktree remove "
        + JSON.stringify(info.path)
        + " --force",
        { stdio: "pipe" },
    );
    execSync(
        "git branch -D "
        + JSON.stringify(info.branch),
        { stdio: "pipe" },
    );
};

type TMergeWorktree = (
    info: TWorktreeInfo,
    targetBranch: string,
) => Promise<void>;

const mergeWorktree: TMergeWorktree = async (
    info,
    targetBranch,
) => {
    execSync(
        "git checkout "
        + JSON.stringify(targetBranch),
        { stdio: "pipe" },
    );
    execSync(
        "git merge "
        + JSON.stringify(info.branch)
        + " --no-edit",
        { stdio: "pipe" },
    );
};

export {
    createWorktree,
    removeWorktree,
    mergeWorktree,
};
