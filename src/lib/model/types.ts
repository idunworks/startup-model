import { tr, numberLocale } from '$lib/i18n';

export type TeamMember = {
	id: string;
	name: string;
	role: string;
	equityPct: number;
	salaryExpectation: number;
	deferredHours: number;
	hourlyRate: number;
};

export type ProjectStage = {
	id: string;
	name: string;
	startMonth: number;
	endMonth: number;
	salaryMultiplier: number;
	description: string;
};

export type InvestorRound = {
	id: string;
	name: string;
	investmentAmount: number;
	dilutionPct: number;
	month: number;
};

export type CompanyEconomy = {
	mrrStart: number;
	growthPctMonthly: number;
	overhead: number;
	taxAndSocialMultiplier: number;
	backpayPct: number;
	timeHorizonMonths: number;
};

export type PricingTier = {
	id: string;
	name: string;
	price: number;
	desc: string;
	customerCount?: number;
};

export type FinancialModel = {
	version: number;
	name: string;
	createdAt: string;
	updatedAt: string;
	team: TeamMember[];
	stages: ProjectStage[];
	rounds: InvestorRound[];
	economy: CompanyEconomy;
	pricingTiers: PricingTier[];
};

export type MonthSnap = {
	month: number;
	stageName: string;
	mrr: number;
	salaryCost: number;
	overhead: number;
	totalCost: number;
	surplus: number;
	cumulativeSurplus: number;
	investmentInflow: number;
	cashPosition: number;
};

export type DilutionResult = {
	memberId: string;
	name: string;
	original: number;
	steps: { roundName: string; pct: number }[];
	final: number;
};

export type RepaymentStatus = {
	memberId: string;
	name: string;
	owed: number;
	paid: number;
	remaining: number;
	paidPct: number;
	caughtUpMonth: number | null;
};

// ─── Factories ───
// Default content is generic and built in the current app language.

export function uid(): string {
	return crypto.randomUUID();
}

export function createDefaultMember(overrides: Partial<TeamMember> = {}): TeamMember {
	return {
		id: uid(),
		name: '',
		role: '',
		equityPct: 0,
		salaryExpectation: 50000,
		deferredHours: 0,
		hourlyRate: 1000,
		...overrides
	};
}

function stage(key: string, startMonth: number, endMonth: number, salaryMultiplier: number): ProjectStage {
	return {
		id: uid(),
		name: tr(`defaults.stage_${key}`),
		startMonth,
		endMonth,
		salaryMultiplier,
		description: tr(`defaults.stage_${key}_desc`)
	};
}

export function createDefaultStages(): ProjectStage[] {
	return [
		stage('mvp', 1, 3, 0),
		stage('pilot', 4, 6, 0),
		stage('launch', 7, 9, 0.5),
		stage('growth', 10, 18, 0.75),
		stage('mature', 19, 24, 1)
	];
}

function tier(key: string, price: number): PricingTier {
	return { id: uid(), name: tr(`defaults.tier_${key}`), price, desc: tr(`defaults.tier_${key}_desc`) };
}

export function createDefaultModel(): FinancialModel {
	const founder = (letter: string, role: string, equityPct: number, salaryExpectation: number, deferredHours: number) =>
		createDefaultMember({
			name: tr('defaults.founder', { letter }),
			role: tr(`defaults.role_${role}`),
			equityPct,
			salaryExpectation,
			deferredHours
		});
	const now = new Date().toISOString();
	return {
		version: 1,
		name: tr('defaults.scenario_name'),
		createdAt: now,
		updatedAt: now,
		team: [
			founder('A', 'business', 40, 55000, 150),
			founder('B', 'tech', 40, 60000, 400),
			founder('C', 'product', 20, 50000, 200)
		],
		stages: createDefaultStages(),
		rounds: [],
		economy: {
			mrrStart: 20000,
			growthPctMonthly: 10,
			overhead: 30000,
			taxAndSocialMultiplier: 1.41,
			backpayPct: 20,
			timeHorizonMonths: 24
		},
		pricingTiers: [tier('starter', 500), tier('pro', 2000), tier('business', 8000), tier('enterprise', 30000)]
	};
}

// ─── Formatting (in the current app language) ───

export function fmtMoney(n: number): string {
	return `${Math.round(n).toLocaleString(numberLocale())} ${tr('unit.currency')}`;
}

export function fmtInt(n: number): string {
	return Math.round(n).toLocaleString(numberLocale());
}

export function fmtPct(n: number): string {
	return `${Number(n.toFixed(1)).toLocaleString(numberLocale())}%`;
}

export const EXIT_VALUATIONS = [0, 5_000_000, 20_000_000, 50_000_000, 150_000_000];
