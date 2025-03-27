# RepoRef

RepoRef is an MCP server that helps AI Agents retrieve information from external Git repositories. It allows AI assistants to access and browse Git repository contents through the MCP protocol, enabling them to better understand and handle code-related questions.

## Features

- Support for configuring and managing multiple Git repositories
- Provides interfaces for querying repository information, file lists, and file contents
- Seamless integration with the MCP protocol for easy invocation by AI assistants
- Support for repository aliases and branch management
- Automatic cloning and updating of configured repositories

## Installation

Ensure you have Node.js >= 22 installed.

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

If you are using nvm:

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

## Configuration

On first run, RepoRef will create a default configuration file in the `~/.repo-ref/` directory. You can edit this file to add your repositories:

```yaml
# ~/.repo-ref/config.yml
repos:
  - name: my-repo
    alias: [mr, myrepo]
    url: https://github.com/username/my-repo.git
    description: "My example repository"
    branches:
      - name: main
        description: "Main branch"
      - name: dev
        description: "Development branch"
```

### Initialize repositories only

```bash
npx repo-ref-mcp init
```

### Run in development mode

```bash
# After cloning the repository
cd repo-ref-mcp
pnpm install
pnpm dev
```

## MCP Tools

RepoRef provides the following MCP tools:

1. `get_repo` - Get repository information and available branches
2. `get_file_list` - Get the file list for a specified repository and branch
3. `get_file_content` - Get the content of a specified file

## Development

```bash
# Clone the repository
git clone https://github.com/username/repo-ref-mcp.git
cd repo-ref-mcp

# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build
```

## License

ISC