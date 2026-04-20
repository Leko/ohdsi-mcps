import type { ListDigestParams, ListDigestResult, WpPost } from "./client.js";
import { PER_PAGE_DEFAULT } from "./client.js";

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function normalizeTitle(rendered: string): string {
  return decodeHtmlEntities(rendered).replace(/\s+/g, " ").trim();
}

export function renderListDigest(
  result: ListDigestResult,
  params: ListDigestParams,
): string {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? PER_PAGE_DEFAULT;
  const lines: string[] = [];
  lines.push("# OHDSI Weekly Digest — posts");
  lines.push("");
  lines.push(`- page: ${page}`);
  lines.push(`- per_page: ${perPage}`);
  lines.push(`- total: ${result.total ?? "unknown"}`);
  lines.push(`- total_pages: ${result.totalPages ?? "unknown"}`);
  if (params.after) lines.push(`- after: ${params.after}`);
  if (params.before) lines.push(`- before: ${params.before}`);
  if (params.search) lines.push(`- search: ${JSON.stringify(params.search)}`);
  lines.push("");

  if (result.posts.length === 0) {
    lines.push("_No posts matched the given filters._");
    return lines.join("\n");
  }

  lines.push("| id | date | title | link |");
  lines.push("| --- | --- | --- | --- |");
  for (const post of result.posts) {
    const date = post.date.slice(0, 10);
    const title = normalizeTitle(post.title.rendered).replace(/\|/g, "\\|");
    lines.push(`| ${post.id} | ${date} | ${title} | ${post.link} |`);
  }
  return lines.join("\n");
}

export function renderRetrieveDigest(post: WpPost): string {
  const title = normalizeTitle(post.title.rendered);
  const header = [
    `# ${title}`,
    "",
    `- id: ${post.id}`,
    `- date: ${post.date}`,
    `- slug: \`${post.slug}\``,
    `- link: ${post.link}`,
    "",
    "---",
    "",
  ].join("\n");
  return header + post.content.rendered;
}
