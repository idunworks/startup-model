import { describe, expect, it } from 'vitest';
import { startupModel as en } from './en';
import { startupModel as sv } from './sv';
import { tr } from './index';

function keys(node: unknown, prefix = ''): string[] {
	if (typeof node === 'string') return [prefix];
	return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('i18n', () => {
	it('Swedish has every English key, and no extra ones', () => {
		expect(keys(sv).sort()).toEqual(keys(en).sort());
	});

	it('fills placeholders and keeps unknown ones', () => {
		expect(tr('defaults.founder', { letter: 'A' })).toContain('A');
		expect(tr('no.such.key')).toBe('no.such.key');
	});
});
