import { readdir } from "fs/promises";
import { join } from "path";
import { TranslatorProvider } from "./provider";
import { translateFile } from "./translateFile";

export interface TranslateDirectoryOptions {
  input: string;
  languages: string[];
  provider: TranslatorProvider;
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

  for (const filename of mdFiles) {
    await translateFile({
      filePath: join(input, filename),
      languages,
      provider,
    });
  }
}
