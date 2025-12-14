// i18n Internationalization Module
import { existsSync } from "node:fs";
import { join } from "node:path";

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

export class I18n {
	private translations: Map<SupportedLocale, Translation> = new Map();
	private config: I18nConfig;

	constructor(config?: Partial<I18nConfig>) {
		this.config = {
			defaultLocale: config?.defaultLocale || "en",
			fallbackLocale: config?.fallbackLocale || "en",
			supportedLocales: config?.supportedLocales || ["en", "ja"],
			localesPath: config?.localesPath || "locales",
		};

		this.loadTranslations();
	}

	private loadTranslations() {
		for (const locale of this.config.supportedLocales) {
			const filePath = join(this.config.localesPath, `${locale}.json`);

			if (existsSync(filePath)) {
				try {
					const file = Bun.file(filePath);
					const content = file.text();
					content.then((text) => {
						const translation = JSON.parse(text);
						this.translations.set(locale, translation);
					});
				} catch (error) {
					console.warn(`Failed to load locale ${locale}:`, error);
				}
			}
		}
	}

	/**
	 * Get translation for a key
	 */
	t(key: string, locale?: SupportedLocale, params?: Record<string, string | number>): string {
		const targetLocale = locale || this.config.defaultLocale;
		const translation = this.translations.get(targetLocale);

		if (!translation) {
			return this.getFallback(key, params);
		}

		const value = this.getNestedValue(translation, key);

		if (!value) {
			return this.getFallback(key, params);
		}

		return this.interpolate(value, params);
	}

	/**
	 * Get fallback translation
	 */
	private getFallback(key: string, params?: Record<string, string | number>): string {
		if (this.config.fallbackLocale === this.config.defaultLocale) {
			return key; // Return key if no fallback
		}

		const fallbackTranslation = this.translations.get(this.config.fallbackLocale);
		if (!fallbackTranslation) {
			return key;
		}

		const value = this.getNestedValue(fallbackTranslation, key);
		return value ? this.interpolate(value, params) : key;
	}

	/**
	 * Get nested value from object using dot notation
	 */
	private getNestedValue(obj: Translation, path: string): string | undefined {
		const keys = path.split(".");
		let current: Translation | string = obj;

		for (const key of keys) {
			if (typeof current === "object" && key in current) {
				current = current[key] as Translation | string;
			} else {
				return undefined;
			}
		}

		return typeof current === "string" ? current : undefined;
	}

	/**
	 * Interpolate parameters into translation string
	 */
	private interpolate(text: string, params?: Record<string, string | number>): string {
		if (!params) return text;

		return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
			return params[key]?.toString() || match;
		});
	}

	/**
	 * Check if locale is supported
	 */
	isSupported(locale: string): locale is SupportedLocale {
		return this.config.supportedLocales.includes(locale as SupportedLocale);
	}

	/**
	 * Get best matching locale from Accept-Language header
	 */
	detectLocale(acceptLanguage?: string): SupportedLocale {
		if (!acceptLanguage) {
			return this.config.defaultLocale;
		}

		// Parse Accept-Language header
		const languages = acceptLanguage
			.split(",")
			.map((lang) => {
				const [locale, q = "1"] = lang.trim().split(";q=");
				return {
					locale: locale.split("-")[0].toLowerCase(),
					quality: Number.parseFloat(q),
				};
			})
			.sort((a, b) => b.quality - a.quality);

		// Find first supported locale
		for (const { locale } of languages) {
			if (this.isSupported(locale)) {
				return locale as SupportedLocale;
			}
		}

		return this.config.defaultLocale;
	}

	/**
	 * Get all available locales
	 */
	getLocales(): SupportedLocale[] {
		return this.config.supportedLocales;
	}

	/**
	 * Add or update translation dynamically
	 */
	addTranslation(locale: SupportedLocale, key: string, value: string) {
		const translation = this.translations.get(locale) || {};
		this.setNestedValue(translation, key, value);
		this.translations.set(locale, translation);
	}

	/**
	 * Set nested value in object using dot notation
	 */
	private setNestedValue(obj: Translation, path: string, value: string) {
		const keys = path.split(".");
		const lastKey = keys.pop();
		if (!lastKey) return;

		let current: Translation = obj;
		for (const key of keys) {
			if (!(key in current)) {
				current[key] = {};
			}
			current = current[key] as Translation;
		}

		current[lastKey] = value;
	}

	/**
	 * Get translation with pluralization support
	 */
	plural(
		key: string,
		count: number,
		locale?: SupportedLocale,
		params?: Record<string, string | number>,
	): string {
		const pluralKey = count === 1 ? `${key}.one` : `${key}.other`;
		const finalParams = { ...params, count };
		return this.t(pluralKey, locale, finalParams);
	}
}

// Singleton instance
export const i18n = new I18n({
	defaultLocale: (process.env.DEFAULT_LOCALE as SupportedLocale) || "en",
	supportedLocales: ["en", "ja", "zh", "ko"],
	localesPath: "locales",
});

/**
 * Middleware helper to extract locale from request
 */
export function getLocaleFromRequest(request: Request): SupportedLocale {
	// Check query parameter
	const url = new URL(request.url);
	const queryLocale = url.searchParams.get("locale") || url.searchParams.get("lang");
	if (queryLocale && i18n.isSupported(queryLocale)) {
		return queryLocale as SupportedLocale;
	}

	// Check Accept-Language header
	const acceptLanguage = request.headers.get("Accept-Language");
	return i18n.detectLocale(acceptLanguage || undefined);
}
