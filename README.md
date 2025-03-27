# RepoRef

RepoRef 是一个帮助 AI Agent 获取外部 Git 仓库信息的 MCP 服务器。它允许 AI 助手通过 MCP 协议访问和浏览 Git 仓库的内容，从而能够更好地理解和处理代码相关的问题。

[English Version](./README_en.md)

## 功能特点

- 支持多个 Git 仓库的配置和管理
- 提供仓库信息、文件列表和文件内容的查询接口
- 与 MCP 协议无缝集成，方便 AI 助手调用
- 支持仓库别名和分支管理
- 自动克隆和更新配置的仓库

## 安装

```json
{
  "mcpServers": {
    "RepoRef": {
      "command": "npx",
      "args": [
        "-y",
        "repo-ref-mcp"
      ]
    }
  }
}
```

如果你在使用 nvm：

```json
{
  "mcpServers": {
    "RepoRef": {
      "command": "your/absolute/path/to/npx",
      "args": [
        "-y",
        "repo-ref-mcp"
      ]
    }
  }
}
```

## 配置

首次运行时，RepoRef 会在 `~/.repo-ref/` 目录下创建默认配置文件。您可以编辑此文件来添加您的仓库：

```yaml
# ~/.repo-ref/config.yml
repos:
  - name: my-repo
    alias: [mr, myrepo]
    url: https://github.com/username/my-repo.git
    description: "我的示例仓库"
    defaultPath: src
    branches:
      - name: main
        description: "主分支"
      - name: dev
        description: "开发分支"
```

### 仅初始化仓库

```bash
npx repo-ref-mcp init
```

### 在开发模式下运行

```bash
# 克隆仓库后
cd repo-ref-mcp
pnpm install
pnpm dev
```

## MCP 工具

RepoRef 提供以下 MCP 工具：

1. `get_repo` - 获取仓库信息和可用分支
2. `get_file_list` - 获取指定仓库和分支的文件列表
3. `get_file_content` - 获取指定文件的内容

## 开发

```bash
# 克隆仓库
git clone https://github.com/username/repo-ref-mcp.git
cd repo-ref-mcp

# 安装依赖
pnpm install

# 开发模式运行
pnpm dev

# 构建
pnpm build
```

## 许可证

ISC