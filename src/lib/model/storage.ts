import type { FinancialModel } from './types';
import { createDefaultModel } from './types';
import { tr } from '$lib/i18n';

// Scenarios live only in this browser's localStorage.
const STORAGE_KEY = 'startup-model-scenarios';
const CURRENT_KEY = 'startup-model-current';

type StorageData = { models: FinancialModel[] };

/** Ensure saved models have all current fields (backward compat) */
function migrateModel(raw: Record<string, unknown>): FinancialModel {
	const defaults = createDefaultModel();
	const model = {
		...defaults,
		...raw,
		economy: { ...defaults.economy, ...(raw.economy as Record<string, unknown> ?? {}) },
		pricingTiers: Array.isArray(raw.pricingTiers) ? raw.pricingTiers : defaults.pricingTiers,
		rounds: Array.isArray(raw.rounds) ? raw.rounds : [],
		team: Array.isArray(raw.team) ? raw.team : defaults.team,
		stages: Array.isArray(raw.stages) ? raw.stages : defaults.stages
	} as FinancialModel;
	return model;
}

function readStorage(): StorageData {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const data = JSON.parse(raw) as StorageData;
			data.models = data.models.map(m => migrateModel(m as unknown as Record<string, unknown>));
			return data;
		}
	} catch { /* corrupt */ }
	return { models: [] };
}

function writeStorage(data: StorageData) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadCurrentModel(): { model: FinancialModel; savedNames: string[] } {
	const data = readStorage();
	const currentName = localStorage.getItem(CURRENT_KEY);
	const found = currentName ? data.models.find((m) => m.name === currentName) : data.models[0];
	return {
		model: found ?? createDefaultModel(),
		savedNames: data.models.map((m) => m.name)
	};
}

export function saveModel(model: FinancialModel): string[] {
	model.updatedAt = new Date().toISOString();
	const data = readStorage();
	const idx = data.models.findIndex((m) => m.name === model.name);
	const clone = JSON.parse(JSON.stringify(model));
	if (idx >= 0) data.models[idx] = clone;
	else data.models.push(clone);
	writeStorage(data);
	localStorage.setItem(CURRENT_KEY, model.name);
	return data.models.map((m) => m.name);
}

export function loadModelByName(name: string): FinancialModel | null {
	const data = readStorage();
	const found = data.models.find((m) => m.name === name);
	if (found) localStorage.setItem(CURRENT_KEY, name);
	return found ?? null;
}

/** Export current model as a downloadable JSON file */
export function exportModel(model: FinancialModel): void {
	const payload = JSON.stringify(model, null, 2);
	const blob = new Blob([payload], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${tr('page.export_filename')}-${model.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

/** Import a model from a JSON file. Returns the migrated model or throws on invalid data. */
export function importModel(file: File): Promise<{ model: FinancialModel; savedNames: string[] }> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const raw = JSON.parse(reader.result as string);
				if (typeof raw !== 'object' || raw === null || !('team' in raw || 'economy' in raw)) {
					throw new Error(tr('page.import_invalid'));
				}
				const imported = migrateModel(raw as Record<string, unknown>);
				// Avoid name collision — append "(import)" if name exists
				const data = readStorage();
				if (data.models.some(m => m.name === imported.name)) {
					imported.name = `${imported.name} ${tr('page.import_suffix')}`;
				}
				imported.updatedAt = new Date().toISOString();
				data.models.push(JSON.parse(JSON.stringify(imported)));
				writeStorage(data);
				localStorage.setItem(CURRENT_KEY, imported.name);
				resolve({ model: imported, savedNames: data.models.map(m => m.name) });
			} catch (e) {
				reject(e instanceof Error ? e : new Error(tr('page.import_unreadable')));
			}
		};
		reader.onerror = () => reject(new Error(tr('page.import_unreadable')));
		reader.readAsText(file);
	});
}

export function deleteModel(name: string): { model: FinancialModel; savedNames: string[] } {
	const data = readStorage();
	data.models = data.models.filter((m) => m.name !== name);
	writeStorage(data);
	if (data.models.length > 0) {
		const model = data.models[0];
		localStorage.setItem(CURRENT_KEY, model.name);
		return { model, savedNames: data.models.map((m) => m.name) };
	}
	localStorage.removeItem(CURRENT_KEY);
	return { model: createDefaultModel(), savedNames: [] };
}
