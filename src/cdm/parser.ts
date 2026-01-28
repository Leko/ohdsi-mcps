import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { CdmTable, CdmField, CdmTableWithFields } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const ASSET_DIR = join(__dirname, "../../asset/cdm");

/**
 * Parse CSV content into rows
 * Handles quoted fields with commas and newlines
 */
export function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
        if (char === "\r") i++;
        currentRow.push(currentField);
        if (currentRow.length > 1 || currentRow[0] !== "") {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else if (char !== "\r") {
        currentField += char;
      }
    }
  }

  // Handle last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function parseBoolean(value: string): boolean {
  return value.toLowerCase() === "yes";
}

function parseNullableString(value: string): string | null {
  return value === "NA" || value === "" ? null : value;
}

function parseNullableNumber(value: string): number | null {
  if (value === "NA" || value === "") return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Load and parse Table Level CSV
 */
export function loadTables(): CdmTable[] {
  const content = readFileSync(
    join(ASSET_DIR, "OMOP_CDMv5.4_Table_Level.csv"),
    "utf-8"
  );
  const rows = parseCSV(content);
  const headers = rows[0];

  if (!headers) {
    throw new Error("Table Level CSV is empty");
  }

  return rows.slice(1).map((row): CdmTable => {
    return {
      cdmTableName: row[0] ?? "",
      schema: (row[1] ?? "CDM") as CdmTable["schema"],
      isRequired: parseBoolean(row[2] ?? "No"),
      conceptPrefix: parseNullableString(row[3] ?? ""),
      measurePersonCompleteness: parseBoolean(row[4] ?? "No"),
      measurePersonCompletenessThreshold: parseNullableNumber(row[5] ?? ""),
      validation: parseNullableString(row[6] ?? ""),
      tableDescription: row[7] ?? "",
      userGuidance: parseNullableString(row[8] ?? ""),
      etlConventions: parseNullableString(row[9] ?? ""),
    };
  });
}

/**
 * Load and parse Field Level CSV
 */
export function loadFields(): CdmField[] {
  const content = readFileSync(
    join(ASSET_DIR, "OMOP_CDMv5.4_Field_Level.csv"),
    "utf-8"
  );
  const rows = parseCSV(content);
  const headers = rows[0];

  if (!headers) {
    throw new Error("Field Level CSV is empty");
  }

  return rows.slice(1).map((row): CdmField => {
    return {
      cdmTableName: row[0] ?? "",
      cdmFieldName: row[1] ?? "",
      isRequired: parseBoolean(row[2] ?? "No"),
      cdmDatatype: row[3] ?? "",
      userGuidance: parseNullableString(row[4] ?? ""),
      etlConventions: parseNullableString(row[5] ?? ""),
      isPrimaryKey: parseBoolean(row[6] ?? "No"),
      isForeignKey: parseBoolean(row[7] ?? "No"),
      fkTableName: parseNullableString(row[8] ?? ""),
      fkFieldName: parseNullableString(row[9] ?? ""),
      fkDomain: parseNullableString(row[10] ?? ""),
      fkClass: parseNullableString(row[11] ?? ""),
      uniqueDQIdentifiers: parseNullableString(row[12] ?? ""),
    };
  });
}

/**
 * Load tables with their associated fields
 */
export function loadTablesWithFields(): CdmTableWithFields[] {
  const tables = loadTables();
  const fields = loadFields();

  const fieldsByTable = new Map<string, CdmField[]>();
  for (const field of fields) {
    const existing = fieldsByTable.get(field.cdmTableName) ?? [];
    existing.push(field);
    fieldsByTable.set(field.cdmTableName, existing);
  }

  return tables.map((table): CdmTableWithFields => {
    return {
      ...table,
      fields: fieldsByTable.get(table.cdmTableName) ?? [],
    };
  });
}
