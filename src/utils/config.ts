import fs from "fs-extra";
import { homedir } from "os";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { Config, RepoConfig } from "../types.js";

// 配置目录路径
export const REPO_REF_DIR = path.join(homedir(), ".repo-ref");
export const CONFIG_PATH = path.join(REPO_REF_DIR, "config.yml");
export const REPOS_DIR = path.join(REPO_REF_DIR, "repos");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(dirname(__filename)); // 获取上一级目录
const exampleConfigPath = path.resolve(__dirname, "example-config.yml");

/**
 * 确保配置目录存在（如果存在则不创建）
 */
export async function ensureRepoRefDirs(): Promise<void> {
  await fs.ensureDir(REPO_REF_DIR);
  await fs.ensureDir(REPOS_DIR);
}

/**
 * 创建默认配置文件（如果不存在）
 */
export async function ensureConfigFile(): Promise<void> {
  if (!(await fs.pathExists(CONFIG_PATH))) {
    const defaultConfig: Config = {
      repos: [],
    };
    const configContent = YAML.stringify(defaultConfig);
    const commentedConfig = configContent
      .split("\n")
      .map((line) => (line.trim() ? `# ${line}` : ""))
      .join("\n");
    await fs.writeFile(CONFIG_PATH, commentedConfig);
    console.log(`⚙️ Created commented config file: ${CONFIG_PATH}`);
  }
}

/**
 * 读取配置文件
 */
export async function readConfig(): Promise<Config> {
  try {
    const configContent = await fs.readFile(CONFIG_PATH, "utf8");
    return YAML.parse(configContent) as Config;
  } catch (error) {
    console.error("⚙️ Failed to read config file:", error);
    return { repos: [] };
  }
}

/**
 * 根据名称或别名查找仓库配置
 */
export function findRepoConfig(
  config: Config,
  repoIdentifier: string
): RepoConfig | undefined {
  return config.repos.find(
    (repo: RepoConfig) =>
      repo.name === repoIdentifier ||
      (Array.isArray(repo.alias)
        ? repo.alias.includes(repoIdentifier)
        : repo.alias === repoIdentifier)
  );
}

/**
 * 获取仓库的本地目录路径
 */
export function getRepoDir(repoName: string): string {
  return path.join(REPOS_DIR, repoName);
}
