export type SupportedLocale = "en" | "ja" | "zh" | "ko" | "es" | "fr" | "de";
export interface I18nConfig {
    defaultLocale: SupportedLocale;
    fallbackLocale: SupportedLocale;
    supportedLocales: SupportedLocale[];
    localesPath: string;
}
export interface Translation {
    [key: string]: string | Translation;
}
export declare class I18n {
    private translations;
    private config;
    constructor(config?: Partial<I18nConfig>);
    private loadTranslations;
    t(key: string, locale?: SupportedLocale, params?: Record<string, string | number>): string;
    private getFallback;
    private getNestedValue;
    private interpolate;
    isSupported(locale: string): locale is SupportedLocale;
    detectLocale(acceptLanguage?: string): SupportedLocale;
    getLocales(): SupportedLocale[];
    addTranslation(locale: SupportedLocale, key: string, value: string): void;
    private setNestedValue;
    plural(key: string, count: number, locale?: SupportedLocale, params?: Record<string, string | number>): string;
}
export declare const i18n: I18n;
export declare function getLocaleFromRequest(request: Request): SupportedLocale;
//# sourceMappingURL=i18n.d.ts.map