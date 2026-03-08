#!/usr/bin/env node
import { readFile } from "fs/promises";
import { join } from "path";
import { translateDirectory } from "./translateDirectory";
import { createOpenAIProvider } from "./openaiProvider";

interface Config {
  openaiApiKey?: string;
  model?: string;
  baseUrl?: string;
  translationOptions?: {
    sourceLang?: string;
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: md-blog-i18n <input-dir> <lang1> [lang2 ...]\n\n" +
      "Example: md-blog-i18n content en jp\n\n" +
      "Reads OpenAI credentials from md-blog-i18n.config.json in the current directory."
    );
    process.exit(1);
  }

  const [input, ...languages] = args;

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

main().catch((err) => {
  console.error("[md-blog-i18n] Unexpected error:", err);
  process.exit(1);
});
