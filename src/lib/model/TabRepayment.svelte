<script lang="ts">
	import type { FinancialModel, MonthSnap, RepaymentStatus } from './types';
	import { fmtMoney, fmtPct } from './types';
	import { computeMonthlySnapshots, computeRepayment } from './computed';
	import { tr } from '$lib/i18n';

	let { model = $bindable() }: { model: FinancialModel } = $props();

	let snapshots: MonthSnap[] = $derived(computeMonthlySnapshots(model.team, model.stages, model.economy, model.rounds));
	let repayments: RepaymentStatus[] = $derived(computeRepayment(model.team, snapshots, model.economy.backpayPct));
	let totalDeferred = $derived(model.team.reduce((s, m) => s + m.deferredHours * m.hourlyRate, 0));
	let allRepaid = $derived(repayments.every(r => r.owed === 0 || r.paidPct >= 100));
</script>

<section class="tab-content">
	<div class="section-intro">
		<h2>{tr('repayment.title')}</h2>
		<p>{tr('repayment.intro')}</p>
	</div>

	<!-- Explainer -->
	<div class="explainer">
		<div class="explainer-title">{tr('repayment.how_title')}</div>
		<ol>
			<li>{tr('repayment.how_1')}</li>
			<li>{tr('repayment.how_2')}</li>
			<li>{tr('repayment.how_3', { pct: model.economy.backpayPct })}</li>
			<li>{tr('repayment.how_4')}</li>
		</ol>
		<p class="explainer-note">{tr('repayment.how_note')}</p>
	</div>

	<!-- Backpay slider -->
	<div class="backpay-control">
		<label for="bp-pct">{tr('repayment.slider')}</label>
		<input id="bp-pct" type="range" min="0" max="100" step="5" bind:value={model.economy.backpayPct} aria-valuetext="{model.economy.backpayPct}%" />
		<span class="slider-value">{model.economy.backpayPct}%</span>
	</div>

	<!-- Summary -->
	<div class="repayment-summary">
		<div class="summary-stat">
			<span class="stat-label">{tr('repayment.total_claim')}</span>
			<span class="stat-value">{fmtMoney(totalDeferred)}</span>
		</div>
		<div class="summary-stat">
			<span class="stat-label">{tr('repayment.status')}</span>
			<span class="stat-value" class:success={allRepaid} class:danger={!allRepaid}>
				{allRepaid ? tr('repayment.all_repaid', { n: model.economy.timeHorizonMonths }) : tr('repayment.not_repaid')}
			</span>
		</div>
	</div>

	<!-- Repayment table -->
	<div class="table-scroll">
		<table>
			<thead>
				<tr>
					<th>{tr('repayment.col_person')}</th>
					<th>{tr('repayment.col_hours')}</th>
					<th>{tr('repayment.col_rate')}</th>
					<th>{tr('repayment.col_claim')}</th>
					<th>{tr('repayment.col_paid')}</th>
					<th>{tr('repayment.col_left')}</th>
					<th>{tr('repayment.col_caught_up')}</th>
					<th>{tr('repayment.col_progress')}</th>
				</tr>
			</thead>
			<tbody>
				{#each repayments as rs (rs.memberId)}
					{@const member = model.team.find(m => m.id === rs.memberId)}
					<tr>
						<td class="td-name">{rs.name}</td>
						<td>{member?.deferredHours ?? 0} {tr('unit.hours_short')}</td>
						<td>{fmtMoney(member?.hourlyRate ?? 0)}</td>
						<td>{fmtMoney(rs.owed)}</td>
						<td class:success={rs.paidPct >= 100}>{fmtMoney(rs.paid)}</td>
						<td class:danger={rs.remaining > 0}>{fmtMoney(rs.remaining)}</td>
						<td>{rs.caughtUpMonth ? `M${rs.caughtUpMonth}` : rs.owed === 0 ? '—' : tr('repayment.not_within', { n: model.economy.timeHorizonMonths })}</td>
						<td class="progress-cell">
							{#if rs.owed > 0}
								<div class="progress-track">
									<div class="progress-fill" class:bg-success={rs.paidPct >= 100} class:bg-warning={rs.paidPct < 100}
										style="width: {Math.min(rs.paidPct, 100)}%"></div>
								</div>
								<span class="progress-pct">{rs.paidPct}%</span>
							{:else}
								<span class="progress-pct">—</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<style>
	.tab-content { padding-top: 1.5rem; }
	.section-intro { margin-bottom: 1.5rem; }
	.section-intro h2 { font-family: var(--comic, inherit); font-size: clamp(1.75rem, 3.5vw, 2.375rem); font-weight: 400; line-height: 1; color: var(--sm-ink); }
	.section-intro p { margin-top: 0.5rem; font-size: 1rem; color: var(--color-text-secondary); line-height: 1.5; max-width: 62ch; }

	.explainer { box-shadow: var(--sm-shadow);
		padding: 1rem 1.25rem; border-radius: 0;
		background: var(--sm-card); border: var(--sm-bw) solid var(--sm-ink);
		margin-bottom: 1.5rem;
	}
	.explainer-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); margin-bottom: 0.5rem; }
	.explainer ol { font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.6; padding-left: 1.25rem; margin: 0; }
	.explainer li { margin-bottom: 0.25rem; }
	.explainer-note { font-size: 0.8125rem; color: var(--sm-ink); font-family: var(--sm-type); margin-top: 0.75rem; line-height: 1.5; padding-top: 0.5rem; border-top: var(--sm-bw) solid var(--sm-ink); }

	.backpay-control {
		display: grid; grid-template-columns: 1fr auto; gap: 0.25rem 0.75rem; align-items: center;
		margin-bottom: 1.5rem;
	}
	.backpay-control label { font-size: 0.8125rem; color: var(--color-text-secondary); grid-column: 1 / -1; }
	.backpay-control input[type="range"] { width: 100%; accent-color: var(--sm-pink-ink); }
	.slider-value { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); min-width: 40px; text-align: right; }
	@media (min-width: 480px) { .backpay-control { grid-template-columns: 260px 1fr auto; } .backpay-control label { grid-column: 1; } }

	.repayment-summary { box-shadow: var(--sm-shadow);
		display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 1rem;
		padding: 0.75rem 1rem; border-radius: 0;
		background: var(--sm-card); border: var(--sm-bw) solid var(--sm-ink);
	}
	.summary-stat { display: flex; flex-direction: column; gap: 0.125rem; }
	.stat-label { font-size: 0.75rem; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.03em; font-weight: 500; }
	.stat-value { font-size: 1.0625rem; font-weight: 600; color: var(--color-text-primary); }

	.table-scroll { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
	th { text-align: left; font-family: var(--sm-type); font-weight: 400; font-size: 0.8125rem; color: var(--color-text-secondary); padding: 0.375rem 0.5rem; border-bottom: var(--sm-bw) solid var(--sm-ink); white-space: nowrap; }
	td { padding: 0.5rem; border-bottom: 1px solid color-mix(in oklab, var(--color-border) 50%, transparent); color: var(--color-text-primary); }
	tr:last-child td { border-bottom: none; }
	.td-name { font-weight: 600; white-space: nowrap; }

	.progress-cell { display: flex; align-items: center; gap: 0.5rem; min-width: 120px; }
	.progress-track { flex: 1; height: 8px; border-radius: 0; background: color-mix(in oklab, var(--color-border) 50%, transparent); overflow: hidden; }
	.progress-fill { height: 100%; border-radius: 0; transition: width 0.4s ease; }
	.bg-success { background: var(--color-success); }
	.bg-warning { background: var(--color-warning); }
	.progress-pct { font-size: 0.75rem; color: var(--color-text-tertiary); white-space: nowrap; min-width: 30px; }

	.danger { color: var(--color-danger); }
	.success { color: var(--color-success); }
</style>
