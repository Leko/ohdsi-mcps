import { z } from "zod";
import {
  CHAPTER_BODIES,
  RMD_FILES,
  SOURCE_COMMIT,
} from "./generated/content.js";

export const chapterEntrySchema = z.object({
  slug: z.string().min(1),
  filename: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
});

export type ChapterEntry = z.infer<typeof chapterEntrySchema>;

export type Manifest = {
  source: {
    owner: "OHDSI";
    repo: "TheBookOfOhdsi";
    commit: string;
  };
  chapters: ChapterEntry[];
};

export function stripYamlFrontmatter(text: string): string {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return text;
  return text.slice(end + 4).replace(/^\r?\n/, "");
}

export function extractTitle(rmd: string, fallback: string): string {
  const body = stripYamlFrontmatter(rmd);
  let partFallback: string | null = null;
  for (const line of body.split("\n")) {
    const match = /^#\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const heading = (match[1] ?? "")
      .replace(/\s*\{[^}]*\}\s*$/g, "")
      .trim();
    if (!heading) continue;
    const partMarker = /^\((?:PART|APPENDIX)\*?\)\s+(.+)$/.exec(heading);
    if (partMarker) {
      if (partFallback === null) partFallback = partMarker[1]!.trim();
      continue;
    }
    return heading;
  }
  return partFallback ?? fallback;
}

export function slugOf(filename: string): string {
  return filename.replace(/\.Rmd$/i, "");
}

function bodyOf(filename: string): string {
  const body = CHAPTER_BODIES[filename];
  if (typeof body !== "string") {
    throw new Error(
      `Chapter ${filename} is missing from the generated content module. Regenerate via \`npm run generate-content\`.`,
    );
  }
  return body;
}

export function loadManifest(): Manifest {
  const chapters: ChapterEntry[] = RMD_FILES.map((filename, order) => {
    const slug = slugOf(filename);
    const body = bodyOf(filename);
    return {
      slug,
      filename,
      title: extractTitle(body, slug),
      order,
    };
  });
  return {
    source: {
      owner: "OHDSI",
      repo: "TheBookOfOhdsi",
      commit: SOURCE_COMMIT,
    },
    chapters,
  };
}

export function loadChapterBody(entry: ChapterEntry): string {
  return bodyOf(entry.filename);
}
