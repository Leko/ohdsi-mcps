import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const bookdownYamlSchema = z.object({
  rmd_files: z.array(z.string()),
});

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
    path: string;
  };
  chapters: ChapterEntry[];
};

export const vendorDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "vendor",
  "TheBookOfOhdsi",
);

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

async function readBookdownConfig(): Promise<string[]> {
  const yamlText = await readFile(join(vendorDir, "_bookdown.yml"), "utf8");
  const parsed = bookdownYamlSchema.parse(parseYaml(yamlText));
  return parsed.rmd_files;
}

async function readHeadCommit(): Promise<string> {
  const result = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: vendorDir,
  });
  return result.stdout.trim();
}

export async function loadManifest(): Promise<Manifest> {
  const rmdFiles = await readBookdownConfig();
  const chapters: ChapterEntry[] = [];
  for (const [order, filename] of rmdFiles.entries()) {
    const slug = slugOf(filename);
    const body = await readFile(join(vendorDir, filename), "utf8");
    chapters.push({
      slug,
      filename,
      title: extractTitle(body, slug),
      order,
    });
  }
  const commit = await readHeadCommit();
  return {
    source: {
      owner: "OHDSI",
      repo: "TheBookOfOhdsi",
      commit,
      path: vendorDir,
    },
    chapters,
  };
}

export async function loadChapterBody(entry: ChapterEntry): Promise<string> {
  return readFile(join(vendorDir, entry.filename), "utf8");
}
