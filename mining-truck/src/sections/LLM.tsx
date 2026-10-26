// The LLM section: shows, step by step, how a typed command becomes truck actions.
// It uses the same pipeline as the Site tab (interpret.ts and trips.ts), so what you
// see here is exactly what happens when you press Send there.
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { interpret, type Command, type Interpretation, type WorldState } from '../interpret'
import { LANDMARKS } from '../landmarks'
import { CAPACITY, makeRocks } from '../rocks'
import { planTrips } from '../trips'

// ---------- Example runs (used when the AI server isn't running, e.g. for demos) ----------

type RawCommand = { action?: string; target?: string; from?: string; to?: string; count?: number }
type RawResponse = { commands?: RawCommand[]; reply?: string }

const EXAMPLES: { text: string; response: RawResponse }[] = [
  {
    text: 'move 3 rocks from the rock pile to the crusher',
    response: {
      reply: 'Moving 3 rocks from the rock pile to the crusher.',
      commands: [
        { action: 'moveTo', target: 'rockPile' },
        { action: 'pickUp', count: 3 },
        { action: 'moveTo', target: 'crusher' },
        { action: 'dropOff' },
      ],
    },
  },
  {
    text: 'take all the rocks to camp',
    response: {
      reply: 'Taking all the rocks from the rock pile to camp.',
      commands: [{ action: 'moveRocks', from: 'rockPile', to: 'camp', count: 6 }],
    },
  },
  {
    text: 'drive to the volcano, then the quarry',
    response: {
      reply: 'Heading to the quarry.',
      commands: [
        { action: 'moveTo', target: 'volcano' },
        { action: 'moveTo', target: 'quarry' },
      ],
    },
  },
]

// ---------- Helpers ----------

function labelOf(id: string) {
  return LANDMARKS.find((l) => l.id === id)?.label ?? id
}

function describe(cmd: Command): string {
  switch (cmd.action) {
    case 'moveTo':
      return `Drive to ${labelOf(cmd.target)}`
    case 'pickUp':
      return cmd.count ? `Pick up ${cmd.count}` : 'Pick up a full load'
    case 'dropOff':
      return 'Drop off'
    case 'moveRocks':
      return `Move ${cmd.count ?? 'all'} rocks from ${labelOf(cmd.from)} to ${labelOf(cmd.to)}`
  }
}

function describeRaw(c: RawCommand): string {
  const parts = [c.action ?? '(no action)']
  if (c.target !== undefined) parts.push(`target: ${c.target}`)
  if (c.from !== undefined) parts.push(`from: ${c.from}`)
  if (c.to !== undefined) parts.push(`to: ${c.to}`)
  if (c.count !== undefined) parts.push(`count: ${c.count}`)
  return parts.join(', ')
}

// Pretty-prints JSON, but keeps small flat objects on one line so it stays short
function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(
    /\{\n([^{}[\]]*?)\n\s*\}/g,
    (_, inner: string) => `{ ${inner.trim().replace(/\n\s*/g, ' ')} }`
  )
}

// A rough picture of tokenization. Real models split text into sub-word pieces
// from their own vocabulary, so their exact tokens differ.
function roughTokens(text: string): string[] {
  return text.match(/[A-Za-z]+|\d+|[^\sA-Za-z\d]/g) ?? []
}

// Explains what the safety check in interpret.ts does to one raw command.
// (The real decision is made by interpret.ts; this only labels the result.)
const KNOWN_ACTIONS = ['moveTo', 'pickUp', 'dropOff', 'moveRocks']
const KNOWN_PLACES = new Set(LANDMARKS.map((l) => l.id))

function checkRaw(c: RawCommand, text: string): { status: 'kept' | 'changed' | 'dropped'; note: string } {
  if (!c.action || !KNOWN_ACTIONS.includes(c.action)) {
    return { status: 'dropped', note: `"${c.action ?? 'nothing'}" is not an action the truck knows` }
  }
  if (c.action === 'moveTo' && !(c.target && KNOWN_PLACES.has(c.target))) {
    return { status: 'dropped', note: `"${c.target ?? 'nowhere'}" is not a place on this site` }
  }
  if (c.action === 'moveRocks') {
    const bad = [c.from, c.to].find((p) => !(p && KNOWN_PLACES.has(p)))
    if (bad !== undefined || !c.from || !c.to) {
      return { status: 'dropped', note: `"${bad ?? 'missing'}" is not a place on this site` }
    }
  }
  if (typeof c.count === 'number') {
    const saidAll = /\b(all|every|everything|rest|remaining)\b/i.test(text)
    const saidAmount =
      /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|couple|few|several|some|half)\b/i.test(
        text
      )
    if (!saidAmount || saidAll) {
      return { status: 'changed', note: `Count ${c.count} ignored: you didn't ask for a number of rocks` }
    }
  }
  return { status: 'kept', note: 'Valid action and places' }
}

// Runs the real interpret() and records the exact request and reply it exchanged.
// With `canned` set, the AI server is skipped and that reply is used instead.
async function traceInterpret(
  text: string,
  state: WorldState,
  canned?: RawResponse
): Promise<{ result: Interpretation; request: unknown; raw: unknown }> {
  const realFetch = window.fetch
  let request: unknown = null
  let raw: unknown = null
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      request = typeof init?.body === 'string' ? JSON.parse(init.body) : null
    } catch {
      request = null
    }
    const res = canned
      ? new Response(JSON.stringify(canned), { headers: { 'Content-Type': 'application/json' } })
      : await realFetch(input, init)
    try {
      raw = await res.clone().json()
    } catch {
      raw = null
    }
    return res
  }) as typeof fetch
  try {
    const result = await interpret(text, CAPACITY, state)
    return { result, request, raw }
  } finally {
    window.fetch = realFetch
  }
}

// ---------- Styles (kept in this file so no other file needs to change) ----------
// Colors come from the site theme in index.css (--header, --accent, --bg, --text).

const CSS = `
.llm { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.5fr); grid-auto-rows: max-content; align-items: start; gap: 32px; padding: 4px 4px 24px; }
@media (max-width: 1000px) { .llm { grid-template-columns: minmax(0, 1fr); } }
.llm-left { display: flex; flex-direction: column; gap: 18px; min-width: 0; position: sticky; top: 0; }
.llm-eyebrow { margin: 0; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #8a5a00; }
.llm-title { margin: -8px 0 0; font-size: 2rem; line-height: 1.15; }
.llm-lead { margin: 0; font-size: 1.05rem; line-height: 1.55; max-width: 34em; }
.llm-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.llm-steps li { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 12px; }
.llm-num { width: 28px; height: 28px; border-radius: 14px; background: var(--header); color: white; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.llm-steps b { display: block; margin-top: 3px; }
.llm-why { color: #5f5a52; font-size: 0.93rem; line-height: 1.45; }
.llm-model { margin-top: 8px; background: white; border: 1px solid #c9c2b4; border-radius: 6px; padding: 12px 14px; }
.llm-model small { display: block; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: #5f5a52; margin-bottom: 4px; }
.llm-mono { font-family: ui-monospace, Consolas, monospace; }
.llm-panel { background: white; border: 1px solid #c9c2b4; border-radius: 8px; display: flex; flex-direction: column; min-width: 0; }
.llm-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 18px; border-bottom: 1px solid #c9c2b4; }
.llm-panel-head h3 { margin: 0; font-size: 1.05rem; }
.llm-badge { font-size: 0.8rem; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: #fbf1d9; color: #6b4500; }
.llm-badge.live { background: #e3f0e3; color: #1e5c24; }
.llm-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 18px; }
.llm-label { margin: 0 0 8px; font-size: 0.88rem; font-weight: 600; color: #5f5a52; }
.llm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.llm-token { padding: 3px 9px; border-radius: 4px; font-family: ui-monospace, Consolas, monospace; font-size: 0.85rem; white-space: pre; background: #ebe5da; border: 1px solid #c9c2b4; }
.llm-token.alt { background: #fbf1d9; border-color: var(--accent); }
.llm-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
@media (max-width: 1300px) { .llm-two { grid-template-columns: minmax(0, 1fr); } }
.llm-code { margin: 0; background: var(--header); color: #f3efe8; border-radius: 6px; padding: 10px 12px; font-size: 0.82rem; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
.llm-facts { margin: 0; padding: 0; list-style: none; font-size: 0.92rem; line-height: 1.7; }
.llm-facts b { font-weight: 600; }
.llm details { margin-top: 6px; font-size: 0.85rem; }
.llm summary { cursor: pointer; color: #5f5a52; }
.llm-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.llm-table th { text-align: left; padding: 5px 8px; border-bottom: 1px solid #c9c2b4; color: #5f5a52; font-weight: 600; }
.llm-table td { padding: 6px 8px; border-bottom: 1px solid #ebe5da; vertical-align: top; }
.llm-pill { padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
.llm-pill.kept { background: #e3f0e3; color: #1e5c24; }
.llm-pill.changed { background: #fbf1d9; color: #6b4500; }
.llm-pill.dropped { background: #fbe9e7; color: #8a2219; }
.llm-note { margin: 8px 0 0; color: #5f5a52; font-size: 0.86rem; line-height: 1.45; }
.llm-actions { margin: 0; padding-left: 22px; line-height: 1.75; }
.llm-trip { color: #5f5a52; font-size: 0.84rem; }
.llm-ok { margin: 8px 0 0; color: #1e5c24; font-weight: 600; font-size: 0.9rem; }
.llm-tries { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
.llm-example { background: white; border: 1px solid #c9c2b4; border-radius: 14px; padding: 5px 12px; font-size: 0.85rem; cursor: pointer; color: var(--text); }
.llm-example:hover { border-color: var(--accent); }
.llm-example:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.llm-toggle { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 0.86rem; }
.llm-msg { margin: 0; padding: 8px 12px; border-radius: 4px; font-size: 0.9rem; }
.llm-msg.warn { background: #fbf1d9; border: 1px solid var(--accent); color: #5c3d00; }
.llm-msg.err { background: #fbe9e7; border: 1px solid #c0392b; color: #7a1f17; }
.llm-empty { color: #5f5a52; margin: 0; }
`

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p className="llm-label">{label}</p>
      {children}
    </div>
  )
}

const STEPS = [
  ['Split text into tokens', 'Words and pieces of words become numbers the model can read.'],
  ['Give the model the facts', "It can't see the site, so we send the places, rock counts and truck capacity."],
  ['The model writes a plan', 'It predicts its answer one token at a time, in a fixed command format.'],
  ['Check every command', 'Invented places, unknown actions and guessed numbers are removed.'],
  ['Plan the truck actions', 'The app turns the plan into round trips using the real rock counts.'],
]

// ---------- The section ----------

type Trace = {
  text: string
  result: Interpretation
  request: unknown
  raw: RawResponse | null
  example: boolean // true when a saved example reply was used instead of the AI server
}

export default function LLM() {
  const [text, setText] = useState(EXAMPLES[0].text)
  const [offline, setOffline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [trace, setTrace] = useState<Trace | null>(null)

  // This page uses the site's starting layout: 10 rocks at the rock pile, truck empty.
  const rocks = useMemo(() => makeRocks('rockPile', 10), [])
  const state: WorldState = useMemo(() => {
    const rocksAt: Record<string, number> = {}
    for (const l of LANDMARKS) rocksAt[l.id] = rocks.filter((r) => r.place === l.id).length
    return { rocksAt, onTruck: 0 }
  }, [rocks])

  async function run(input: string, useExample: boolean) {
    const t = input.trim()
    if (!t || busy) return
    const example = EXAMPLES.find((e) => e.text.toLowerCase() === t.toLowerCase())
    setBusy(true)
    setError('')
    try {
      if (useExample) {
        if (!example) {
          setError('Example mode only works with the example commands below. Pick one, or turn off example mode.')
          return
        }
        const r = await traceInterpret(t, state, example.response)
        setTrace({ text: t, ...r, raw: r.raw as RawResponse | null, example: true })
      } else {
        try {
          const r = await traceInterpret(t, state)
          setTrace({ text: t, ...r, raw: r.raw as RawResponse | null, example: false })
        } catch {
          if (example) {
            // Server not reachable: show the saved example so the page still works
            const r = await traceInterpret(t, state, example.response)
            setTrace({ text: t, ...r, raw: r.raw as RawResponse | null, example: true })
            setError("Couldn't reach the AI server, so this shows a saved example reply.")
          } else {
            setError(
              "Couldn't reach the AI server. Check that it's running and your API key is set, or turn on example mode."
            )
          }
        }
      }
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    run(text, offline)
  }

  // The final plan after the trip planner expands any "move rocks" step
  const expanded: { cmd: Command; trip?: number }[] = []
  if (trace) {
    for (const cmd of trace.result.commands) {
      if (cmd.action === 'moveRocks') {
        planTrips(cmd.from, cmd.to, cmd.count, rocks).forEach((p, i) =>
          expanded.push({ cmd: p, trip: Math.floor(i / 4) + 1 })
        )
      } else {
        expanded.push({ cmd })
      }
    }
  }
  const trips = expanded.reduce((m, e) => Math.max(m, e.trip ?? 0), 0)
  const rawCommands = trace?.raw?.commands ?? []
  const checks = trace ? rawCommands.map((c) => checkRaw(c, trace.text)) : []
  const allKept = checks.length > 0 && checks.every((c) => c.status === 'kept')
  const folded = trace
    ? trace.result.commands.some((c) => c.action === 'moveRocks') &&
      !rawCommands.some((c) => c.action === 'moveRocks')
    : false
  const tokens = trace ? roughTokens(trace.text) : []
  const places = LANDMARKS.map((l) => l.label).join(', ')

  return (
    <div className="llm">
      <style>{CSS}</style>

      {/* LEFT: what this page explains */}
      <div className="llm-left">
        <p className="llm-eyebrow">LLM · Large language model</p>
        <h2 className="llm-title">How it reads commands</h2>
        <p className="llm-lead">
          A language model turns a plain-English command into a list of actions the haul truck can carry out. Type a
          command on the right to watch each step.
        </p>
        <ol className="llm-steps">
          {STEPS.map(([title, why], i) => (
            <li key={title}>
              <span className="llm-num">{i + 1}</span>
              <div>
                <b>{title}</b>
                <span className="llm-why">{why}</span>
              </div>
            </li>
          ))}
        </ol>
        <div className="llm-model">
          <small>Model running in this tab</small>
          <span className="llm-mono">
            {trace?.example ? 'Saved example reply (no server)' : 'Your AI server · /api/command'}
          </span>
        </div>
      </div>

      {/* RIGHT: the live trace */}
      <section className="llm-panel" aria-label="Command to actions">
        <div className="llm-panel-head">
          <h3>Command to truck actions</h3>
          <span className={trace && !trace.example ? 'llm-badge live' : 'llm-badge'}>
            {!trace ? 'Ready' : trace.example ? 'Example reply' : 'Live AI'}
          </span>
        </div>

        <div className="llm-body">
          <Block label="Ask the truck in plain English">
            <form className="prompt-form" onSubmit={onSubmit}>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Command to trace"
                placeholder='e.g. "move 3 rocks from the rock pile to the crusher"'
              />
              <button type="submit" className="go" disabled={busy}>
                {busy ? 'Thinking…' : 'Send'}
              </button>
            </form>
              <div className="llm-tries">
          <span style={{ fontSize: '0.85rem', color: '#5f5a52' }}>Try:</span>
          {EXAMPLES.map((e) => (
            <button
              key={e.text}
              type="button"
              className="llm-example"
              onClick={() => {
                setText(e.text)
                run(e.text, offline)
              }}
            >
              {e.text}
            </button>
          ))}
          <label className="llm-toggle">
            <input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} />
            Example mode (no AI server)
          </label>
        </div>
          </Block>

          {error && <p className={trace?.example ? 'llm-msg warn' : 'llm-msg err'}>{error}</p>}

          {!trace ? (
            <p className="llm-empty">Press Send, or pick an example below, to see each step.</p>
          ) : (
            <>
              <Block label={`Step 1 · text split into tokens (${tokens.length}, approximate)`}>
                <div className="llm-chips">
                  {tokens.map((tok, i) => (
                    <span key={i} className={i % 2 ? 'llm-token alt' : 'llm-token'}>
                      {tok}
                    </span>
                  ))}
                </div>
              </Block>

              <div className="llm-two">
                <Block label="Step 2 · facts sent with the command">
                  <ul className="llm-facts">
                    <li>
                      <b>Places:</b> {places}
                    </li>
                    <li>
                      <b>Rocks:</b>{' '}
                      {LANDMARKS.filter((l) => state.rocksAt[l.id] > 0)
                        .map((l) => `${state.rocksAt[l.id]} at ${l.label}`)
                        .join(', ') || 'none'}
                    </li>
                    <li>
                      <b>Truck holds:</b> {CAPACITY} rocks ({state.onTruck} on board)
                    </li>
                  </ul>
                  <details>
                    <summary>Show the exact request</summary>
                    <pre className="llm-code">{pretty(trace.request)}</pre>
                  </details>
                </Block>

                <Block label="Step 3 · the model's plan">
                  {trace.raw ? (
                    <pre className="llm-code">{pretty(trace.raw)}</pre>
                  ) : (
                    <p className="llm-msg err">The reply wasn't valid JSON, so no commands could be read.</p>
                  )}
                </Block>
              </div>

              <Block label="Step 4 · safety check">
                {rawCommands.length === 0 ? (
                  <p className="llm-empty">The model returned no commands.</p>
                ) : (
                  <table className="llm-table">
                    <thead>
                      <tr>
                        <th>Model's command</th>
                        <th>Result</th>
                        <th>Why</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawCommands.map((c, i) => (
                        <tr key={i}>
                          <td className="llm-mono">{describeRaw(c)}</td>
                          <td>
                            <span className={`llm-pill ${checks[i].status}`}>
                              {checks[i].status === 'kept' ? 'Kept' : checks[i].status === 'changed' ? 'Changed' : 'Dropped'}
                            </span>
                          </td>
                          <td>{checks[i].note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {allKept && !folded && <p className="llm-ok">✓ Every command is safe to run</p>}
                {folded && (
                  <p className="llm-note">
                    The model spelled out a round trip step by step, so it was combined into one "move rocks" command.
                    That lets the app plan as many trips as the real rock count needs.
                  </p>
                )}
              </Block>

              <Block label={`Step 5 · truck actions${trips > 0 ? ` (${trips} trip${trips === 1 ? '' : 's'})` : ''}`}>
                {expanded.length === 0 ? (
                  <p className="llm-empty">Nothing for the truck to do.</p>
                ) : (
                  <ol className="llm-actions">
                    {expanded.map((e, i) => (
                      <li key={i}>
                        {describe(e.cmd)}
                        {e.trip !== undefined && <span className="llm-trip"> · trip {e.trip}</span>}
                      </li>
                    ))}
                  </ol>
                )}
                <p className="llm-note">
                  <b style={{ color: 'var(--text)' }}>Reply to the user:</b> {trace.result.reply || '(none)'}
                </p>
              </Block>
            </>
          )}
        </div>

      </section>
    </div>
  )
}
