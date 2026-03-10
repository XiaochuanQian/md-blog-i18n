#!/usr/bin/env node
import { readFile } from "fs/promises";
import { join } from "path";
import { translateDirectory } from "./translateDirectory";
import { createOpenAIProvider } from "./openaiProvider";
import { buildCache } from "./cache";

interface Config {
  openaiApiKey?: string;
  model?: string;
  baseUrl?: string;
  translationOptions?: {
    sourceLang?: string;
  };
}

const USAGE = `\
Usage:
  md-blog-i18n <input-dir> <lang1> [lang2 ...]   Translate Markdown files
  md-blog-i18n hash-cache <input-dir>             Build/update the hash cache without translating

Examples:
  md-blog-i18n content ja fr zh
  md-blog-i18n hash-cache content

Reads OpenAI credentials from md-blog-i18n.config.json in the current directory.`;

async function runHashCache(input: string): Promise<void> {
  await buildCache(input);
  console.log(`[md-blog-i18n] Cache built for "${input}".`);
}

async function runTranslate(input: string, languages: string[]): Promise<void> {
  const configPath = join(process.cwd(), "md-blog-i18n.config.json");
  let config: Config = {};

  try {
    const raw = await readFile(configPath, "utf-8");
    config = JSON.parse(raw) as Config;
  } catch {
    console.error(
      `[md-blog-i18n] Config file not found or invalid: ${configPath}\n` +
      "Create md-blog-i18n.config.json in the current directory with:\n" +
      '  { "openaiApiKey": "sk-..." }'
    );
    process.exit(1);
  }

  if (!config.openaiApiKey) {
    console.error(
      '[md-blog-i18n] Missing "openaiApiKey" in md-blog-i18n.config.json'
    );
    process.exit(1);
  }

  const provider = createOpenAIProvider({
    apiKey: config.openaiApiKey,
    model: config.model,
    baseUrl: config.baseUrl,
    translationOptions: config.translationOptions,
  });

  console.log(
    `[md-blog-i18n] Translating "${input}" into: ${languages.join(", ")}`
  );

  await translateDirectory({ input, languages, provider });

  console.log("[md-blog-i18n] Done.");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args[0] === "hash-cache") {
    const input = args[1];
    if (!input) {
      console.error("Usage: md-blog-i18n hash-cache <input-dir>");
      process.exit(1);
    }
    await runHashCache(input);
    return;
  }

  if (args.length < 2) {
    console.error(USAGE);
    process.exit(1);
  }

  const [input, ...languages] = args;
  await runTranslate(input, languages);
}

main().catch((err) => {
  console.error("[md-blog-i18n] Unexpected error:", err);
  process.exit(1);
});
