export interface TranslatorProvider {
  translate(text: string, targetLang: string): Promise<string>;
}
