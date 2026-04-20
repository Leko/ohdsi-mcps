import type { Heading, Root, RootContent } from "mdast";
import { toString as nodeToString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";

import {
  SUPPORTED_VERSIONS,
  listDocuments,
  listFields,
  listTables,
  loadDocumentBody,
  type CdmDocumentEntry,
  type CdmField,
  type CdmTable,
  type CdmVersion,
} from "./manifest.js";

export type SearchChunkKind = "rmd" | "csv-table" | "csv-field";

export interface SearchChunk {
  id: string;
  title: string;
  text: string;
  kind: SearchChunkKind;
  category: string;
  documentSlug?: string;
  version?: CdmVersion;
  tableName?: string;
  fieldName?: string;
}

function stripYamlFrontmatter(text: string): string {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return text;
  return text.slice(end + 4).replace(/^\r?\n/, "");
}

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "section"
  );
}

function isHeading(node: RootContent): node is Heading {
  return node.type === "heading";
}

function isCodeNode(node: RootContent): boolean {
  return node.type === "code";
}

function collectText(nodes: RootContent[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (isCodeNode(node)) continue;
    const text = nodeToString(node).trim();
    if (text) parts.push(text);
  }
  return parts.join("\n\n");
}

export function chunkDocument(doc: CdmDocumentEntry, body: string): SearchChunk[] {
  const cleaned = stripYamlFrontmatter(body);
  const tree = unified().use(remarkParse).parse(cleaned) as Root;
  const chunks: SearchChunk[] = [];
  const usedIds = new Set<string>();

  let currentHeading: string | null = null;
  let currentNodes: RootContent[] = [];
  let hasPreamble = false;

  const flush = (headingText: string | null) => {
    const text = collectText(currentNodes);
    currentNodes = [];
    if (!text) return;
    const headingLabel = headingText ?? doc.title;
    const base = slugifyHeading(headingLabel);
    let id = `rmd-${doc.slug}-${base}`;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `rmd-${doc.slug}-${base}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    chunks.push({
      id,
      title: `${headingLabel} | ${doc.title}`,
      text,
      kind: "rmd",
      category: `document / ${doc.slug}`,
      documentSlug: doc.slug,
    });
  };

  for (const node of tree.children) {
    if (isHeading(node)) {
      if (currentHeading !== null || hasPreamble) {
        flush(currentHeading);
      }
      currentHeading = nodeToString(node).trim() || null;
      hasPreamble = false;
    } else {
      currentNodes.push(node);
      if (currentHeading === null) hasPreamble = true;
    }
  }
  flush(currentHeading);

  return chunks;
}

function joinCells(...values: Array<string | undefined>): string {
  return values
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0 && v !== "NA")
    .join("\n\n");
}

export function chunkTableRow(
  version: CdmVersion,
  table: CdmTable,
): SearchChunk {
  const text = joinCells(
    table.tableDescription,
    table.userGuidance,
    table.etlConventions,
  );
  return {
    id: `csv-table-${version}-${table.cdmTableName}`,
    title: `${table.cdmTableName} | OMOP CDM v${version} table`,
    text,
    kind: "csv-table",
    category: `v${version} / table / ${table.cdmTableName}`,
    version,
    tableName: table.cdmTableName,
  };
}

export function chunkFieldRow(
  version: CdmVersion,
  field: CdmField,
): SearchChunk {
  const fkTarget =
    field.isForeignKey.toLowerCase() === "yes"
      ? `foreign key → ${field.fkTableName}${field.fkFieldName ? `.${field.fkFieldName}` : ""}${field.fkDomain && field.fkDomain !== "NA" ? ` (${field.fkDomain})` : ""}`
      : "";
  const text = joinCells(
    `datatype: ${field.cdmDatatype}`,
    `required: ${field.isRequired}`,
    field.isPrimaryKey.toLowerCase() === "yes" ? "primary key" : "",
    fkTarget,
    field.userGuidance,
    field.etlConventions,
  );
  return {
    id: `csv-field-${version}-${field.cdmTableName}-${field.cdmFieldName}`,
    title: `${field.cdmTableName}.${field.cdmFieldName} | OMOP CDM v${version} field`,
    text,
    kind: "csv-field",
    category: `v${version} / field / ${field.cdmTableName}.${field.cdmFieldName}`,
    version,
    tableName: field.cdmTableName,
    fieldName: field.cdmFieldName,
  };
}

export function buildAllChunks(): SearchChunk[] {
  const chunks: SearchChunk[] = [];
  for (const doc of listDocuments()) {
    chunks.push(...chunkDocument(doc, loadDocumentBody(doc)));
  }
  for (const version of SUPPORTED_VERSIONS) {
    for (const table of listTables(version)) {
      chunks.push(chunkTableRow(version, table));
    }
    for (const field of listFields(version)) {
      chunks.push(chunkFieldRow(version, field));
    }
  }
  return chunks;
}
