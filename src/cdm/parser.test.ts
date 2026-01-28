import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseCSV,
  loadTables,
  loadFields,
  loadTablesWithFields,
  ASSET_DIR,
} from "./parser.js";

describe("parseCSV", () => {
  it("parses simple CSV", () => {
    const csv = "a,b,c\n1,2,3";
    const result = parseCSV(csv);
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with commas", () => {
    const csv = 'a,"b,c",d\n1,"2,3",4';
    const result = parseCSV(csv);
    expect(result).toEqual([
      ["a", "b,c", "d"],
      ["1", "2,3", "4"],
    ]);
  });

  it("handles quoted fields with newlines", () => {
    const csv = 'a,"b\nc",d\n1,2,3';
    const result = parseCSV(csv);
    expect(result).toEqual([
      ["a", "b\nc", "d"],
      ["1", "2", "3"],
    ]);
  });

  it("handles escaped quotes", () => {
    const csv = 'a,"b""c",d';
    const result = parseCSV(csv);
    expect(result).toEqual([["a", 'b"c', "d"]]);
  });

  it("handles CRLF line endings", () => {
    const csv = "a,b,c\r\n1,2,3";
    const result = parseCSV(csv);
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });
});

describe("CDM Table Level CSV", () => {
  const TABLE_LEVEL_HEADERS = [
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
  ];

  it("parses without error", () => {
    expect(() => loadTables()).not.toThrow();
  });

  it("has correct headers", () => {
    const content = readFileSync(
      join(ASSET_DIR, "OMOP_CDMv5.4_Table_Level.csv"),
      "utf-8"
    );
    const rows = parseCSV(content);
    const headers = rows[0];

    expect(headers).toBeDefined();
    expect(headers).toEqual(TABLE_LEVEL_HEADERS);
  });

  it("has expected number of columns per row", () => {
    const content = readFileSync(
      join(ASSET_DIR, "OMOP_CDMv5.4_Table_Level.csv"),
      "utf-8"
    );
    const rows = parseCSV(content);
    const expectedColumns = TABLE_LEVEL_HEADERS.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      expect(row?.length, `Row ${i} has wrong column count`).toBe(
        expectedColumns
      );
    }
  });

  it("has expected number of tables", () => {
    const tables = loadTables();
    // CDM v5.4 has 39 tables (including all schemas: CDM, VOCAB, RESULTS)
    expect(tables.length).toBe(39);
  });
});

describe("CDM Field Level CSV", () => {
  const FIELD_LEVEL_HEADERS = [
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
    "unique DQ identifiers",
  ];

  it("parses without error", () => {
    expect(() => loadFields()).not.toThrow();
  });

  it("has correct headers", () => {
    const content = readFileSync(
      join(ASSET_DIR, "OMOP_CDMv5.4_Field_Level.csv"),
      "utf-8"
    );
    const rows = parseCSV(content);
    const headers = rows[0];

    expect(headers).toBeDefined();
    expect(headers).toEqual(FIELD_LEVEL_HEADERS);
  });

  it("has expected number of columns per row (with known exceptions)", () => {
    const content = readFileSync(
      join(ASSET_DIR, "OMOP_CDMv5.4_Field_Level.csv"),
      "utf-8"
    );
    const rows = parseCSV(content);
    const expectedColumns = FIELD_LEVEL_HEADERS.length;

    // Count rows that don't match expected column count
    // Note: Original CSV has unquoted commas in some fields (e.g., "e.g., ...")
    const badRows = rows.filter((row) => row.length !== expectedColumns);

    // Allow at most 1 problematic row (known issue with source_documentation_reference field)
    expect(
      badRows.length,
      `Too many rows with wrong column count: ${badRows.map((r) => r[1]).join(", ")}`
    ).toBeLessThanOrEqual(1);
  });

  it("has more than 100 fields", () => {
    const fields = loadFields();
    expect(fields.length).toBeGreaterThan(100);
  });
});

describe("loadTablesWithFields", () => {
  it("loads tables with their fields", () => {
    const tables = loadTablesWithFields();

    expect(tables.length).toBe(39);

    // Check person table has fields
    const personTable = tables.find((t) => t.cdmTableName === "person");
    expect(personTable).toBeDefined();
    expect(personTable?.fields.length).toBeGreaterThan(0);

    // Check field properties
    const personIdField = personTable?.fields.find(
      (f) => f.cdmFieldName === "person_id"
    );
    expect(personIdField).toBeDefined();
    expect(personIdField?.isPrimaryKey).toBe(true);
    expect(personIdField?.isRequired).toBe(true);
  });

  it("associates fields with correct tables", () => {
    const tables = loadTablesWithFields();

    for (const table of tables) {
      for (const field of table.fields) {
        expect(field.cdmTableName).toBe(table.cdmTableName);
      }
    }
  });
});
