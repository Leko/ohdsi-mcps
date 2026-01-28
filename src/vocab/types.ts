/**
 * OMOPHub API Types
 * Based on https://docs.omophub.com/api-reference
 */

// Base API response structure
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: ApiMeta;
}

export interface ApiMeta {
  request_id: string;
  vocab_release?: string;
  timestamp?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  current_page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Concept types
export interface Concept {
  concept_id: number;
  concept_name: string;
  domain_id: string;
  vocabulary_id: string;
  concept_class_id: string;
  standard_concept: string | null;
  concept_code: string;
  valid_start_date: string;
  valid_end_date: string;
  invalid_reason: string | null;
}

export interface ConceptDetail extends Concept {
  synonyms?: ConceptSynonym[];
  relationships?: ConceptRelationship[];
  ancestors?: Concept[];
  descendants?: Concept[];
}

export interface ConceptSynonym {
  concept_synonym_name: string;
  language_concept_id: number;
}

export interface ConceptRelationship {
  relationship_id: string;
  concept_id_2: number;
  concept_name_2: string;
  vocabulary_id_2: string;
}

// Search types - Note: search API returns data as direct array
export interface SearchResult {
  concept_id: number;
  concept_name: string;
  domain_id: string;
  vocabulary_id: string;
  concept_class_id: string;
  standard_concept: string | null;
  concept_code: string;
  valid_start_date: string;
  valid_end_date: string;
  invalid_reason: string | null;
}

// Hierarchy types
export interface AncestorConcept extends Concept {
  level?: number;
  min_levels_of_separation?: number;
  max_levels_of_separation?: number;
  relationship_id?: string;
  relationship_name?: string;
}

export interface DescendantConcept extends Concept {
  level?: number;
  min_levels_of_separation?: number;
  max_levels_of_separation?: number;
  relationship_id?: string;
  relationship_name?: string;
}

export interface HierarchySummary {
  total_ancestors?: number;
  total_descendants?: number;
  max_hierarchy_depth?: number;
  unique_vocabularies?: string[];
  relationship_types_used?: string[];
}

export interface AncestorsResponse {
  concept_id: number;
  concept_name: string;
  vocabulary_id: string;
  ancestors: AncestorConcept[];
  hierarchy_summary?: HierarchySummary;
}

export interface DescendantsResponse {
  concept_id: number;
  concept_name: string;
  vocabulary_id: string;
  descendants: DescendantConcept[];
  hierarchy_summary?: HierarchySummary;
}

// Mapping types
export interface ConceptMapping {
  source_concept_id: number;
  source_concept_name: string;
  source_vocabulary_id: string;
  target_concept_id: number;
  target_concept_name: string;
  target_vocabulary_id: string;
  relationship_id: string;
  confidence_score?: number;
  valid_start_date: string;
  valid_end_date: string;
}

export interface MappingResponse {
  mappings: ConceptMapping[];
}

// Vocabulary types
export interface Vocabulary {
  vocabulary_id: string;
  vocabulary_name: string;
  vocabulary_reference: string;
  vocabulary_version: string;
  vocabulary_concept_id: number;
  concept_count?: number;
  standard_concept_count?: number;
}

export interface VocabulariesResponse {
  vocabularies: Vocabulary[];
}

// Relationship type
export interface RelationshipType {
  relationship_id: string;
  relationship_name: string;
  is_hierarchical: string;
  defines_ancestry: string;
  reverse_relationship_id: string;
  relationship_concept_id: number;
}

export interface RelationshipTypesResponse {
  relationship_types: RelationshipType[];
}

// Domain types
export interface Domain {
  domain_id: string;
  domain_name: string;
  domain_concept_id: number;
  concept_count?: number;
  standard_concept_count?: number;
  vocabulary_coverage?: string[];
}

export interface DomainsResponse {
  domains: Domain[];
}

// API Client options
export interface OmopHubClientOptions {
  apiKey: string;
  baseUrl?: string | undefined;
  vocabRelease?: string | undefined;
}

// Tool input types
export interface SearchConceptsInput {
  query: string;
  vocabulary_ids?: string | undefined;
  domain_ids?: string | undefined;
  page?: number | undefined;
  page_size?: number | undefined;
}

export interface GetConceptInput {
  concept_id: number;
  include_relationships?: boolean | undefined;
  include_synonyms?: boolean | undefined;
  include_hierarchy?: boolean | undefined;
}

export interface GetAncestorsInput {
  concept_id: number;
  vocabulary_ids?: string | undefined;
  domain_ids?: string | undefined;
  max_levels?: number | undefined;
  relationship_types?: string | undefined;
  include_distance?: boolean | undefined;
  page?: number | undefined;
  page_size?: number | undefined;
}

export interface GetDescendantsInput {
  concept_id: number;
  vocabulary_ids?: string | undefined;
  domain_ids?: string | undefined;
  max_levels?: number | undefined;
  relationship_types?: string | undefined;
  include_distance?: boolean | undefined;
  page?: number | undefined;
  page_size?: number | undefined;
}

export interface MapConceptsInput {
  source_concepts: number[];
  target_vocabulary: string;
  mapping_type?: "direct" | "equivalent" | "broader" | "narrower" | undefined;
  include_invalid?: boolean | undefined;
}

export interface ListVocabulariesInput {
  page?: number | undefined;
  page_size?: number | undefined;
  include_stats?: boolean | undefined;
  include_inactive?: boolean | undefined;
  sort_by?: "name" | "priority" | "updated" | undefined;
  sort_order?: "asc" | "desc" | undefined;
}

export interface ListDomainsInput {
  include_stats?: boolean | undefined;
}
