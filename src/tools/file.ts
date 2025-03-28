import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import path from "path";
import { z } from "zod";
import { findRepoConfig, readConfig } from "../utils/config.js";
import { listFiles, readFileContent, switchBranch } from "../utils/git.js";
import {
  buildRepoCache,
  clearRepoCache,
  getCacheStatus,
  searchFiles,
} from "../utils/search.js";

export const getFileListToolSchema = {
  repo: z.string().describe("The name or alias of the repository"),
  branch: z.string().describe("The name of the branch"),
  path: z
    .string()
    .describe(
      "The path of the directory, default is the default entry directory"
    )
    .optional(),
};

export const getFileContentToolSchema = {
  repo: z.string().describe("The name or alias of the repository"),
  branch: z.string().describe("The name of the branch"),
  path: z.string().describe("The path of the file, with the extension"),
};

export const searchRepoToolSchema = {
  repo: z.string().describe("The name or alias of the repository"),
  branch: z.string().describe("The name of the branch"),
  pattern: z
    .string()
    .describe("The search pattern, support fuzzy matching, case-insensitive"),
};

export const manageCacheToolSchema = {
  action: z
    .enum(["status", "refresh"])
    .describe(
      "The action of cache management: status-check the status, refresh-refresh the cache"
    ),
  repo: z.string().describe("The name or alias of the repository").optional(),
  branch: z.string().describe("The name of the branch").optional(),
};

/**
 * 获取文件列表工具
 */
export const getFileListHandler: ToolCallback<
  typeof getFileListToolSchema
> = async ({ repo, branch, path: filePath }, extra) => {
  try {
    const config = await readConfig();
    const repoConfig = findRepoConfig(config, repo);
    if (!repoConfig) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Repository "${repo}" not found`,
          },
        ],
        isError: true,
      };
    }

    // 确认分支存在
    const branchConfig = repoConfig.branches.find((b) => b.name === branch);
    if (!branchConfig) {
      const availableBranches = repoConfig.branches
        .map((b) => b.name)
        .join(", ");
      return {
        content: [
          {
            type: "text" as const,
            text: `Branch "${branch}" not found, available branches: ${availableBranches}`,
          },
        ],
        isError: true,
      };
    }

    // 切换到请求的分支
    await switchBranch(repoConfig.name, branch);

    // 默认使用仓库的默认路径
    const actualPath = filePath || repoConfig.defaultPath || "";

    // 获取文件列表
    const files = await listFiles(repoConfig.name, actualPath);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(files),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to get file list: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
};

/**
 * 获取文件内容工具
 */
export const getFileContentHandler: ToolCallback<
  typeof getFileContentToolSchema
> = async ({ repo, branch, path: filePath }, extra) => {
  try {
    const config = await readConfig();
    const repoConfig = findRepoConfig(config, repo);
    if (!repoConfig) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Repository "${repo}" not found`,
          },
        ],
        isError: true,
      };
    }

    // 确认分支存在
    const branchConfig = repoConfig.branches.find((b) => b.name === branch);
    if (!branchConfig) {
      const availableBranches = repoConfig.branches
        .map((b) => b.name)
        .join(", ");
      return {
        content: [
          {
            type: "text" as const,
            text: `Branch "${branch}" not found, available branches: ${availableBranches}`,
          },
        ],
        isError: true,
      };
    }

    // 切换到请求的分支
    await switchBranch(repoConfig.name, branch);

    // 读取文件内容
    const content = await readFileContent(repoConfig.name, filePath);

    // 如果不是markdown文件，用代码块包装
    const fileExtension = path.extname(filePath).toLowerCase();
    const isMarkdown = fileExtension === ".md" || fileExtension === ".markdown";

    const formattedContent = isMarkdown
      ? content
      : `\`\`\`${fileExtension.substring(1) || ""}
${content}
\`\`\``;

    return {
      content: [
        {
          type: "text" as const,
          text: formattedContent,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to get file content: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
};

/**
 * 搜索仓库文件工具
 */
export const searchRepoHandler: ToolCallback<
  typeof searchRepoToolSchema
> = async ({ repo, branch, pattern }, extra) => {
  try {
    const config = await readConfig();
    const repoConfig = findRepoConfig(config, repo);
    if (!repoConfig) {
      return {
        content: [
          {
            type: "text" as const,
            text: `仓库 "${repo}" 不存在`,
          },
        ],
        isError: true,
      };
    }

    // 确认分支存在
    const branchConfig = repoConfig.branches.find((b) => b.name === branch);
    if (!branchConfig) {
      const availableBranches = repoConfig.branches
        .map((b) => b.name)
        .join(", ");
      return {
        content: [
          {
            type: "text" as const,
            text: `分支 "${branch}" 不存在，可用分支: ${availableBranches}`,
          },
        ],
        isError: true,
      };
    }

    // 执行文件搜索
    const results = await searchFiles(repoConfig.name, pattern, branch);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ results }, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `文件搜索失败: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
};

/**
 * 缓存管理工具
 */
export const manageCacheHandler: ToolCallback<
  typeof manageCacheToolSchema
> = async ({ action, repo, branch }, extra) => {
  try {
    const config = await readConfig();

    // 查看缓存状态
    if (action === "status") {
      const status = getCacheStatus();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }

    // 刷新缓存
    if (action === "refresh") {
      // 如果指定了仓库和分支，只刷新特定仓库的缓存
      if (repo && branch) {
        const repoConfig = findRepoConfig(config, repo);
        if (!repoConfig) {
          return {
            content: [
              {
                type: "text" as const,
                text: `仓库 "${repo}" 不存在`,
              },
            ],
            isError: true,
          };
        }

        // 清除旧缓存
        clearRepoCache(repoConfig.name, branch);

        // 重建缓存
        await buildRepoCache(repoConfig.name, branch);

        return {
          content: [
            {
              type: "text" as const,
              text: `已刷新仓库 ${repoConfig.name} 的 ${branch} 分支缓存`,
            },
          ],
        };
      }
      // 刷新所有仓库的缓存
      else {
        // 异步处理所有刷新请求
        const refreshPromises = config.repos.flatMap((repo) =>
          repo.branches.map(async (branch) => {
            // 清除旧缓存
            clearRepoCache(repo.name, branch.name);
            // 重建缓存
            try {
              await buildRepoCache(repo.name, branch.name);
              return `${repo.name}/${branch.name}: 成功`;
            } catch (error) {
              return `${repo.name}/${branch.name}: 失败 - ${
                error instanceof Error ? error.message : String(error)
              }`;
            }
          })
        );

        // 等待所有刷新完成
        const results = await Promise.all(refreshPromises);

        return {
          content: [
            {
              type: "text" as const,
              text: `缓存刷新结果:\n${results.join("\n")}`,
            },
          ],
        };
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `不支持的操作: ${action}`,
        },
      ],
      isError: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `缓存管理出错: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
};
