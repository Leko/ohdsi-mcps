import { z } from "zod";

/**
 * OMOPHub API Schemas
 * Based on https://docs.omophub.com/api-reference
 */

// Pagination meta schema
export const PaginationMetaSchema = z.object({
  current_page: z.number(),
  page_size: z.number(),
  total_items: z.number(),
  total_pages: z.number(),
  has_next: z.boolean(),
  has_previous: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// API meta schema
export const ApiMetaSchema = z.object({
  request_id: z.string(),
  vocab_release: z.string().optional(),
  timestamp: z.string().optional(),
  pagination: PaginationMetaSchema.optional(),
});

export type ApiMeta = z.infer<typeof ApiMetaSchema>;

// Base API response schema factory
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    meta: ApiMetaSchema,
  });

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta: ApiMeta;
};

// Concept schema
export const ConceptSchema = z.object({
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

export type Concept = z.infer<typeof ConceptSchema>;

// Concept synonym schema
export const ConceptSynonymSchema = z.object({
  concept_synonym_name: z.string(),
  language_concept_id: z.number(),
});

export type ConceptSynonym = z.infer<typeof ConceptSynonymSchema>;

// Concept relationship schema
export const ConceptRelationshipSchema = z.object({
  relationship_id: z.string(),
  concept_id_2: z.number(),
  concept_name_2: z.string(),
  vocabulary_id_2: z.string(),
});

export type ConceptRelationship = z.infer<typeof ConceptRelationshipSchema>;

// Concept detail schema (extends Concept with optional fields)
export const ConceptDetailSchema = ConceptSchema.extend({
  synonyms: z.array(ConceptSynonymSchema).optional(),
  relationships: z.array(ConceptRelationshipSchema).optional(),
  ancestors: z.array(ConceptSchema).optional(),
  descendants: z.array(ConceptSchema).optional(),
});

export type ConceptDetail = z.infer<typeof ConceptDetailSchema>;

// Search result schema (same structure as Concept)
export const SearchResultSchema = ConceptSchema;

export type SearchResult = z.infer<typeof SearchResultSchema>;

// Ancestor/Descendant concept schema
export const HierarchyConceptSchema = ConceptSchema.extend({
  level: z.number().optional(),
  min_levels_of_separation: z.number().optional(),
  max_levels_of_separation: z.number().optional(),
  relationship_id: z.string().optional(),
  relationship_name: z.string().optional(),
});

export type AncestorConcept = z.infer<typeof HierarchyConceptSchema>;
export type DescendantConcept = z.infer<typeof HierarchyConceptSchema>;

// Hierarchy summary schema
export const HierarchySummarySchema = z.object({
  total_ancestors: z.number().optional(),
  total_descendants: z.number().optional(),
  max_hierarchy_depth: z.number().optional(),
  unique_vocabularies: z.array(z.string()).optional(),
  relationship_types_used: z.array(z.string()).optional(),
});

export type HierarchySummary = z.infer<typeof HierarchySummarySchema>;

// Ancestors response schema
export const AncestorsResponseSchema = z.object({
  concept_id: z.number(),
  concept_name: z.string(),
  vocabulary_id: z.string(),
  ancestors: z.array(HierarchyConceptSchema),
  hierarchy_summary: HierarchySummarySchema.optional(),
});

export type AncestorsResponse = z.infer<typeof AncestorsResponseSchema>;

// Descendants response schema
export const DescendantsResponseSchema = z.object({
  concept_id: z.number(),
  concept_name: z.string(),
  vocabulary_id: z.string(),
  descendants: z.array(HierarchyConceptSchema),
  hierarchy_summary: HierarchySummarySchema.optional(),
});

export type DescendantsResponse = z.infer<typeof DescendantsResponseSchema>;

// Concept mapping schema
export const ConceptMappingSchema = z.object({
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

export type ConceptMapping = z.infer<typeof ConceptMappingSchema>;

// Mapping response schema
export const MappingResponseSchema = z.object({
  mappings: z.array(ConceptMappingSchema),
});

export type MappingResponse = z.infer<typeof MappingResponseSchema>;

// Vocabulary schema
export const VocabularySchema = z.object({
  vocabulary_id: z.string(),
  vocabulary_name: z.string(),
  vocabulary_reference: z.string(),
  vocabulary_version: z.string(),
  vocabulary_concept_id: z.number(),
  concept_count: z.number().optional(),
  standard_concept_count: z.number().optional(),
});

export type Vocabulary = z.infer<typeof VocabularySchema>;

// Vocabularies response schema
export const VocabulariesResponseSchema = z.object({
  vocabularies: z.array(VocabularySchema),
});

export type VocabulariesResponse = z.infer<typeof VocabulariesResponseSchema>;

// Relationship type schema
export const RelationshipTypeSchema = z.object({
  relationship_id: z.string(),
  relationship_name: z.string(),
  is_hierarchical: z.string(),
  defines_ancestry: z.string(),
  reverse_relationship_id: z.string(),
  relationship_concept_id: z.number(),
});

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

// Relationship types response schema
export const RelationshipTypesResponseSchema = z.object({
  relationship_types: z.array(RelationshipTypeSchema),
});

export type RelationshipTypesResponse = z.infer<typeof RelationshipTypesResponseSchema>;

// Domain schema
export const DomainSchema = z.object({
  domain_id: z.string(),
  domain_name: z.string(),
  domain_concept_id: z.number(),
  concept_count: z.number().optional(),
  standard_concept_count: z.number().optional(),
  vocabulary_coverage: z.array(z.string()).optional(),
});

export type Domain = z.infer<typeof DomainSchema>;

// Domains response schema
export const DomainsResponseSchema = z.object({
  domains: z.array(DomainSchema),
});

export type DomainsResponse = z.infer<typeof DomainsResponseSchema>;

// API Client options schema
export const OmopHubClientOptionsSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  vocabRelease: z.string().optional(),
});

export type OmopHubClientOptions = z.infer<typeof OmopHubClientOptionsSchema>;

// Tool input schemas
export const SearchConceptsInputSchema = z.object({
  query: z.string(),
  vocabulary_ids: z.string().optional(),
  domain_ids: z.string().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
});

export type SearchConceptsInput = z.infer<typeof SearchConceptsInputSchema>;

export const GetConceptInputSchema = z.object({
  concept_id: z.number(),
  include_relationships: z.boolean().optional(),
  include_synonyms: z.boolean().optional(),
  include_hierarchy: z.boolean().optional(),
});

export type GetConceptInput = z.infer<typeof GetConceptInputSchema>;

export const GetAncestorsInputSchema = z.object({
  concept_id: z.number(),
  vocabulary_ids: z.string().optional(),
  domain_ids: z.string().optional(),
  max_levels: z.number().optional(),
  relationship_types: z.string().optional(),
  include_distance: z.boolean().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
});

export type GetAncestorsInput = z.infer<typeof GetAncestorsInputSchema>;

export const GetDescendantsInputSchema = z.object({
  concept_id: z.number(),
  vocabulary_ids: z.string().optional(),
  domain_ids: z.string().optional(),
  max_levels: z.number().optional(),
  relationship_types: z.string().optional(),
  include_distance: z.boolean().optional(),
  page: z.number().optional(),
  page_size: z.number().optional(),
});

export type GetDescendantsInput = z.infer<typeof GetDescendantsInputSchema>;

export const MapConceptsInputSchema = z.object({
  source_concepts: z.array(z.number()),
  target_vocabulary: z.string(),
  mapping_type: z.enum(["direct", "equivalent", "broader", "narrower"]).optional(),
  include_invalid: z.boolean().optional(),
});

export type MapConceptsInput = z.infer<typeof MapConceptsInputSchema>;

export const ListVocabulariesInputSchema = z.object({
  page: z.number().optional(),
  page_size: z.number().optional(),
  include_stats: z.boolean().optional(),
  include_inactive: z.boolean().optional(),
  sort_by: z.enum(["name", "priority", "updated"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
});

export type ListVocabulariesInput = z.infer<typeof ListVocabulariesInputSchema>;

export const ListDomainsInputSchema = z.object({
  include_stats: z.boolean().optional(),
});

export type ListDomainsInput = z.infer<typeof ListDomainsInputSchema>;
