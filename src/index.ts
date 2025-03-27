#!/usr/bin/env node

import { startServer } from "./server.js";
import {
  ensureConfigFile,
  ensureRepoRefDirs,
  readConfig,
} from "./utils/config.js";
import { cloneRepo, updateRepo } from "./utils/git.js";

if (process.env.NODE_ENV === "development") {
  import("mcps-logger/console");
} else {
  // 在生产环境中，禁用所有日志输出
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.debug = () => {};
}

/**
 * 初始化所有仓库
 */
async function initRepos() {
  const config = await readConfig();

  // 克隆配置中的所有仓库
  for (const repo of config.repos) {
    try {
      await cloneRepo(repo);
      await updateRepo(repo.name);
    } catch (error) {
      console.error(`📦 Failed to initialize repository ${repo.name}:`, error);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  const command = args[0] || "start";

  // 确保配置目录和文件存在
  await ensureRepoRefDirs();
  await ensureConfigFile();

  switch (command) {
    case "start":
      // 初始化仓库
      await initRepos();

      // 启动MCP服务器
      console.log("⏳ Starting RepoRef MCP server...");
      await startServer();
      break;

    case "init":
      // 仅初始化仓库
      await initRepos();
      console.log("📦 Repository initialization completed");
      break;

    default:
      console.log("⚠️ Unknown command:", command);
      console.log("Available commands: start, init");
      process.exit(1);
  }
}

// 执行主函数
main().catch((error) => {
  console.error("⚠️ Error:", error);
  process.exit(1);
});
