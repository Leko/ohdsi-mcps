import { describe, it, expect } from "vitest";
import {
  formatTableMarkdown,
  formatFieldMarkdown,
  formatTablesListMarkdown,
} from "./index.js";
import type { CdmTableWithFields, CdmField } from "./schema.js";

describe("formatTableMarkdown", () => {
  it("should format a basic table", () => {
    const table: CdmTableWithFields = {
      cdmTableName: "person",
      schema: "CDM",
      isRequired: true,
      conceptPrefix: null,
      measurePersonCompleteness: false,
      measurePersonCompletenessThreshold: null,
      validation: null,
      tableDescription: "The Person table contains records.",
      userGuidance: null,
      etlConventions: null,
      fields: [
        {
          cdmTableName: "person",
          cdmFieldName: "person_id",
          cdmDatatype: "integer",
          isRequired: true,
          isPrimaryKey: true,
          isForeignKey: false,
          userGuidance: null,
          etlConventions: null,
          fkTableName: null,
          fkFieldName: null,
          fkDomain: null,
          fkClass: null,
          uniqueDQIdentifiers: null,
        },
      ],
    };

    const result = formatTableMarkdown(table);

    expect(result).toContain("# person");
    expect(result).toContain("**Schema:** CDM");
    expect(result).toContain("**Required:** Yes");
    expect(result).toContain("## Description");
    expect(result).toContain("The Person table contains records.");
    expect(result).toContain("## Fields");
    expect(result).toContain("| person_id | integer | Yes | Yes | - |");
  });

  it("should include optional sections when present", () => {
    const table: CdmTableWithFields = {
      cdmTableName: "visit_occurrence",
      schema: "CDM",
      isRequired: false,
      conceptPrefix: "visit",
      measurePersonCompleteness: false,
      measurePersonCompletenessThreshold: null,
      validation: null,
      tableDescription: "Visit records.",
      userGuidance: "Use this for visits.",
      etlConventions: "Map from source visits.",
      fields: [],
    };

    const result = formatTableMarkdown(table);

    expect(result).toContain("**Concept Prefix:** visit");
    expect(result).toContain("## User Guidance");
    expect(result).toContain("Use this for visits.");
    expect(result).toContain("## ETL Conventions");
    expect(result).toContain("Map from source visits.");
  });

  it("should format foreign key information", () => {
    const table: CdmTableWithFields = {
      cdmTableName: "condition_occurrence",
      schema: "CDM",
      isRequired: false,
      conceptPrefix: null,
      measurePersonCompleteness: false,
      measurePersonCompletenessThreshold: null,
      validation: null,
      tableDescription: "Conditions.",
      userGuidance: null,
      etlConventions: null,
      fields: [
        {
          cdmTableName: "condition_occurrence",
          cdmFieldName: "person_id",
          cdmDatatype: "integer",
          isRequired: true,
          isPrimaryKey: false,
          isForeignKey: true,
          userGuidance: null,
          etlConventions: null,
          fkTableName: "person",
          fkFieldName: "person_id",
          fkDomain: null,
          fkClass: null,
          uniqueDQIdentifiers: null,
        },
      ],
    };

    const result = formatTableMarkdown(table);

    expect(result).toContain("| person_id | integer | Yes | - | person.person_id |");
  });
});

describe("formatFieldMarkdown", () => {
  it("should format a basic field", () => {
    const field: CdmField = {
      cdmTableName: "person",
      cdmFieldName: "person_id",
      cdmDatatype: "integer",
      isRequired: true,
      isPrimaryKey: true,
      isForeignKey: false,
      userGuidance: null,
      etlConventions: null,
      fkTableName: null,
      fkFieldName: null,
      fkDomain: null,
      fkClass: null,
      uniqueDQIdentifiers: null,
    };

    const result = formatFieldMarkdown(field, "person");

    expect(result).toContain("# person.person_id");
    expect(result).toContain("**Data Type:** integer");
    expect(result).toContain("**Required:** Yes");
    expect(result).toContain("**Primary Key:** Yes");
    expect(result).toContain("**Foreign Key:** No");
  });

  it("should include foreign key reference details", () => {
    const field: CdmField = {
      cdmTableName: "condition_occurrence",
      cdmFieldName: "condition_concept_id",
      cdmDatatype: "integer",
      isRequired: true,
      isPrimaryKey: false,
      isForeignKey: true,
      userGuidance: null,
      etlConventions: null,
      fkTableName: "concept",
      fkFieldName: "concept_id",
      fkDomain: "Condition",
      fkClass: "Clinical Finding",
      uniqueDQIdentifiers: null,
    };

    const result = formatFieldMarkdown(field, "condition_occurrence");

    expect(result).toContain("### Foreign Key Reference");
    expect(result).toContain("- **Table:** concept");
    expect(result).toContain("- **Field:** concept_id");
    expect(result).toContain("- **Domain:** Condition");
    expect(result).toContain("- **Class:** Clinical Finding");
  });

  it("should include guidance sections when present", () => {
    const field: CdmField = {
      cdmTableName: "person",
      cdmFieldName: "birth_datetime",
      cdmDatatype: "datetime",
      isRequired: false,
      isPrimaryKey: false,
      isForeignKey: false,
      userGuidance: "Use full datetime when available.",
      etlConventions: "Derive from source birth date.",
      fkTableName: null,
      fkFieldName: null,
      fkDomain: null,
      fkClass: null,
      uniqueDQIdentifiers: null,
    };

    const result = formatFieldMarkdown(field, "person");

    expect(result).toContain("## User Guidance");
    expect(result).toContain("Use full datetime when available.");
    expect(result).toContain("## ETL Conventions");
    expect(result).toContain("Derive from source birth date.");
  });
});

describe("formatTablesListMarkdown", () => {
  it("should format empty list", () => {
    const result = formatTablesListMarkdown([]);

    expect(result).toContain("# OMOP CDM v5.4 Tables");
    expect(result).toContain("Total tables: 0");
  });

  it("should group tables by schema", () => {
    const tables: CdmTableWithFields[] = [
      {
        cdmTableName: "person",
        schema: "CDM",
        isRequired: true,
        conceptPrefix: null,
        measurePersonCompleteness: false,
        measurePersonCompletenessThreshold: null,
        validation: null,
        tableDescription: "Person records.",
        userGuidance: null,
        etlConventions: null,
        fields: [],
      },
      {
        cdmTableName: "concept",
        schema: "VOCAB",
        isRequired: true,
        conceptPrefix: null,
        measurePersonCompleteness: false,
        measurePersonCompletenessThreshold: null,
        validation: null,
        tableDescription: "Vocabulary concepts.",
        userGuidance: null,
        etlConventions: null,
        fields: [],
      },
      {
        cdmTableName: "cohort",
        schema: "RESULTS",
        isRequired: false,
        conceptPrefix: null,
        measurePersonCompleteness: false,
        measurePersonCompletenessThreshold: null,
        validation: null,
        tableDescription: "Cohort definitions.",
        userGuidance: null,
        etlConventions: null,
        fields: [],
      },
    ];

    const result = formatTablesListMarkdown(tables);

    expect(result).toContain("Total tables: 3");
    expect(result).toContain("## CDM Schema");
    expect(result).toContain("## VOCAB Schema");
    expect(result).toContain("## RESULTS Schema");
    expect(result).toContain("| person | Yes | Person records. |");
    expect(result).toContain("| concept | Yes | Vocabulary concepts. |");
    expect(result).toContain("| cohort | No | Cohort definitions. |");
  });

  it("should truncate long descriptions", () => {
    const longDesc = "A".repeat(150);
    const tables: CdmTableWithFields[] = [
      {
        cdmTableName: "test",
        schema: "CDM",
        isRequired: true,
        conceptPrefix: null,
        measurePersonCompleteness: false,
        measurePersonCompletenessThreshold: null,
        validation: null,
        tableDescription: longDesc,
        userGuidance: null,
        etlConventions: null,
        fields: [],
      },
    ];

    const result = formatTablesListMarkdown(tables);

    expect(result).toContain("A".repeat(100) + "...");
    expect(result).not.toContain("A".repeat(101));
  });
});
