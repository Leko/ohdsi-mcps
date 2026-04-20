import {
  CDM_FIELDS,
  CDM_TABLES,
  RMD_BODIES,
  RMD_FILES,
  SOURCE_COMMIT,
  SUPPORTED_VERSIONS,
  type CdmVersion,
} from "./generated/content.js";

export { SUPPORTED_VERSIONS };
export type { CdmVersion };

export const DEFAULT_VERSION: CdmVersion = "5.4";

export interface CdmTable {
  cdmTableName: string;
  schema: string;
  isRequired: string;
  conceptPrefix: string;
  measurePersonCompleteness: string;
  measurePersonCompletenessThreshold: string;
  validation: string;
  tableDescription: string;
  userGuidance: string;
  etlConventions: string;
}

export interface CdmField {
  cdmTableName: string;
  cdmFieldName: string;
  isRequired: string;
  cdmDatatype: string;
  userGuidance: string;
  etlConventions: string;
  isPrimaryKey: string;
  isForeignKey: string;
  fkTableName: string;
  fkFieldName: string;
  fkDomain: string;
  fkClass: string;
}

interface Manifest {
  source: {
    owner: "OHDSI";
    repo: "CommonDataModel";
    commit: string;
  };
  defaultVersion: CdmVersion;
  supportedVersions: readonly CdmVersion[];
  documents: readonly CdmDocumentEntry[];
}

export interface CdmDocumentEntry {
  slug: string;
  filename: string;
  title: string;
  order: number;
}

function stripYamlFrontmatter(text: string): string {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return text;
  return text.slice(end + 4).replace(/^\r?\n/, "");
}

function flattenTitle(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFrontmatterTitle(raw: string): string | undefined {
  if (!raw.startsWith("---")) return undefined;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return undefined;
  const frontmatter = raw.slice(3, end);
  const match = /^title\s*:\s*(.+)$/m.exec(frontmatter);
  if (!match) return undefined;
  let value = match[1]!.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  const title = flattenTitle(value);
  return title.length > 0 ? title : undefined;
}

function extractFirstHeading(raw: string): string | undefined {
  const body = stripYamlFrontmatter(raw);
  for (const line of body.split("\n")) {
    const match = /^#+\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const heading = flattenTitle(match[1] ?? "");
    if (heading.length > 0) return heading;
  }
  return undefined;
}

export function extractDocumentTitle(raw: string, fallback: string): string {
  return (
    extractFrontmatterTitle(raw) ?? extractFirstHeading(raw) ?? fallback
  );
}

export function slugOfRmd(filename: string): string {
  return filename.replace(/\.rmd$/i, "");
}

/**
 * Filenames (matched case-insensitively) excluded from the document
 * list and from `findDocumentBySlug`. Each regex below is paired with a
 * short note on *why* the file is filtered out so future contributors
 * can re-evaluate the rule when the upstream repository changes.
 */
export const RMD_DOCUMENT_BLACKLIST: readonly RegExp[] = [
  // `cdm30.Rmd`, `cdm53.Rmd`, `cdm531.Rmd`, `cdm54.Rmd`, `cdm60.Rmd`:
  // auto-generated tables rendered from the per-version Table/Field CSVs.
  // The same information is already served (and kept in sync) by the
  // `omop-cdm_table_list` / `omop-cdm_field_list` tools, so including
  // these documents would just duplicate the CSV payload and drown the
  // genuinely narrative docs (change logs, conventions, FAQ, ...) in the
  // document list. Note the strict `\d+$` tail: it preserves siblings
  // like `cdm54Changes.rmd`, `cdm54erd.Rmd`, and `cdm54ToolingSupport.RMD`
  // which carry narrative content beyond the CSV mirror.
  /^cdm\d+\.rmd$/i,
];

export function isBlacklistedDocument(filename: string): boolean {
  return RMD_DOCUMENT_BLACKLIST.some((pattern) => pattern.test(filename));
}

function buildDocuments(): readonly CdmDocumentEntry[] {
  const visible = RMD_FILES.filter(
    (filename) => !isBlacklistedDocument(filename),
  );
  return visible.map((filename, order) => {
    const body = RMD_BODIES[filename];
    if (typeof body !== "string") {
      throw new Error(
        `Rmd document ${filename} is missing from the generated content module. ` +
          "Regenerate via `npm run generate-content`.",
      );
    }
    const slug = slugOfRmd(filename);
    return {
      slug,
      filename,
      title: extractDocumentTitle(body, slug),
      order,
    };
  });
}

const DOCUMENTS = buildDocuments();

export const MANIFEST: Manifest = {
  source: {
    owner: "OHDSI",
    repo: "CommonDataModel",
    commit: SOURCE_COMMIT,
  },
  defaultVersion: DEFAULT_VERSION,
  supportedVersions: SUPPORTED_VERSIONS,
  documents: DOCUMENTS,
};

export function listDocuments(): readonly CdmDocumentEntry[] {
  return DOCUMENTS;
}

export function findDocumentBySlug(
  slug: string,
): CdmDocumentEntry | undefined {
  const target = slug.toLowerCase();
  return DOCUMENTS.find((doc) => doc.slug.toLowerCase() === target);
}

export function loadDocumentBody(entry: CdmDocumentEntry): string {
  const body = RMD_BODIES[entry.filename];
  if (typeof body !== "string") {
    throw new Error(
      `Rmd document ${entry.filename} is missing from the generated content module.`,
    );
  }
  return body;
}

export function isSupportedVersion(value: string): value is CdmVersion {
  return (SUPPORTED_VERSIONS as readonly string[]).includes(value);
}

export function listTables(version: CdmVersion): readonly CdmTable[] {
  return CDM_TABLES[version] as unknown as readonly CdmTable[];
}

export function listFields(version: CdmVersion): readonly CdmField[] {
  return CDM_FIELDS[version] as unknown as readonly CdmField[];
}

export function listFieldsForTable(
  version: CdmVersion,
  tableName: string,
): readonly CdmField[] {
  const target = tableName.toLowerCase();
  return listFields(version).filter(
    (field) => field.cdmTableName.toLowerCase() === target,
  );
}

export function hasTable(version: CdmVersion, tableName: string): boolean {
  const target = tableName.toLowerCase();
  return listTables(version).some(
    (table) => table.cdmTableName.toLowerCase() === target,
  );
}
