import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, basename, join } from "path";
import { TranslatorProvider } from "./provider";

export interface TranslateFileOptions {
  filePath: string;
  languages: string[];
  provider: TranslatorProvider;
}

export async function translateFile(options: TranslateFileOptions): Promise<void> {
  const { filePath, languages, provider } = options;

  let source: string;
  try {
    source = await readFile(filePath, "utf-8");
  } catch (err) {
    console.error(`[md-blog-i18n] Failed to read file: ${filePath}`, err);
    return;
  }

  const dir = dirname(filePath);
  const filename = basename(filePath);

  for (const lang of languages) {
    try {
      const translated = await provider.translate(source, lang);
      const outDir = join(dir, lang);
      await mkdir(outDir, { recursive: true });
      await writeFile(join(outDir, filename), translated, "utf-8");
      console.log(`[md-blog-i18n] ${filename} → ${lang}/${filename}`);
    } catch (err) {
      console.error(
        `[md-blog-i18n] Failed to translate "${filename}" to "${lang}":`,
        err
      );
    }
  }
}
