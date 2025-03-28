import lancedb, { connect } from "@lancedb/lancedb";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Command } from "commander";
import fs from "fs-extra";
const program = new Command();

program
  .option("-d, --database <path>", "LanceDB 数据库路径", "./lancedb")
  .option("-k, --top-k <number>", "返回最相关的结果数量", "5")
  .option("-q, --query <text>", "搜索查询文本")
  .parse(process.argv);

const options = program.opts();

// 如果没有提供查询参数，进入交互模式
if (!options.query) {
  console.log("请输入您的自然语言查询 (输入 'exit' 退出):");
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", async (data) => {
    const query = data.toString().trim();

    if (query.toLowerCase() === "exit") {
      console.log("再见！");
      process.exit(0);
    }

    await performSearch(query, options.database, parseInt(options.topK));
    console.log("\n请输入新的查询 (或输入 'exit' 退出):");
  });
} else {
  // 如果提供了查询参数，直接执行搜索
  performSearch(options.query, options.database, parseInt(options.topK))
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("搜索时发生错误:", error);
      process.exit(1);
    });
}

async function performSearch(query: string, dbPath: string, topK: number) {
  console.log(`正在搜索: "${query}"`);

  // 检查数据库是否存在
  if (!fs.existsSync(dbPath)) {
    console.error(`错误: 数据库 "${dbPath}" 不存在，请先运行索引命令`);
    return;
  }

  try {
    // 初始化 Ollama 嵌入模型
    const embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      truncate: true,
    });

    // 生成查询的嵌入向量
    const queryEmbedding = await embeddings.embedQuery(query);

    // 连接到数据库
    const db = await connect(dbPath);
    const table = await db.openTable("code_embeddings");

    // 执行向量搜索并转换为 JavaScript 数组
    const results = await (table.search(queryEmbedding) as lancedb.VectorQuery)
      // .distanceType("cosine")
      // .distanceRange(0.1, 0.2)
      .limit(topK)
      .toArray();

    // console.log(results);

    // 显示结果
    if (results.length === 0) {
      console.log("未找到匹配结果");
      return;
    }

    console.log(`找到 ${results.length} 个匹配结果:`);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      console.log(
        `\n------------- 结果 #${i + 1} (相似度: ${Number(result._distance).toFixed(
          4
        )}) -------------`
      );
      console.log(`文件: ${result.file}`);
      console.log(`类型: ${result.type || "代码片段"}`);
      if (result.name) {
        console.log(`名称: ${result.name}`);
      }
      console.log("\n代码片段:");
      console.log("```");
      console.log(result.content);
      console.log("```");
    }
  } catch (error) {
    console.error("搜索过程中发生错误:", error);
  }
}
