# md-blog-i18n

Translate Markdown blog posts into multiple languages using an AI translation provider.

## Features

- Translate a single Markdown file or an entire directory
- Language-specific output folders (`content/en/`, `content/ja/`, …)
- **Hash-based caching** — skips files that haven't changed since the last run
- Built-in OpenAI-compatible provider — works with OpenAI, Qwen MT, and any compatible API
- No extra runtime dependencies — uses Node 18+ native `fetch`
- Bring-your-own provider via a simple interface
- CLI included (`npx md-blog-i18n`)
- Sequential processing — safe for rate-limited APIs

## Requirements

- Node.js ≥ 18

## Installation

```bash
npm install md-blog-i18n
```

## Caching

`translateDirectory` (and the CLI) automatically track which files have already been translated using SHA-256 content hashing. A `.md-blog-i18n-cache.json` file is written inside the input directory:

```json
{
  "post1.md": "a3f1...",
  "post2.md": "9c4e..."
}
```

### Translation behaviour per file

| Source changed? | Output files missing? | Action |
|---|---|---|
| Yes | — | Retranslate **all** requested languages |
| No | Yes (e.g. new language added) | Translate **only the missing** languages |
| No | No | **Skip** — nothing to do |

This means:
- **Unchanged files are never re-sent** to the API.
- **Adding a new language** (e.g. adding `zh` after `ja` and `fr` already exist) only translates the new language for each unchanged file.
- **Editing a source file** re-translates it into every requested language.

### Seeding the cache (hash-cache command)

If you already have translated output on disk (e.g. you generated it previously without the cache), you can seed the cache without running any translations:

```bash
md-blog-i18n hash-cache content
```

This scans the input directory for `.md` files, computes their hashes, and writes the cache file. On the next `md-blog-i18n` run, unchanged files with existing outputs will be skipped.

> **Tip:** Commit `.md-blog-i18n-cache.json` to version control so CI benefits from the cache across runs. If you prefer not to, add it to `.gitignore`.

---

## Configuration

Create **`md-blog-i18n.config.json`** in your project root (same directory where you run the CLI):

### OpenAI / GPT models

```json
{
  "openaiApiKey": "sk-...",
  "model": "gpt-4o-mini"
}
```

### Qwen MT (Alibaba DashScope)

```json
{
  "openaiApiKey": "YOUR_DASHSCOPE_API_KEY",
  "model": "qwen-mt-flash",
  "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "translationOptions": {
    "sourceLang": "auto"
  }
}
```

Use `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` for the Singapore region.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `openaiApiKey` | `string` | — | API key for your provider |
| `model` | `string` | `"gpt-4o-mini"` | Model name |
| `baseUrl` | `string` | `"https://api.openai.com/v1"` | Base URL of any OpenAI-compatible API |
| `translationOptions.sourceLang` | `string` | `"auto"` | Source language for dedicated translation models |

> **Do not commit this file to version control.** Add it to `.gitignore`.

## Language codes

The CLI and output directory names use short language codes. The provider receives the full English name automatically.

| Code | Language |
|------|----------|
| `en` | English |
| `zh` | Chinese (Simplified) |
| `zh_tw` | Traditional Chinese |
| `ja` | Japanese |
| `ko` | Korean |
| `fr` | French |
| `de` | German |
| `es` | Spanish |
| `ru` | Russian |
| `ar` | Arabic |

See [src/languages.ts](src/languages.ts) or [Qwen-mt documentation](https://help.aliyun.com/zh/model-studio/machine-translation#14735a54e0rwb)for the full list of supported codes.

## CLI usage

### Translate

```bash
npx md-blog-i18n <input-dir> <lang1> [lang2 ...]
```

```bash
npx md-blog-i18n content ja fr
```

Given:

```
content/
  post1.md
  post2.md
```

Produces:

```
content/
  post1.md
  post2.md
  .md-blog-i18n-cache.json
  ja/
    post1.md
    post2.md
  fr/
    post1.md
    post2.md
```

Adding a new language later only translates the new language for unchanged files:

```bash
npx md-blog-i18n content ja fr zh
# ja/ and fr/ already exist and source is unchanged → only zh/ is generated
```

### Build the hash cache (without translating)

```bash
npx md-blog-i18n hash-cache <input-dir>
```

Scans the directory for `.md` files, computes their SHA-256 hashes, and writes `.md-blog-i18n-cache.json`. No translation is performed. Useful for seeding the cache when you already have translated output on disk.

```bash
npx md-blog-i18n hash-cache content
```

## Programmatic usage

### With the built-in OpenAI provider

```ts
import { translateDirectory, createOpenAIProvider } from "md-blog-i18n";

const provider = createOpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4o-mini",
});

await translateDirectory({
  input: "content",
  languages: ["ja", "fr"],
  provider,
});
```

### With the Qwen MT provider

```ts
import { translateDirectory, createOpenAIProvider } from "md-blog-i18n";

const provider = createOpenAIProvider({
  apiKey: process.env.DASHSCOPE_API_KEY!,
  model: "qwen-mt-flash",
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  translationOptions: { sourceLang: "auto" },
});

await translateDirectory({
  input: "content",
  languages: ["ja", "fr"],
  provider,
});
```

### Translate a single file

```ts
import { translateFile, createOpenAIProvider } from "md-blog-i18n";

const provider = createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! });

await translateFile({
  filePath: "content/post1.md",
  languages: ["ja", "fr"],
  provider,
});
```

### With a custom provider

Implement the `TranslatorProvider` interface to use any translation backend:

```ts
import { TranslatorProvider, translateDirectory } from "md-blog-i18n";

const myProvider: TranslatorProvider = {
  async translate(text, targetLang) {
    // targetLang is the short code passed by the caller, e.g. "ja"
    return yourTranslationFunction(text, targetLang);
  },
};

await translateDirectory({
  input: "content",
  languages: ["ja", "fr"],
  provider: myProvider,
});
```

> **Note:** When using a custom provider, `targetLang` is passed through as-is (the short code).
> Use the exported `resolveLanguageName` helper if your backend requires full language names:
> ```ts
> import { resolveLanguageName } from "md-blog-i18n";
> resolveLanguageName("ja"); // → "Japanese"
> ```

### Provider interface

```ts
export interface TranslatorProvider {
  translate(text: string, targetLang: string): Promise<string>;
}
```

## API reference

### `translateFile(options)`

| Option | Type | Description |
|--------|------|-------------|
| `filePath` | `string` | Absolute or relative path to the `.md` file |
| `languages` | `string[]` | Target language codes (e.g. `["ja", "fr"]`) |
| `provider` | `TranslatorProvider` | Translation provider to use |

Reads `filePath`, translates the content into each language, and writes the result to `<dir>/<lang>/<filename>`.

### `translateDirectory(options)`

| Option | Type | Description |
|--------|------|-------------|
| `input` | `string` | Path to the directory containing `.md` files |
| `languages` | `string[]` | Target language codes |
| `provider` | `TranslatorProvider` | Translation provider to use |

Scans the top level of `input` for `.md` files and calls `translateFile` for each one.
Subdirectories (including previously translated output folders) are ignored.

### `createOpenAIProvider(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | API key |
| `model` | `string` | `"gpt-4o-mini"` | Model name |
| `baseUrl` | `string` | `"https://api.openai.com/v1"` | Base URL of any OpenAI-compatible API |
| `translationOptions.sourceLang` | `string` | `"auto"` | Enables dedicated translation model mode; sets the source language |

When `translationOptions` is provided, the provider sends the document as a plain user message with an `translation_options` extra body field — compatible with Qwen MT and similar dedicated translation models.

Without `translationOptions`, it uses a chat system prompt that instructs the model to preserve Markdown formatting, protect URLs and code blocks, and adapt cultural idioms naturally.

### `resolveLanguageName(codeOrName)`

Resolves a short language code to its full English name:

```ts
resolveLanguageName("ja");  // → "Japanese"
resolveLanguageName("zh");  // → "Chinese"
resolveLanguageName("Japanese"); // → "Japanese" (passthrough if not found)
```

## License

AGPL v3