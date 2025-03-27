import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    getFileContentHandler,
    getFileContentToolSchema,
    getFileListHandler,
    getFileListToolSchema,
    getRepoHandler,
    getRepoToolSchema,
} from "./tools/index.js";
import { Config } from "./types.js";
import { readConfig } from "./utils/config.js";

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

  // 连接到 STDIO 传输
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
