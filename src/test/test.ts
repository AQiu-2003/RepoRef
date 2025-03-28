import fs from "fs-extra";
import path from "path";
import { Command } from "commander";
import ProgressBar from "progress";
import Tinypool from "tinypool";
import { connect } from "@lancedb/lancedb";
import * as arrow from "apache-arrow";
import physicalCpuCount from "physical-cpu-count";

// 通过 commander 定义 CLI 参数
const program = new Command();
program
  .option("-d, --directory <path>", "目录路径", "./your-codebase")
  .option("-o, --output <path>", "LanceDB 数据库路径", "./lancedb")
  .parse(process.argv);

const options = program.opts();

// 清理并重新创建数据库目录
if (fs.existsSync(options.output)) {
  fs.rmSync(options.output, { recursive: true, force: true });
}
fs.mkdirSync(options.output, { recursive: true });

// 递归获取指定目录下所有文件
function getFilesInDirectory(dir: string): string[] {
  const files: string[] = [];

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // 排除 node_modules 和 .git 目录
      if (item !== "node_modules" && item !== ".git" && !item.startsWith(".")) {
        files.push(...getFilesInDirectory(fullPath));
      }
    } else if (
      stat.isFile() &&
      (fullPath.endsWith(".ts") ||
        fullPath.endsWith(".tsx") ||
        fullPath.endsWith(".js") ||
        fullPath.endsWith(".jsx"))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

// 创建工作线程池
const pool = new Tinypool({
  maxThreads: Math.max(1, physicalCpuCount - 1),
  filename: new URL("./worker.cjs", import.meta.url).href,
});

// 确保在不需要时销毁池
process.on("beforeExit", async () => {
  await pool.destroy();
});

// 处理文件并生成嵌入
async function embedFiles() {
  // 初始化 LanceDB
  const db = await connect(options.output);

  try {
    // 获取所有文件
    const files = getFilesInDirectory(options.directory);

    // 创建进度条
    const bar = new ProgressBar(
      "🔥索引中 :current/:total [:bar] :percent :etas | :file",
      {
        total: files.length,
        width: 40,
      }
    );

    // 准备任务数据
    const tasks = files.map((file) => ({
      file,
      content: fs.readFileSync(file, "utf8"),
    }));

    // 使用 Promise.all 并行处理所有文件
    const allResults = await Promise.all(
      tasks.map(async (task) => {
        const results = await pool.run(task);
        bar.tick(1, { file: task.file });
        return results;
      })
    );

    // 压平结果数组并过滤成功的结果
    const successfulResults = allResults
      .flat()
      .filter((r) => r.success && r.embedding);

    if (successfulResults.length > 0) {
      // 准备数据并添加到表格
      const data = successfulResults.map((r) => ({
        vector: r.embedding,
        file: r.file,
        type: r.type || "代码片段",
        name: r.name || "",
        content: r.content,
        startLine: r.startLine || 1,
        endLine: r.endLine || (r.content ? r.content.split("\n").length : 1),
      }));

      // 将数据添加到 LanceDB
      await db.createTable("code_embeddings", data, {
        mode: "overwrite",
        existOk: true,
      });
    }

    // 统计结果
    const totalFragments = successfulResults.length;
    const processedFiles = new Set(successfulResults.map((r) => r.file)).size;
    const failedResults = allResults.flat().filter((r) => !r.success);
    const failCount = failedResults.length;

    console.log(`\n✅ 索引完成！`);
    console.log(`成功处理的文件数：${processedFiles} 个`);
    console.log(`成功生成的代码片段数：${totalFragments} 个`);
    if (failCount > 0) {
      console.log(`失败文件：${failCount} 个`);
      failedResults.forEach((r) => console.log(`- ${r.file}: ${r.error}`));
    }
  } catch (error) {
    console.error("处理过程中发生错误:", error);
  } finally {
    await pool.destroy();
  }
}

// 运行主程序
embedFiles().catch(console.error);
