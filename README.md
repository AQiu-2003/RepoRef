# RepoRef - 代码仓库向量搜索工具

RepoRef 是一个强大的代码仓库向量搜索工具，可以对代码库进行语法分析，提取函数、类、方法等语法单元，并为它们生成嵌入向量，便于使用自然语言查询相关代码片段。

## 特点

- 使用 ts-morph 进行代码分析，提取有意义的语法单元
- 根据语法结构进行智能分片，确保代码片段的完整性
- 根据代码行数进行分片，每个分片不超过50行
- 使用 Ollama 生成嵌入向量
- 使用 LanceDB 存储和检索向量数据
- 支持自然语言查询

## 安装

```bash
# 安装依赖
pnpm install
```

## 使用方法

### 1. 索引代码库

```bash
# 索引当前目录
pnpm index -d ./ -o ./lancedb

# 索引指定目录
pnpm index -d /path/to/your/codebase -o ./lancedb
```

参数说明：
- `-d, --directory <path>`: 要索引的代码库路径（默认为 "./your-codebase"）
- `-o, --output <path>`: LanceDB 数据库路径（默认为 "./lancedb"）

### 2. 查询代码

```bash
# 交互式查询
pnpm query -d ./lancedb

# 直接查询
pnpm query -d ./lancedb -q "如何处理异步操作" -k 5
```

参数说明：
- `-d, --database <path>`: LanceDB 数据库路径（默认为 "./lancedb"）
- `-q, --query <text>`: 搜索查询文本（如果不提供，将进入交互模式）
- `-k, --top-k <number>`: 返回最相关的结果数量（默认为 5）

## 工作原理

1. 扫描代码库中的所有 TypeScript/JavaScript 文件
2. 使用 ts-morph 分析源代码，提取语法单元（函数、类、方法等）
3. 将代码按语法单元分片，确保每个分片不超过50行
4. 为每个语法单元生成嵌入向量
5. 将嵌入向量和原始代码存储在 LanceDB 中
6. 查询时，将自然语言转换为嵌入向量，在 LanceDB 中查找最相似的代码片段

## 要求

- Node.js 16+
- Ollama 服务运行（用于生成嵌入向量）