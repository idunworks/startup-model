<!--
  Startup financial model — a public, browser-only calculator (/tools/startup-model).
  Intro with three steps, then the model in six tabs. Scenarios autosave to
  localStorage (storage.ts); nothing is sent to the server. Strings follow the
  app language (i18n.ts). Styled for the Riot shell via the --sm-* tokens
  below, which fall back to the shared theme tokens outside Riot.
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { FinancialModel } from '$lib/model/types';
	import { createDefaultModel, fmtMoney } from '$lib/model/types';
	import { computeMonthlySnapshots, memberGrossSalary } from '$lib/model/computed';
	import { loadCurrentModel, saveModel, loadModelByName, deleteModel, exportModel, importModel } from '$lib/model/storage';
	import { tr, numberLocale } from '$lib/i18n';
	import TabTeam from '$lib/model/TabTeam.svelte';
	import TabStages from '$lib/model/TabStages.svelte';
	import TabInvestors from '$lib/model/TabInvestors.svelte';
	import TabEconomy from '$lib/model/TabEconomy.svelte';
	import TabRepayment from '$lib/model/TabRepayment.svelte';
	import TabRisks from '$lib/model/TabRisks.svelte';

	type TabName = 'team' | 'stages' | 'investors' | 'economy' | 'repayment' | 'risks';

	let model = $state<FinancialModel>(createDefaultModel());
	let activeTab = $state<TabName>('team');
	let mounted = $state(false);
	let savedModels = $state<string[]>([]);
	let lastSaved = $state<string | null>(null);
	let importError = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let toolEl: HTMLElement;

	// ─── Derived summary values ───
	let totalDeferred = $derived(model.team.reduce((s, m) => s + m.deferredHours * m.hourlyRate, 0));
	let monthlyBurn = $derived(model.team.reduce((s, m) => s + memberGrossSalary(m, model.economy.taxAndSocialMultiplier), 0) + model.economy.overhead);
	let snapshots = $derived(computeMonthlySnapshots(model.team, model.stages, model.economy, model.rounds));
	let breakEvenMonth = $derived(snapshots.find((s) => s.surplus > 0)?.month ?? null);

	// ─── Lifecycle ───
	onMount(() => {
		const loaded = loadCurrentModel();
		model = loaded.model;
		savedModels = loaded.savedNames;
		lastSaved = loaded.model.updatedAt;
		mounted = true;
	});

	// Auto-save
	let saveTimeout: ReturnType<typeof setTimeout>;
	$effect(() => {
		if (!mounted) return;
		JSON.stringify(model); // register reactivity
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			savedModels = saveModel(model);
			lastSaved = model.updatedAt;
		}, 800);
		return () => clearTimeout(saveTimeout);
	});

	function switchModel(name: string) {
		const m = loadModelByName(name);
		if (m) { model = m; lastSaved = m.updatedAt; }
	}

	function createNew() {
		model = { ...createDefaultModel(), name: tr('defaults.new_scenario', { n: savedModels.length + 1 }) };
		savedModels = saveModel(model);
		lastSaved = model.updatedAt;
	}

	function deleteCurrent() {
		const result = deleteModel(model.name);
		model = result.model;
		savedModels = result.savedNames;
	}

	async function handleImport(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		importError = null;
		try {
			const result = await importModel(file);
			model = result.model;
			savedModels = result.savedNames;
			lastSaved = model.updatedAt;
		} catch (err) {
			importError = err instanceof Error ? err.message : tr('page.import_failed');
		}
		input.value = '';
	}

	/** An intro step opens its tab and brings the model into view. */
	async function goToStep(tab: TabName) {
		activeTab = tab;
		await tick();
		toolEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		document.getElementById(`tab-${tab}`)?.focus({ preventScroll: true });
	}

	const tabs: { id: TabName; label: string }[] = [
		{ id: 'team', label: tr('page.tab_team') },
		{ id: 'stages', label: tr('page.tab_stages') },
		{ id: 'investors', label: tr('page.tab_investors') },
		{ id: 'economy', label: tr('page.tab_economy') },
		{ id: 'repayment', label: tr('page.tab_repayment') },
		{ id: 'risks', label: tr('page.tab_risks') }
	];

	const steps: { n: number; tab: TabName; title: string; body: string }[] = [
		{ n: 1, tab: 'team', title: tr('intro.step1_title'), body: tr('intro.step1_body') },
		{ n: 2, tab: 'stages', title: tr('intro.step2_title'), body: tr('intro.step2_body') },
		{ n: 3, tab: 'economy', title: tr('intro.step3_title'), body: tr('intro.step3_body') }
	];
</script>

<svelte:head>
	<title>{tr('meta.title')}</title>
	<meta name="description" content={tr('meta.description')} />
</svelte:head>

<div class="sm-tool">
	<!-- Intro: what it is, and the three steps -->
	<header class="intro">
		<span class="kicker">{tr('intro.kicker')}</span>
		<h1>{tr('intro.title')}</h1>
		<p class="lead">{tr('intro.lead')}</p>

		<h2 class="sr-only">{tr('intro.steps_label')}</h2>
		<ol class="steps">
			{#each steps as step (step.n)}
				<li>
					<button type="button" class="step" onclick={() => goToStep(step.tab)} aria-label="{tr('intro.step_go', { n: step.n })}: {step.title}">
						<span class="step-n" aria-hidden="true">{step.n}</span>
						<span class="step-title">{step.title}</span>
						<span class="step-body">{step.body}</span>
					</button>
				</li>
			{/each}
		</ol>
		<p class="privacy">{tr('intro.privacy')}</p>
	</header>

	<section class="model" bind:this={toolEl} aria-label={tr('intro.title')}>
		<div class="model-top">
			<label class="model-selector">
				<span>{tr('page.scenarios_label')}</span>
				<select value={model.name} onchange={(e) => switchModel((e.target as HTMLSelectElement).value)}>
					{#each savedModels as name}
						<option value={name}>{name}</option>
					{/each}
				</select>
			</label>
			<button type="button" class="btn-sm" onclick={createNew}>{tr('page.new')}</button>
		</div>

		<!-- Summary strip -->
		<div class="summary-strip">
			<div class="summary-item">
				<span class="summary-label">{tr('page.summary_team')}</span>
				<span class="summary-value">{model.team.length} {tr('unit.people')}</span>
			</div>
			<div class="summary-item">
				<span class="summary-label">{tr('page.summary_deferred')}</span>
				<span class="summary-value danger">{fmtMoney(totalDeferred)}</span>
			</div>
			<div class="summary-item">
				<span class="summary-label">{tr('page.summary_burn')}</span>
				<span class="summary-value">{fmtMoney(monthlyBurn)}{tr('unit.per_month')}</span>
			</div>
			<div class="summary-item">
				<span class="summary-label">{tr('page.summary_breakeven')}</span>
				<span class="summary-value" class:success={breakEvenMonth !== null} class:danger={breakEvenMonth === null}>
					{breakEvenMonth ? tr('page.month_n', { n: breakEvenMonth }) : `> ${model.economy.timeHorizonMonths} ${tr('unit.months_short')}`}
				</span>
			</div>
		</div>

		<!-- Tabs -->
		<div class="tabs" role="tablist" aria-label={tr('page.tabs_label')}>
			{#each tabs as tab (tab.id)}
				<button
					type="button"
					role="tab"
					id="tab-{tab.id}"
					aria-selected={activeTab === tab.id}
					aria-controls="panel-{tab.id}"
					tabindex={activeTab === tab.id ? 0 : -1}
					class="tab"
					class:active={activeTab === tab.id}
					onclick={() => activeTab = tab.id}
					onkeydown={(e) => {
						const ids = tabs.map(t => t.id);
						const cur = ids.indexOf(activeTab);
						if (e.key === 'ArrowRight' && cur < ids.length - 1) { activeTab = ids[cur + 1]; (e.target as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[cur + 1]?.focus(); }
						if (e.key === 'ArrowLeft' && cur > 0) { activeTab = ids[cur - 1]; (e.target as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[cur - 1]?.focus(); }
					}}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Tab content -->
		<div role="tabpanel" id="panel-{activeTab}" aria-labelledby="tab-{activeTab}">
			{#if activeTab === 'team'}
				<TabTeam bind:model />
			{:else if activeTab === 'stages'}
				<TabStages bind:model />
			{:else if activeTab === 'investors'}
				<TabInvestors bind:model />
			{:else if activeTab === 'economy'}
				<TabEconomy bind:model />
			{:else if activeTab === 'repayment'}
				<TabRepayment bind:model />
			{:else if activeTab === 'risks'}
				<TabRisks {model} />
			{/if}
		</div>

		<!-- Hidden file input for import -->
		<input type="file" accept=".json" class="sr-only" bind:this={fileInput} onchange={handleImport} />

		<!-- Save bar: sticks to the bottom of the screen while the model is in view -->
		<div class="save-bar">
			{#if importError}
				<span class="import-error">{importError}</span>
			{/if}
			{#if lastSaved}
				<span class="save-time">{tr('page.saved_at', { time: new Date(lastSaved).toLocaleTimeString(numberLocale(), { hour: '2-digit', minute: '2-digit' }) })}</span>
			{/if}
			<button type="button" class="btn-sm" onclick={() => fileInput.click()}>{tr('page.import')}</button>
			<button type="button" class="btn-sm" onclick={() => exportModel(model)}>{tr('page.export')}</button>
			<button type="button" class="btn-sm" onclick={() => { savedModels = saveModel(model); lastSaved = model.updatedAt; }}>{tr('page.save_now')}</button>
			{#if savedModels.length > 1}
				<button type="button" class="btn-sm btn-danger" onclick={deleteCurrent}>{tr('page.delete_scenario')}</button>
			{/if}
		</div>
	</section>
</div>

<style>
	/* Riot tokens with fallbacks to the shared theme, read by every tab */
	.sm-tool {
		--sm-ink: var(--ink, var(--color-text-primary));
		--sm-paper: var(--paper, var(--color-bg-secondary));
		--sm-card: var(--color-bg-primary, #fff);
		--sm-pink: var(--pink, var(--color-accent-primary));
		--sm-pink-ink: var(--pink-ink, var(--color-accent-primary));
		--sm-pink-lit: var(--pink-lit, #ff5aa5);
		--sm-gold: var(--gold, #f2c230);
		--sm-cyan: var(--cyan, #2fd4e6);
		--sm-bw: var(--bw, 2px);
		--sm-shadow: 4px 4px 0 var(--sm-ink);
		--sm-head: var(--poster, inherit);
		--sm-type: var(--type, ui-monospace, monospace);
		--sm-tilt: var(--tilt, 1);
		font-family: var(--body, inherit);
		color: var(--sm-ink);
	}

	/* ── Intro ── */
	.intro { padding: 0.5rem 0 2.5rem; }
	.kicker {
		display: inline-block; font-family: var(--sm-type); font-size: 0.875rem;
		background: var(--sm-gold); color: var(--sm-ink); border: var(--sm-bw) solid var(--sm-ink);
		padding: 0.2rem 0.6rem; transform: rotate(calc(-2deg * var(--sm-tilt))); margin-bottom: 1rem;
	}
	.intro h1 { margin: 0 0 1rem; }
	.lead { font-size: 1.1875rem; line-height: 1.5; max-width: 62ch; color: var(--color-text-secondary); }

	.steps {
		list-style: none; margin: 2rem 0 0; padding: 0;
		display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.5rem;
	}
	.steps li:nth-child(1) .step { transform: rotate(calc(-1.2deg * var(--sm-tilt))); }
	.steps li:nth-child(2) .step { transform: rotate(calc(0.8deg * var(--sm-tilt))); }
	.steps li:nth-child(3) .step { transform: rotate(calc(-0.6deg * var(--sm-tilt))); }
	.step {
		position: relative; display: flex; flex-direction: column; gap: 0.375rem; height: 100%;
		width: 100%; text-align: left; cursor: pointer; font: inherit; color: var(--sm-ink);
		background: var(--sm-paper); border: var(--sm-bw) solid var(--sm-ink); box-shadow: 6px 6px 0 var(--sm-ink);
		padding: 2.75rem 1.25rem 1.25rem; transition: transform 0.12s, box-shadow 0.12s;
	}
	.steps li .step:hover, .steps li .step:focus-visible {
		transform: translate(-2px, -2px) rotate(0deg); box-shadow: 9px 9px 0 var(--sm-pink);
		outline: none;
	}
	.step-n {
		position: absolute; top: -1.25rem; left: 1rem; width: 3.25rem; height: 3.25rem;
		display: grid; place-items: center; border-radius: 50%;
		background: var(--sm-gold); border: var(--sm-bw) solid var(--sm-ink); box-shadow: 3px 3px 0 var(--sm-ink);
		font-family: var(--sm-head); font-size: 1.75rem; line-height: 1;
	}
	.steps li:nth-child(2) .step-n { background: var(--sm-pink); }
	.steps li:nth-child(3) .step-n { background: var(--sm-cyan); }
	.step-title { font-family: var(--sm-head); font-size: 1.5rem; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1.05; }
	.step-body { font-size: 0.9375rem; line-height: 1.5; color: var(--color-text-secondary); }
	.privacy {
		margin-top: 1.75rem; font-family: var(--sm-type); font-size: 0.9375rem;
		border-left: 6px solid var(--sm-pink); padding-left: 0.75rem; max-width: 70ch;
	}
	@media (max-width: 760px) {
		.steps { grid-template-columns: 1fr; gap: 1.75rem; }
		.lead { font-size: 1.0625rem; }
	}

	/* ── Model ── */
	.model { scroll-margin-top: 1rem; border-top: var(--sm-bw) dashed var(--sm-ink); padding-top: 1.75rem; }
	.model-top { display: flex; align-items: flex-end; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
	.model-selector { display: flex; flex-direction: column; gap: 0.25rem; }
	.model-selector span { font-family: var(--sm-type); font-size: 0.8125rem; }
	.model-selector select {
		font-size: 0.9375rem; padding: 0.375rem 0.75rem; border-radius: 0;
		border: var(--sm-bw) solid var(--sm-ink); background: var(--sm-card);
		color: var(--sm-ink); font-family: inherit; min-width: 12rem;
	}

	.btn-sm {
		font-size: 0.8125rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
		padding: 0.4rem 0.8rem; border-radius: 0;
		border: var(--sm-bw) solid var(--sm-ink); background: var(--sm-card); box-shadow: 3px 3px 0 var(--sm-ink);
		color: var(--sm-ink); cursor: pointer; font-family: inherit; white-space: nowrap;
		transition: background 0.12s, transform 0.12s, box-shadow 0.12s;
	}
	.btn-sm:hover { background: var(--sm-gold); }
	.btn-sm:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--sm-ink); }
	.btn-danger { color: var(--sm-pink-ink); }
	.btn-danger:hover { background: var(--sm-pink); color: var(--sm-ink); }

	/* the summary is a black date bar: gold numbers, pink/cyan for bad/good */
	.summary-strip {
		display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem;
		padding: 1rem 1.25rem; background: var(--sm-ink); color: var(--sm-paper);
		box-shadow: 6px 6px 0 var(--sm-pink); margin-bottom: 0.5rem;
	}
	.summary-item { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
	.summary-label { font-family: var(--sm-type); font-size: 0.8125rem; opacity: 0.85; }
	.summary-value { font-family: var(--sm-head); font-size: 1.5rem; letter-spacing: 0.02em; color: var(--sm-gold); line-height: 1.1; }
	.summary-value.danger { color: var(--sm-pink-lit); }
	.summary-value.success { color: var(--sm-cyan); }
	@media (max-width: 760px) { .summary-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

	.tabs {
		display: flex; gap: 0.5rem; margin-top: 1.5rem; padding: 0.375rem 0.25rem 0.75rem;
		overflow-x: auto; -webkit-overflow-scrolling: touch; border-bottom: var(--sm-bw) solid var(--sm-ink);
	}
	.tab {
		padding: 0.5rem 0.9rem; font-family: var(--sm-head); font-size: 1.0625rem;
		text-transform: uppercase; letter-spacing: 0.03em; line-height: 1.1;
		color: var(--sm-ink); background: var(--sm-card); border: var(--sm-bw) solid var(--sm-ink);
		cursor: pointer; white-space: nowrap; transition: background 0.12s, transform 0.12s;
	}
	.tab:hover { background: var(--sm-paper); }
	.tab.active { background: var(--sm-gold); box-shadow: 3px 3px 0 var(--sm-ink); transform: rotate(calc(-1.5deg * var(--sm-tilt))); }
	.tab:focus-visible { outline: 3px solid var(--sm-pink); outline-offset: 2px; }

	.save-bar {
		position: sticky; bottom: 0; z-index: 10; margin-top: 2rem;
		display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap;
		padding: 0.75rem 1rem; background: var(--sm-ink); color: var(--sm-paper);
	}
	.save-time { font-family: var(--sm-type); font-size: 0.8125rem; margin-right: auto; }
	.import-error { font-size: 0.8125rem; color: var(--sm-pink-lit); margin-right: auto; }
	.save-bar .btn-sm { box-shadow: none; }

	.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
	.danger { color: var(--color-danger); }
	.success { color: var(--color-success); }
</style>
