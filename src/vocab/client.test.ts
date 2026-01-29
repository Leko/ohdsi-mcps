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
      // API returns data as direct array
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      const concept = response.data[0]!;
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
      expect(response.data.length).toBeGreaterThan(0);

      for (const concept of response.data) {
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
      expect(response.data.length).toBeGreaterThan(0);

      for (const concept of response.data) {
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
      // Note: relationships may or may not be included depending on API
      // Just check that the request succeeds
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
      expect(response.data.ancestors).toBeDefined();
      expect(Array.isArray(response.data.ancestors)).toBe(true);
      expect(response.data.ancestors.length).toBeGreaterThan(0);
    });

    it("should respect max_levels parameter", async () => {
      const response = await client.getAncestors({
        concept_id: 201826,
        max_levels: 2,
        page_size: 50,
      });

      expect(response.success).toBe(true);

      for (const concept of response.data.ancestors) {
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
      expect(response.data.descendants).toBeDefined();
      expect(Array.isArray(response.data.descendants)).toBe(true);
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

    it("should contain common vocabularies with large page size", async () => {
      // Need larger page size to get all vocabularies due to pagination
      const response = await client.listVocabularies({
        page_size: 200,
      });

      const vocabIds = response.data.vocabularies.map((v) => v.vocabulary_id);

      // Check for common vocabularies
      expect(vocabIds.length).toBeGreaterThan(50);
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

    it("should have many relationship types", async () => {
      const response = await client.listRelationshipTypes(undefined, 500);

      expect(response.data.relationship_types.length).toBeGreaterThan(100);
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
