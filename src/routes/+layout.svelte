<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { getLang, setLang, tr } from '$lib/i18n';

	let { children }: { children: Snippet } = $props();
	const lang = getLang();
	const IDUN = 'https://idunworks.com/projects?utm_source=startup-model&utm_medium=app&utm_campaign=startup-model';
	const REPO = 'https://github.com/idunworks/startup-model';

	$effect(() => {
		document.documentElement.lang = lang;
	});
</script>

<div class="shell">
	<nav class="lang" aria-label={tr('chrome.language')}>
		<button type="button" aria-pressed={lang === 'en'} onclick={() => setLang('en')}>EN</button>
		<button type="button" aria-pressed={lang === 'sv'} onclick={() => setLang('sv')}>SV</button>
	</nav>
	<main>
		{@render children()}
	</main>
	<footer>
		<span>{tr('chrome.private')}</span>
		<a href={REPO}>{tr('chrome.source')}</a>
		<a href={IDUN}>{tr('chrome.built_at')}</a>
	</footer>
</div>

<style>
	.shell {
		max-width: 1200px;
		margin: 0 auto;
		padding: clamp(16px, 4vw, 48px);
	}
	.lang {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-bottom: 16px;
	}
	.lang button {
		padding: 4px 10px;
		font: inherit;
		font-family: var(--type);
		background: var(--paper);
		color: var(--ink);
		border: var(--bw) solid var(--ink);
		cursor: pointer;
	}
	.lang button[aria-pressed='true'] {
		background: var(--ink);
		color: var(--gold);
	}
	footer {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 24px;
		margin-top: 48px;
		padding-top: 16px;
		border-top: var(--bw) solid var(--ink);
		font-family: var(--type);
		font-size: 0.875rem;
	}
	footer a {
		color: var(--pink-ink);
	}
</style>
