import { useEffect, useState, type ReactNode } from 'react'
import Command from '../components/Command'
import { REPO } from '../links'
import { ReviewMerge, Tally, TrialFlow } from './Diagrams'
import './docs.css'

const NAV: [string, [string, string][]][] = [
  ['Start', [['intro', 'Introduction'], ['quickstart', 'Quickstart']]],
  ['Commands', [['ask', 'ask'], ['review', 'review'], ['models', 'models'], ['options', 'Options & env']]],
  ['Concepts', [['trial', 'How a trial runs'], ['tally', 'Verdicts and hung juries'], ['otari', 'What Otari does']]],
  ['Reference', [['ci', 'CI gate'], ['json', 'JSON output'], ['exit', 'Exit codes']]],
]
const IDS = NAV.flatMap(([, items]) => items.map(([id]) => id))

const Code = ({ children, file }: { children: string; file?: string }) => (
  <div className="d-code">
    {file && <span className="d-code-file">{file}</span>}
    <pre>{children}</pre>
  </div>
)
const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={id} className="d-sec">
    <h2>
      <a href={`#${id}`}>{title}</a>
    </h2>
    {children}
  </section>
)
const Note = ({ children }: { children: ReactNode }) => <div className="d-note">{children}</div>

export default function Docs() {
  const [active, setActive] = useState(IDS[0])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.title = 'Docs · Wildjury'
    // Scrollspy: the section nearest the top of the viewport is the current one.
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: '-80px 0px -65% 0px' },
    )
    IDS.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView()
    return () => io.disconnect()
  }, [])

  const idx = IDS.indexOf(active)

  return (
    <div className="docs">
      <header className="d-top">
        <a href="/" className="d-brand">
          <img src="/logo/wildjury-lockup.svg" alt="wildjury" height={24} />
          <span>docs</span>
        </a>
        <div className="d-top-end">
          <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
          <a className="btn btn-lime btn-sm" href="#quickstart">Quickstart</a>
          <button className="d-burger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className="d-shell">
        <aside className={`d-side ${open ? 'open' : ''}`}>
          {NAV.map(([group, items]) => (
            <nav key={group}>
              <b>{group}</b>
              {items.map(([id, label]) => (
                <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} onClick={() => setOpen(false)}>
                  {label}
                </a>
              ))}
            </nav>
          ))}
        </aside>

        <main className="d-main">
          <Section id="intro" title="Introduction">
            <p className="d-lede">
              Wildjury asks several models from different labs the same thing, each in private, and gives you the verdict with
              the dissent left in. It is a Node CLI with no dependencies; every model call goes through{' '}
              <a href="https://otari.ai" target="_blank" rel="noreferrer">Otari</a>, so one key reaches every lab.
            </p>
            <div className="d-cards">
              <a href="#ask"><b>ask</b><span>Any question, with files as context.</span></a>
              <a href="#review"><b>review</b><span>Your diff, reviewed by the jury.</span></a>
              <a href="#ci"><b>CI gate</b><span>Block merges the jury won’t approve.</span></a>
            </div>
          </Section>

          <Section id="quickstart" title="Quickstart">
            <p>Needs Node 21 or newer and an Otari API key (otari.ai → API keys).</p>
            <ol className="d-steps">
              <li>
                <span>Set your key</span>
                <Command cmd="export OTARI_API_KEY=otk_..." />
              </li>
              <li>
                <span>Ask the jury</span>
                <Command cmd={'npx github:enliven17/wildjury ask "Is this safe?" -f db.sql'} />
              </li>
              <li>
                <span>Review a branch</span>
                <Command cmd="npx github:enliven17/wildjury review --base main" />
              </li>
            </ol>
          </Section>

          <Section id="ask" title="ask">
            <p>Puts a question to the jury. Attach files with -f; add --web to let jurors search.</p>
            <Code>{`wildjury ask "Should our job queue use Postgres advisory locks?"
wildjury ask "Is this migration safe to run online?" -f migrations/042.sql
wildjury ask "What changed in the Node 24 fetch defaults?" --web
echo "question" | wildjury ask -`}</Code>
          </Section>

          <Section id="review" title="review">
            <p>Reviews a diff for real defects: bugs, security, data loss, races. Style is ignored.</p>
            <Code>{`wildjury review                # staged changes, else working tree vs HEAD
wildjury review --base main    # main...HEAD
git diff | wildjury review -   # anything on stdin`}</Code>
            <Note>Input over 80,000 characters is cut, and the jurors are told so.</Note>
          </Section>

          <Section id="models" title="models">
            <p>Lists the chat models your key can seat, grouped by lab, and marks the default jury.</p>
            <Code>{`wildjury models
wildjury models -n 7    # preview a 7-seat jury`}</Code>
          </Section>

          <Section id="options" title="Options & env">
            <table className="d-table">
              <tbody>
                {[
                  ['-m, --models a,b,c', 'Exact jurors, by catalog id or provider:model'],
                  ['-n, --jurors 5', 'Size of the default jury'],
                  ['-j, --judge model', 'Foreperson. Default: first juror to answer'],
                  ['-f, --file path', 'Context for ask, repeatable'],
                  ['--base ref', 'Review ref...HEAD'],
                  ['--web', 'Otari web search for jurors (ask)'],
                  ['--json', 'Print the whole trial as JSON'],
                  ['OTARI_API_KEY', 'Required'],
                  ['OTARI_BASE_URL', 'A self-hosted gateway'],
                  ['WILDJURY_MODELS', 'A fixed jury, comma separated'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td><code>{k}</code></td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="trial" title="How a trial runs">
            <TrialFlow />
            <ol className="d-list">
              <li><b>Empanel.</b> Read the Otari catalog; seat one mid-priced chat model per lab.</li>
              <li><b>Ballots.</b> Jurors answer in parallel, blind to each other, as JSON.</li>
              <li><b>Foreperson.</b> One model groups ballots that agree, or merges duplicate findings. It does not vote.</li>
              <li><b>Tally.</b> Plain code counts. A juror that errors or returns an unreadable ballot is recused.</li>
            </ol>
            <ReviewMerge />
            <p className="d-cap">In review, duplicate findings merge and keep a count of the jurors who raised them.</p>
          </Section>

          <Section id="tally" title="Verdicts and hung juries">
            <Tally />
            <p>The largest group wins only with a strict majority of jurors who voted. Otherwise the result is a hung jury and every position is shown. Review approves only when more jurors approve than request changes.</p>
          </Section>

          <Section id="otari" title="What Otari does">
            <table className="d-table">
              <tbody>
                {[
                  ['Catalog', 'GET /api/v1/models is the jury pool'],
                  ['Routing', 'Catalog ids let Otari pick the provider and fail over'],
                  ['Traces', 'Otari-Conversation-Id per juror: <trial>/juror-3'],
                  ['Web search', 'otari_web_search tool; sources from otari_tool_calls'],
                  ['Budgets', 'Refusals shown with Retry-After'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td><b>{k}</b></td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id="ci" title="CI gate">
            <Code file=".github/workflows/jury.yml">{`on: pull_request
jobs:
  jury:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx github:enliven17/wildjury review --base origin/main
        env:
          OTARI_API_KEY: \${{ secrets.OTARI_API_KEY }}`}</Code>
          </Section>

          <Section id="json" title="JSON output">
            <p>--json prints the trial instead of the terminal view.</p>
            <Code>{`{
  "trial": "wj-mw9pbv5q-770d",
  "kind": "review",
  "verdict": "request_changes",      // approve | request_changes | hung
  "approve": 1, "changes": 4,
  "findings": [{ "title": "...", "file": "src/queue.ts", "line": 42,
                 "severity": "high", "jurors": ["J1", "J3", "J4"] }],
  "jurors": [{ "id": "J1", "model": "openai/...", "ms": 3100,
               "ballot": { ... } }, { "id": "J5", "recused": "timed out" }]
}`}</Code>
            <p>ask returns <code>positions</code>, <code>agreement</code> (0–1) and <code>hung</code> in place of verdict and findings.</p>
          </Section>

          <Section id="exit" title="Exit codes">
            <table className="d-table">
              <tbody>
                {[
                  ['0', 'Done; for review, the jury approved'],
                  ['1', 'review: changes requested or hung'],
                  ['3', 'Error: no key, bad input, gateway refusal'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td><code>{k}</code></td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <nav className="d-pager">
            {idx > 0 ? <a href={`#${IDS[idx - 1]}`}>← Previous</a> : <span />}
            {idx < IDS.length - 1 && <a href={`#${IDS[idx + 1]}`}>Next →</a>}
          </nav>
        </main>

        <aside className="d-toc">
          <b>On this page</b>
          {IDS.map((id) => (
            <a key={id} href={`#${id}`} className={active === id ? 'on' : ''}>
              {NAV.flatMap(([, i]) => i).find(([k]) => k === id)![1]}
            </a>
          ))}
        </aside>
      </div>
    </div>
  )
}
