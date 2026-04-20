import {
  DEFAULT_VERSION,
  MANIFEST,
  SUPPORTED_VERSIONS,
  findDocumentBySlug,
  hasTable,
  isSupportedVersion,
  listDocuments,
  listFieldsForTable,
  listTables,
  loadDocumentBody,
  type CdmDocumentEntry,
  type CdmField,
  type CdmTable,
  type CdmVersion,
} from "./manifest.js";
import { documentUri } from "./resources.js";

export class UnknownVersionError extends Error {
  constructor(readonly version: string) {
    super(
      `Unknown OMOP CDM version "${version}". ` +
        `Supported versions: ${SUPPORTED_VERSIONS.join(", ")}.`,
    );
    this.name = "UnknownVersionError";
  }
}

export class UnknownTableError extends Error {
  constructor(
    readonly tableName: string,
    readonly version: CdmVersion,
    readonly availableTables: readonly string[],
  ) {
    super(
      `Unknown OMOP CDM table "${tableName}" in version ${version}. ` +
        `Available tables: ${availableTables.join(", ")}.`,
    );
    this.name = "UnknownTableError";
  }
}

export class UnknownDocumentError extends Error {
  constructor(
    readonly slug: string,
    readonly availableSlugs: readonly string[],
  ) {
    super(
      `Unknown OMOP CDM document slug "${slug}". ` +
        `Available slugs: ${availableSlugs.join(", ")}.`,
    );
    this.name = "UnknownDocumentError";
  }
}

export function resolveVersion(version: string | undefined): CdmVersion {
  if (version === undefined) return DEFAULT_VERSION;
  if (!isSupportedVersion(version)) {
    throw new UnknownVersionError(version);
  }
  return version;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function truncate(value: string, max = 200): string {
  const flat = value.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

function renderListTables(version: CdmVersion): string {
  const tables = listTables(version);
  const lines: string[] = [];
  lines.push(`# OMOP CDM v${version} — tables`);
  lines.push("");
  lines.push(
    `- source: ${MANIFEST.source.owner}/${MANIFEST.source.repo} @ ${MANIFEST.source.commit}`,
  );
  lines.push(`- version: ${version}${version === DEFAULT_VERSION ? " (default)" : ""}`);
  lines.push(`- supported versions: ${SUPPORTED_VERSIONS.join(", ")}`);
  lines.push(`- table count: ${tables.length}`);
  lines.push("");
  lines.push("| # | table | schema | required | description |");
  lines.push("| --- | --- | --- | --- | --- |");
  tables.forEach((table, index) => {
    lines.push(
      `| ${index + 1} | \`${table.cdmTableName}\` | ${escapeCell(table.schema)} | ${escapeCell(table.isRequired)} | ${escapeCell(truncate(table.tableDescription))} |`,
    );
  });
  return lines.join("\n");
}

function renderFkTarget(field: CdmField): string {
  if (field.isForeignKey.toLowerCase() !== "yes") return "—";
  const target = field.fkFieldName
    ? `${field.fkTableName}.${field.fkFieldName}`
    : field.fkTableName;
  const domain =
    field.fkDomain && field.fkDomain !== "NA" ? ` (${field.fkDomain})` : "";
  return `${target}${domain}`;
}

function renderListFields(
  version: CdmVersion,
  table: CdmTable,
  fields: readonly CdmField[],
): string {
  const lines: string[] = [];
  lines.push(`# OMOP CDM v${version} — \`${table.cdmTableName}\` fields`);
  lines.push("");
  lines.push(
    `- source: ${MANIFEST.source.owner}/${MANIFEST.source.repo} @ ${MANIFEST.source.commit}`,
  );
  lines.push(`- version: ${version}${version === DEFAULT_VERSION ? " (default)" : ""}`);
  lines.push(`- table: \`${table.cdmTableName}\``);
  lines.push(`- schema: ${escapeCell(table.schema)}`);
  lines.push(`- required table: ${escapeCell(table.isRequired)}`);
  lines.push(`- field count: ${fields.length}`);
  lines.push("");
  lines.push("| # | field | datatype | required | PK | FK target |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  fields.forEach((field, index) => {
    const pk = field.isPrimaryKey.toLowerCase() === "yes" ? "✓" : "";
    lines.push(
      `| ${index + 1} | \`${field.cdmFieldName}\` | ${escapeCell(field.cdmDatatype)} | ${escapeCell(field.isRequired)} | ${pk} | ${escapeCell(renderFkTarget(field))} |`,
    );
  });
  return lines.join("\n");
}

export function callListTables(input: { version?: string | undefined }): string {
  const version = resolveVersion(input.version);
  return renderListTables(version);
}

export function callListFields(input: {
  table: string;
  version?: string | undefined;
}): string {
  const version = resolveVersion(input.version);
  if (!hasTable(version, input.table)) {
    const available = listTables(version).map((t) => t.cdmTableName);
    throw new UnknownTableError(input.table, version, available);
  }
  const target = input.table.toLowerCase();
  const tables = listTables(version);
  const table = tables.find((t) => t.cdmTableName.toLowerCase() === target)!;
  const fields = listFieldsForTable(version, input.table);
  return renderListFields(version, table, fields);
}

export function renderListDocuments(): string {
  const docs = listDocuments();
  const lines: string[] = [];
  lines.push("# OMOP CDM — R Markdown documents");
  lines.push("");
  lines.push(
    `- source: ${MANIFEST.source.owner}/${MANIFEST.source.repo} @ ${MANIFEST.source.commit} (\`rmd/\`)`,
  );
  lines.push(`- document count: ${docs.length}`);
  lines.push("");
  lines.push("| # | slug | title | resource URI |");
  lines.push("| --- | --- | --- | --- |");
  for (const doc of docs) {
    lines.push(
      `| ${doc.order + 1} | \`${doc.slug}\` | ${escapeCell(doc.title)} | \`${documentUri(doc.slug)}\` |`,
    );
  }
  return lines.join("\n");
}

function renderReadDocument(doc: CdmDocumentEntry): string {
  const body = loadDocumentBody(doc);
  const header = [
    `# ${doc.title}`,
    "",
    `- slug: \`${doc.slug}\``,
    `- filename: \`${doc.filename}\``,
    `- resource URI: \`${documentUri(doc.slug)}\``,
    `- source: ${MANIFEST.source.owner}/${MANIFEST.source.repo} @ ${MANIFEST.source.commit}`,
    "",
    "---",
    "",
  ].join("\n");
  return header + body;
}

export function callReadDocument(input: { slug: string }): string {
  const doc = findDocumentBySlug(input.slug);
  if (!doc) {
    throw new UnknownDocumentError(
      input.slug,
      listDocuments().map((d) => d.slug),
    );
  }
  return renderReadDocument(doc);
}
