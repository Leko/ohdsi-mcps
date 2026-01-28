# ohdsi-mcps

A collection of MCP (Model Context Protocol) servers for OHDSI/OMOP users.

## Available MCP Servers

| Server | Description | Source |
|--------|-------------|--------|
| **CDM Specification** | OMOP CDM v5.4 table/field specifications | This repository |
| **OHDSI Forum** | Search and read OHDSI Forum discussions | [@discourse/mcp](https://github.com/discourse/discourse-mcp) |

## Setup Guide

### CDM Specification MCP

Provides access to OMOP Common Data Model v5.4 specifications including table schemas, field definitions, and ETL conventions.

#### Available Resources

- `cdm://tables` - List all CDM tables
- `cdm://tables/{tableName}` - Get table details and fields
- `cdm://tables/{tableName}/fields/{fieldName}` - Get field details

### OHDSI Forum MCP

Uses the official Discourse MCP to search and read posts from [OHDSI Forum](https://forums.ohdsi.org/).

#### Available Tools

- `discourse_search` - Search topics and posts
- `discourse_read_topic` - Read topic content
- `discourse_read_post` - Read specific post
- `discourse_filter_topics` - Advanced topic filtering
- `discourse_get_user` - Get user information

## Configuration by Platform

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "cdm-spec": {
      "command": "npx",
      "args": ["tsx", "/path/to/ohdsi-mcps/src/cdm/index.ts"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp@latest", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

### Claude Code

Edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "cdm-spec": {
      "command": "npx",
      "args": ["tsx", "/path/to/ohdsi-mcps/src/cdm/index.ts"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp@latest", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

### VS Code (GitHub Copilot)

Edit `.vscode/mcp.json` in your workspace or user settings:

```json
{
  "servers": {
    "cdm-spec": {
      "command": "npx",
      "args": ["tsx", "/path/to/ohdsi-mcps/src/cdm/index.ts"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp@latest", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

### Gemini CLI

Edit `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "cdm-spec": {
      "command": "npx",
      "args": ["tsx", "/path/to/ohdsi-mcps/src/cdm/index.ts"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp@latest", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "cdm-spec": {
      "command": "npx",
      "args": ["tsx", "/path/to/ohdsi-mcps/src/cdm/index.ts"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp@latest", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "cdm-spec": {
      "command": "npx",
      "args": ["tsx", "/path/to/ohdsi-mcps/src/cdm/index.ts"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp@latest", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

## Requirements

- Node.js 24+ (see `.nvmrc`)
- For OHDSI Forum MCP: `@discourse/mcp` requires Node.js 24+

## Development

### npm scripts

| Script | Description |
|--------|-------------|
| `npm run build` | TypeScript type check (no emit) |
| `npm test` | Run tests with vitest |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run cdm` | Start the CDM specification MCP server |

## License

Apache-2.0
