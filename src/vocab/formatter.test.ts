import { describe, it, expect } from "vitest";
import {
  formatSearchResults,
  formatConceptDetail,
  formatHierarchy,
  formatMappings,
  formatVocabularies,
  formatRelationshipTypes,
  formatDomains,
} from "./index.js";
import type {
  SearchResult,
  ConceptDetail,
  AncestorConcept,
  DescendantConcept,
  ConceptMapping,
  Vocabulary,
  RelationshipType,
  Domain,
} from "./types.js";

describe("formatSearchResults", () => {
  it("should return message for empty results", () => {
    const result = formatSearchResults([]);
    expect(result).toBe("No concepts found matching your query.");
  });

  it("should format search results", () => {
    const concepts: SearchResult[] = [
      {
        concept_id: 201826,
        concept_name: "Type 2 diabetes mellitus",
        domain_id: "Condition",
        vocabulary_id: "SNOMED",
        concept_class_id: "Clinical Finding",
        standard_concept: "S",
        concept_code: "44054006",
        valid_start_date: "2002-01-31",
        valid_end_date: "2099-12-31",
        invalid_reason: null,
      },
    ];

    const result = formatSearchResults(concepts);

    expect(result).toContain("# Search Results (1 concepts)");
    expect(result).toContain("## Type 2 diabetes mellitus");
    expect(result).toContain("- **Concept ID:** 201826");
    expect(result).toContain("- **Code:** 44054006");
    expect(result).toContain("- **Vocabulary:** SNOMED");
    expect(result).toContain("- **Domain:** Condition");
    expect(result).toContain("- **Class:** Clinical Finding");
    expect(result).toContain("- **Standard:** Yes");
  });

  it("should show No for non-standard concepts", () => {
    const concepts: SearchResult[] = [
      {
        concept_id: 123,
        concept_name: "Test",
        domain_id: "Condition",
        vocabulary_id: "ICD10",
        concept_class_id: "ICD10 code",
        standard_concept: null,
        concept_code: "A00",
        valid_start_date: "2020-01-01",
        valid_end_date: "2099-12-31",
        invalid_reason: null,
      },
    ];

    const result = formatSearchResults(concepts);
    expect(result).toContain("- **Standard:** No");
  });
});

describe("formatConceptDetail", () => {
  it("should format concept details", () => {
    const concept: ConceptDetail = {
      concept_id: 201826,
      concept_name: "Type 2 diabetes mellitus",
      domain_id: "Condition",
      vocabulary_id: "SNOMED",
      concept_class_id: "Clinical Finding",
      standard_concept: "S",
      concept_code: "44054006",
      valid_start_date: "2002-01-31",
      valid_end_date: "2099-12-31",
      invalid_reason: null,
    };

    const result = formatConceptDetail(concept);

    expect(result).toContain("# Type 2 diabetes mellitus");
    expect(result).toContain("- **Concept ID:** 201826");
    expect(result).toContain("- **Standard Concept:** Yes");
    expect(result).toContain("- **Valid Start:** 2002-01-31");
  });

  it("should show Classification for C standard_concept", () => {
    const concept: ConceptDetail = {
      concept_id: 123,
      concept_name: "Test Classification",
      domain_id: "Condition",
      vocabulary_id: "SNOMED",
      concept_class_id: "Clinical Finding",
      standard_concept: "C",
      concept_code: "123",
      valid_start_date: "2020-01-01",
      valid_end_date: "2099-12-31",
      invalid_reason: null,
    };

    const result = formatConceptDetail(concept);
    expect(result).toContain("- **Standard Concept:** Classification");
  });

  it("should include synonyms when present", () => {
    const concept: ConceptDetail = {
      concept_id: 201826,
      concept_name: "Type 2 diabetes mellitus",
      domain_id: "Condition",
      vocabulary_id: "SNOMED",
      concept_class_id: "Clinical Finding",
      standard_concept: "S",
      concept_code: "44054006",
      valid_start_date: "2002-01-31",
      valid_end_date: "2099-12-31",
      invalid_reason: null,
      synonyms: [
        { concept_synonym_name: "T2DM", language_concept_id: 0 },
        { concept_synonym_name: "Adult-onset diabetes", language_concept_id: 0 },
      ],
    };

    const result = formatConceptDetail(concept);

    expect(result).toContain("## Synonyms");
    expect(result).toContain("- T2DM");
    expect(result).toContain("- Adult-onset diabetes");
  });

  it("should include relationships when present", () => {
    const concept: ConceptDetail = {
      concept_id: 201826,
      concept_name: "Type 2 diabetes mellitus",
      domain_id: "Condition",
      vocabulary_id: "SNOMED",
      concept_class_id: "Clinical Finding",
      standard_concept: "S",
      concept_code: "44054006",
      valid_start_date: "2002-01-31",
      valid_end_date: "2099-12-31",
      invalid_reason: null,
      relationships: [
        {
          relationship_id: "Is a",
          concept_id_2: 201820,
          concept_name_2: "Diabetes mellitus",
          vocabulary_id_2: "SNOMED",
        },
      ],
    };

    const result = formatConceptDetail(concept);

    expect(result).toContain("## Relationships");
    expect(result).toContain("| Is a | Diabetes mellitus (201820) | SNOMED |");
  });

  it("should include invalid_reason when present", () => {
    const concept: ConceptDetail = {
      concept_id: 123,
      concept_name: "Deprecated concept",
      domain_id: "Condition",
      vocabulary_id: "SNOMED",
      concept_class_id: "Clinical Finding",
      standard_concept: null,
      concept_code: "123",
      valid_start_date: "2002-01-31",
      valid_end_date: "2020-12-31",
      invalid_reason: "D",
    };

    const result = formatConceptDetail(concept);
    expect(result).toContain("- **Invalid Reason:** D");
  });
});

describe("formatHierarchy", () => {
  it("should return message for empty ancestors", () => {
    const result = formatHierarchy([], "ancestors");
    expect(result).toBe("No ancestors found for this concept.");
  });

  it("should return message for empty descendants", () => {
    const result = formatHierarchy([], "descendants");
    expect(result).toBe("No descendants found for this concept.");
  });

  it("should format ancestor concepts", () => {
    const ancestors: AncestorConcept[] = [
      {
        concept_id: 201820,
        concept_name: "Diabetes mellitus",
        domain_id: "Condition",
        vocabulary_id: "SNOMED",
        concept_class_id: "Clinical Finding",
        standard_concept: "S",
        concept_code: "73211009",
        valid_start_date: "2002-01-31",
        valid_end_date: "2099-12-31",
        invalid_reason: null,
        min_levels_of_separation: 1,
      },
    ];

    const result = formatHierarchy(ancestors, "ancestors");

    expect(result).toContain("# Ancestors (1 concepts)");
    expect(result).toContain("| Diabetes mellitus (201820) | SNOMED | Condition | 1 |");
  });

  it("should show - for missing level", () => {
    const descendants: DescendantConcept[] = [
      {
        concept_id: 123,
        concept_name: "Test",
        domain_id: "Condition",
        vocabulary_id: "SNOMED",
        concept_class_id: "Clinical Finding",
        standard_concept: "S",
        concept_code: "123",
        valid_start_date: "2002-01-31",
        valid_end_date: "2099-12-31",
        invalid_reason: null,
      },
    ];

    const result = formatHierarchy(descendants, "descendants");
    expect(result).toContain("| Test (123) | SNOMED | Condition | - |");
  });
});

describe("formatMappings", () => {
  it("should return message for empty mappings", () => {
    const result = formatMappings([]);
    expect(result).toBe("No mappings found for the provided concepts.");
  });

  it("should format mappings", () => {
    const mappings: ConceptMapping[] = [
      {
        source_concept_id: 201826,
        source_concept_name: "Type 2 diabetes mellitus",
        source_vocabulary_id: "SNOMED",
        target_concept_id: 45591057,
        target_concept_name: "E11",
        target_vocabulary_id: "ICD10CM",
        relationship_id: "Maps to",
        valid_start_date: "2020-01-01",
        valid_end_date: "2099-12-31",
      },
    ];

    const result = formatMappings(mappings);

    expect(result).toContain("# Concept Mappings (1 mappings)");
    expect(result).toContain("| Type 2 diabetes mellitus (201826) | E11 (45591057) | Maps to | - |");
  });

  it("should show confidence score when present", () => {
    const mappings: ConceptMapping[] = [
      {
        source_concept_id: 201826,
        source_concept_name: "Type 2 diabetes mellitus",
        source_vocabulary_id: "SNOMED",
        target_concept_id: 45591057,
        target_concept_name: "E11",
        target_vocabulary_id: "ICD10CM",
        relationship_id: "Maps to",
        confidence_score: 0.95,
        valid_start_date: "2020-01-01",
        valid_end_date: "2099-12-31",
      },
    ];

    const result = formatMappings(mappings);
    expect(result).toContain("| 0.95 |");
  });
});

describe("formatVocabularies", () => {
  it("should format vocabularies", () => {
    const vocabularies: Vocabulary[] = [
      {
        vocabulary_id: "SNOMED",
        vocabulary_name: "Systematic Nomenclature of Medicine",
        vocabulary_reference: "http://snomed.org",
        vocabulary_version: "2023-09-01",
        vocabulary_concept_id: 44819096,
      },
    ];

    const result = formatVocabularies(vocabularies);

    expect(result).toContain("# Available Vocabularies (1)");
    expect(result).toContain("| SNOMED | Systematic Nomenclature of Medicine | 2023-09-01 | - |");
  });

  it("should show concept count when present", () => {
    const vocabularies: Vocabulary[] = [
      {
        vocabulary_id: "SNOMED",
        vocabulary_name: "SNOMED CT",
        vocabulary_reference: "http://snomed.org",
        vocabulary_version: "2023-09-01",
        vocabulary_concept_id: 44819096,
        concept_count: 500000,
      },
    ];

    const result = formatVocabularies(vocabularies);
    expect(result).toContain("| 500,000 |");
  });
});

describe("formatRelationshipTypes", () => {
  it("should format relationship types", () => {
    const types: RelationshipType[] = [
      {
        relationship_id: "Is a",
        relationship_name: "Is a (SNOMED)",
        is_hierarchical: "1",
        defines_ancestry: "1",
        reverse_relationship_id: "Subsumes",
        relationship_concept_id: 44818821,
      },
    ];

    const result = formatRelationshipTypes(types);

    expect(result).toContain("# Relationship Types (1)");
    expect(result).toContain("| Is a | Is a (SNOMED) | Yes | Yes | Subsumes |");
  });

  it("should show No for non-hierarchical", () => {
    const types: RelationshipType[] = [
      {
        relationship_id: "Maps to",
        relationship_name: "Maps to",
        is_hierarchical: "0",
        defines_ancestry: "0",
        reverse_relationship_id: "Mapped from",
        relationship_concept_id: 44818723,
      },
    ];

    const result = formatRelationshipTypes(types);
    expect(result).toContain("| Maps to | Maps to | No | No | Mapped from |");
  });
});

describe("formatDomains", () => {
  it("should format domains", () => {
    const domains: Domain[] = [
      {
        domain_id: "Condition",
        domain_name: "Condition",
        domain_concept_id: 19,
      },
    ];

    const result = formatDomains(domains);

    expect(result).toContain("# Domains (1)");
    expect(result).toContain("| Condition | Condition | - | - |");
  });

  it("should show counts when present", () => {
    const domains: Domain[] = [
      {
        domain_id: "Drug",
        domain_name: "Drug",
        domain_concept_id: 13,
        concept_count: 1500000,
        standard_concept_count: 300000,
      },
    ];

    const result = formatDomains(domains);
    expect(result).toContain("| Drug | Drug | 1,500,000 | 300,000 |");
  });
});
