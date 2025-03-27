import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RepoInfo } from "../types.js";
import { findRepoConfig, readConfig } from "../utils/config.js";

export const getRepoToolSchema = {
  name: z
    .string()
    .describe(
      "The name or alias of the repository, if not provided or error, it will return all available repositories"
    )
    .optional(),
};

/**
 * 获取仓库信息工具
 */
export const getRepoHandler: ToolCallback<typeof getRepoToolSchema> = async (
  { name },
  extra
) => {
  try {
    const config = await readConfig();
    if (!name) {
      // 返回可用仓库列表
      const repos = config.repos.map((repo) => ({
        name: repo.name,
        alias: repo.alias,
        description: repo.description,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ repos }, null, 2),
          },
        ],
      };
    }

    // 查找指定名称的仓库
    const repo = findRepoConfig(config, name);
    if (!repo) {
      const response = {
        message: `仓库 "${name}" 不存在`,
        availableRepos: config.repos.map((r) => ({
          name: r.name,
          alias: r.alias,
          description: r.description,
        })),
      };
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(response, null, 2),
          },
        ],
        isError: true,
      };
    }

    // 返回仓库信息和分支列表
    const repoInfo: RepoInfo = {
      name: repo.name,
      alias: repo.alias,
      description: repo.description,
      branches: repo.branches.map((branch) => ({
        name: branch.name,
        description: branch.description,
      })),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(repoInfo, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `获取仓库信息失败: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
};
