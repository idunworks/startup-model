<script lang="ts">
	import type { FinancialModel, DilutionResult } from './types';
	import { fmtMoney, fmtPct, EXIT_VALUATIONS, uid } from './types';
	import { computeDilution } from './computed';
	import { tr } from '$lib/i18n';

	let { model = $bindable() }: { model: FinancialModel } = $props();

	function addRound() {
		const lastMonth = model.rounds.length > 0 ? model.rounds[model.rounds.length - 1].month + 6 : 6;
		model.rounds = [...model.rounds, {
			id: uid(),
			name: model.rounds.length === 0 ? tr('defaults.round_seed') : tr('defaults.round_n', { n: model.rounds.length + 1 }),
			investmentAmount: 2000000,
			dilutionPct: 15,
			month: lastMonth
		}];
	}

	function removeRound(id: string) {
		model.rounds = model.rounds.filter((r) => r.id !== id);
	}

	let dilutionTable: DilutionResult[] = $derived(computeDilution(model.team, model.rounds));
	let totalInvested = $derived(model.rounds.reduce((s, r) => s + r.investmentAmount, 0));
</script>

<section class="tab-content">
	<div class="section-intro">
		<h2>{tr('investors.title')}</h2>
		<p>{tr('investors.intro')}</p>
	</div>

	<div class="round-cards">
		{#each model.rounds as round, i (round.id)}
			<div class="round-card">
				<div class="round-card-header">
					<input type="text" class="name-input" bind:value={model.rounds[i].name} aria-label={tr('investors.round_name')} />
					<button type="button" class="remove-btn" aria-label={tr('investors.remove', { name: round.name })} onclick={() => { if (confirm(tr('investors.remove_confirm', { name: round.name }))) removeRound(round.id); }}>&times;</button>
				</div>
				<div class="round-fields">
					<label><span>{tr('investors.investment', { currency: tr('unit.currency') })}</span><input type="number" min="0" step="500000" bind:value={model.rounds[i].investmentAmount} /></label>
					<label><span>{tr('investors.dilution')}</span><input type="number" min="0" max="50" step="1" bind:value={model.rounds[i].dilutionPct} /></label>
					<label><span>{tr('investors.month')}</span><input type="number" min="1" max="60" bind:value={model.rounds[i].month} /></label>
				</div>
				<div class="round-meta">{tr('investors.pre_money', { amount: round.dilutionPct > 0 ? fmtMoney(round.investmentAmount / (round.dilutionPct / 100) - round.investmentAmount) : '—' })}</div>
			</div>
		{/each}
		<button type="button" class="add-card" onclick={addRound}>
			<span class="add-icon">+</span><span>{tr('investors.add')}</span>
		</button>
	</div>

	{#if totalInvested > 0}
		<div class="invested-total">{tr('investors.total_invested')} <strong>{fmtMoney(totalInvested)}</strong></div>
	{/if}

	{#if model.rounds.length > 0}
		<h3>{tr('investors.waterfall')}</h3>
		<div class="dilution-waterfall">
			{#each dilutionTable as row (row.memberId)}
				<div class="dilution-row">
					<div class="dilution-name">{row.name}</div>
					<div class="dilution-bars">
						<div class="dilution-bar-track">
							<div class="dilution-bar original" style="width: {row.original}%"><span>{fmtPct(row.original)}</span></div>
						</div>
						<div class="dilution-bar-track">
							<div class="dilution-bar final" style="width: {row.final}%"><span>{fmtPct(row.final)}</span></div>
						</div>
					</div>
					<div class="dilution-change">{fmtPct(row.original)} &rarr; {fmtPct(row.final)}</div>
				</div>
			{/each}
		</div>
	{/if}

	<h3>{tr('investors.exit_title')}</h3>
	<p class="section-note">{tr('investors.exit_note')}</p>
	<div class="table-scroll">
		<table>
			<thead>
				<tr>
					<th>{tr('investors.col_valuation')}</th>
					{#each model.team as m}
						<th>{m.name}<br /><span class="th-sub">{fmtPct(dilutionTable.find(d => d.memberId === m.id)?.final ?? m.equityPct)}</span></th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each EXIT_VALUATIONS as val}
					<tr class:row-danger={val === 0} class:row-ok={val >= 50_000_000}>
						<td class="td-name">{val === 0 ? tr('investors.fails') : fmtMoney(val)}</td>
						{#each model.team as m}
							{@const pct = (dilutionTable.find(d => d.memberId === m.id)?.final ?? m.equityPct) / 100}
							<td>{fmtMoney(val * pct)}</td>
						{/each}
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
	h3 { font-family: var(--sm-head); font-size: 1.375rem; font-weight: 400; text-transform: uppercase; letter-spacing: 0.02em; color: var(--sm-ink); margin: 2rem 0 0.5rem; }
	.section-note { font-size: 0.875rem; color: var(--color-text-tertiary); margin-bottom: 0.75rem; }

	.round-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem; }
	.round-card { box-shadow: var(--sm-shadow); border-radius: 0; background: var(--sm-card); border: var(--sm-bw) solid var(--sm-ink); padding: 0.875rem; }
	.round-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }

	.name-input {
		font-size: 0.9375rem; font-weight: 600; border: none; background: none; color: var(--color-text-primary);
		font-family: inherit; padding: 0; width: 100%; border-bottom: 1px solid transparent; transition: border-color 0.15s;
	}
	.name-input:hover { border-bottom-color: var(--color-border); }
	.name-input:focus { outline: none; border-bottom-color: var(--sm-pink); }

	.remove-btn {
		font-size: 0.9375rem; width: 22px; height: 22px; border-radius: 0;
		border: var(--sm-bw) solid var(--sm-ink); background: none; color: var(--color-text-tertiary);
		cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; line-height: 1;
	}
	.remove-btn:hover { color: var(--color-danger); border-color: var(--color-danger); }

	.round-fields { display: flex; flex-direction: column; gap: 0.375rem; }
	.round-fields label { display: flex; flex-direction: column; gap: 0.125rem; }
	.round-fields label span { font-size: 0.6875rem; color: var(--color-text-tertiary); font-weight: 500; }
	.round-fields input {
		font-size: 0.875rem; padding: 0.25rem 0.375rem; border-radius: 0;
		border: var(--sm-bw) solid var(--sm-ink); background: var(--sm-card);
		color: var(--color-text-primary); font-family: inherit; width: 100%;
	}
	.round-fields input:focus { outline: none; border-color: var(--sm-pink); }
	.round-meta { font-size: 0.75rem; color: var(--color-text-tertiary); margin-top: 0.5rem; }

	.add-card {
		border: var(--sm-bw) dashed var(--sm-ink); border-radius: 0; background: none;
		padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
		cursor: pointer; color: var(--color-text-tertiary); font-family: inherit; font-size: 0.875rem;
		transition: border-color 0.15s, color 0.15s;
	}
	.add-card:hover { border-color: var(--sm-pink); color: var(--color-text-primary); }
	.add-icon { font-size: 1.3125rem; font-weight: 300; }

	.invested-total { font-size: 0.9375rem; color: var(--color-text-secondary); margin: 1rem 0; }

	.dilution-waterfall { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.75rem; }
	.dilution-row { display: grid; grid-template-columns: 100px 1fr auto; align-items: center; gap: 0.75rem; }
	.dilution-name { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); }
	.dilution-bars { display: flex; flex-direction: column; gap: 3px; }
	.dilution-bar-track { height: 18px; background: color-mix(in oklab, var(--color-border) 30%, transparent); border-radius: 0; overflow: hidden; }
	.dilution-bar { height: 100%; border-radius: 0; display: flex; align-items: center; padding: 0 6px; font-size: 0.6875rem; font-weight: 800; color: var(--sm-ink); transition: width 0.4s ease; min-width: 30px; }
	.dilution-bar.original { background: var(--sm-pink); }
	.dilution-bar.final { background: var(--sm-gold); }
	.dilution-change { font-size: 0.75rem; color: var(--color-text-secondary); white-space: nowrap; }

	@media (max-width: 480px) { .dilution-row { grid-template-columns: 1fr; } }

	.table-scroll { overflow-x: auto; margin-top: 0.5rem; }
	table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
	th { text-align: left; font-family: var(--sm-type); font-weight: 400; font-size: 0.8125rem; color: var(--color-text-secondary); padding: 0.375rem 0.5rem; border-bottom: var(--sm-bw) solid var(--sm-ink); white-space: nowrap; }
	.th-sub { font-weight: 400; color: var(--color-text-tertiary); }
	td { padding: 0.5rem; border-bottom: 1px solid color-mix(in oklab, var(--color-border) 50%, transparent); color: var(--color-text-primary); }
	tr:last-child td { border-bottom: none; }
	.td-name { font-weight: 600; white-space: nowrap; }
	.row-danger td { color: var(--color-danger); }
	.row-ok td { color: var(--color-success); }
</style>
