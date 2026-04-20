import { describe, expect, it } from "vitest";

import type { ListDigestResult, WpPost } from "./client.js";
import { WEEKLY_DIGEST_CATEGORY_ID } from "./client.js";
import { renderListDigest, renderRetrieveDigest } from "./tools.js";

function samplePost(overrides: Partial<WpPost> = {}): WpPost {
  return {
    id: 37328,
    date: "2026-04-13T22:25:54",
    date_gmt: "2026-04-13T22:25:54",
    modified: "2026-04-13T22:25:54",
    modified_gmt: "2026-04-13T22:25:54",
    slug: "weekly-ohdsi-digest-april-13-2026",
    status: "publish",
    type: "post",
    link: "https://www.ohdsi.org/weekly-ohdsi-digest-april-13-2026/",
    title: { rendered: "Weekly OHDSI Digest &#8211; April 13, 2026" },
    excerpt: { rendered: "<p>excerpt text</p>" },
    content: { rendered: "<h2>Full body HTML</h2>\n<p>content</p>" },
    author: 9527,
    categories: [WEEKLY_DIGEST_CATEGORY_ID],
    tags: [],
    ...overrides,
  };
}

describe("renderListDigest", () => {
  it("renders a markdown header, metadata block, and a table row per post", () => {
    const result: ListDigestResult = {
      posts: [samplePost(), samplePost({ id: 37238, date: "2026-04-06T20:20:34" })],
      total: 73,
      totalPages: 4,
    };

    const out = renderListDigest(result, { page: 1, perPage: 20 });

    expect(out).toContain("# OHDSI Weekly Digest — posts");
    expect(out).toContain("- page: 1");
    expect(out).toContain("- per_page: 20");
    expect(out).toContain("- total: 73");
    expect(out).toContain("- total_pages: 4");
    expect(out).toContain("| id | date | title | link |");
    expect(out).toContain("| 37328 | 2026-04-13 |");
    expect(out).toContain("| 37238 | 2026-04-06 |");
    // HTML entity in title must be decoded
    expect(out).toContain("Weekly OHDSI Digest – April 13, 2026");
    expect(out).not.toContain("&#8211;");
  });

  it("renders 'no posts' copy when the result set is empty", () => {
    const out = renderListDigest(
      { posts: [], total: 0, totalPages: 0 },
      { search: "zzz" },
    );
    expect(out).toContain("No posts matched");
    expect(out).toContain("- search:");
  });

  it("shows 'unknown' when WP total headers were not provided", () => {
    const out = renderListDigest(
      { posts: [samplePost()], total: undefined, totalPages: undefined },
      {},
    );
    expect(out).toContain("- total: unknown");
    expect(out).toContain("- total_pages: unknown");
  });

  it("echoes after/before/search filters into the metadata block", () => {
    const out = renderListDigest(
      { posts: [samplePost()], total: 1, totalPages: 1 },
      {
        after: "2026-01-01T00:00:00",
        before: "2026-02-01T00:00:00",
        search: "vocab",
      },
    );
    expect(out).toContain("- after: 2026-01-01T00:00:00");
    expect(out).toContain("- before: 2026-02-01T00:00:00");
    expect(out).toContain('- search: "vocab"');
  });
});

describe("renderRetrieveDigest", () => {
  it("decodes named and hex HTML entities in titles", () => {
    const out = renderRetrieveDigest(
      samplePost({
        title: {
          rendered: "A &amp; B &#x2013; C &quot;D&quot; &#039;E&#039; &lt;F&gt; &nbsp; &#8211;",
        },
      }),
    );
    expect(out).toContain('# A & B – C "D" \'E\' <F>');
  });

  it("emits a metadata header followed by the raw content HTML", () => {
    const out = renderRetrieveDigest(samplePost());

    expect(out).toContain("# Weekly OHDSI Digest – April 13, 2026");
    expect(out).toContain("- id: 37328");
    expect(out).toContain("- slug: `weekly-ohdsi-digest-april-13-2026`");
    expect(out).toContain(
      "- link: https://www.ohdsi.org/weekly-ohdsi-digest-april-13-2026/",
    );
    expect(out).toContain("<h2>Full body HTML</h2>");
    expect(out.indexOf("---")).toBeLessThan(out.indexOf("<h2>"));
  });
});
