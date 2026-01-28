#!/usr/bin/env node

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadTablesWithFields } from "./parser.js";
import type { CdmTableWithFields, CdmField } from "./types.js";

const CDM_VERSION = "5.4";

/**
 * Format table info as Markdown
 */
function formatTableMarkdown(table: CdmTableWithFields): string {
  const lines: string[] = [];

  lines.push(`# ${table.cdmTableName}`);
  lines.push("");
  lines.push(`**Schema:** ${table.schema}`);
  lines.push(`**Required:** ${table.isRequired ? "Yes" : "No"}`);
  if (table.conceptPrefix) {
    lines.push(`**Concept Prefix:** ${table.conceptPrefix}`);
  }
  lines.push("");
  lines.push("## Description");
  lines.push("");
  lines.push(table.tableDescription);

  if (table.userGuidance) {
    lines.push("");
    lines.push("## User Guidance");
    lines.push("");
    lines.push(table.userGuidance);
  }

  if (table.etlConventions) {
    lines.push("");
    lines.push("## ETL Conventions");
    lines.push("");
    lines.push(table.etlConventions);
  }

  lines.push("");
  lines.push("## Fields");
  lines.push("");
  lines.push(
    "| Field Name | Data Type | Required | Primary Key | Foreign Key |"
  );
  lines.push("|------------|-----------|----------|-------------|-------------|");
  for (const field of table.fields) {
    const fkInfo = field.isForeignKey
      ? `${field.fkTableName}.${field.fkFieldName}`
      : "-";
    lines.push(
      `| ${field.cdmFieldName} | ${field.cdmDatatype} | ${field.isRequired ? "Yes" : "No"} | ${field.isPrimaryKey ? "Yes" : "-"} | ${field.isForeignKey ? fkInfo : "-"} |`
    );
  }

  return lines.join("\n");
}

/**
 * Format field info as Markdown
 */
function formatFieldMarkdown(
  field: CdmField,
  tableName: string
): string {
  const lines: string[] = [];

  lines.push(`# ${tableName}.${field.cdmFieldName}`);
  lines.push("");
  lines.push(`**Data Type:** ${field.cdmDatatype}`);
  lines.push(`**Required:** ${field.isRequired ? "Yes" : "No"}`);
  lines.push(`**Primary Key:** ${field.isPrimaryKey ? "Yes" : "No"}`);
  lines.push(`**Foreign Key:** ${field.isForeignKey ? "Yes" : "No"}`);

  if (field.isForeignKey) {
    lines.push("");
    lines.push("### Foreign Key Reference");
    lines.push(`- **Table:** ${field.fkTableName}`);
    lines.push(`- **Field:** ${field.fkFieldName}`);
    if (field.fkDomain) {
      lines.push(`- **Domain:** ${field.fkDomain}`);
    }
    if (field.fkClass) {
      lines.push(`- **Class:** ${field.fkClass}`);
    }
  }

  if (field.userGuidance) {
    lines.push("");
    lines.push("## User Guidance");
    lines.push("");
    lines.push(field.userGuidance);
  }

  if (field.etlConventions) {
    lines.push("");
    lines.push("## ETL Conventions");
    lines.push("");
    lines.push(field.etlConventions);
  }

  return lines.join("\n");
}

/**
 * Format tables list as Markdown
 */
function formatTablesListMarkdown(tables: CdmTableWithFields[]): string {
  const lines: string[] = [];

  lines.push(`# OMOP CDM v${CDM_VERSION} Tables`);
  lines.push("");
  lines.push(`Total tables: ${tables.length}`);
  lines.push("");

  // Group by schema
  const schemas = ["CDM", "VOCAB", "RESULTS"] as const;

  for (const schema of schemas) {
    const schemaTables = tables.filter((t) => t.schema === schema);
    if (schemaTables.length === 0) continue;

    lines.push(`## ${schema} Schema`);
    lines.push("");
    lines.push("| Table Name | Required | Description |");
    lines.push("|------------|----------|-------------|");
    for (const table of schemaTables) {
      const desc =
        table.tableDescription.length > 100
          ? table.tableDescription.slice(0, 100) + "..."
          : table.tableDescription;
      lines.push(
        `| ${table.cdmTableName} | ${table.isRequired ? "Yes" : "No"} | ${desc.replace(/\n/g, " ")} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  // Load CDM data
  const tables = loadTablesWithFields();
  const tableMap = new Map<string, CdmTableWithFields>();
  for (const table of tables) {
    tableMap.set(table.cdmTableName.toLowerCase(), table);
  }

  // Create MCP server
  const server = new McpServer({
    name: "cdm-spec",
    version: "1.0.0",
    description: `OMOP Common Data Model v${CDM_VERSION} Specification Server`,
  });

  // Register resource: List all tables
  server.resource(
    "tables",
    "cdm://tables",
    {
      description: `List all OMOP CDM v${CDM_VERSION} tables with their schemas and descriptions`,
      mimeType: "text/markdown",
    },
    async () => {
      return {
        contents: [
          {
            uri: "cdm://tables",
            mimeType: "text/markdown",
            text: formatTablesListMarkdown(tables),
          },
        ],
      };
    }
  );

  // Register resource template: Get specific table
  server.resource(
    "table",
    new ResourceTemplate("cdm://tables/{tableName}", {
      list: async () => {
        return {
          resources: tables.map((t) => ({
            uri: `cdm://tables/${t.cdmTableName}`,
            name: t.cdmTableName,
            description: t.tableDescription.slice(0, 100),
            mimeType: "text/markdown",
          })),
        };
      },
      complete: {
        tableName: () => tables.map((t) => t.cdmTableName),
      },
    }),
    {
      description:
        "Get detailed information about a specific CDM table including all its fields",
      mimeType: "text/markdown",
    },
    async (uri, params) => {
      const tableName = params.tableName as string;
      const table = tableMap.get(tableName.toLowerCase());

      if (!table) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Table '${tableName}' not found in OMOP CDM v${CDM_VERSION}`,
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: formatTableMarkdown(table),
          },
        ],
      };
    }
  );

  // Register resource template: Get specific field
  server.resource(
    "field",
    new ResourceTemplate("cdm://tables/{tableName}/fields/{fieldName}", {
      list: undefined,
      complete: {
        tableName: () => tables.map((t) => t.cdmTableName),
        fieldName: (_value, context) => {
          const tableName = context?.arguments?.["tableName"];
          if (typeof tableName !== "string") return [];
          const table = tableMap.get(tableName.toLowerCase());
          if (!table) return [];
          return table.fields.map((f) => f.cdmFieldName);
        },
      },
    }),
    {
      description:
        "Get detailed information about a specific field in a CDM table",
      mimeType: "text/markdown",
    },
    async (uri, params) => {
      const tableName = params.tableName as string;
      const fieldName = params.fieldName as string;
      const table = tableMap.get(tableName.toLowerCase());

      if (!table) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Table '${tableName}' not found in OMOP CDM v${CDM_VERSION}`,
            },
          ],
        };
      }

      const field = table.fields.find(
        (f) => f.cdmFieldName.toLowerCase() === fieldName.toLowerCase()
      );

      if (!field) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Field '${fieldName}' not found in table '${tableName}'`,
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: formatFieldMarkdown(field, table.cdmTableName),
          },
        ],
      };
    }
  );

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
