import { describe, expect, it } from "vitest";

import {
  DEFAULT_BASE_URL,
  PER_PAGE_DEFAULT,
  WEEKLY_DIGEST_CATEGORY_ID,
  WpDigestNotFoundError,
  WpRequestError,
  createWpClient,
  type WpPost,
} from "./client.js";

function samplePost(overrides: Partial<WpPost> = {}): WpPost {
  return {
    id: 1,
    date: "2026-04-13T22:25:54",
    date_gmt: "2026-04-13T22:25:54",
    modified: "2026-04-13T22:25:54",
    modified_gmt: "2026-04-13T22:25:54",
    slug: "weekly-ohdsi-digest-april-13-2026",
    status: "publish",
    type: "post",
    link: "https://www.ohdsi.org/weekly-ohdsi-digest-april-13-2026/",
    title: { rendered: "Weekly OHDSI Digest – April 13, 2026" },
    excerpt: { rendered: "<p>excerpt</p>" },
    content: { rendered: "<h2>body</h2>" },
    author: 9527,
    categories: [WEEKLY_DIGEST_CATEGORY_ID],
    tags: [],
    ...overrides,
  };
}

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

describe("createWpClient.listDigests", () => {
  it("scopes requests to the Weekly Digest category and uses sensible defaults", async () => {
    const calls: string[] = [];
    const client = createWpClient({
      fetch: async (input) => {
        calls.push(String(input));
        return jsonResponse([samplePost()], {
          headers: { "x-wp-total": "73", "x-wp-totalpages": "4" },
        });
      },
    });

    const result = await client.listDigests({});

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!);
    expect(`${url.origin}${url.pathname}`).toBe(`${DEFAULT_BASE_URL}/posts`);
    expect(url.searchParams.get("categories")).toBe(
      String(WEEKLY_DIGEST_CATEGORY_ID),
    );
    expect(url.searchParams.get("per_page")).toBe(String(PER_PAGE_DEFAULT));
    expect(url.searchParams.get("orderby")).toBe("date");
    expect(url.searchParams.get("order")).toBe("desc");
    expect(url.searchParams.get("page")).toBeNull();
    expect(url.searchParams.get("search")).toBeNull();

    expect(result.total).toBe(73);
    expect(result.totalPages).toBe(4);
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]!.id).toBe(1);
  });

  it("propagates page / per_page / after / before / search into the query string", async () => {
    let seenUrl = "";
    const client = createWpClient({
      baseUrl: "https://example.test/wp-json/wp/v2/",
      fetch: async (input) => {
        seenUrl = String(input);
        return jsonResponse([]);
      },
    });

    await client.listDigests({
      page: 3,
      perPage: 50,
      after: "2026-01-01T00:00:00",
      before: "2026-02-01T00:00:00",
      search: "vocabulary",
    });

    const url = new URL(seenUrl);
    expect(url.origin + url.pathname).toBe(
      "https://example.test/wp-json/wp/v2/posts",
    );
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("per_page")).toBe("50");
    expect(url.searchParams.get("after")).toBe("2026-01-01T00:00:00");
    expect(url.searchParams.get("before")).toBe("2026-02-01T00:00:00");
    expect(url.searchParams.get("search")).toBe("vocabulary");
  });

  it("returns undefined totals when the WP headers are absent", async () => {
    const client = createWpClient({
      fetch: async () => jsonResponse([samplePost()]),
    });
    const result = await client.listDigests({});
    expect(result.total).toBeUndefined();
    expect(result.totalPages).toBeUndefined();
  });

  it("throws WpRequestError on non-2xx responses", async () => {
    const client = createWpClient({
      fetch: async () =>
        new Response("boom", {
          status: 500,
          headers: { "content-type": "text/plain" },
        }),
    });

    await expect(client.listDigests({})).rejects.toBeInstanceOf(WpRequestError);
  });
});

describe("createWpClient.retrieveDigest", () => {
  it("hits /posts/:id and returns the parsed post", async () => {
    let seenUrl = "";
    const client = createWpClient({
      fetch: async (input) => {
        seenUrl = String(input);
        return jsonResponse(samplePost({ id: 42 }));
      },
    });

    const post = await client.retrieveDigest(42);

    expect(seenUrl).toBe(`${DEFAULT_BASE_URL}/posts/42`);
    expect(post.id).toBe(42);
  });

  it("throws WpDigestNotFoundError on 404", async () => {
    const client = createWpClient({
      fetch: async () =>
        new Response(JSON.stringify({ code: "rest_post_invalid_id" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
    });

    await expect(client.retrieveDigest(99999)).rejects.toBeInstanceOf(
      WpDigestNotFoundError,
    );
  });

  it("throws WpRequestError on other non-2xx responses", async () => {
    const client = createWpClient({
      fetch: async () =>
        new Response("nope", {
          status: 500,
          headers: { "content-type": "text/plain" },
        }),
    });

    await expect(client.retrieveDigest(1)).rejects.toBeInstanceOf(
      WpRequestError,
    );
  });
});
