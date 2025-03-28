import fs from "fs-extra";
import path from "path";
import { getRepoDir } from "./config.js";
import { switchBranch } from "./git.js";

// 文件路径缓存，格式：{ repoName_branch: string[] }
const filePathCache: Record<string, string[]> = {};

/**
 * 扫描仓库文件并构建缓存
 * @param repoName 仓库名称
 * @param branch 分支名称
 * @returns 所有文件的相对路径列表
 */
export async function buildRepoCache(
  repoName: string,
  branch: string
): Promise<string[]> {
  const cacheKey = `${repoName}_${branch}`;

  // 切换到指定分支
  await switchBranch(repoName, branch);

  const repoDir = getRepoDir(repoName);

  if (!(await fs.pathExists(repoDir))) {
    throw new Error(`📦 Repository ${repoName} does not exist`);
  }

  try {
    console.log(
      `📦 Start scanning the files of branch ${branch} of repository ${repoName}...`
    );

    // 递归函数，用于扫描目录
    const scanDir = async (
      dirPath: string,
      relativePath: string = ""
    ): Promise<string[]> => {
      const results: string[] = [];
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemRelativePath = path.join(relativePath, item.name);
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          // 忽略 .git 等常见需要排除的目录
          if (item.name === ".git" || item.name === "node_modules") {
            continue;
          }

          // 递归扫描子目录
          const subResults = await scanDir(fullPath, itemRelativePath);
          results.push(...subResults);
        } else {
          // 添加文件路径
          results.push(itemRelativePath);
        }
      }

      return results;
    };

    // 从仓库根目录开始扫描
    const filePaths = await scanDir(repoDir);

    // 缓存结果
    filePathCache[cacheKey] = filePaths;

    console.log(
      `📦 Repository ${repoName} on branch ${branch} file scanning completed, ${filePaths.length} files found`
    );

    return filePaths;
  } catch (error) {
    console.error(
      `📦 Failed to scan the files of repository ${repoName}:`,
      error
    );
    throw error;
  }
}

/**
 * 搜索仓库中的文件
 * @param repoName 仓库名称
 * @param searchPattern 搜索模式，支持模糊匹配，大小写不敏感
 * @param branch 分支名称
 * @returns 匹配的文件路径列表
 */
export async function searchFiles(
  repoName: string,
  searchPattern: string,
  branch: string
): Promise<string[]> {
  const cacheKey = `${repoName}_${branch}`;

  // 检查缓存是否存在，不存在则构建
  if (!filePathCache[cacheKey]) {
    await buildRepoCache(repoName, branch);
  }

  // 创建不区分大小写的正则表达式
  const pattern = new RegExp(searchPattern, "i");

  // 从缓存中过滤匹配的文件
  const matchedFiles = filePathCache[cacheKey].filter((filePath) =>
    pattern.test(filePath)
  );

  return matchedFiles;
}

/**
 * 清除特定仓库和分支的缓存
 * @param repoName 仓库名称
 * @param branch 分支名称
 */
export function clearRepoCache(repoName: string, branch: string): void {
  const cacheKey = `${repoName}_${branch}`;
  if (filePathCache[cacheKey]) {
    delete filePathCache[cacheKey];
    console.log(`📦 已清除仓库 ${repoName} 的 ${branch} 分支缓存`);
  }
}

/**
 * 获取缓存状态信息
 */
export function getCacheStatus(): Record<string, number> {
  const status: Record<string, number> = {};

  for (const [key, files] of Object.entries(filePathCache)) {
    status[key] = files.length;
  }

  return status;
}
