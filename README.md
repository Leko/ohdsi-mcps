# ohdsi-mcps

A collection of MCP (Model Context Protocol) servers for OHDSI/OMOP users.

## Available MCP Servers

| Server | Command | Description |
|--------|---------|-------------|
| **CDM Specification** | `npx ohdsi-mcps` | OMOP CDM v5.4 table/field specifications |
| **OHDSI Forum** | `npx @discourse/mcp --site https://forums.ohdsi.org` | Search and read OHDSI Forum discussions |

## CDM Specification MCP

Provides access to OMOP Common Data Model v5.4 specifications including table schemas, field definitions, and ETL conventions.

### Resources

| URI | Description |
|-----|-------------|
| `cdm://tables` | List all CDM tables |
| `cdm://tables/{tableName}` | Get table details and fields |
| `cdm://tables/{tableName}/fields/{fieldName}` | Get field details |

## OHDSI Forum MCP

Uses the official [Discourse MCP](https://github.com/discourse/discourse-mcp) to search and read posts from [OHDSI Forum](https://forums.ohdsi.org/). No authentication required for read-only access.

### Tools

| Tool | Description |
|------|-------------|
| `discourse_search` | Search topics and posts |
| `discourse_read_topic` | Read topic content |
| `discourse_read_post` | Read specific post |
| `discourse_filter_topics` | Advanced topic filtering |
| `discourse_get_user` | Get user information |

## Setup

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "ohdsi-cdm": {
      "command": "npx",
      "args": ["-y", "ohdsi-mcps"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

### Claude Code

Edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "ohdsi-cdm": {
      "command": "npx",
      "args": ["-y", "ohdsi-mcps"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

### VS Code (GitHub Copilot)

Edit `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "ohdsi-cdm": {
      "command": "npx",
      "args": ["-y", "ohdsi-mcps"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ohdsi-cdm": {
      "command": "npx",
      "args": ["-y", "ohdsi-mcps"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "ohdsi-cdm": {
      "command": "npx",
      "args": ["-y", "ohdsi-mcps"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

### Gemini CLI

Edit `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "ohdsi-cdm": {
      "command": "npx",
      "args": ["-y", "ohdsi-mcps"]
    },
    "ohdsi-forum": {
      "command": "npx",
      "args": ["-y", "@discourse/mcp", "--site", "https://forums.ohdsi.org"]
    }
  }
}
```

## Requirements

- Node.js 24+

## Development

```bash
npm install
npm run build
npm test
```

| Script | Description |
|--------|-------------|
| `npm run build` | Build TypeScript to dist/ |
| `npm test` | Run tests |
| `npm run cdm` | Start CDM MCP server (dev mode) |

## License

Apache-2.0
