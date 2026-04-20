export const DEFAULT_BASE_URL = "https://www.ohdsi.org/wp-json/wp/v2";

/**
 * WordPress category id that scopes the `posts` endpoint to the
 * "Weekly Digest" series on ohdsi.org. Fixed on purpose — this MCP is
 * dedicated to the Weekly Digest, so the category is not exposed as a
 * tool argument.
 */
export const WEEKLY_DIGEST_CATEGORY_ID = 1;

export const PER_PAGE_DEFAULT = 20;
export const PER_PAGE_MAX = 100;

export interface WpRendered {
  rendered: string;
}

export interface WpPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: WpRendered;
  excerpt: WpRendered;
  content: WpRendered;
  author: number;
  categories: number[];
  tags: number[];
}

export interface ListDigestParams {
  page?: number | undefined;
  perPage?: number | undefined;
  after?: string | undefined;
  before?: string | undefined;
  search?: string | undefined;
}

export interface ListDigestResult {
  posts: WpPost[];
  total: number | undefined;
  totalPages: number | undefined;
}

export interface WpClient {
  listDigests(params: ListDigestParams): Promise<ListDigestResult>;
  retrieveDigest(id: number): Promise<WpPost>;
}

export interface WpClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export class WpDigestNotFoundError extends Error {
  constructor(readonly id: number) {
    super(`OHDSI Weekly Digest post not found: id=${id}`);
    this.name = "WpDigestNotFoundError";
  }
}

export class WpRequestError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly body: string,
  ) {
    super(
      `WordPress REST API request failed: ${status} ${url}${body ? ` — ${body}` : ""}`,
    );
    this.name = "WpRequestError";
  }
}

function parseIntHeader(value: string | null): number | undefined {
  if (value === null) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function createWpClient(options: WpClientOptions = {}): WpClient {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const fetchImpl = options.fetch ?? globalThis.fetch;

  async function request(url: string): Promise<Response> {
    const response = await fetchImpl(url, {
      headers: { accept: "application/json" },
    });
    return response;
  }

  return {
    async listDigests(params) {
      const url = new URL(`${baseUrl}/posts`);
      url.searchParams.set("categories", String(WEEKLY_DIGEST_CATEGORY_ID));
      url.searchParams.set(
        "per_page",
        String(params.perPage ?? PER_PAGE_DEFAULT),
      );
      if (params.page !== undefined) {
        url.searchParams.set("page", String(params.page));
      }
      if (params.after) url.searchParams.set("after", params.after);
      if (params.before) url.searchParams.set("before", params.before);
      if (params.search) url.searchParams.set("search", params.search);
      url.searchParams.set("orderby", "date");
      url.searchParams.set("order", "desc");

      const response = await request(url.toString());
      if (!response.ok) {
        const body = await response.text();
        throw new WpRequestError(response.status, url.toString(), body);
      }
      const posts = (await response.json()) as WpPost[];
      return {
        posts,
        total: parseIntHeader(response.headers.get("x-wp-total")),
        totalPages: parseIntHeader(response.headers.get("x-wp-totalpages")),
      };
    },

    async retrieveDigest(id) {
      const url = `${baseUrl}/posts/${id}`;
      const response = await request(url);
      if (response.status === 404) {
        throw new WpDigestNotFoundError(id);
      }
      if (!response.ok) {
        const body = await response.text();
        throw new WpRequestError(response.status, url, body);
      }
      return (await response.json()) as WpPost;
    },
  };
}
