#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { OmopHubClient, createClientFromEnv } from "./client.js";
import type {
  SearchResult,
  ConceptDetail,
  AncestorConcept,
  DescendantConcept,
  ConceptMapping,
  Vocabulary,
  RelationshipType,
  Domain,
} from "./schema.js";

/**
 * Format search results as Markdown
 */
export function formatSearchResults(concepts: SearchResult[]): string {
  if (concepts.length === 0) {
    return "No concepts found matching your query.";
  }

  const lines: string[] = [];
  lines.push(`# Search Results (${concepts.length} concepts)`);
  lines.push("");

  for (const concept of concepts) {
    lines.push(`## ${concept.concept_name}`);
    lines.push("");
    lines.push(`- **Concept ID:** ${concept.concept_id}`);
    lines.push(`- **Code:** ${concept.concept_code}`);
    lines.push(`- **Vocabulary:** ${concept.vocabulary_id}`);
    lines.push(`- **Domain:** ${concept.domain_id}`);
    lines.push(`- **Class:** ${concept.concept_class_id}`);
    lines.push(
      `- **Standard:** ${concept.standard_concept === "S" ? "Yes" : "No"}`
    );
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format concept detail as Markdown
 */
export function formatConceptDetail(concept: ConceptDetail): string {
  const lines: string[] = [];

  lines.push(`# ${concept.concept_name}`);
  lines.push("");
  lines.push(`- **Concept ID:** ${concept.concept_id}`);
  lines.push(`- **Code:** ${concept.concept_code}`);
  lines.push(`- **Vocabulary:** ${concept.vocabulary_id}`);
  lines.push(`- **Domain:** ${concept.domain_id}`);
  lines.push(`- **Class:** ${concept.concept_class_id}`);
  lines.push(
    `- **Standard Concept:** ${concept.standard_concept === "S" ? "Yes" : concept.standard_concept === "C" ? "Classification" : "No"}`
  );
  lines.push(`- **Valid Start:** ${concept.valid_start_date}`);
  lines.push(`- **Valid End:** ${concept.valid_end_date}`);
  if (concept.invalid_reason) {
    lines.push(`- **Invalid Reason:** ${concept.invalid_reason}`);
  }

  if (concept.synonyms && concept.synonyms.length > 0) {
    lines.push("");
    lines.push("## Synonyms");
    lines.push("");
    for (const syn of concept.synonyms) {
      lines.push(`- ${syn}`);
    }
  }

  if (concept.relationships) {
    // Handle both array and object formats
    const relArray = Array.isArray(concept.relationships)
      ? concept.relationships
      : Object.values(concept.relationships).flat();

    if (relArray.length > 0) {
      lines.push("");
      lines.push("## Relationships");
      lines.push("");
      lines.push("| Relationship | Target Concept | Vocabulary |");
      lines.push("|-------------|----------------|------------|");
      for (const rel of relArray) {
        lines.push(
          `| ${rel.relationship_id} | ${rel.concept_name_2} (${rel.concept_id_2}) | ${rel.vocabulary_id_2} |`
        );
      }
    }
  }

  return lines.join("\n");
}

/**
 * Format hierarchy results as Markdown
 */
export function formatHierarchy(
  concepts: (AncestorConcept | DescendantConcept)[],
  direction: "ancestors" | "descendants"
): string {
  if (concepts.length === 0) {
    return `No ${direction} found for this concept.`;
  }

  const lines: string[] = [];
  lines.push(`# ${direction === "ancestors" ? "Ancestors" : "Descendants"} (${concepts.length} concepts)`);
  lines.push("");
  lines.push("| Concept | Vocabulary | Domain | Level |");
  lines.push("|---------|------------|--------|-------|");

  for (const concept of concepts) {
    const level =
      concept.min_levels_of_separation !== undefined
        ? `${concept.min_levels_of_separation}`
        : "-";
    lines.push(
      `| ${concept.concept_name} (${concept.concept_id}) | ${concept.vocabulary_id} | ${concept.domain_id} | ${level} |`
    );
  }

  return lines.join("\n");
}

/**
 * Format mappings as Markdown
 */
export function formatMappings(mappings: ConceptMapping[]): string {
  if (mappings.length === 0) {
    return "No mappings found for the provided concepts.";
  }

  const lines: string[] = [];
  lines.push(`# Concept Mappings (${mappings.length} mappings)`);
  lines.push("");
  lines.push("| Source | Target | Relationship | Confidence |");
  lines.push("|--------|--------|--------------|------------|");

  for (const mapping of mappings) {
    const confidence = mapping.confidence_score
      ? mapping.confidence_score.toFixed(2)
      : "-";
    lines.push(
      `| ${mapping.source_concept_name} (${mapping.source_concept_id}) | ${mapping.target_concept_name} (${mapping.target_concept_id}) | ${mapping.relationship_id} | ${confidence} |`
    );
  }

  return lines.join("\n");
}

/**
 * Format vocabularies list as Markdown
 */
export function formatVocabularies(vocabularies: Vocabulary[]): string {
  const lines: string[] = [];
  lines.push(`# Available Vocabularies (${vocabularies.length})`);
  lines.push("");
  lines.push("| ID | Name | Version | Concepts |");
  lines.push("|----|------|---------|----------|");

  for (const vocab of vocabularies) {
    const count = vocab.concept_count !== undefined ? vocab.concept_count.toLocaleString() : "-";
    lines.push(
      `| ${vocab.vocabulary_id} | ${vocab.vocabulary_name} | ${vocab.vocabulary_version} | ${count} |`
    );
  }

  return lines.join("\n");
}

/**
 * Format relationship types as Markdown
 */
export function formatRelationshipTypes(types: RelationshipType[]): string {
  const lines: string[] = [];
  lines.push(`# Relationship Types (${types.length})`);
  lines.push("");
  lines.push("| ID | Name | Hierarchical | Defines Ancestry | Reverse |");
  lines.push("|----|------|--------------|------------------|---------|");

  for (const type of types) {
    lines.push(
      `| ${type.relationship_id} | ${type.relationship_name} | ${type.is_hierarchical === "1" ? "Yes" : "No"} | ${type.defines_ancestry === "1" ? "Yes" : "No"} | ${type.reverse_relationship_id} |`
    );
  }

  return lines.join("\n");
}

/**
 * Format domains as Markdown
 */
export function formatDomains(domains: Domain[]): string {
  const lines: string[] = [];
  lines.push(`# Domains (${domains.length})`);
  lines.push("");
  lines.push("| ID | Name | Concepts | Standard Concepts |");
  lines.push("|----|------|----------|-------------------|");

  for (const domain of domains) {
    const count = domain.concept_count !== undefined ? domain.concept_count.toLocaleString() : "-";
    const standardCount =
      domain.standard_concept_count !== undefined
        ? domain.standard_concept_count.toLocaleString()
        : "-";
    lines.push(`| ${domain.domain_id} | ${domain.domain_name} | ${count} | ${standardCount} |`);
  }

  return lines.join("\n");
}

async function main() {
  // Create API client
  const client = createClientFromEnv();

  // Create MCP server
  const server = new McpServer({
    name: "ohdsi-vocab",
    version: "1.0.0",
    description:
      "OHDSI Vocabulary MCP Server - Search and explore OMOP vocabularies via OMOPHub API",
  });

  // Tool: search_concepts
  server.tool(
    "search_concepts",
    "Search for medical concepts across 90+ vocabularies (SNOMED, ICD10, LOINC, RxNorm, etc.). Supports fuzzy matching and handles typos.",
    {
      query: z
        .string()
        .min(1)
        .max(100)
        .describe("Search query text (1-100 characters)"),
      vocabulary_ids: z
        .string()
        .optional()
        .describe(
          "Filter by vocabularies (comma-separated): SNOMED, ICD10CM, RXNORM, LOINC, etc."
        ),
      domain_ids: z
        .string()
        .optional()
        .describe(
          "Filter by domains (comma-separated): Condition, Procedure, Drug, Measurement, etc."
        ),
      page_size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results to return (default: 20, max: 100)"),
    },
    async (params) => {
      const response = await client.searchConcepts({
        query: params.query,
        vocabulary_ids: params.vocabulary_ids,
        domain_ids: params.domain_ids,
        page_size: params.page_size,
      });

      return {
        content: [
          {
            type: "text",
            text: formatSearchResults(response.data),
          },
        ],
      };
    }
  );

  // Tool: get_concept
  server.tool(
    "get_concept",
    "Get detailed information about a specific medical concept by its OMOP concept ID.",
    {
      concept_id: z.number().describe("OMOP concept ID"),
      include_relationships: z
        .boolean()
        .optional()
        .describe("Include relationships to other concepts"),
      include_synonyms: z
        .boolean()
        .optional()
        .describe("Include alternative names and synonyms"),
      include_hierarchy: z
        .boolean()
        .optional()
        .describe("Include ancestor and descendant concepts"),
    },
    async (params) => {
      const response = await client.getConcept({
        concept_id: params.concept_id,
        include_relationships: params.include_relationships,
        include_synonyms: params.include_synonyms,
        include_hierarchy: params.include_hierarchy,
      });

      return {
        content: [
          {
            type: "text",
            text: formatConceptDetail(response.data),
          },
        ],
      };
    }
  );

  // Tool: get_ancestors
  server.tool(
    "get_ancestors",
    "Get ancestor (parent) concepts in the hierarchy for a given concept ID.",
    {
      concept_id: z.number().describe("OMOP concept ID"),
      vocabulary_ids: z
        .string()
        .optional()
        .describe("Filter by vocabularies (comma-separated)"),
      domain_ids: z
        .string()
        .optional()
        .describe("Filter by domains (comma-separated)"),
      max_levels: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe("Maximum hierarchy depth (1-20, default: 10)"),
      include_distance: z
        .boolean()
        .optional()
        .describe("Include hierarchy level distance"),
      page_size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results (default: 20, max: 100)"),
    },
    async (params) => {
      const response = await client.getAncestors({
        concept_id: params.concept_id,
        vocabulary_ids: params.vocabulary_ids,
        domain_ids: params.domain_ids,
        max_levels: params.max_levels,
        include_distance: params.include_distance,
        page_size: params.page_size,
      });

      return {
        content: [
          {
            type: "text",
            text: formatHierarchy(response.data.ancestors, "ancestors"),
          },
        ],
      };
    }
  );

  // Tool: get_descendants
  server.tool(
    "get_descendants",
    "Get descendant (child) concepts in the hierarchy for a given concept ID.",
    {
      concept_id: z.number().describe("OMOP concept ID"),
      vocabulary_ids: z
        .string()
        .optional()
        .describe("Filter by vocabularies (comma-separated)"),
      domain_ids: z
        .string()
        .optional()
        .describe("Filter by domains (comma-separated)"),
      max_levels: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe("Maximum hierarchy depth (1-20, default: 10)"),
      include_distance: z
        .boolean()
        .optional()
        .describe("Include hierarchy level distance"),
      page_size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results (default: 20, max: 100)"),
    },
    async (params) => {
      const response = await client.getDescendants({
        concept_id: params.concept_id,
        vocabulary_ids: params.vocabulary_ids,
        domain_ids: params.domain_ids,
        max_levels: params.max_levels,
        include_distance: params.include_distance,
        page_size: params.page_size,
      });

      return {
        content: [
          {
            type: "text",
            text: formatHierarchy(response.data.descendants, "descendants"),
          },
        ],
      };
    }
  );

  // Tool: map_concepts
  server.tool(
    "map_concepts",
    "Map concepts from one vocabulary to another (e.g., SNOMED to ICD10, RxNorm to NDC).",
    {
      source_concepts: z
        .array(z.number())
        .min(1)
        .max(100)
        .describe("Array of source OMOP concept IDs (max 100)"),
      target_vocabulary: z
        .string()
        .describe("Target vocabulary: ICD10CM, SNOMED, ICD9CM, LOINC, RXNORM, NDC, etc."),
      mapping_type: z
        .enum(["direct", "equivalent", "broader", "narrower"])
        .optional()
        .describe("Type of mapping relationship"),
      include_invalid: z
        .boolean()
        .optional()
        .describe("Include deprecated concepts (default: false)"),
    },
    async (params) => {
      const response = await client.mapConcepts({
        source_concepts: params.source_concepts,
        target_vocabulary: params.target_vocabulary,
        mapping_type: params.mapping_type,
        include_invalid: params.include_invalid,
      });

      return {
        content: [
          {
            type: "text",
            text: formatMappings(response.data.mappings),
          },
        ],
      };
    }
  );

  // Tool: list_vocabularies
  server.tool(
    "list_vocabularies",
    "List all available medical vocabularies in the OMOP system (SNOMED CT, ICD-10-CM, LOINC, RxNorm, etc.).",
    {
      include_stats: z
        .boolean()
        .optional()
        .describe("Include concept counts for each vocabulary"),
      page_size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results (default: 20, max: 100)"),
    },
    async (params) => {
      const response = await client.listVocabularies({
        include_stats: params.include_stats,
        page_size: params.page_size,
      });

      return {
        content: [
          {
            type: "text",
            text: formatVocabularies(response.data.vocabularies),
          },
        ],
      };
    }
  );

  // Tool: list_relationship_types
  server.tool(
    "list_relationship_types",
    "List all available relationship types in the OMOP vocabulary system (Is a, Maps to, etc.).",
    {
      page_size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results (default: 100, max: 100)"),
    },
    async (params) => {
      const response = await client.listRelationshipTypes(
        undefined,
        params.page_size
      );

      return {
        content: [
          {
            type: "text",
            text: formatRelationshipTypes(response.data.relationship_types),
          },
        ],
      };
    }
  );

  // Tool: list_domains
  server.tool(
    "list_domains",
    "List all available concept domains in OMOP (Condition, Drug, Procedure, Measurement, etc.).",
    {
      include_stats: z
        .boolean()
        .optional()
        .describe("Include concept counts for each domain"),
    },
    async (params) => {
      const response = await client.listDomains({
        include_stats: params.include_stats,
      });

      return {
        content: [
          {
            type: "text",
            text: formatDomains(response.data.domains),
          },
        ],
      };
    }
  );

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
