<script lang="ts">
	import type { FinancialModel } from './types';
	import { fmtMoney, uid } from './types';
	import { memberStageSalary, memberStageGross } from './computed';
	import { tr } from '$lib/i18n';

	let { model = $bindable() }: { model: FinancialModel } = $props();

	function addStage() {
		const last = model.stages[model.stages.length - 1];
		model.stages = [...model.stages, {
			id: uid(), name: tr('defaults.new_stage'),
			startMonth: (last?.endMonth ?? 0) + 1,
			endMonth: (last?.endMonth ?? 0) + 3,
			salaryMultiplier: 0.5, description: ''
		}];
	}

	function removeStage(id: string) {
		model.stages = model.stages.filter((s) => s.id !== id);
	}

	let stageWarnings = $derived(model.stages.map((s, i) => {
		if (s.startMonth > s.endMonth) return tr('stages.warn_start_after_end');
		const overlap = model.stages.find((o, j) => j !== i &&
			s.startMonth <= o.endMonth && s.endMonth >= o.startMonth);
		if (overlap) return tr('stages.warn_overlap', { name: overlap.name });
		return null;
	}));
</script>

<section class="tab-content">
	<div class="section-intro">
		<h2>{tr('stages.title')}</h2>
		<p>{tr('stages.intro')}</p>
	</div>

	<!-- Timeline visual -->
	<div class="stage-timeline">
		{#each model.stages as stage (stage.id)}
			<div class="stage-block" style="flex: {stage.endMonth - stage.startMonth + 1}">
				<div class="stage-block-bar" style="opacity: {0.3 + stage.salaryMultiplier * 0.7}"></div>
				<div class="stage-block-label">{stage.name}</div>
				<div class="stage-block-months">M{stage.startMonth}–M{stage.endMonth}</div>
				<div class="stage-block-mult">{tr('stages.pct_salary', { pct: Math.round(stage.salaryMultiplier * 100) })}</div>
			</div>
		{/each}
	</div>

	<!-- Stage cards -->
	<div class="stage-cards">
		{#each model.stages as stage, i (stage.id)}
			<div class="stage-card">
				<div class="stage-card-header">
					<input type="text" class="stage-name-input" bind:value={model.stages[i].name} aria-label={tr('stages.name_label')} />
					{#if model.stages.length > 1}
						<button type="button" class="remove-btn" aria-label={tr('stages.remove', { name: stage.name })} onclick={() => { if (confirm(tr('stages.remove_confirm', { name: stage.name }))) removeStage(stage.id); }}>&times;</button>
					{/if}
				</div>
				<div class="stage-card-fields">
					<label><span>{tr('stages.start')}</span><input type="number" min="1" max="36" bind:value={model.stages[i].startMonth} /></label>
					<label><span>{tr('stages.end')}</span><input type="number" min="1" max="36" bind:value={model.stages[i].endMonth} /></label>
					<label>
						<span>{tr('stages.salary_share')}</span>
						<div class="multiplier-btns">
							{#each [0, 0.25, 0.5, 0.75, 1] as mult}
								<button type="button" class="mult-btn" class:active={stage.salaryMultiplier === mult}
									onclick={() => model.stages[i].salaryMultiplier = mult}>{Math.round(mult * 100)}%</button>
							{/each}
						</div>
					</label>
				</div>
				<input type="text" class="stage-desc-input" placeholder={tr('stages.description_placeholder')} bind:value={model.stages[i].description} aria-label={tr('stages.description_label', { name: stage.name })} />
				{#if stageWarnings[i]}
					<p class="stage-warning">{stageWarnings[i]}</p>
				{/if}
			</div>
		{/each}
		<button type="button" class="add-card" onclick={addStage}>
			<span class="add-icon">+</span><span>{tr('stages.add')}</span>
		</button>
	</div>

	<!-- Salary matrix -->
	<h3>{tr('stages.matrix_title')}</h3>
	<div class="table-scroll">
		<table>
			<thead>
				<tr>
					<th>{tr('stages.col_person')}</th>
					{#each model.stages as stage}
						<th>{stage.name}<br /><span class="th-sub">{tr('stages.pct_salary', { pct: Math.round(stage.salaryMultiplier * 100) })}</span></th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each model.team as member}
					<tr>
						<td class="td-name">{member.name}</td>
						{#each model.stages as stage}
							<td>
								<div class="salary-cell">
									<span class="salary-net">{fmtMoney(memberStageSalary(member, stage))}</span>
									<span class="salary-gross">{tr('stages.gross', { amount: fmtMoney(memberStageGross(member, stage, model.economy.taxAndSocialMultiplier)) })}</span>
								</div>
							</td>
						{/each}
					</tr>
				{/each}
				<tr class="total-row">
					<td class="td-name">{tr('stages.total_cost')}</td>
					{#each model.stages as stage}
						<td><span class="salary-gross">{fmtMoney(model.team.reduce((s, m) => s + memberStageGross(m, stage, model.economy.taxAndSocialMultiplier), 0) + model.economy.overhead)}{tr('unit.per_month')}</span></td>
					{/each}
				</tr>
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

	.stage-timeline { display: flex; gap: 0; margin-bottom: 1.5rem; overflow: hidden; border: var(--sm-bw) solid var(--sm-ink); background: var(--sm-card); }
	.stage-block + .stage-block { border-left: var(--sm-bw) solid var(--sm-ink); }
	.stage-block { text-align: center; padding: 0.5rem 0.25rem; position: relative; min-width: 0; }
	.stage-block-bar { position: absolute; inset: 0; background: var(--sm-pink); z-index: 0; }
	.stage-block-label, .stage-block-months, .stage-block-mult { position: relative; z-index: 1; color: var(--sm-ink); }
	.stage-block-label { font-family: var(--sm-head); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.02em; }
	.stage-block-months { font-size: 0.625rem; opacity: 0.8; }
	.stage-block-mult { font-size: 0.6875rem; font-weight: 500; margin-top: 0.125rem; }

	.stage-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }

	.stage-card { box-shadow: var(--sm-shadow);
		border-radius: 0; background: var(--sm-card);
		border: var(--sm-bw) solid var(--sm-ink); padding: 0.875rem;
	}
	.stage-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }

	.stage-name-input {
		font-size: 0.9375rem; font-weight: 600; border: none; background: none;
		color: var(--color-text-primary); font-family: inherit; padding: 0; width: 100%;
		border-bottom: 1px solid transparent; transition: border-color 0.15s;
	}
	.stage-name-input:hover { border-bottom-color: var(--color-border); }
	.stage-name-input:focus { outline: none; border-bottom-color: var(--sm-pink); }

	.stage-desc-input {
		font-size: 0.75rem; border: none; background: none;
		color: var(--color-text-tertiary); font-family: inherit; padding: 0; width: 100%; margin-top: 0.375rem;
		border-bottom: 1px solid transparent; transition: border-color 0.15s;
	}
	.stage-desc-input:hover { border-bottom-color: var(--color-border); }
	.stage-desc-input:focus { outline: none; color: var(--color-text-secondary); border-bottom-color: var(--sm-pink); }

	.stage-warning { font-size: 0.75rem; color: var(--color-warning); margin-top: 0.25rem; font-weight: 500; }

	.remove-btn {
		font-size: 0.9375rem; width: 22px; height: 22px; border-radius: 0;
		border: var(--sm-bw) solid var(--sm-ink); background: none; color: var(--color-text-tertiary);
		cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; line-height: 1;
	}
	.remove-btn:hover { color: var(--color-danger); border-color: var(--color-danger); }

	.stage-card-fields { display: flex; flex-direction: column; gap: 0.375rem; }
	.stage-card-fields label { display: flex; flex-direction: column; gap: 0.125rem; }
	.stage-card-fields label span { font-size: 0.6875rem; color: var(--color-text-tertiary); font-weight: 500; }

	.stage-card-fields input[type="number"] {
		font-size: 0.875rem; padding: 0.25rem 0.375rem; border-radius: 0;
		border: var(--sm-bw) solid var(--sm-ink); background: var(--sm-card);
		color: var(--color-text-primary); font-family: inherit; width: 100%;
	}
	.stage-card-fields input:focus { outline: none; border-color: var(--sm-pink); }

	.multiplier-btns { display: flex; gap: 2px; }
	.mult-btn {
		flex: 1; font-size: 0.6875rem; font-weight: 600; padding: 0.25rem;
		border: var(--sm-bw) solid var(--sm-ink); background: none; color: var(--color-text-secondary);
		cursor: pointer; border-radius: 0; font-family: inherit; transition: background 0.15s, color 0.15s;
	}
	.mult-btn.active { background: var(--sm-gold); color: var(--sm-ink); border-color: var(--sm-ink); }

	.add-card {
		border: var(--sm-bw) dashed var(--sm-ink); border-radius: 0; background: none;
		padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
		cursor: pointer; color: var(--color-text-tertiary); font-family: inherit; font-size: 0.875rem;
		transition: border-color 0.15s, color 0.15s;
	}
	.add-card:hover { border-color: var(--sm-pink); color: var(--color-text-primary); }
	.add-icon { font-size: 1.3125rem; font-weight: 300; }

	.table-scroll { overflow-x: auto; margin-top: 0.5rem; }
	table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
	th { text-align: left; font-family: var(--sm-type); font-weight: 400; font-size: 0.8125rem; color: var(--color-text-secondary); padding: 0.375rem 0.5rem; border-bottom: var(--sm-bw) solid var(--sm-ink); white-space: nowrap; }
	.th-sub { font-weight: 400; color: var(--color-text-tertiary); }
	td { padding: 0.5rem; border-bottom: 1px solid color-mix(in oklab, var(--color-border) 50%, transparent); color: var(--color-text-primary); }
	tr:last-child td { border-bottom: none; }
	.td-name { font-weight: 600; white-space: nowrap; }
	.total-row td { border-top: 2px solid var(--color-border); font-weight: 600; }
	.salary-cell { display: flex; flex-direction: column; }
	.salary-net { font-weight: 600; }
	.salary-gross { font-size: 0.6875rem; color: var(--color-text-tertiary); }

	@media (max-width: 639px) {
		.stage-timeline { flex-direction: column; gap: 0.25rem; }
		.stage-block { display: grid; grid-template-columns: 1fr auto auto; text-align: left; padding: 0.5rem 0.75rem; }
		.stage-block-months { text-align: right; }
		.stage-block-mult { text-align: right; }
		.mult-btn { padding: 0.5rem 0.25rem; min-height: 2.75rem; }
	}
</style>
