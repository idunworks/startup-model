import type { TeamMember, ProjectStage, InvestorRound, CompanyEconomy, MonthSnap, DilutionResult, RepaymentStatus } from './types';

export function memberGrossSalary(m: TeamMember, taxMult: number): number {
	return Math.round(m.salaryExpectation * taxMult);
}

export function memberStageSalary(m: TeamMember, stage: ProjectStage): number {
	return Math.round(m.salaryExpectation * stage.salaryMultiplier);
}

export function memberStageGross(m: TeamMember, stage: ProjectStage, taxMult: number): number {
	return Math.round(memberGrossSalary(m, taxMult) * stage.salaryMultiplier);
}

export function computeDilution(team: TeamMember[], rounds: InvestorRound[]): DilutionResult[] {
	const sorted = [...rounds].sort((a, b) => a.month - b.month);
	return team.map((m) => {
		let pct = m.equityPct;
		const steps: { roundName: string; pct: number }[] = [];
		for (const round of sorted) {
			pct = pct * (1 - round.dilutionPct / 100);
			steps.push({ roundName: round.name, pct });
		}
		return { memberId: m.id, name: m.name, original: m.equityPct, steps, final: pct };
	});
}

export function computeMonthlySnapshots(team: TeamMember[], stages: ProjectStage[], economy: CompanyEconomy, rounds: InvestorRound[] = []): MonthSnap[] {
	const snaps: MonthSnap[] = [];
	let cumSurplus = 0;
	let cashPosition = 0;
	const g = 1 + economy.growthPctMonthly / 100;

	for (let m = 1; m <= economy.timeHorizonMonths; m++) {
		const mrr = Math.round(economy.mrrStart * Math.pow(g, m - 1));
		const stage = stages.find((s) => m >= s.startMonth && m <= s.endMonth);
		const mult = stage?.salaryMultiplier ?? 0;
		const salaryCost = Math.round(team.reduce((s, mem) => s + memberGrossSalary(mem, economy.taxAndSocialMultiplier) * mult, 0));
		const overhead = economy.overhead;
		const totalCost = salaryCost + overhead;
		const surplus = mrr - totalCost;
		cumSurplus += surplus;
		const investmentInflow = rounds.filter((r) => r.month === m).reduce((s, r) => s + r.investmentAmount, 0);
		cashPosition += surplus + investmentInflow;

		snaps.push({ month: m, stageName: stage?.name ?? '—', mrr, salaryCost, overhead, totalCost, surplus, cumulativeSurplus: cumSurplus, investmentInflow, cashPosition });
	}
	return snaps;
}

export function computeRepayment(team: TeamMember[], snapshots: MonthSnap[], backpayPct: number): RepaymentStatus[] {
	const bpPct = backpayPct / 100;
	const totalDeferred = team.reduce((s, m) => s + m.deferredHours * m.hourlyRate, 0);

	return team.map((m) => {
		const owed = m.deferredHours * m.hourlyRate;
		if (owed === 0) return { memberId: m.id, name: m.name, owed: 0, paid: 0, remaining: 0, paidPct: 100, caughtUpMonth: 0 };
		const share = totalDeferred > 0 ? owed / totalDeferred : 0;
		let paid = 0;
		let caughtUpMonth: number | null = null;

		for (const snap of snapshots) {
			if (snap.surplus > 0) {
				paid += snap.surplus * bpPct * share;
				if (paid >= owed && caughtUpMonth === null) caughtUpMonth = snap.month;
			}
		}
		paid = Math.min(paid, owed);
		return { memberId: m.id, name: m.name, owed, paid, remaining: owed - paid, paidPct: Math.round((paid / owed) * 100), caughtUpMonth };
	});
}
