import { MANIFEST, listDocuments } from "./manifest.js";

export const TOC_URI = "omop-cdm://documents";
export const DOCUMENT_URI_PREFIX = "omop-cdm://document/";

export const MIME_MARKDOWN = "text/markdown";
export const MIME_RMARKDOWN = "text/x-rmarkdown";

export function documentUri(slug: string): string {
  return `${DOCUMENT_URI_PREFIX}${slug}`;
}

export function renderToc(): string {
  const docs = listDocuments();
  const lines: string[] = [];
  lines.push("# OMOP CDM — R Markdown documents");
  lines.push("");
  lines.push(
    `- source: ${MANIFEST.source.owner}/${MANIFEST.source.repo} @ ${MANIFEST.source.commit}`,
  );
  lines.push(`- document count: ${docs.length}`);
  lines.push("");
  lines.push("| # | slug | title | resource URI |");
  lines.push("| --- | --- | --- | --- |");
  for (const doc of docs) {
    const safeTitle = doc.title.replace(/\|/g, "\\|");
    lines.push(
      `| ${doc.order + 1} | \`${doc.slug}\` | ${safeTitle} | \`${documentUri(doc.slug)}\` |`,
    );
  }
  return lines.join("\n");
}
