/**
 * OMOPHub API Client
 * Wrapper for the OMOPHub Vocabulary API
 */

import type {
  ApiResponse,
  OmopHubClientOptions,
  ConceptDetail,
  SearchResult,
  AncestorsResponse,
  DescendantsResponse,
  MappingResponse,
  VocabulariesResponse,
  RelationshipTypesResponse,
  DomainsResponse,
  SearchConceptsInput,
  GetConceptInput,
  GetAncestorsInput,
  GetDescendantsInput,
  MapConceptsInput,
  ListVocabulariesInput,
  ListDomainsInput,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.omophub.com/v1";

export class OmopHubClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly vocabRelease: string | undefined;

  constructor(options: OmopHubClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.vocabRelease = options.vocabRelease;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);

    // Add query parameters
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Add vocab_release if set globally and not provided in params
    if (this.vocabRelease && !params?.vocab_release) {
      url.searchParams.set("vocab_release", this.vocabRelease);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const requestInit: RequestInit = {
      method,
      headers,
    };
    if (body) {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), requestInit);

    if (!response.ok) {
      const errorText = await response.text();
      throw new OmopHubApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    return response.json() as Promise<ApiResponse<T>>;
  }

  /**
   * Search for concepts across vocabularies
   * Note: API returns data as direct array of SearchResult
   */
  async searchConcepts(
    input: SearchConceptsInput
  ): Promise<ApiResponse<SearchResult[]>> {
    return this.request<SearchResult[]>("GET", "/search/concepts", {
      query: input.query,
      vocabulary_ids: input.vocabulary_ids,
      domain_ids: input.domain_ids,
      page: input.page,
      page_size: input.page_size,
    });
  }

  /**
   * Get detailed information about a specific concept
   */
  async getConcept(input: GetConceptInput): Promise<ApiResponse<ConceptDetail>> {
    return this.request<ConceptDetail>(
      "GET",
      `/concepts/${input.concept_id}`,
      {
        include_relationships: input.include_relationships,
        include_synonyms: input.include_synonyms,
        include_hierarchy: input.include_hierarchy,
      }
    );
  }

  /**
   * Get ancestor concepts for a given concept
   */
  async getAncestors(
    input: GetAncestorsInput
  ): Promise<ApiResponse<AncestorsResponse>> {
    return this.request<AncestorsResponse>(
      "GET",
      `/concepts/${input.concept_id}/ancestors`,
      {
        vocabulary_ids: input.vocabulary_ids,
        domain_ids: input.domain_ids,
        max_levels: input.max_levels,
        relationship_types: input.relationship_types,
        include_distance: input.include_distance,
        page: input.page,
        page_size: input.page_size,
      }
    );
  }

  /**
   * Get descendant concepts for a given concept
   */
  async getDescendants(
    input: GetDescendantsInput
  ): Promise<ApiResponse<DescendantsResponse>> {
    return this.request<DescendantsResponse>(
      "GET",
      `/concepts/${input.concept_id}/descendants`,
      {
        vocabulary_ids: input.vocabulary_ids,
        domain_ids: input.domain_ids,
        max_levels: input.max_levels,
        relationship_types: input.relationship_types,
        include_distance: input.include_distance,
        page: input.page,
        page_size: input.page_size,
      }
    );
  }

  /**
   * Map concepts from source vocabularies to target vocabularies
   */
  async mapConcepts(
    input: MapConceptsInput
  ): Promise<ApiResponse<MappingResponse>> {
    return this.request<MappingResponse>(
      "POST",
      "/concepts/map",
      {
        mapping_type: input.mapping_type,
        include_invalid: input.include_invalid,
      },
      {
        source_concepts: input.source_concepts,
        target_vocabulary: input.target_vocabulary,
      }
    );
  }

  /**
   * List all available vocabularies
   */
  async listVocabularies(
    input?: ListVocabulariesInput
  ): Promise<ApiResponse<VocabulariesResponse>> {
    return this.request<VocabulariesResponse>("GET", "/vocabularies", {
      page: input?.page,
      page_size: input?.page_size,
      include_stats: input?.include_stats,
      include_inactive: input?.include_inactive,
      sort_by: input?.sort_by,
      sort_order: input?.sort_order,
    });
  }

  /**
   * List all available relationship types
   */
  async listRelationshipTypes(
    page?: number,
    pageSize?: number
  ): Promise<ApiResponse<RelationshipTypesResponse>> {
    return this.request<RelationshipTypesResponse>(
      "GET",
      "/relationships/types",
      {
        page,
        page_size: pageSize,
      }
    );
  }

  /**
   * List all available domains
   */
  async listDomains(
    input?: ListDomainsInput
  ): Promise<ApiResponse<DomainsResponse>> {
    return this.request<DomainsResponse>("GET", "/domains", {
      include_stats: input?.include_stats,
    });
  }
}

/**
 * Custom error class for OMOPHub API errors
 */
export class OmopHubApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string
  ) {
    super(message);
    this.name = "OmopHubApiError";
  }
}

/**
 * Create a client from environment variables
 */
export function createClientFromEnv(): OmopHubClient {
  const apiKey = process.env.OMOPHUB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OMOPHUB_API_KEY environment variable is required. " +
        "Get your API key from https://omophub.com"
    );
  }

  return new OmopHubClient({
    apiKey,
    baseUrl: process.env.OMOPHUB_BASE_URL,
    vocabRelease: process.env.OMOPHUB_VOCAB_RELEASE,
  });
}
