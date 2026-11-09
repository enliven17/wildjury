# wildjury

**Put your code on trial.** Wildjury seats language models from different labs, asks each one alone, and hands you
the verdict with the dissent left in. One [Otari](https://otari.ai) key, one command.

**Site:** [wildjury.cankat.art](https://wildjury.cankat.art) · **Docs:** [wildjury.cankat.art/docs](https://wildjury.cankat.art/docs)

```
$ wildjury review --base main

  WILDJURY  review · 5 jurors · trial wj-mw9pbv5q-770d

  ● openai/gpt-5.1                     request changes                              0.84 3.1s
  ● mistralai/mistral-large-3          approve                                      0.62 3.4s
  ● anthropic/claude-sonnet-4.6        request changes                              0.91 4.0s
  ● google/gemini-3-pro                request changes                              0.77 4.6s
  ● deepseek/deepseek-v4-pro           request changes                              0.80 6.2s

  CHANGES REQUESTED  1 approve · 4 request changes · of 5

  HIGH Lock released before the transaction commits  3/5 jurors
       src/queue.ts:42
       pg_advisory_unlock runs before COMMIT, so two workers can claim the same job.
```

(Example output. Model ids come from your own Otari catalog.)

## Why a jury

One model is one set of blind spots. Models from different labs are trained differently and miss different things.
Wildjury asks several of them the same thing in private, groups the answers that agree, and only calls a verdict when
a strict majority holds. When nothing does, it says **hung jury** instead of averaging.

## Install

Needs Node 21+ and an Otari API key (otari.ai → API keys).

```bash
export OTARI_API_KEY=otk_...
npx github:enliven17/wildjury --help
```

## Use

```bash
wildjury ask "Should our job queue use Postgres advisory locks?"
wildjury ask "Is this migration safe to run online?" -f migrations/042.sql
wildjury ask "What changed in the Node 24 fetch timeout defaults?" --web
wildjury review                  # staged changes, or the working tree against HEAD
wildjury review --base main      # this branch against main
git diff | wildjury review -     # anything on stdin
wildjury models                  # what your key can seat, and the default jury
```

| Option | |
|---|---|
| `-m, --models a,b,c` | Jurors by catalog id (`openai/gpt-5.1`) or `provider:model`. Default: one model per lab |
| `-n, --jurors 5` | Size of the default jury |
| `-j, --judge model` | Foreperson who groups the ballots. Default: the first juror who answered |
| `-f, --file path` | Attach a file to `ask` (repeatable) |
| `--base ref` | Review `ref...HEAD` |
| `--web` | Let jurors search the web with Otari's built-in search |
| `--json` | Print the whole trial as JSON |

Env: `OTARI_API_KEY` (required), `OTARI_BASE_URL` (a self-hosted gateway), `WILDJURY_MODELS` (a fixed jury).

`review` exits `0` when the jury approves and `1` otherwise, so it works as a CI gate:

```yaml
- run: npx github:enliven17/wildjury review --base origin/${{ github.base_ref }}
  env:
    OTARI_API_KEY: ${{ secrets.OTARI_API_KEY }}
```

## How a trial runs

1. **Empanel.** Read the Otari catalog and seat one mid-priced chat model per lab, preferred labs first.
2. **Ballots.** Every juror answers in parallel with no view of the others, as JSON: an answer and confidence, or a
   review verdict with findings.
3. **Foreperson.** One model groups ballots that agree in substance (`ask`) or merges duplicate findings and lists who
   raised each (`review`). It reports; it does not vote.
4. **Tally.** Plain code, not a model: the largest position wins only with a strict majority. Review findings are
   ranked by how many jurors raised them, then by severity.

A juror that errors, times out or returns an unreadable ballot is **recused**; the trial goes on with the rest.

## What Otari does

- **One key, every lab.** `GET /api/v1/models` is the jury pool. Jurors are named by catalog id, so Otari picks the
  provider and fails over when a call fails.
- **Traces.** Each juror and the foreperson send their own `Otari-Conversation-Id` (`<trial>/juror-3`) and
  `User-Agent: wildjury/<version>`, so a trial reads ballot by ballot on Otari's Traces page.
- **Web search.** `--web` declares the `otari_web_search` tool; Otari runs it and Wildjury prints the sources from
  `otari_tool_calls`.
- **Budgets.** A refusal is shown with its `Retry-After`.

## Repository

| Path | |
|---|---|
| `cli/` | The CLI: `src/otari.js` (gateway client), `src/jury.js` (trial and tally), `src/prompts.js`, `src/render.js` |
| `site/` | The landing page (Vite, React, GSAP, Lenis) |
| `brand/` | Logo, profile, banner, link preview and kit sheets, rendered from HTML (`npm run render`) |

```bash
npm test                      # CLI tests, no network
cd site && npm i && npm run dev
```

## License

MIT
