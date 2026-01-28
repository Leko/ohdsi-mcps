# ohdsi-mcps
A collection of MCP server for OMOP users (ex. CDM specification, the book of ohdsi, forum, athena)

## Development

### Prerequisites

- Node.js 24+ (see `.nvmrc`)

### npm scripts

| Script | Description |
|--------|-------------|
| `npm run build` | TypeScript type check (no emit) |
| `npm test` | Run tests with vitest |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run cdm` | Start the CDM specification MCP server |
