import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import path from "path";
import { z } from "zod";
import { findRepoConfig, readConfig } from "../utils/config.js";
import { listFiles, readFileContent, switchBranch } from "../utils/git.js";

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
