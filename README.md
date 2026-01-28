# ohdsi-mcps

A collection of MCP (Model Context Protocol) servers for OHDSI/OMOP users.

## Available MCP Servers

| Server | Command | Description |
|--------|---------|-------------|
| **CDM Specification** | `npx ohdsi-cdm-mcp` | OMOP CDM v5.4 table/field specifications |
| **Vocabulary** | `npx ohdsi-vocab-mcp` | Search OMOP vocabularies via OMOPHub API |
| **OHDSI Forum** | `npx @discourse/mcp --site https://forums.ohdsi.org` | Search and read OHDSI Forum discussions |

## CDM Specification MCP

Provides access to OMOP Common Data Model v5.4 specifications including table schemas, field definitions, and ETL conventions.

### Resources

| URI | Description |
|-----|-------------|
| `cdm://tables` | List all CDM tables |
| `cdm://tables/{tableName}` | Get table details and fields |
| `cdm://tables/{tableName}/fields/{fieldName}` | Get field details |

## Vocabulary MCP

Search and explore OMOP vocabularies (SNOMED, ICD10, LOINC, RxNorm, etc.) via [OMOPHub API](https://omophub.com).

**Requires API key:** Get your key from [omophub.com](https://omophub.com) and set it via `OMOPHUB_API_KEY` environment variable.

### Tools

| Tool | Description |
|------|-------------|
| `search_concepts` | Search medical concepts across 90+ vocabularies with fuzzy matching |
| `get_concept` | Get detailed concept information by OMOP concept ID |
| `get_ancestors` | Get parent concepts in hierarchy |
| `get_descendants` | Get child concepts in hierarchy |
| `map_concepts` | Map concepts between vocabularies (e.g., SNOMED → ICD10) |
| `list_vocabularies` | List all available medical vocabularies |
| `list_relationship_types` | List relationship types (Is a, Maps to, etc.) |
| `list_domains` | List concept domains (Condition, Drug, Procedure, etc.) |

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
      "args": ["-y", "ohdsi-cdm-mcp"]
    },
    "ohdsi-vocab": {
      "command": "npx",
      "args": ["-y", "ohdsi-vocab-mcp"],
      "env": {
        "OMOPHUB_API_KEY": "oh_your_api_key_here"
      }
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
      "args": ["-y", "ohdsi-cdm-mcp"]
    },
    "ohdsi-vocab": {
      "command": "npx",
      "args": ["-y", "ohdsi-vocab-mcp"],
      "env": {
        "OMOPHUB_API_KEY": "oh_your_api_key_here"
      }
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
      "args": ["-y", "ohdsi-cdm-mcp"]
    },
    "ohdsi-vocab": {
      "command": "npx",
      "args": ["-y", "ohdsi-vocab-mcp"],
      "env": {
        "OMOPHUB_API_KEY": "oh_your_api_key_here"
      }
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
      "args": ["-y", "ohdsi-cdm-mcp"]
    },
    "ohdsi-vocab": {
      "command": "npx",
      "args": ["-y", "ohdsi-vocab-mcp"],
      "env": {
        "OMOPHUB_API_KEY": "oh_your_api_key_here"
      }
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
      "args": ["-y", "ohdsi-cdm-mcp"]
    },
    "ohdsi-vocab": {
      "command": "npx",
      "args": ["-y", "ohdsi-vocab-mcp"],
      "env": {
        "OMOPHUB_API_KEY": "oh_your_api_key_here"
      }
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
      "args": ["-y", "ohdsi-cdm-mcp"]
    },
    "ohdsi-vocab": {
      "command": "npx",
      "args": ["-y", "ohdsi-vocab-mcp"],
      "env": {
        "OMOPHUB_API_KEY": "oh_your_api_key_here"
      }
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
| `npm run vocab` | Start Vocabulary MCP server (dev mode, requires .env) |

## License

Apache-2.0
