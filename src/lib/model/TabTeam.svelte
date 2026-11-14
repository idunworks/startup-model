<script lang="ts">
	import type { FinancialModel } from './types';
	import { createDefaultMember, fmtMoney, fmtPct } from './types';
	import { memberGrossSalary } from './computed';
	import { tr } from '$lib/i18n';

	let { model = $bindable() }: { model: FinancialModel } = $props();

	let editingId = $state<string | null>(null);

	let totalEquity = $derived(model.team.reduce((s, m) => s + m.equityPct, 0));
	let equityWarning = $derived(Math.abs(totalEquity - 100) > 0.1);

	function addMember() {
		model.team = [...model.team, createDefaultMember({ name: tr('defaults.person', { n: model.team.length + 1 }) })];
		editingId = model.team[model.team.length - 1].id;
	}

	function removeMember(id: string) {
		model.team = model.team.filter((m) => m.id !== id);
		if (editingId === id) editingId = null;
	}
</script>

<section class="tab-content">
	<div class="section-intro">
		<h2>{tr('team.title')}</h2>
		<p>{tr('team.intro')}</p>
	</div>

	<!-- Equity bar -->
	<div class="equity-bar-section">
		<div class="equity-bar-header">
			<span>{tr('team.equity_split')}</span>
			<span class:equity-ok={!equityWarning} class:equity-warn={equityWarning}>
				{tr('team.of_100', { pct: fmtPct(totalEquity) })}
			</span>
		</div>
		<div class="equity-bar-track">
			{#each model.team as m (m.id)}
				{#if m.equityPct > 0}
					<div class="equity-bar-segment" style="width: {Math.min(m.equityPct, 100)}%" title="{m.name}: {fmtPct(m.equityPct)}">
						{#if m.equityPct >= 8}<span class="equity-bar-label">{m.name}</span>{/if}
					</div>
				{/if}
			{/each}
			{#if totalEquity < 100}
				<div class="equity-bar-empty" style="width: {100 - totalEquity}%"></div>
			{/if}
		</div>
		{#if equityWarning}
			<p class="equity-warning-text">
				{totalEquity > 100 ? tr('team.over_100', { pct: fmtPct(totalEquity - 100) }) : tr('team.unallocated', { pct: fmtPct(100 - totalEquity) })}
			</p>
		{/if}
	</div>

	<!-- Member cards -->
	<div class="member-grid">
		{#each model.team as member, i (member.id)}
			<div class="member-card" class:editing={editingId === member.id}>
				<div class="member-card-header">
					<button type="button" class="member-edit-toggle" onclick={() => editingId = editingId === member.id ? null : member.id}>
						{editingId === member.id ? tr('team.done') : tr('team.edit')}
					</button>
					{#if model.team.length > 1}
						<button type="button" class="member-remove" aria-label={tr('team.remove', { name: member.name || tr('team.person_fallback') })} onclick={() => { if (confirm(tr('team.remove_confirm', { name: member.name || tr('team.person_fallback') }))) removeMember(member.id); }}>&times;</button>
					{/if}
				</div>

				{#if editingId === member.id}
					<div class="member-fields">
						<label><span>{tr('team.name')}</span><input type="text" bind:value={model.team[i].name} /></label>
						<label><span>{tr('team.role')}</span><input type="text" bind:value={model.team[i].role} /></label>
						<label><span>{tr('team.equity')}</span><input type="number" min="0" max="100" step="0.5" bind:value={model.team[i].equityPct} /></label>
						<label><span>{tr('team.salary', { currency: tr('unit.currency') })}</span><input type="number" min="0" step="5000" bind:value={model.team[i].salaryExpectation} /></label>
						<label><span>{tr('team.deferred_hours')}</span><input type="number" min="0" step="10" bind:value={model.team[i].deferredHours} /></label>
						<label><span>{tr('team.hourly_rate')}</span><input type="number" min="0" step="50" bind:value={model.team[i].hourlyRate} /></label>
					</div>
				{:else}
					<div class="member-display">
						<div class="member-name">{member.name || tr('team.unnamed')}</div>
						<div class="member-role">{member.role || '—'}</div>
						<div class="member-stats">
							<div class="member-stat">
								<span class="stat-label">{tr('team.stat_equity')}</span>
								<span class="stat-value">{fmtPct(member.equityPct)}</span>
							</div>
							<div class="member-stat">
								<span class="stat-label">{tr('team.stat_salary')}</span>
								<span class="stat-value">{fmtMoney(member.salaryExpectation)}</span>
							</div>
							<div class="member-stat">
								<span class="stat-label">{tr('team.stat_deferred')}</span>
								<span class="stat-value danger">{fmtMoney(member.deferredHours * member.hourlyRate)}</span>
							</div>
							<div class="member-stat">
								<span class="stat-label">{tr('team.stat_gross')}</span>
								<span class="stat-value">{fmtMoney(memberGrossSalary(member, model.economy.taxAndSocialMultiplier))}{tr('unit.per_month')}</span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/each}

		<button type="button" class="add-card" onclick={addMember}>
			<span class="add-icon">+</span>
			<span>{tr('team.add')}</span>
		</button>
	</div>
</section>

<style>
	.tab-content { padding-top: 1.5rem; }
	.section-intro { margin-bottom: 1.5rem; }
	.section-intro h2 { font-family: var(--comic, inherit); font-size: clamp(1.75rem, 3.5vw, 2.375rem); font-weight: 400; line-height: 1; color: var(--sm-ink); }
	.section-intro p { margin-top: 0.5rem; font-size: 1rem; color: var(--color-text-secondary); line-height: 1.5; max-width: 62ch; }

	.equity-bar-section { margin-bottom: 1.5rem; }
	.equity-bar-header { display: flex; justify-content: space-between; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.375rem; }
	.equity-ok { color: var(--color-success); }
	.equity-warn { color: var(--color-warning); }

	.equity-bar-track { display: flex; height: 32px; overflow: hidden; background: var(--sm-card); border: var(--sm-bw) solid var(--sm-ink); }

	.equity-bar-segment {
		overflow: hidden;
		display: flex; align-items: center; justify-content: center;
		background: var(--sm-pink); border-right: var(--sm-bw) solid var(--sm-ink);
		color: var(--sm-ink); font-size: 0.75rem; font-weight: 800;
		transition: width 0.3s ease; min-width: 2px;
	}

	.equity-bar-segment:nth-child(2n) { background: var(--sm-gold); }
	.equity-bar-segment:nth-child(3n) { background: var(--sm-cyan); }
	.equity-bar-segment:nth-child(4n) { background: var(--sm-pink-lit); }

	.equity-bar-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 4px; }
	.equity-bar-empty { background: transparent; }
	.equity-warning-text { font-size: 0.8125rem; color: var(--color-warning); margin-top: 0.25rem; }

	.member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; }

	.member-card { box-shadow: var(--sm-shadow);
		border-radius: 0; background: var(--sm-card);
		border: var(--sm-bw) solid var(--sm-ink); padding: 1rem; transition: border-color 0.2s;
	}
	.member-card.editing { box-shadow: 6px 6px 0 var(--sm-pink); }

	.member-card-header { display: flex; justify-content: flex-end; gap: 0.375rem; margin-bottom: 0.5rem; }

	.member-edit-toggle {
		font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.75rem; min-height: 2rem;
		border-radius: 0; border: var(--sm-bw) solid var(--sm-ink);
		background: none; color: var(--color-text-secondary); cursor: pointer; font-family: inherit;
	}
	@media (pointer: coarse) { .member-edit-toggle { min-height: 2.75rem; padding: 0.375rem 0.875rem; } }

	.member-remove {
		font-size: 0.9375rem; width: 28px; height: 28px; border-radius: 0;
		border: var(--sm-bw) solid var(--sm-ink); background: none; color: var(--color-text-tertiary);
		cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; line-height: 1;
	}
	.member-remove:hover { color: var(--color-danger); border-color: var(--color-danger); }
	@media (pointer: coarse) { .member-remove { width: 36px; height: 36px; } }

	.member-fields { display: flex; flex-direction: column; gap: 0.5rem; }
	.member-fields label { display: flex; flex-direction: column; gap: 0.125rem; }
	.member-fields label span { font-size: 0.75rem; color: var(--color-text-tertiary); font-weight: 500; }

	.member-fields input {
		font-size: 0.9375rem; padding: 0.375rem 0.5rem; border-radius: 0;
		border: var(--sm-bw) solid var(--sm-ink); background: var(--sm-card);
		color: var(--color-text-primary); font-family: inherit;
	}
	.member-fields input:focus { outline: none; border-color: var(--sm-pink); }

	.member-display { display: flex; flex-direction: column; gap: 0.375rem; }
	.member-name { font-size: 1.0625rem; font-weight: 700; color: var(--color-text-primary); }
	.member-role { font-size: 0.8125rem; color: var(--color-text-secondary); }
	.member-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem; }
	.member-stat { display: flex; flex-direction: column; }
	.stat-label { font-size: 0.6875rem; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.03em; }
	.stat-value { font-size: 0.9375rem; font-weight: 600; color: var(--color-text-primary); }

	.add-card {
		border: var(--sm-bw) dashed var(--sm-ink); border-radius: 0; background: none;
		padding: 2rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
		cursor: pointer; color: var(--color-text-tertiary); font-family: inherit; font-size: 0.875rem;
		transition: border-color 0.15s, color 0.15s;
	}
	.add-card:hover { border-color: var(--sm-pink); color: var(--color-text-primary); }
	.add-icon { font-size: 1.3125rem; font-weight: 300; }
	.danger { color: var(--color-danger); }
</style>
