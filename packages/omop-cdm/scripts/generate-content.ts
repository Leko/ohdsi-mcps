#!/usr/bin/env node
/**
 * Codegen: snapshot the OMOP CDM CSV definitions from the vendored
 * `CommonDataModel` submodule into a static TypeScript module so the
 * server can load table- and field-level metadata on any runtime (Node,
 * Cloudflare Workers, Vercel Functions) without touching the filesystem
 * or shelling out to `git` at startup.
 */
import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parse as parseCsv } from "csv-parse/sync";

const execFileAsync = promisify(execFile);

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorDir = join(packageRoot, "vendor", "CommonDataModel");
const csvDir = join(vendorDir, "inst", "csv");
const rmdDir = join(vendorDir, "rmd");
const outputPath = join(packageRoot, "src", "generated", "content.ts");

const SUPPORTED_VERSIONS = ["5.3", "5.4", "6.0"] as const;
type CdmVersion = (typeof SUPPORTED_VERSIONS)[number];

type Row = Record<string, string>;

const TABLE_COLUMNS = [
  "cdmTableName",
  "schema",
  "isRequired",
  "conceptPrefix",
  "measurePersonCompleteness",
  "measurePersonCompletenessThreshold",
  "validation",
  "tableDescription",
  "userGuidance",
  "etlConventions",
] as const;

const FIELD_COLUMNS = [
  "cdmTableName",
  "cdmFieldName",
  "isRequired",
  "cdmDatatype",
  "userGuidance",
  "etlConventions",
  "isPrimaryKey",
  "isForeignKey",
  "fkTableName",
  "fkFieldName",
  "fkDomain",
  "fkClass",
] as const;

async function resolveCommit(): Promise<string> {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: vendorDir,
  });
  return stdout.trim();
}

/**
 * Known upstream quoting bugs in `OHDSI/CommonDataModel` CSVs: the
 * offending line contains a field with an unescaped comma that is not
 * wrapped in double quotes, which makes the row have one extra column.
 * Each entry replaces the raw substring with a fixed one and asserts
 * the substitution occurred so the patch cannot silently rot once
 * upstream fixes the row.
 */
const CSV_PATCHES: Readonly<
  Record<string, ReadonlyArray<{ from: string; to: string }>>
> = {
  "OMOP_CDMv5.4_Field_Level.csv": [
    {
      from: "cdm_source,source_documentation_reference,No,varchar(255),Refers to a publication or web resource describing the source data, e.g. a data dictionary.,NA,No,No,NA,NA,NA,NA,NA",
      to: 'cdm_source,source_documentation_reference,No,varchar(255),"Refers to a publication or web resource describing the source data, e.g. a data dictionary.",NA,No,No,NA,NA,NA,NA,NA',
    },
  ],
};

function applyPatches(csvBasename: string, text: string): string {
  const patches = CSV_PATCHES[csvBasename] ?? [];
  let patched = text;
  for (const { from, to } of patches) {
    if (!patched.includes(from)) {
      throw new Error(
        `CSV patch for ${csvBasename} no longer matches upstream; ` +
          `remove the obsolete entry from CSV_PATCHES in scripts/generate-content.ts.`,
      );
    }
    patched = patched.replace(from, to);
  }
  return patched;
}

async function readCsv(path: string): Promise<Row[]> {
  const basename = path.split("/").pop() ?? path;
  const raw = await readFile(path, "utf8");
  const text = applyPatches(basename, raw);
  return parseCsv(text, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: false,
  }) as Row[];
}

function pickColumns(
  row: Row,
  keys: readonly string[],
  csvPath: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = row[key];
    if (value === undefined) {
      throw new Error(
        `Missing column "${key}" in row of ${csvPath}. ` +
          `Upstream CSV schema may have changed.`,
      );
    }
    out[key] = value;
  }
  return out;
}

function tsStringLiteral(value: string): string {
  return JSON.stringify(value);
}

function emitRecord(row: Record<string, string>): string {
  const entries = Object.entries(row)
    .map(([key, value]) => `    ${tsStringLiteral(key)}: ${tsStringLiteral(value)},`)
    .join("\n");
  return `  {\n${entries}\n  },`;
}

function emitVersionedMap(
  typeName: string,
  data: Readonly<Record<CdmVersion, Record<string, string>[]>>,
): string[] {
  const lines: string[] = [];
  lines.push(
    `export const ${typeName}: Readonly<Record<CdmVersion, readonly Readonly<Record<string, string>>[]>> = Object.freeze({`,
  );
  for (const version of SUPPORTED_VERSIONS) {
    lines.push(`  ${tsStringLiteral(version)}: Object.freeze([`);
    for (const row of data[version]) {
      lines.push(emitRecord(row));
    }
    lines.push("  ]),");
  }
  lines.push("});");
  return lines;
}

async function readRmdFiles(): Promise<Array<{ filename: string; body: string }>> {
  const entries = await readdir(rmdDir, { withFileTypes: true });
  const rmdFiles = entries
    .filter((entry) => entry.isFile() && /\.rmd$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const out: Array<{ filename: string; body: string }> = [];
  for (const filename of rmdFiles) {
    const body = await readFile(join(rmdDir, filename), "utf8");
    out.push({ filename, body });
  }
  return out;
}

async function main(): Promise<void> {
  const commit = await resolveCommit();

  const tables: Record<CdmVersion, Record<string, string>[]> = {
    "5.3": [],
    "5.4": [],
    "6.0": [],
  };
  const fields: Record<CdmVersion, Record<string, string>[]> = {
    "5.3": [],
    "5.4": [],
    "6.0": [],
  };

  for (const version of SUPPORTED_VERSIONS) {
    const tablePath = join(csvDir, `OMOP_CDMv${version}_Table_Level.csv`);
    const fieldPath = join(csvDir, `OMOP_CDMv${version}_Field_Level.csv`);
    const tableRows = await readCsv(tablePath);
    const fieldRows = await readCsv(fieldPath);
    tables[version] = tableRows.map((row) =>
      pickColumns(row, TABLE_COLUMNS, tablePath),
    );
    fields[version] = fieldRows.map((row) =>
      pickColumns(row, FIELD_COLUMNS, fieldPath),
    );
  }

  const rmdFiles = await readRmdFiles();

  const totalTables = Object.values(tables).reduce(
    (sum, rows) => sum + rows.length,
    0,
  );
  const totalFields = Object.values(fields).reduce(
    (sum, rows) => sum + rows.length,
    0,
  );

  const lines: string[] = [];
  lines.push(
    "// THIS FILE IS AUTO-GENERATED BY scripts/generate-content.ts.",
    "// Do not edit by hand; rerun `npm run generate-content` after updating",
    "// the vendor/CommonDataModel submodule.",
    "",
    `export const SOURCE_COMMIT = ${tsStringLiteral(commit)};`,
    "",
    "export const SUPPORTED_VERSIONS = [",
    ...SUPPORTED_VERSIONS.map((v) => `  ${tsStringLiteral(v)},`),
    "] as const;",
    "",
    "export type CdmVersion = (typeof SUPPORTED_VERSIONS)[number];",
    "",
    "export const TABLE_COLUMNS = [",
    ...TABLE_COLUMNS.map((c) => `  ${tsStringLiteral(c)},`),
    "] as const;",
    "",
    "export const FIELD_COLUMNS = [",
    ...FIELD_COLUMNS.map((c) => `  ${tsStringLiteral(c)},`),
    "] as const;",
    "",
  );
  lines.push(...emitVersionedMap("CDM_TABLES", tables));
  lines.push("");
  lines.push(...emitVersionedMap("CDM_FIELDS", fields));
  lines.push("");

  lines.push("export const RMD_FILES: readonly string[] = Object.freeze([");
  for (const { filename } of rmdFiles) {
    lines.push(`  ${tsStringLiteral(filename)},`);
  }
  lines.push("]);", "");

  lines.push(
    "export const RMD_BODIES: Readonly<Record<string, string>> = Object.freeze({",
  );
  for (const { filename, body } of rmdFiles) {
    lines.push(`  ${tsStringLiteral(filename)}: ${tsStringLiteral(body)},`);
  }
  lines.push("});", "");

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, lines.join("\n"), "utf8");

  const rmdBytes = rmdFiles.reduce(
    (sum, entry) => sum + Buffer.byteLength(entry.body, "utf8"),
    0,
  );
  console.error(
    `[generate-content] ${totalTables} tables, ${totalFields} fields across ${SUPPORTED_VERSIONS.length} versions, ${rmdFiles.length} Rmd docs (${rmdBytes} bytes), commit ${commit}`,
  );
  console.error(`[generate-content] wrote ${outputPath}`);
}

await main();
