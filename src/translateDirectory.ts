import { readdir, readFile, access } from "fs/promises";
import { join } from "path";
import { TranslatorProvider } from "./provider";
import { translateFile } from "./translateFile";
import { readCache, writeCache, computeHash } from "./cache";

export interface TranslateDirectoryOptions {
  input: string;
  languages: string[];
  provider: TranslatorProvider;
}

async function missingLanguages(
  inputDir: string,
  filename: string,
  languages: string[]
): Promise<string[]> {
  const missing: string[] = [];
  for (const lang of languages) {
    try {
      await access(join(inputDir, lang, filename));
    } catch {
      missing.push(lang);
    }
  }
  return missing;
}

export async function translateDirectory(
  options: TranslateDirectoryOptions
): Promise<void> {
  const { input, languages, provider } = options;

  let entries: string[];
  try {
    entries = await readdir(input);
  } catch (err) {
    console.error(`[md-blog-i18n] Failed to read directory: ${input}`, err);
    return;
  }

  const mdFiles = entries.filter((entry) => entry.endsWith(".md"));

  if (mdFiles.length === 0) {
    console.warn(`[md-blog-i18n] No .md files found in "${input}"`);
    return;
  }

  const cache = await readCache(input);

  for (const filename of mdFiles) {
    const filePath = join(input, filename);

    let source: string;
    try {
      source = await readFile(filePath, "utf-8");
    } catch (err) {
      console.error(`[md-blog-i18n] Failed to read file: ${filePath}`, err);
      continue;
    }

    const hash = computeHash(source);
    const hashChanged = cache[filename] !== hash;

    if (hashChanged) {
      // Source changed — retranslate every language.
      await translateFile({ filePath, languages, provider });
      cache[filename] = hash;
      await writeCache(input, cache);
    } else {
      // Source unchanged — only translate languages whose output is missing.
      const missing = await missingLanguages(input, filename, languages);
      if (missing.length === 0) {
        console.log(`[md-blog-i18n] Skipping "${filename}" (unchanged)`);
      } else {
        console.log(
          `[md-blog-i18n] "${filename}" unchanged — translating new language(s): ${missing.join(", ")}`
        );
        await translateFile({ filePath, languages: missing, provider });
        // Hash stays the same; cache entry is already correct.
      }
    }
  }
}
