<script lang="ts">
	import type { FinancialModel, MonthSnap } from './types';
	import { fmtMoney } from './types';
	import { computeMonthlySnapshots, memberGrossSalary } from './computed';
	import { tr } from '$lib/i18n';

	let { model = $bindable() }: { model: FinancialModel } = $props();

	let snapshots: MonthSnap[] = $derived(computeMonthlySnapshots(model.team, model.stages, model.economy, model.rounds));
	let monthlyBurn = $derived(model.team.reduce((s, m) => s + memberGrossSalary(m, model.economy.taxAndSocialMultiplier), 0) + model.economy.overhead);

	// ─── Unit economics ───
	let impliedMrr = $derived(model.pricingTiers.reduce((s, t) => s + t.price * (t.customerCount ?? 0), 0));
	let mrrGap = $derived(model.economy.mrrStart - impliedMrr);

	// ─── Chart constants & derived ───
	const chartW = 720;
	const chartH = 340;
	const pad = { top: 24, right: 16, bottom: 36, left: 64 };
	const iW = chartW - pad.left - pad.right;
	const iH = chartH - pad.top - pad.bottom;

	let chartMax = $derived(Math.max(...snapshots.map(s => Math.max(s.mrr, s.totalCost, s.cumulativeSurplus, s.cashPosition)), 1));
	let chartMin = $derived(Math.min(...snapshots.map(s => Math.min(s.cumulativeSurplus, s.cashPosition)), 0));
	let chartRange = $derived(chartMax - chartMin || 1);
	function yScale(v: number) { return pad.top + iH - ((v - chartMin) / chartRange) * iH; }
	let horizon = $derived(model.economy.timeHorizonMonths);
	function xScale(m: number) { return pad.left + ((m - 1) / (horizon - 1)) * iW; }

	let breakEvenSnap = $derived(snapshots.find(s => s.surplus > 0) ?? null);
	let fullSalaryBurn = $derived(model.team.reduce((s, m) => s + memberGrossSalary(m, model.economy.taxAndSocialMultiplier), 0) + model.economy.overhead);
	let mrrLine = $derived(snapshots.map(s => `${xScale(s.month)},${yScale(s.mrr)}`).join(' '));
	let costLine = $derived(snapshots.map(s => `${xScale(s.month)},${yScale(s.totalCost)}`).join(' '));
	let cumLine = $derived(snapshots.map(s => `${xScale(s.month)},${yScale(s.cumulativeSurplus)}`).join(' '));
	let cashLine = $derived(snapshots.map(s => `${xScale(s.month)},${yScale(s.cashPosition)}`).join(' '));
	let cumAreaPositive = $derived(`${xScale(1)},${yScale(0)} ` + snapshots.map(s => `${xScale(s.month)},${yScale(Math.max(s.cumulativeSurplus, 0))}`).join(' ') + ` ${xScale(horizon)},${yScale(0)}`);
	let cumAreaNegative = $derived(`${xScale(1)},${yScale(0)} ` + snapshots.map(s => `${xScale(s.month)},${yScale(Math.min(s.cumulativeSurplus, 0))}`).join(' ') + ` ${xScale(horizon)},${yScale(0)}`);
	let xLabels = $derived.by(() => {
		if (horizon <= 18) return Array.from({ length: horizon }, (_, i) => i + 1).filter(m => m === 1 || m % 3 === 0);
		if (horizon <= 36) return Array.from({ length: horizon }, (_, i) => i + 1).filter(m => m === 1 || m % 6 === 0);
		return Array.from({ length: horizon }, (_, i) => i + 1).filter(m => m === 1 || m % 12 === 0);
	});
	let yTicks = $derived.by(() => {
		const ticks: number[] = [];
		const step = chartRange / 4;
		for (let i = 0; i <= 4; i++) ticks.push(chartMin + step * i);
		return ticks;
	});

	let showAllMonths = $state(false);
	let hasInvestments = $derived(model.rounds.length > 0);
</script>

<section class="tab-content">
	<div class="section-intro">
		<h2>{tr('economy.title')}</h2>
		<p>{tr('economy.intro')}</p>
	</div>

	<!-- Time horizon -->
	<div class="horizon-control">
		<label for="ec-horizon">{tr('economy.horizon')}</label>
		<input id="ec-horizon" type="range" min="12" max="60" step="6" bind:value={model.economy.timeHorizonMonths} aria-valuetext="{model.economy.timeHorizonMonths} {tr('unit.months')}" />
		<span class="slider-value">{model.economy.timeHorizonMonths} {tr('unit.months_short')}{model.economy.timeHorizonMonths >= 24 ? ` (${(model.economy.timeHorizonMonths / 12).toFixed(model.economy.timeHorizonMonths % 12 === 0 ? 0 : 1)} ${tr('unit.years')})` : ''}</span>
	</div>

	<!-- Controls -->
	<div class="economy-controls">
		<div class="control-group">
			<div class="control-group-title">{tr('economy.revenue')}</div>
			<div class="slider-row">
				<label for="ec-mrr">{tr('economy.mrr_start')}</label>
				<input id="ec-mrr" type="range" min="0" max="1000000" step="5000" bind:value={model.economy.mrrStart} aria-valuetext={fmtMoney(model.economy.mrrStart)} />
				<span class="slider-value">{fmtMoney(model.economy.mrrStart)}</span>
			</div>
			<div class="slider-row">
				<label for="ec-growth">{tr('economy.growth')}</label>
				<input id="ec-growth" type="range" min="0" max="30" step="1" bind:value={model.economy.growthPctMonthly} aria-valuetext="{model.economy.growthPctMonthly}%" />
				<span class="slider-value">{model.economy.growthPctMonthly}%</span>
			</div>
			<p class="control-hint">{tr('economy.growth_hint')}</p>
			{#if model.economy.growthPctMonthly > 15}
				<p class="growth-note">{tr('economy.growth_note')}</p>
			{/if}
		</div>
		<div class="control-group">
			<div class="control-group-title">{tr('economy.costs')}</div>
			<div class="slider-row">
				<label for="ec-overhead">{tr('economy.overhead')}</label>
				<input id="ec-overhead" type="range" min="0" max="500000" step="10000" bind:value={model.economy.overhead} aria-valuetext={fmtMoney(model.economy.overhead)} />
				<span class="slider-value">{fmtMoney(model.economy.overhead)}</span>
			</div>
			<div class="slider-row">
				<label for="ec-tax">{tr('economy.employer_cost')}</label>
				<input id="ec-tax" type="range" min="1.0" max="1.8" step="0.01" bind:value={model.economy.taxAndSocialMultiplier} aria-valuetext="{model.economy.taxAndSocialMultiplier}x" />
				<span class="slider-value">{model.economy.taxAndSocialMultiplier}x</span>
			</div>
			<p class="control-hint">{tr('economy.employer_hint')}</p>
		</div>
	</div>

	<div class="burn-indicator">
		{tr('economy.burn_full')} <strong>{fmtMoney(monthlyBurn)}</strong>
		{#if monthlyBurn > 0}
			<span class="burn-runway"> &middot; {tr('economy.runway', { n: Math.round(snapshots[0]?.cashPosition / monthlyBurn) || '–' })}</span>
		{/if}
	</div>

	<!-- Graph -->
	<h3>{tr('economy.chart_title')}</h3>
	<div class="chart-container">
		<svg viewBox="0 0 {chartW} {chartH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={tr('economy.chart_aria')}>
			<title>{tr('economy.chart_title')}: {breakEvenSnap ? tr('economy.chart_summary_be', { mrr: fmtMoney(snapshots[0]?.mrr ?? 0), n: breakEvenSnap.month }) : tr('economy.chart_summary_no_be', { mrr: fmtMoney(snapshots[0]?.mrr ?? 0), n: horizon })}</title>

			<!-- Grid lines + Y axis -->
			{#each yTicks as val}
				<line x1={pad.left} x2={chartW - pad.right} y1={yScale(val)} y2={yScale(val)} class="grid-line" />
				<text x={pad.left - 8} y={yScale(val) + 4} class="axis-label" text-anchor="end">
					{Math.abs(val) >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M` : `${Math.round(val / 1000)}k`}
				</text>
			{/each}

			<!-- Zero line -->
			{#if chartMin < 0}
				<line x1={pad.left} x2={chartW - pad.right} y1={yScale(0)} y2={yScale(0)} class="zero-line" />
			{/if}

			<!-- X-axis labels -->
			{#each xLabels as m}
				<text x={xScale(m)} y={chartH - 8} class="axis-label" text-anchor="middle">M{m}</text>
			{/each}

			<!-- Cumulative surplus areas -->
			<polygon points={cumAreaPositive} class="cum-area cum-area-positive" />
			{#if chartMin < 0}
				<polygon points={cumAreaNegative} class="cum-area cum-area-negative" />
			{/if}

			<!-- Stage boundaries -->
			{#each model.stages as stage, i}
				{#if i > 0}
					<line x1={xScale(stage.startMonth)} x2={xScale(stage.startMonth)} y1={pad.top} y2={chartH - pad.bottom} class="stage-boundary" />
					<text x={xScale(stage.startMonth) + 3} y={chartH - pad.bottom - 4} class="stage-boundary-label">{stage.name}</text>
				{/if}
			{/each}

			<!-- Full salary threshold -->
			{#if fullSalaryBurn <= chartMax}
				<line x1={pad.left} x2={chartW - pad.right} y1={yScale(fullSalaryBurn)} y2={yScale(fullSalaryBurn)} class="threshold-line" />
				<text x={chartW - pad.right} y={yScale(fullSalaryBurn) - 5} class="threshold-label" text-anchor="end">{tr('economy.full_pay_line')}</text>
			{/if}

			<!-- Cost line -->
			<polyline points={costLine} class="line-cost" fill="none" />
			<!-- MRR line -->
			<polyline points={mrrLine} class="line-mrr" fill="none" />
			<!-- Cumulative surplus line -->
			<polyline points={cumLine} class="line-cum" fill="none" />
			<!-- Cash position line (includes investments) -->
			{#if hasInvestments}
				<polyline points={cashLine} class="line-cash" fill="none" />
			{/if}

			<!-- Investment markers -->
			{#each snapshots as snap}
				{#if snap.investmentInflow > 0}
					<circle cx={xScale(snap.month)} cy={yScale(snap.cashPosition)} r="5" class="invest-dot" />
					<text x={xScale(snap.month)} y={yScale(snap.cashPosition) - 10} class="invest-label" text-anchor="middle">+{fmtMoney(snap.investmentInflow)}</text>
				{/if}
			{/each}

			<!-- Break-even marker -->
			{#if breakEvenSnap}
				<line x1={xScale(breakEvenSnap.month)} x2={xScale(breakEvenSnap.month)} y1={pad.top} y2={chartH - pad.bottom} class="break-even-line" />
				<circle cx={xScale(breakEvenSnap.month)} cy={yScale(breakEvenSnap.mrr)} r="4" class="break-even-dot" />
				<text x={xScale(breakEvenSnap.month) + 6} y={pad.top + 14} class="break-even-label">Break-even M{breakEvenSnap.month}</text>
			{/if}

			<!-- Hover hit areas with tooltips -->
			{#each snapshots as snap}
				<rect x={xScale(snap.month) - iW / (horizon * 2)} y={pad.top} width={iW / horizon} height={iH} fill="transparent" class="chart-hit-area">
					<title>{tr('economy.tooltip', { n: snap.month, stage: snap.stageName, mrr: fmtMoney(snap.mrr), cost: fmtMoney(snap.totalCost), surplus: fmtMoney(snap.surplus), cash: fmtMoney(snap.cashPosition) })}</title>
				</rect>
			{/each}
		</svg>

		<div class="chart-legend">
			<span class="legend-item"><span class="legend-swatch swatch-mrr"></span>{tr('economy.legend_mrr')}</span>
			<span class="legend-item"><span class="legend-swatch swatch-cost"></span>{tr('economy.legend_cost')}</span>
			<span class="legend-item"><span class="legend-swatch swatch-cum"></span>{tr('economy.legend_cum')}</span>
			{#if hasInvestments}
				<span class="legend-item"><span class="legend-swatch swatch-cash"></span>{tr('economy.legend_cash')}</span>
			{/if}
			<span class="legend-item"><span class="legend-swatch swatch-threshold"></span>{tr('economy.legend_full')}</span>
			{#if breakEvenSnap}
				<span class="legend-item"><span class="legend-swatch swatch-breakeven"></span>{tr('economy.legend_breakeven')}</span>
			{/if}
		</div>
	</div>

	<!-- Timeline -->
	<h3>
		{tr('economy.timeline')}
		<button type="button" class="toggle-btn" onclick={() => showAllMonths = !showAllMonths}>
			{showAllMonths ? tr('economy.show_fewer') : tr('economy.show_all', { n: horizon })}
		</button>
	</h3>
	<div class="table-scroll">
		<table>
			<thead>
				<tr>
					<th>{tr('economy.col_month')}</th><th>{tr('economy.col_phase')}</th><th>{tr('economy.col_mrr')}</th><th>{tr('economy.col_salary')}</th><th>{tr('economy.col_overhead')}</th><th>{tr('economy.col_total')}</th><th>{tr('economy.col_surplus')}</th><th>{tr('economy.col_cumulative')}</th>
					{#if hasInvestments}<th>{tr('economy.col_investment')}</th><th>{tr('economy.col_cash')}</th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each snapshots as snap}
					{#if showAllMonths || snap.month <= 6 || snap.month % 3 === 0}
						<tr class:row-danger={snap.surplus < 0} class:row-ok={snap.surplus > 0}>
							<td>M{snap.month}</td>
							<td>{snap.stageName}</td>
							<td>{fmtMoney(snap.mrr)}</td>
							<td>{fmtMoney(snap.salaryCost)}</td>
							<td>{fmtMoney(snap.overhead)}</td>
							<td>{fmtMoney(snap.totalCost)}</td>
							<td>{fmtMoney(snap.surplus)}</td>
							<td class:danger={snap.cumulativeSurplus < 0} class:success={snap.cumulativeSurplus > 0}>{fmtMoney(snap.cumulativeSurplus)}</td>
							{#if hasInvestments}
								<td class:invest-highlight={snap.investmentInflow > 0}>{snap.investmentInflow > 0 ? fmtMoney(snap.investmentInflow) : '—'}</td>
								<td class:danger={snap.cashPosition < 0} class:success={snap.cashPosition > 0}>{fmtMoney(snap.cashPosition)}</td>
							{/if}
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Unit Economics + Pricing -->
	<h3>{tr('economy.mix_title')}</h3>
	<p class="section-note">{tr('economy.mix_note')}</p>
	<div class="pricing-cards">
		{#each model.pricingTiers as tier, i (tier.id)}
			<div class="pricing-card">
				<input type="text" class="pricing-name-input" bind:value={model.pricingTiers[i].name} aria-label={tr('economy.tier_name')} />
				<div class="pricing-amount-row">
					<input type="number" class="pricing-price-input" min="0" step="500" bind:value={model.pricingTiers[i].price} aria-label={tr('economy.price')} />
					<span class="pricing-suffix">{tr('unit.per_month')}</span>
				</div>
				<input type="text" class="pricing-desc-input" bind:value={model.pricingTiers[i].desc} placeholder={tr('economy.description_placeholder')} aria-label={tr('economy.description')} />
				<label class="pricing-count-label">
					<span>{tr('economy.customers')}</span>
					<input type="number" min="0" step="1" bind:value={model.pricingTiers[i].customerCount} aria-label={tr('economy.customers')} />
				</label>
				<div class="pricing-subtotal">{fmtMoney(tier.price * (tier.customerCount ?? 0))}{tr('unit.per_month')}</div>
			</div>
		{/each}
	</div>
	<div class="unit-economics-summary">
		<span>{tr('economy.implied_mrr')} <strong>{fmtMoney(impliedMrr)}</strong></span>
		{#if impliedMrr > 0}
			<span class:gap-ok={Math.abs(mrrGap) < model.economy.mrrStart * 0.1} class:gap-warn={Math.abs(mrrGap) >= model.economy.mrrStart * 0.1}>
				{mrrGap > 0 ? tr('economy.gap_short', { amount: fmtMoney(mrrGap) }) : mrrGap < 0 ? tr('economy.gap_over', { amount: fmtMoney(Math.abs(mrrGap)) }) : tr('economy.gap_match')}
			</span>
		{/if}
	</div>
</section>

<style>
	.tab-content { padding-top: 1.5rem; }
	.section-intro { margin-bottom: 1.5rem; }
	.section-intro h2 { font-family: var(--comic, inherit); font-size: clamp(1.75rem, 3.5vw, 2.375rem); font-weight: 400; line-height: 1; color: var(--sm-ink); }
	.section-intro p { margin-top: 0.5rem; font-size: 1rem; color: var(--color-text-secondary); line-height: 1.5; max-width: 62ch; }
	h3 { font-family: var(--sm-head); font-size: 1.375rem; font-weight: 400; text-transform: uppercase; letter-spacing: 0.02em; color: var(--sm-ink); margin: 2rem 0 0.5rem; display: flex; align-items: center; gap: 0.75rem; }
	.section-note { font-size: 0.875rem; color: var(--color-text-tertiary); margin-bottom: 0.75rem; }

	.toggle-btn {
		font-size: 0.75rem; font-weight: 500; padding: 0.25rem 0.5rem;
		border-radius: 0; border: var(--sm-bw) solid var(--sm-ink);
		background: none; color: var(--color-text-secondary); cursor: pointer; font-family: inherit;
	}

	.horizon-control { box-shadow: var(--sm-shadow);
		display: grid; grid-template-columns: 1fr auto; gap: 0.25rem 0.75rem; align-items: center;
		margin-bottom: 1rem; padding: 0.75rem 1rem; border-radius: 0;
		background: var(--sm-card); border: var(--sm-bw) solid var(--sm-ink);
	}
	.horizon-control label { font-size: 0.8125rem; font-weight: 600; color: var(--color-text-primary); grid-column: 1 / -1; }
	.horizon-control input[type="range"] { width: 100%; accent-color: var(--sm-pink-ink); }
	@media (min-width: 480px) { .horizon-control { box-shadow: var(--sm-shadow); grid-template-columns: 120px 1fr auto; } .horizon-control label { grid-column: 1; } }

	.economy-controls { box-shadow: var(--sm-shadow);
		display: grid; grid-template-columns: 1fr; gap: 1.5rem; padding: 1rem 1.25rem;
		border-radius: 0; background: var(--sm-card); border: var(--sm-bw) solid var(--sm-ink);
	}
	@media (min-width: 640px) { .economy-controls { box-shadow: var(--sm-shadow); grid-template-columns: 1fr 1fr; } }

	.control-group { display: flex; flex-direction: column; gap: 0.625rem; }
	.control-group-title { font-family: var(--sm-head); font-size: 1.125rem; text-transform: uppercase; letter-spacing: 0.02em; font-weight: 400; color: var(--color-text-primary); }
	.control-hint { font-size: 0.75rem; color: var(--color-text-tertiary); line-height: 1.4; }
	.growth-note { font-size: 0.75rem; color: var(--color-warning); line-height: 1.4; padding: 0.25rem 0.5rem; background: color-mix(in oklab, var(--color-warning) 8%, transparent); border-radius: 0; }

	.slider-row { display: grid; grid-template-columns: 1fr auto; gap: 0.25rem 0.75rem; align-items: center; }
	.slider-row label { font-size: 0.8125rem; color: var(--color-text-secondary); grid-column: 1 / -1; }
	.slider-row input[type="range"] { width: 100%; accent-color: var(--sm-pink-ink); }
	.slider-value { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); min-width: 80px; text-align: right; white-space: nowrap; }
	@media (min-width: 480px) { .slider-row { grid-template-columns: 160px 1fr auto; } .slider-row label { grid-column: 1; } }

	.burn-indicator { font-size: 0.875rem; color: var(--color-text-secondary); margin-top: 0.75rem; }
	.burn-runway { color: var(--color-text-tertiary); }

	.table-scroll { overflow-x: auto; margin-top: 0.5rem; }
	table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
	th { text-align: left; font-family: var(--sm-type); font-weight: 400; font-size: 0.8125rem; color: var(--color-text-secondary); padding: 0.375rem 0.5rem; border-bottom: var(--sm-bw) solid var(--sm-ink); white-space: nowrap; }
	td { padding: 0.5rem; border-bottom: 1px solid color-mix(in oklab, var(--color-border) 50%, transparent); color: var(--color-text-primary); }
	tr:last-child td { border-bottom: none; }
	.row-danger td { color: var(--color-danger); }
	.row-ok td { color: var(--color-success); }
	.invest-highlight { color: var(--sm-pink-ink); font-weight: 700; }

	/* Pricing / Unit Economics */
	.pricing-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-top: 0.75rem; }
	@media (min-width: 640px) { .pricing-cards { grid-template-columns: repeat(4, 1fr); } }
	.pricing-card { box-shadow: var(--sm-shadow); border-radius: 0; background: var(--sm-card); border: var(--sm-bw) solid var(--sm-ink); padding: 0.875rem; display: flex; flex-direction: column; gap: 0.25rem; }

	.pricing-name-input {
		font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.03em;
		border: none; background: none; font-family: inherit; padding: 0; width: 100%;
		border-bottom: 1px solid transparent; transition: border-color 0.15s;
	}
	.pricing-name-input:hover { border-bottom-color: var(--color-border); }
	.pricing-name-input:focus { outline: none; border-bottom-color: var(--sm-pink); }

	.pricing-amount-row { display: flex; align-items: baseline; gap: 0.125rem; }
	.pricing-price-input {
		font-size: 1.1875rem; font-weight: 700; color: var(--color-text-primary);
		border: none; background: none; font-family: inherit; padding: 0; width: 100%;
		border-bottom: 1px solid transparent; transition: border-color 0.15s;
	}
	.pricing-price-input:hover { border-bottom-color: var(--color-border); }
	.pricing-price-input:focus { outline: none; border-bottom-color: var(--sm-pink); }
	.pricing-suffix { font-size: 0.75rem; color: var(--color-text-tertiary); white-space: nowrap; }

	.pricing-desc-input {
		font-size: 0.75rem; color: var(--color-text-tertiary); border: none; background: none;
		font-family: inherit; padding: 0; width: 100%; border-bottom: 1px solid transparent; transition: border-color 0.15s;
	}
	.pricing-desc-input:hover { border-bottom-color: var(--color-border); }
	.pricing-desc-input:focus { outline: none; color: var(--color-text-secondary); border-bottom-color: var(--sm-pink); }

	.pricing-count-label { display: flex; flex-direction: column; gap: 0.125rem; margin-top: 0.375rem; }
	.pricing-count-label span { font-size: 0.6875rem; color: var(--color-text-tertiary); font-weight: 500; }
	.pricing-count-label input {
		font-size: 0.875rem; padding: 0.25rem 0.375rem; border-radius: 0;
		border: var(--sm-bw) solid var(--sm-ink); background: var(--sm-card);
		color: var(--color-text-primary); font-family: inherit; width: 100%;
	}
	.pricing-count-label input:focus { outline: none; border-color: var(--sm-pink); }

	.pricing-subtotal { font-size: 0.8125rem; font-weight: 600; color: var(--color-text-primary); margin-top: 0.25rem; text-align: center; }

	.unit-economics-summary {
		display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; align-items: center;
		font-size: 0.875rem; color: var(--color-text-secondary); margin-top: 0.75rem;
		padding: 0.625rem 1rem; border-radius: 0; background: var(--sm-card); border: var(--sm-bw) solid var(--sm-ink);
	}
	.gap-ok { color: var(--color-success); font-weight: 500; }
	.gap-warn { color: var(--color-warning); font-weight: 500; }

	.danger { color: var(--color-danger); }
	.success { color: var(--color-success); }

	/* Chart */
	.chart-container { box-shadow: var(--sm-shadow); margin-top: 0.75rem; border-radius: 0; background: var(--sm-card); border: var(--sm-bw) solid var(--sm-ink); padding: 1rem; overflow-x: auto; }
	.chart-container svg { width: 100%; height: auto; display: block; }
	.grid-line { stroke: var(--color-border); stroke-width: 0.5; }
	.axis-label { font-size: 10px; fill: var(--color-text-tertiary); font-family: inherit; }

	.line-mrr { stroke: var(--sm-pink); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
	.line-cost { stroke: var(--sm-ink); stroke-width: 2.5; stroke-dasharray: 6 3; stroke-linecap: round; }
	.line-cum { stroke: var(--color-success); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
	.line-cash { stroke: var(--sm-cyan); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
	.cum-area { opacity: 0.08; }
	.cum-area-positive { fill: var(--color-success); }
	.cum-area-negative { fill: var(--color-danger); }
	.zero-line { stroke: var(--color-text-tertiary); stroke-width: 1; stroke-dasharray: 2 2; opacity: 0.5; }

	.stage-boundary { stroke: var(--color-border); stroke-width: 0.75; stroke-dasharray: 3 4; opacity: 0.6; }
	.stage-boundary-label { font-size: 9px; fill: var(--color-text-tertiary); font-family: inherit; }

	.threshold-line { stroke: var(--color-warning); stroke-width: 1; stroke-dasharray: 4 4; }
	.threshold-label { font-size: 9px; fill: var(--color-warning); font-family: inherit; }

	.break-even-line { stroke: var(--sm-pink); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0.5; }
	.break-even-dot { fill: var(--sm-pink); }
	.break-even-label { font-size: 10px; fill: var(--sm-pink-ink); font-weight: 600; font-family: inherit; }

	.invest-dot { fill: var(--sm-cyan); stroke: var(--sm-ink); stroke-width: 1.5; }
	.invest-label { font-size: 9px; fill: var(--sm-ink); font-weight: 600; font-family: inherit; }

	.chart-hit-area { cursor: crosshair; }

	.chart-legend { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.625rem; padding-top: 0.5rem; border-top: var(--sm-bw) solid var(--sm-ink); }
	.legend-item { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--color-text-secondary); }
	.legend-swatch { width: 12px; height: 3px; border-radius: 0; flex-shrink: 0; }
	.swatch-mrr { background: var(--sm-pink); }
	.swatch-cost { background: var(--sm-ink); }
	.swatch-cum { background: var(--color-success); }
	.swatch-cash { background: var(--sm-cyan); }
	.swatch-threshold { background: var(--color-warning); }
	.swatch-breakeven { background: var(--sm-pink); height: 8px; width: 8px; border-radius: 50%; }
</style>
