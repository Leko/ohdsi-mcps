import { z } from "zod";

/**
 * OMOPHub API Schemas
 * Based on https://docs.omophub.com/api-reference
 */

// Pagination meta schema
export const paginationMetaSchema = z.object({
  current_page: z.number(),
  page_size: z.number(),
  total_items: z.number(),
  total_pages: z.number(),
  has_next: z.boolean(),
  has_previous: z.boolean(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

// API meta schema
export const apiMetaSchema = z.object({
  request_id: z.string(),
  vocab_release: z.string().optional(),
  timestamp: z.string().optional(),
  pagination: paginationMetaSchema.optional(),
});

export type ApiMeta = z.infer<typeof apiMetaSchema>;

// Base API response schema factory
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    meta: apiMetaSchema,
  });

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta: ApiMeta;
};

// Concept schema
export const conceptSchema = z.object({
  concept_id: z.number(),
  concept_name: z.string(),
  domain_id: z.string(),
  vocabulary_id: z.string(),
  concept_class_id: z.string(),
  standard_concept: z.string().nullable(),
  concept_code: z.string(),
  valid_start_date: z.string(),
  valid_end_date: z.string(),
  invalid_reason: z.string().nullable(),
});

export type Concept = z.infer<typeof conceptSchema>;

// Concept synonym schema
export const conceptSynonymSchema = z.object({
  concept_synonym_name: z.string(),
  language_concept_id: z.number(),
});

export type ConceptSynonym = z.infer<typeof conceptSynonymSchema>;

// Concept relationship schema
export const conceptRelationshipSchema = z.object({
  relationship_id: z.string(),
  concept_id_2: z.number(),
  concept_name_2: z.string(),
  vocabulary_id_2: z.string(),
});

export type ConceptRelationship = z.infer<typeof conceptRelationshipSchema>;

// Concept detail schema (extends Concept with optional fields)
export const conceptDetailSchema = conceptSchema.extend({
  synonyms: z.array(conceptSynonymSchema).optional(),
  relationships: z.array(conceptRelationshipSchema).optional(),
  ancestors: z.array(conceptSchema).optional(),
  descendants: z.array(conceptSchema).optional(),
});

export type ConceptDetail = z.infer<typeof conceptDetailSchema>;

// Search result schema (same structure as Concept)
export const searchResultSchema = conceptSchema;

export type SearchResult = z.infer<typeof searchResultSchema>;

// Ancestor/Descendant concept schema
export const hierarchyConceptSchema = conceptSchema.extend({
  level: z.number().optional(),
  min_levels_of_separation: z.number().optional(),
  max_levels_of_separation: z.number().optional(),
  relationship_id: z.string().optional(),
  relationship_name: z.string().optional(),
});

export type AncestorConcept = z.infer<typeof hierarchyConceptSchema>;
export type DescendantConcept = z.infer<typeof hierarchyConceptSchema>;

// Hierarchy summary schema
export const hierarchySummarySchema = z.object({
  total_ancestors: z.number().optional(),
  total_descendants: z.number().optional(),
  max_hierarchy_depth: z.number().optional(),
  unique_vocabularies: z.array(z.string()).optional(),
  relationship_types_used: z.array(z.string()).optional(),
});

export type HierarchySummary = z.infer<typeof hierarchySummarySchema>;

// Ancestors response schema
export const ancestorsResponseSchema = z.object({
  concept_id: z.number(),
  concept_name: z.string(),
  vocabulary_id: z.string(),
  ancestors: z.array(hierarchyConceptSchema),
  hierarchy_summary: hierarchySummarySchema.optional(),
});

export type AncestorsResponse = z.infer<typeof ancestorsResponseSchema>;

// Descendants response schema
export const descendantsResponseSchema = z.object({
  concept_id: z.number(),
  concept_name: z.string(),
  vocabulary_id: z.string(),
  descendants: z.array(hierarchyConceptSchema),
  hierarchy_summary: hierarchySummarySchema.optional(),
});

export type DescendantsResponse = z.infer<typeof descendantsResponseSchema>;

// Concept mapping schema
export const conceptMappingSchema = z.object({
  source_concept_id: z.number(),
  source_concept_name: z.string(),
  source_vocabulary_id: z.string(),
  target_concept_id: z.number(),
  target_concept_name: z.string(),
  target_vocabulary_id: z.string(),
  relationship_id: z.string(),
  confidence_score: z.number().optional(),
  valid_start_date: z.string(),
  valid_end_date: z.string(),
});

export type ConceptMapping = z.infer<typeof conceptMappingSchema>;

// Mapping response schema
export const mappingResponseSchema = z.object({
  mappings: z.array(conceptMappingSchema),
});

export type MappingResponse = z.infer<typeof mappingResponseSchema>;

// Vocabulary schema
export const vocabularySchema = z.object({
  vocabulary_id: z.string(),
  vocabulary_name: z.string(),
  vocabulary_reference: z.string(),
  vocabulary_version: z.string(),
  vocabulary_concept_id: z.number(),
  concept_count: z.number().optional(),
  standard_concept_count: z.number().optional(),
});

export type Vocabulary = z.infer<typeof vocabularySchema>;

// Vocabularies response schema
export const vocabulariesResponseSchema = z.object({
  vocabularies: z.array(vocabularySchema),
});

export type VocabulariesResponse = z.infer<typeof vocabulariesResponseSchema>;

// Relationship type schema
export const relationshipTypeSchema = z.object({
  relationship_id: z.string(),
  relationship_name: z.string(),
  is_hierarchical: z.string(),
  defines_ancestry: z.string(),
  reverse_relationship_id: z.string(),
  relationship_concept_id: z.number(),
});

export type RelationshipType = z.infer<typeof relationshipTypeSchema>;

// Relationship types response schema
export const relationshipTypesResponseSchema = z.object({
  relationship_types: z.array(relationshipTypeSchema),
});

export type RelationshipTypesResponse = z.infer<typeof relationshipTypesResponseSchema>;

// Domain schema
export const domainSchema = z.object({
  domain_id: z.string(),
  domain_name: z.string(),
  domain_concept_id: z.number(),
  concept_count: z.number().optional(),
  standard_concept_count: z.number().optional(),
  vocabulary_coverage: z.array(z.string()).optional(),
});

export type Domain = z.infer<typeof domainSchema>;

// Domains response schema
export const domainsResponseSchema = z.object({
  domains: z.array(domainSchema),
});

export type DomainsResponse = z.infer<typeof domainsResponseSchema>;

// API Client options schema
export const omopHubClientOptionsSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  vocabRelease: z.string().optional(),
});

export type OmopHubClientOptions = z.infer<typeof omopHubClientOptionsSchema>;

// Tool input schemas
export const searchConceptsInputSchema = z.object({
  query: z.string(),
  vocabulary_ids: z.string().optional(),
  domain_ids: z.string().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
});

export type SearchConceptsInput = z.infer<typeof searchConceptsInputSchema>;

export const getConceptInputSchema = z.object({
  concept_id: z.number(),
  include_relationships: z.boolean().optional(),
  include_synonyms: z.boolean().optional(),
  include_hierarchy: z.boolean().optional(),
});

export type GetConceptInput = z.infer<typeof getConceptInputSchema>;

export const getAncestorsInputSchema = z.object({
  concept_id: z.number(),
  vocabulary_ids: z.string().optional(),
  domain_ids: z.string().optional(),
  max_levels: z.number().optional(),
  relationship_types: z.string().optional(),
  include_distance: z.boolean().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
});

export type GetAncestorsInput = z.infer<typeof getAncestorsInputSchema>;

export const getDescendantsInputSchema = z.object({
  concept_id: z.number(),
  vocabulary_ids: z.string().optional(),
  domain_ids: z.string().optional(),
  max_levels: z.number().optional(),
  relationship_types: z.string().optional(),
  include_distance: z.boolean().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
});

export type GetDescendantsInput = z.infer<typeof getDescendantsInputSchema>;

export const mapConceptsInputSchema = z.object({
  source_concepts: z.array(z.number()),
  target_vocabulary: z.string(),
  mapping_type: z.enum(["direct", "equivalent", "broader", "narrower"]).optional(),
  include_invalid: z.boolean().optional(),
});

export type MapConceptsInput = z.infer<typeof mapConceptsInputSchema>;

export const listVocabulariesInputSchema = z.object({
  page: z.number().optional(),
  page_size: z.number().optional(),
  include_stats: z.boolean().optional(),
  include_inactive: z.boolean().optional(),
  sort_by: z.enum(["name", "priority", "updated"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
});

export type ListVocabulariesInput = z.infer<typeof listVocabulariesInputSchema>;

export const listDomainsInputSchema = z.object({
  include_stats: z.boolean().optional(),
});

export type ListDomainsInput = z.infer<typeof listDomainsInputSchema>;
