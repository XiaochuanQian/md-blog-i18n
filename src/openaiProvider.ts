import { TranslatorProvider } from "./provider";
import { resolveLanguageName } from "./languages";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface TranslationOptions {
  /** Source language code or name. Defaults to "auto" (auto-detect). */
  sourceLang?: string;
}

export interface OpenAIProviderOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  /**
   * When set, the provider uses the OpenAI-compatible `translation_options`
   * extra body field instead of a chat system prompt.
   * Required for dedicated translation models such as `qwen-mt-flash`.
   */
  translationOptions?: TranslationOptions;
}

export function createOpenAIProvider(
  options: OpenAIProviderOptions
): TranslatorProvider {
  const {
    apiKey,
    model = "gpt-4o-mini",
    baseUrl = "https://api.openai.com/v1",
    translationOptions,
  } = options;

  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  return {
    async translate(text: string, targetLang: string): Promise<string> {
      const langName = resolveLanguageName(targetLang);
      let messages: OpenAIMessage[];
      let extraBody: Record<string, unknown> | undefined;

      if (translationOptions) {
        // Dedicated translation model mode (e.g. qwen-mt-flash):
        // pass text as a plain user message and supply translation_options.
        messages = [{ role: "user", content: text }];
        extraBody = {
          translation_options: {
            source_lang: translationOptions.sourceLang ?? "auto",
            target_lang: langName,
          },
        };
      } else {
        // General chat model mode: instruct via system prompt.
        messages = [
          {
            role: "system",
            content:
              `You are a professional translator specializing in Markdown documents. ` +
              `Translate the document the user provides into ${langName}. ` +
              `Rules you must follow:\n` +
              `1. Preserve all Markdown formatting exactly — headings, bold, italic, tables, lists, blockquotes, horizontal rules, etc.\n` +
              `2. Do NOT modify any URLs, image paths, or HTML attributes.\n` +
              `3. Do NOT modify code blocks or inline code. You may translate comments inside code if they are in the source language.\n` +
              `4. When the source text contains cultural jokes, idioms, wordplay, or memes that don't translate literally, ` +
              `adapt them naturally so they read fluently in ${langName} — prioritize natural expression over literal accuracy.\n` +
              `5. Output only the translated Markdown — no explanations, no surrounding code fences, no metadata.`,
          },
          {
            role: "user",
            content: text,
          },
        ];
      }

      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model, messages, ...extraBody }),
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `OpenAI API error ${response.status}: ${body}`
        );
      }

      const data = (await response.json()) as OpenAIResponse;
      const content = data.choices?.[0]?.message?.content;

      if (typeof content !== "string") {
        throw new Error("Unexpected response shape from OpenAI API");
      }

      return content;
    },
  };
}
