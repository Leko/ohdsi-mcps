import { describe, expect, it } from "vitest";

import {
  buildAllChunks,
  chunkDocument,
  chunkFieldRow,
  chunkTableRow,
} from "./chunker.js";
import { findDocumentBySlug, listTables, loadDocumentBody } from "./manifest.js";
import { buildSearchIndex, renderSearchHits, search } from "./search.js";

describe("chunker", () => {
  it("chunks documents by heading and skips code blocks", () => {
    const doc = findDocumentBySlug("cdm54Changes")!;
    const body = loadDocumentBody(doc);
    const chunks = chunkDocument(doc, body);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.kind).toBe("rmd");
      expect(chunk.category).toBe(`document / ${doc.slug}`);
      expect(chunk.documentSlug).toBe(doc.slug);
    }
  });

  it("emits one chunk per CSV table row, with description + guidance + conventions", () => {
    const tables = listTables("5.4");
    const person = tables.find((t) => t.cdmTableName === "person")!;
    const chunk = chunkTableRow("5.4", person);
    expect(chunk.id).toBe("csv-table-5.4-person");
    expect(chunk.kind).toBe("csv-table");
    expect(chunk.version).toBe("5.4");
    expect(chunk.tableName).toBe("person");
    expect(chunk.text.length).toBeGreaterThan(0);
    expect(chunk.text).toContain("Person");
    expect(chunk.category).toBe("v5.4 / table / person");
  });

  it("emits one chunk per CSV field row with PK/FK annotations", () => {
    const chunk = chunkFieldRow("5.4", {
      cdmTableName: "person",
      cdmFieldName: "gender_concept_id",
      isRequired: "Yes",
      cdmDatatype: "integer",
      userGuidance: "biological sex at birth",
      etlConventions: "use the gender value",
      isPrimaryKey: "No",
      isForeignKey: "Yes",
      fkTableName: "CONCEPT",
      fkFieldName: "CONCEPT_ID",
      fkDomain: "Gender",
      fkClass: "NA",
    });
    expect(chunk.id).toBe("csv-field-5.4-person-gender_concept_id");
    expect(chunk.kind).toBe("csv-field");
    expect(chunk.text).toContain("datatype: integer");
    expect(chunk.text).toContain("foreign key → CONCEPT.CONCEPT_ID (Gender)");
    expect(chunk.category).toBe("v5.4 / field / person.gender_concept_id");
  });

  it("produces a large but non-empty chunk universe across all sources", () => {
    const chunks = buildAllChunks();
    expect(chunks.length).toBeGreaterThan(100);
    expect(chunks.some((c) => c.kind === "rmd")).toBe(true);
    expect(chunks.some((c) => c.kind === "csv-table")).toBe(true);
    expect(chunks.some((c) => c.kind === "csv-field")).toBe(true);
  });
});

describe("search", () => {
  const index = buildSearchIndex();

  it("finds matching CSV field rows for a field name", () => {
    const hits = search(index, { query: "gender_concept_id", limit: 5 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.kind === "csv-field")).toBe(true);
  });

  it("returns an empty array for a blank query", () => {
    expect(search(index, { query: "   ", limit: 5 })).toEqual([]);
  });

  it("honours the limit parameter", () => {
    const hits = search(index, { query: "person", limit: 3 });
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("filters by kind when requested", () => {
    const rmdOnly = search(index, {
      query: "person",
      limit: 20,
      kinds: ["rmd"],
    });
    expect(rmdOnly.length).toBeGreaterThan(0);
    expect(rmdOnly.every((h) => h.kind === "rmd")).toBe(true);
  });

  it("renders a markdown table of hits with snippets", () => {
    const hits = search(index, { query: "observation_period", limit: 3 });
    const rendered = renderSearchHits(hits, "observation_period");
    expect(rendered).toMatch(/result/);
    expect(rendered).toContain("id: `");
  });

  it("renders a 'no results' message when the hit list is empty", () => {
    expect(renderSearchHits([], "whatever")).toContain("No results");
  });
});
