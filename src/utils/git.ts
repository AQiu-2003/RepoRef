import fs from "fs-extra";
import path from "path";
import { CleanOptions, ResetMode, simpleGit } from "simple-git";
import { RepoConfig } from "../types.js";
import { getRepoDir } from "./config.js";

const git = simpleGit();

/**
 * 克隆仓库，并切换到指定分支
 */
export async function cloneRepo(repo: RepoConfig): Promise<void> {
  const repoDir = getRepoDir(repo.name);

  // 检查仓库是否已经存在
  if (await fs.pathExists(repoDir)) {
    console.log(`📦 Repository ${repo.name} already exists, skipping clone`);
    return;
  }

  console.log(`📦 Cloning repository: ${repo.name} (${repo.url})`);

  try {
    await git.clone(repo.url, repoDir);
    console.log(`📦 Repository ${repo.name} cloned successfully`);

    // 如果有分支配置，切换到第一个分支
    if (repo.branches && repo.branches.length > 0) {
      await switchBranch(repo.name, repo.branches[0].name);
    }
  } catch (error) {
    console.error(`📦 Failed to clone repository ${repo.name}:`, error);
    throw error;
  }
}

/**
 * 更新仓库到最新状态
 */
export async function updateRepo(repoName: string): Promise<void> {
  const repoDir = getRepoDir(repoName);

  if (!(await fs.pathExists(repoDir))) {
    throw new Error(`📦 Repository ${repoName} not found`);
  }

  console.log(`📦 Updating repository: ${repoName}`);

  try {
    const gitRepo = git.cwd(repoDir);
    await gitRepo.fetch(["--all", "--prune"]);
    const currentBranch = (await gitRepo.branch()).current;
    await gitRepo.pull(["--ff-only"]);
    console.log(`📦 Repository ${repoName} updated successfully`);
  } catch (error) {
    console.error(`📦 Failed to update repository ${repoName}:`, error);
    throw error;
  }
}

/**
 * 切换仓库分支
 */
export async function switchBranch(
  repoName: string,
  branchName: string
): Promise<void> {
  const repoDir = getRepoDir(repoName);

  if (!(await fs.pathExists(repoDir))) {
    throw new Error(`📦 Repository ${repoName} not found`);
  }

  console.log(`📦 Checking branch status for repository ${repoName}`);

  try {
    const gitRepo = git.cwd(repoDir);

    // 获取当前分支信息
    const branchInfo = await gitRepo.branch();
    if (branchInfo.current === branchName) {
      console.log(
        `📦 Repository ${repoName} is already on branch ${branchName}`
      );
      return;
    }

    // 获取所有分支信息（包括远程分支）
    await gitRepo.fetch(["--all", "--prune"]);
    const branches = await gitRepo.branch(["-a"]);

    const localBranchExists = branches.all.includes(branchName);
    const remoteBranchExists = branches.all.includes(
      `remotes/origin/${branchName}`
    );

    if (localBranchExists) {
      // 本地分支存在，强制切换
      await gitRepo.checkout(["-f", branchName]);
      // 清理不属于该分支的内容
      await git.clean(CleanOptions.IGNORED_ONLY + CleanOptions.FORCE);
      await gitRepo.reset(ResetMode.HARD, ["HEAD"]);
    } else if (remoteBranchExists) {
      // 只有远程分支存在，创建并切换到跟踪分支
      await gitRepo.checkout(["-f", "--track", `origin/${branchName}`]);
      // 清理不属于该分支的内容
      await gitRepo.clean(["--force", "-d"]);
    } else {
      throw new Error(`Branch ${branchName} not found in local or remote`);
    }

    console.log(`📦 Repository ${repoName} switched to branch ${branchName}`);
  } catch (error) {
    console.error(`📦 Failed to switch repository ${repoName} branch:`, error);
    throw error;
  }
}

/**
 * 列出指定路径下的文件和目录
 */
export async function listFiles(
  repoName: string,
  pathInRepo: string = ""
): Promise<{
  path: string;
  entries: string[];
}> {
  const repoDir = getRepoDir(repoName);
  const fullPath = path.join(repoDir, pathInRepo);

  if (!(await fs.pathExists(fullPath))) {
    throw new Error(`📦 Path ${fullPath} not found`);
  }

  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    return {
      path: fullPath,
      entries: entries.map(
        (entry) => `${entry.name}${entry.isDirectory() ? "/" : ""}`
      ),
    };
  } catch (error) {
    console.error(`📦 Failed to read path ${fullPath}:`, error);
    throw error;
  }
}

/**
 * 读取文件内容
 */
export async function readFileContent(
  repoName: string,
  filePath: string
): Promise<string> {
  const repoDir = getRepoDir(repoName);
  const fullPath = path.join(repoDir, filePath);

  if (!(await fs.pathExists(fullPath))) {
    throw new Error(`📦 File ${fullPath} not found`);
  }

  try {
    const content = await fs.readFile(fullPath, "utf8");
    return content;
  } catch (error) {
    console.error(`📦 Failed to read file ${fullPath}:`, error);
    throw error;
  }
}
