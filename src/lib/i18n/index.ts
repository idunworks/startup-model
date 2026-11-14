// Two languages, English and Swedish. The choice is read once at start-up (a
// saved choice, else the browser's language); switching saves it and reloads,
// so every string, number and date on the page follows it.
import { startupModel as en } from './en';
import { startupModel as sv } from './sv';

export type Lang = 'en' | 'sv';
type Vars = Record<string, string | number>;

const LANG_KEY = 'startup-model-lang';
const STRINGS: Record<Lang, unknown> = { en, sv };

function detect(): Lang {
	if (typeof window === 'undefined') return 'en';
	const saved = localStorage.getItem(LANG_KEY);
	if (saved === 'en' || saved === 'sv') return saved;
	return navigator.language?.toLowerCase().startsWith('sv') ? 'sv' : 'en';
}

const lang: Lang = detect();

export function getLang(): Lang {
	return lang;
}

export function setLang(next: Lang): void {
	localStorage.setItem(LANG_KEY, next);
	location.reload();
}

function lookup(table: unknown, key: string): string | undefined {
	const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], table);
	return typeof value === 'string' ? value : undefined;
}

/** The string for `key` (e.g. "intro.title") with its `{placeholders}` filled in. Falls back to English, then the key. */
export function tr(key: string, vars: Vars = {}): string {
	const text = lookup(STRINGS[lang], key) ?? lookup(STRINGS.en, key) ?? key;
	return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** BCP 47 tag for number and date formatting in the current language. */
export function numberLocale(): string {
	return lang === 'sv' ? 'sv-SE' : 'en-GB';
}
