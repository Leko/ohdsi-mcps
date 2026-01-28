import { describe, it, expect, beforeAll } from "vitest";
import { OmopHubClient, createClientFromEnv } from "./client.js";

describe("OmopHubClient", () => {
  let client: OmopHubClient;

  beforeAll(() => {
    client = createClientFromEnv();
  });

  describe("searchConcepts", () => {
    it("should search for concepts by query", async () => {
      const response = await client.searchConcepts({
        query: "diabetes",
        page_size: 10,
      });

      expect(response.success).toBe(true);
      expect(response.data.concepts).toBeDefined();
      expect(Array.isArray(response.data.concepts)).toBe(true);
      expect(response.data.concepts.length).toBeGreaterThan(0);

      const concept = response.data.concepts[0]!;
      expect(concept.concept_id).toBeDefined();
      expect(concept.concept_name).toBeDefined();
      expect(concept.vocabulary_id).toBeDefined();
      expect(concept.domain_id).toBeDefined();
    });

    it("should filter by vocabulary", async () => {
      const response = await client.searchConcepts({
        query: "hypertension",
        vocabulary_ids: "SNOMED",
        page_size: 5,
      });

      expect(response.success).toBe(true);
      expect(response.data.concepts.length).toBeGreaterThan(0);

      for (const concept of response.data.concepts) {
        expect(concept.vocabulary_id).toBe("SNOMED");
      }
    });

    it("should filter by domain", async () => {
      const response = await client.searchConcepts({
        query: "aspirin",
        domain_ids: "Drug",
        page_size: 5,
      });

      expect(response.success).toBe(true);
      expect(response.data.concepts.length).toBeGreaterThan(0);

      for (const concept of response.data.concepts) {
        expect(concept.domain_id).toBe("Drug");
      }
    });
  });

  describe("getConcept", () => {
    it("should get concept details by ID", async () => {
      // Concept ID 201826 is "Type 2 diabetes mellitus" in SNOMED
      const response = await client.getConcept({
        concept_id: 201826,
      });

      expect(response.success).toBe(true);
      expect(response.data.concept_id).toBe(201826);
      expect(response.data.concept_name).toBeDefined();
      expect(response.data.vocabulary_id).toBe("SNOMED");
      expect(response.data.domain_id).toBe("Condition");
    });

    it("should include synonyms when requested", async () => {
      const response = await client.getConcept({
        concept_id: 201826,
        include_synonyms: true,
      });

      expect(response.success).toBe(true);
      expect(response.data.synonyms).toBeDefined();
      expect(Array.isArray(response.data.synonyms)).toBe(true);
    });

    it("should include relationships when requested", async () => {
      const response = await client.getConcept({
        concept_id: 201826,
        include_relationships: true,
      });

      expect(response.success).toBe(true);
      expect(response.data.relationships).toBeDefined();
      expect(Array.isArray(response.data.relationships)).toBe(true);
    });
  });

  describe("getAncestors", () => {
    it("should get ancestor concepts", async () => {
      // Get ancestors of Type 2 diabetes
      const response = await client.getAncestors({
        concept_id: 201826,
        page_size: 10,
      });

      expect(response.success).toBe(true);
      expect(response.data.concepts).toBeDefined();
      expect(Array.isArray(response.data.concepts)).toBe(true);
      expect(response.data.concepts.length).toBeGreaterThan(0);
    });

    it("should respect max_levels parameter", async () => {
      const response = await client.getAncestors({
        concept_id: 201826,
        max_levels: 2,
        include_distance: true,
        page_size: 50,
      });

      expect(response.success).toBe(true);

      for (const concept of response.data.concepts) {
        if (concept.max_levels_of_separation !== undefined) {
          expect(concept.max_levels_of_separation).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  describe("getDescendants", () => {
    it("should get descendant concepts", async () => {
      // Get descendants of Diabetes mellitus (parent concept)
      const response = await client.getDescendants({
        concept_id: 201820, // Diabetes mellitus
        page_size: 10,
      });

      expect(response.success).toBe(true);
      expect(response.data.concepts).toBeDefined();
      expect(Array.isArray(response.data.concepts)).toBe(true);
    });
  });

  describe("mapConcepts", () => {
    it("should map concepts to target vocabulary", async () => {
      // Map SNOMED concept to ICD10CM
      const response = await client.mapConcepts({
        source_concepts: [201826], // Type 2 diabetes
        target_vocabulary: "ICD10CM",
      });

      expect(response.success).toBe(true);
      expect(response.data.mappings).toBeDefined();
      expect(Array.isArray(response.data.mappings)).toBe(true);
    });

    it("should handle multiple source concepts", async () => {
      const response = await client.mapConcepts({
        source_concepts: [201826, 316866], // Type 2 diabetes, Hypertension
        target_vocabulary: "ICD10CM",
      });

      expect(response.success).toBe(true);
      expect(response.data.mappings).toBeDefined();
    });
  });

  describe("listVocabularies", () => {
    it("should list available vocabularies", async () => {
      const response = await client.listVocabularies({
        page_size: 50,
      });

      expect(response.success).toBe(true);
      expect(response.data.vocabularies).toBeDefined();
      expect(Array.isArray(response.data.vocabularies)).toBe(true);
      expect(response.data.vocabularies.length).toBeGreaterThan(0);

      const vocab = response.data.vocabularies[0]!;
      expect(vocab.vocabulary_id).toBeDefined();
      expect(vocab.vocabulary_name).toBeDefined();
    });

    it("should include stats when requested", async () => {
      const response = await client.listVocabularies({
        include_stats: true,
        page_size: 10,
      });

      expect(response.success).toBe(true);

      const vocabWithStats = response.data.vocabularies.find(
        (v) => v.concept_count !== undefined
      );
      expect(vocabWithStats).toBeDefined();
    });

    it("should contain common vocabularies", async () => {
      const response = await client.listVocabularies({
        page_size: 100,
      });

      const vocabIds = response.data.vocabularies.map((v) => v.vocabulary_id);

      expect(vocabIds).toContain("SNOMED");
      expect(vocabIds).toContain("ICD10CM");
      expect(vocabIds).toContain("LOINC");
      expect(vocabIds).toContain("RxNorm");
    });
  });

  describe("listRelationshipTypes", () => {
    it("should list relationship types", async () => {
      const response = await client.listRelationshipTypes();

      expect(response.success).toBe(true);
      expect(response.data.relationship_types).toBeDefined();
      expect(Array.isArray(response.data.relationship_types)).toBe(true);
      expect(response.data.relationship_types.length).toBeGreaterThan(0);

      const relType = response.data.relationship_types[0]!;
      expect(relType.relationship_id).toBeDefined();
      expect(relType.relationship_name).toBeDefined();
    });

    it("should include common relationship types", async () => {
      const response = await client.listRelationshipTypes(undefined, 200);

      const relIds = response.data.relationship_types.map(
        (r) => r.relationship_id
      );

      expect(relIds).toContain("Is a");
      expect(relIds).toContain("Maps to");
    });
  });

  describe("listDomains", () => {
    it("should list domains", async () => {
      const response = await client.listDomains();

      expect(response.success).toBe(true);
      expect(response.data.domains).toBeDefined();
      expect(Array.isArray(response.data.domains)).toBe(true);
      expect(response.data.domains.length).toBeGreaterThan(0);

      const domain = response.data.domains[0]!;
      expect(domain.domain_id).toBeDefined();
      expect(domain.domain_name).toBeDefined();
    });

    it("should include common domains", async () => {
      const response = await client.listDomains();

      const domainIds = response.data.domains.map((d) => d.domain_id);

      expect(domainIds).toContain("Condition");
      expect(domainIds).toContain("Drug");
      expect(domainIds).toContain("Procedure");
      expect(domainIds).toContain("Measurement");
    });

    it("should include stats when requested", async () => {
      const response = await client.listDomains({
        include_stats: true,
      });

      expect(response.success).toBe(true);

      const domainWithStats = response.data.domains.find(
        (d) => d.concept_count !== undefined
      );
      expect(domainWithStats).toBeDefined();
    });
  });
});
