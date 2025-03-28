import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  getFileContentHandler,
  getFileContentToolSchema,
  getFileListHandler,
  getFileListToolSchema,
  getRepoHandler,
  getRepoToolSchema,
  searchRepoHandler,
  searchRepoToolSchema,
} from "./tools/index.js";
import { Config } from "./types.js";
import { readConfig } from "./utils/config.js";
import { buildRepoCache } from "./utils/search.js";

/**
 * 创建并启动 MCP 服务器
 */
export async function startServer(configObject?: Config): Promise<void> {
  // 读取配置
  const config = configObject || (await readConfig());

  // 获取可用仓库信息描述
  const reposDescription = config.repos
    .map((repo) => {
      return `- ${repo.name} ${repo.alias ? ` (alias: ${repo.alias})` : ""}: ${
        repo.description
      }`;
    })
    .join("\n");

  // 创建服务器的描述，包含可用仓库信息
  const serverDescription = `
This is a tool for accessing the content of Git repositories. You can use it a few times to retrieve source code.
And when you meet the following problem, you can use it to get the source code: ${
    config.globalDescription
  }

Available repositories:
${config.repos.length > 0 ? reposDescription : "No repositories available now."}
  `.trim();

  // 初始化仓库文件缓存
  console.log("Initializing repository file cache...");
  try {
    // 异步加载所有仓库的默认分支缓存
    const cachePromises = config.repos.map(async (repo) => {
      if (repo.branches && repo.branches.length > 0) {
        const defaultBranch = repo.branches[0].name;
        console.log(
          `Preloading cache for repository ${repo.name} on branch ${defaultBranch}...`
        );
        await buildRepoCache(repo.name, defaultBranch);
      }
    });

    // 不等待缓存完成，让它在后台异步处理
    cachePromises.forEach((p) =>
      p.catch((e) => console.error(`Cache initialization error: ${e.message}`))
    );
  } catch (error) {
    console.error("Cache initialization error:", error);
  }

  // 创建 MCP 服务器
  const server = new McpServer(
    {
      name: "RepoRef",
      version: "1.0.0",
    },
    {
      instructions: serverDescription,
    }
  );

  // 注册工具
  server.tool(
    "get_repo",
    `
You should use this tool first and use it several times to ensure you get the correct repository name/branch and necessary prompts.
And then use the other tools to get the file list and file content.
`,
    getRepoToolSchema,
    getRepoHandler
  );
  server.tool(
    "get_file_list",
    `
You should use this tool after you get the repository information.
`,
    getFileListToolSchema,
    getFileListHandler
  );
  server.tool(
    "get_file_content",
    `
You should use this tool after you get the repository information and file list.
`,
    getFileContentToolSchema,
    getFileContentHandler
  );
  server.tool(
    "search_repo",
    `
After you get the repository information, you can use this tool to search for matching files. Support fuzzy matching and case-insensitive search.
For example: Using "test" can match files like "src/test/index.ts" and "src/TEST/type.ts".
`,
    searchRepoToolSchema,
    searchRepoHandler
  );
  //   server.tool(
  //     "manage_cache",
  //     `
  // You can use this tool to manage the file cache. You can check the cache status or refresh the cache.
  // `,
  //     manageCacheToolSchema,
  //     manageCacheHandler
  //   );

  // 连接到 STDIO 传输
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
