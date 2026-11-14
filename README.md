# startup-model

Plan pay, ownership, back-pay and cash flow for a founding team, phase by phase, before you split the shares. It runs in your browser, and nothing is sent anywhere.

**Try it:** [idunworks.com/tools/startup-model](https://idunworks.com/tools/startup-model?utm_source=github&utm_medium=readme&utm_campaign=startup-model)

## Install

```sh
pnpm install && pnpm dev
```

Node 22 or later. `pnpm build` writes a static site to `build/` that any web server can host.

## Try it in 30 seconds

1. **Add your team:** who's in, what share they own, the salary they'd want, and the hours they put in now for free.
2. **Set the plan:** phases that pay a share of the salary, your revenue and growth, monthly costs, and any investor rounds.
3. **Read the verdict:** cash flow, the month you break even, when the unpaid work gets paid back, and what happens if things go wrong.

It starts with an example team of three founders, so every tab shows numbers at once. English and Swedish; amounts are in Swedish kronor. Employer fees on top of salary are one multiplier (1.41 by default), set under Cash flow.

## Configuration

Nothing to configure. Scenarios save themselves in the browser's `localStorage` as you type. Export a scenario to a JSON file to back it up or share it, and import it on another machine.

| Build setting | Default | What it does |
|---|---|---|
| `BASE_PATH` | empty | Serve from a sub-path, e.g. `/startup-model` on GitHub Pages |

## Turn it off

Close the tab. To remove your saved scenarios, use **Delete** on each one, or clear the site's data in your browser. The app stores nothing anywhere else.

## How it works

- `src/lib/model/computed.ts` holds the whole calculation, in pure functions with tests: gross salary per phase, the monthly cash position, dilution per investor round, and how a share of each month's surplus pays back unpaid hours.
- The six tabs in `src/lib/model/` only read and edit one model object.
- Strings live in `src/lib/i18n/{en,sv}.ts`, and a test checks that both languages have the same keys.
- The page is static (SvelteKit with `adapter-static`), with a strict Content Security Policy and no requests to other sites: no analytics, no fonts, no CDN.

## Built at idunworks

startup-model came out of building [Idun CMS](https://idunworks.com/projects?utm_source=github&utm_medium=readme&utm_campaign=startup-model), the platform behind
idunworks.com and the sites it hosts. More projects: [idunworks.com/projects](https://idunworks.com/projects?utm_source=github&utm_medium=readme&utm_campaign=startup-model).

[![idunworks](https://img.shields.io/badge/built%20at-idunworks-black)](https://idunworks.com/projects?utm_source=github&utm_medium=badge&utm_campaign=startup-model)

## License

MIT
