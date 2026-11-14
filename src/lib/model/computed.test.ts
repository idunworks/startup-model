import { describe, expect, it } from 'vitest';
import { computeDilution, computeMonthlySnapshots, computeRepayment, memberGrossSalary } from './computed';
import { createDefaultMember, type CompanyEconomy, type InvestorRound, type ProjectStage } from './types';

const economy: CompanyEconomy = {
	mrrStart: 10_000,
	growthPctMonthly: 0,
	overhead: 2_000,
	taxAndSocialMultiplier: 1.5,
	backpayPct: 50,
	timeHorizonMonths: 4
};
const stages: ProjectStage[] = [
	{ id: 's1', name: 'Unpaid', startMonth: 1, endMonth: 2, salaryMultiplier: 0, description: '' },
	{ id: 's2', name: 'Half pay', startMonth: 3, endMonth: 4, salaryMultiplier: 0.5, description: '' }
];
const alice = createDefaultMember({ id: 'a', name: 'A', equityPct: 60, salaryExpectation: 4_000, deferredHours: 10, hourlyRate: 100 });
const bob = createDefaultMember({ id: 'b', name: 'B', equityPct: 40, salaryExpectation: 2_000, deferredHours: 0, hourlyRate: 100 });

describe('the model', () => {
	it('adds tax and social fees on top of the salary', () => {
		expect(memberGrossSalary(alice, 1.5)).toBe(6_000);
	});

	it('pays salaries by phase and keeps a running cash position', () => {
		const snaps = computeMonthlySnapshots([alice, bob], stages, economy);
		expect(snaps.map((s) => s.salaryCost)).toEqual([0, 0, 4_500, 4_500]);
		expect(snaps.map((s) => s.surplus)).toEqual([8_000, 8_000, 3_500, 3_500]);
		expect(snaps.at(-1)?.cashPosition).toBe(23_000);
	});

	it('counts investor money as cash in its month', () => {
		const rounds: InvestorRound[] = [{ id: 'r', name: 'Seed', month: 2, investmentAmount: 50_000, dilutionPct: 20 }];
		const snaps = computeMonthlySnapshots([alice], stages, economy, rounds);
		expect(snaps[1].investmentInflow).toBe(50_000);
		expect(snaps[1].cashPosition - snaps[0].cashPosition).toBe(snaps[1].surplus + 50_000);
	});

	it('dilutes every founder by each round, in month order', () => {
		const rounds: InvestorRound[] = [
			{ id: 'r2', name: 'A', month: 12, investmentAmount: 0, dilutionPct: 50 },
			{ id: 'r1', name: 'Seed', month: 3, investmentAmount: 0, dilutionPct: 10 }
		];
		const [a] = computeDilution([alice], rounds);
		expect(a.steps.map((s) => s.roundName)).toEqual(['Seed', 'A']);
		expect(a.final).toBeCloseTo(60 * 0.9 * 0.5);
	});

	it('marks founders without unpaid hours as already paid back', () => {
		const snaps = computeMonthlySnapshots([alice, bob], stages, economy);
		const [, b] = computeRepayment([alice, bob], snaps, economy.backpayPct);
		expect(b).toMatchObject({ owed: 0, paidPct: 100 });
	});
});
