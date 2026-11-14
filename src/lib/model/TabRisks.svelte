<script lang="ts">
	import type { FinancialModel } from './types';
	import { fmtMoney, fmtInt, fmtPct } from './types';
	import { computeMonthlySnapshots, computeDilution } from './computed';
	import { tr } from '$lib/i18n';

	let { model }: { model: FinancialModel } = $props();

	let totalDeferred = $derived(model.team.reduce((s, m) => s + m.deferredHours * m.hourlyRate, 0));
	let totalHours = $derived(model.team.reduce((s, m) => s + m.deferredHours, 0));

	// Dynamic risk: model at half current growth
	let halfGrowthEconomy = $derived({ ...model.economy, growthPctMonthly: Math.round(model.economy.growthPctMonthly / 2) });
	let halfGrowthSnaps = $derived(computeMonthlySnapshots(model.team, model.stages, halfGrowthEconomy, model.rounds));
	let halfGrowthBreakEven = $derived(halfGrowthSnaps.find(s => s.surplus > 0)?.month ?? null);
	let horizon = $derived(model.economy.timeHorizonMonths);
	let halfGrowthCashEnd = $derived(halfGrowthSnaps[horizon - 1]?.cashPosition ?? 0);

	// Dynamic risk: emergency dilution round
	let emergencyDilution = $derived.by(() => {
		const emergencyRound = { id: '_emergency', name: tr('defaults.emergency_round'), investmentAmount: 2_000_000, dilutionPct: 30, month: 12 };
		const allRounds = [...model.rounds, emergencyRound];
		return computeDilution(model.team, allRounds);
	});

	// Dynamic risk: zero revenue
	let zeroRevenueSnaps = $derived(computeMonthlySnapshots(model.team, model.stages, { ...model.economy, mrrStart: 0, growthPctMonthly: 0 }, model.rounds));
	let baseBreakEven = $derived(computeMonthlySnapshots(model.team, model.stages, model.economy, model.rounds).find(s => s.surplus > 0)?.month ?? null);
	let mostExposed = $derived(model.team.length > 0
		? model.team.reduce((max, m) => m.deferredHours * m.hourlyRate > max.deferredHours * max.hourlyRate ? m : max, model.team[0])
		: null);
	let avgRate = $derived(model.team.length > 0 ? Math.round(model.team.reduce((s, m) => s + m.hourlyRate, 0) / model.team.length) : 0);

	const glossary: { term: string; def: string }[] = [
		{ term: 'MRR', def: tr('risks.g_mrr') },
		{ term: 'ARR', def: tr('risks.g_arr') },
		{ term: tr('risks.g_deferred_term'), def: tr('risks.g_deferred') },
		{ term: tr('risks.g_dilution_term'), def: tr('risks.g_dilution') },
		{ term: 'Break-even', def: tr('risks.g_breakeven') },
		{ term: 'Runway', def: tr('risks.g_runway') },
		{ term: 'MVP / MUP', def: tr('risks.g_mvp') },
		{ term: tr('risks.g_multiplier_term'), def: tr('risks.g_multiplier') },
		{ term: tr('risks.g_gross_term'), def: tr('risks.g_gross') },
		{ term: 'Pre-money', def: tr('risks.g_premoney') },
		{ term: tr('risks.g_cash_term'), def: tr('risks.g_cash') }
	];

	let zeroRevenueRunway = $derived.by(() => {
		const firstNegCash = zeroRevenueSnaps.find(s => s.cashPosition < -500_000);
		return firstNegCash?.month ?? null;
	});
</script>

<section class="tab-content">
	<div class="section-intro">
		<h2>{tr('risks.title')}</h2>
		<p>{tr('risks.intro')}</p>
	</div>

	<h3>{tr('risks.scenarios')}</h3>
	<div class="risk-cards">
		<div class="risk-card risk-danger">
			<div class="risk-title">{tr('risks.fail_title')}</div>
			<div class="risk-desc">
				{tr('risks.fail_body', { amount: fmtMoney(totalDeferred) })}
				{#if mostExposed}
					{tr('risks.fail_most', { name: mostExposed.name, amount: fmtMoney(mostExposed.deferredHours * mostExposed.hourlyRate) })}
				{/if}
			</div>
		</div>

		<div class="risk-card risk-warning">
			<div class="risk-title">{tr('risks.slow_title', { half: halfGrowthEconomy.growthPctMonthly, full: model.economy.growthPctMonthly })}</div>
			<div class="risk-desc">
				{#if halfGrowthBreakEven}
					{tr('risks.slow_late', { n: halfGrowthBreakEven, base: baseBreakEven ?? `> ${horizon}` })}
				{:else}
					{tr('risks.slow_never', { n: horizon })}
				{/if}
				{tr('risks.slow_cash', { n: horizon, amount: fmtMoney(halfGrowthCashEnd) })}
			</div>
		</div>

		<div class="risk-card risk-warning">
			<div class="risk-title">{tr('risks.forced_title')}</div>
			<div class="risk-desc">
				{tr('risks.forced_body')}
				{#each emergencyDilution as d}
					<br />{d.name}: {fmtPct(d.original)} &rarr; {fmtPct(d.final)}
				{/each}
			</div>
		</div>

		<div class="risk-card risk-info">
			<div class="risk-title">{tr('risks.creep_title')}</div>
			<div class="risk-desc">
				{tr('risks.creep_body', { hours: fmtInt(totalHours), amount: fmtMoney(totalDeferred), per100: fmtMoney(avgRate * 100) })}
			</div>
		</div>

		{#if zeroRevenueRunway}
			<div class="risk-card risk-danger">
				<div class="risk-title">{tr('risks.zero_title')}</div>
				<div class="risk-desc">
					{tr('risks.zero_body', { n: zeroRevenueRunway })}
					{#if model.rounds.length > 0}
						{zeroRevenueRunway > 12 ? tr('risks.zero_some') : tr('risks.zero_little')}
					{:else}
						{tr('risks.zero_none')}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<p class="callout">
		{tr('risks.callout_pre')}<strong>{tr('risks.callout_strong')}</strong>{tr('risks.callout_post')}
	</p>

	<h3>{tr('risks.glossary')}</h3>
	<div class="glossary-grid">
		{#each glossary as item (item.term)}
			<div class="glossary-item">
				<div class="glossary-term">{item.term}</div>
				<div class="glossary-def">{item.def}</div>
			</div>
		{/each}
	</div>
</section>

<style>
	.tab-content { padding-top: 1.5rem; }
	.section-intro { margin-bottom: 1.5rem; }
	.section-intro h2 { font-family: var(--comic, inherit); font-size: clamp(1.75rem, 3.5vw, 2.375rem); font-weight: 400; line-height: 1; color: var(--sm-ink); }
	.section-intro p { margin-top: 0.5rem; font-size: 1rem; color: var(--color-text-secondary); line-height: 1.5; max-width: 62ch; }
	h3 { font-family: var(--sm-head); font-size: 1.375rem; font-weight: 400; text-transform: uppercase; letter-spacing: 0.02em; color: var(--sm-ink); margin: 2rem 0 0.5rem; }

	.risk-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; }

	.risk-card { box-shadow: var(--sm-shadow);
		border-radius: 0; background: var(--sm-card);
		border: var(--sm-bw) solid var(--sm-ink); padding: 1rem; border-left-width: 10px;
	}
	.risk-danger { border-left-color: var(--sm-pink); }
	.risk-warning { border-left-color: var(--sm-gold); }
	.risk-info { border-left-color: var(--sm-cyan); }
	.risk-title { font-family: var(--sm-head); font-size: 1.125rem; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1.15; font-weight: 400; color: var(--color-text-primary); margin-bottom: 0.25rem; }
	.risk-desc { font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5; }

	.callout {
		font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.6;
		margin-top: 1.5rem; padding: 0.875rem 1rem;
		border-left: 8px solid var(--sm-pink);
		background: var(--sm-paper);
	}
	.callout strong { color: var(--color-text-primary); }

	.glossary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; margin-top: 0.75rem; }
	.glossary-item { box-shadow: var(--sm-shadow); padding: 0.75rem; border-radius: 0; background: var(--sm-card); border: var(--sm-bw) solid var(--sm-ink); }
	.glossary-term { font-family: var(--sm-head); font-size: 1.0625rem; text-transform: uppercase; letter-spacing: 0.02em; font-weight: 400; color: var(--color-text-primary); margin-bottom: 0.25rem; }
	.glossary-def { font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5; }
</style>
