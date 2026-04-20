import type { Heading, Root, RootContent } from "mdast";
import { toString as nodeToString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { ChapterEntry } from "./manifest.js";
import { stripYamlFrontmatter } from "./manifest.js";

export type SearchChunk = {
  id: string;
  title: string;
  text: string;
  category: string;
};

const headingIdPattern = /\s*\{#([^}]+)\}\s*$/;
const headingAttrPattern = /\s*\{[^}]*\}\s*$/;
const partMarkerPattern = /^\((?:PART|APPENDIX)\*?\)\s+(.+)$/;

type HeadingInfo = {
  text: string;
  explicitId: string | null;
  isPartMarker: boolean;
};

function extractHeadingInfo(heading: Heading): HeadingInfo {
  const raw = nodeToString(heading);
  const idMatch = headingIdPattern.exec(raw);
  const explicitId = idMatch ? idMatch[1]!.trim() : null;
  const withoutAttrs = raw.replace(headingAttrPattern, "").trim();
  const partMatch = partMarkerPattern.exec(withoutAttrs);
  return {
    text: partMatch ? partMatch[1]!.trim() : withoutAttrs,
    explicitId,
    isPartMarker: partMatch !== null,
  };
}

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "section"
  );
}

function isHeading(node: RootContent): node is Heading {
  return node.type === "heading";
}

function collectText(nodes: RootContent[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    const text = nodeToString(node).trim();
    if (text) parts.push(text);
  }
  return parts.join("\n\n");
}

export function chunkChapter(
  chapter: ChapterEntry,
  body: string,
): SearchChunk[] {
  const cleanedBody = stripYamlFrontmatter(body);
  const tree = unified().use(remarkParse).parse(cleanedBody) as Root;
  const chunks: SearchChunk[] = [];
  const usedIds = new Set<string>();

  let currentHeading: HeadingInfo | null = null;
  let currentNodes: RootContent[] = [];

  const flush = () => {
    if (!currentHeading) {
      currentNodes = [];
      return;
    }
    const text = collectText(currentNodes);
    currentNodes = [];
    if (currentHeading.isPartMarker && !text) {
      return;
    }
    const base =
      currentHeading.explicitId ?? slugifyHeading(currentHeading.text);
    let id = `${chapter.slug}-${base}`;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${chapter.slug}-${base}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    chunks.push({
      id,
      title: `${currentHeading.text} | ${chapter.title}`,
      text,
      category: chapter.slug,
    });
  };

  for (const node of tree.children) {
    if (isHeading(node)) {
      flush();
      currentHeading = extractHeadingInfo(node);
    } else if (currentHeading) {
      currentNodes.push(node);
    }
  }
  flush();

  return chunks;
}
