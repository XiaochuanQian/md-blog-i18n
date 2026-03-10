import { createHash } from "crypto";
import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";

const CACHE_FILENAME = ".md-blog-i18n-cache.json";

/** Maps source filename → SHA-256 hash of the content that was last translated. */
export type TranslationCache = Record<string, string>;

export async function readCache(dir: string): Promise<TranslationCache> {
  try {
    const raw = await readFile(join(dir, CACHE_FILENAME), "utf-8");
    return JSON.parse(raw) as TranslationCache;
  } catch {
    return {};
  }
}

export async function writeCache(dir: string, cache: TranslationCache): Promise<void> {
  await writeFile(
    join(dir, CACHE_FILENAME),
    JSON.stringify(cache, null, 2) + "\n",
    "utf-8"
  );
}

export function computeHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Scans `dir` for top-level `.md` files, computes their hashes, and writes
 * the cache file. Useful for seeding the cache after adding existing
 * translations without running a full translation pass.
 */
export async function buildCache(dir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    console.error(`[md-blog-i18n] Failed to read directory: ${dir}`, err);
    return;
  }

  const mdFiles = entries.filter((f) => f.endsWith(".md"));

  if (mdFiles.length === 0) {
    console.warn(`[md-blog-i18n] No .md files found in "${dir}"`);
    return;
  }

  const cache = await readCache(dir);

  for (const filename of mdFiles) {
    try {
      const content = await readFile(join(dir, filename), "utf-8");
      cache[filename] = computeHash(content);
      console.log(`[md-blog-i18n] Hashed "${filename}"`);
    } catch (err) {
      console.error(`[md-blog-i18n] Failed to read "${filename}":`, err);
    }
  }

  await writeCache(dir, cache);
}
