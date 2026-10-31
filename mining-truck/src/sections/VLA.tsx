// The VLA section: a clickable map of a Vision-Language-Action model, and how each part
// shows up (or will show up) in Haul Control. Click a block to see what it does, what goes
// in and out, and what happens underneath.
import { useState, type KeyboardEvent } from 'react'

type Status = 'live' | 'planned'

type Part = {
  id: string
  name: string
  kind: 'io' | 'ai'
  status: Status
  // position and size in the diagram (SVG units)
  x: number
  y: number
  w: number
  h: number
  lines: string[]
  role: string
  input: string
  output: string
  haul: string
  under: string
}

const PARTS: Part[] = [
  {
    id: 'camera',
    name: 'Camera image',
    kind: 'io',
    status: 'live',
    x: 16, y: 98, w: 118, h: 48,
    lines: ['Camera', 'image'],
    role: "What the robot sees. VLA models usually take one RGB frame from a camera mounted on the robot.",
    input: "The scene in front of the robot",
    output: "An RGB image, for example 224 × 224 pixels × 3 color channels",
    haul: "A camera above the truck's cab takes a 640 × 640 photo each time the truck arrives at a site. Working today; the photo shows on the Computer Vision tab.",
    under: "The scene is rendered offscreen from the truck's point of view and read back as pixels. A model would see it as an array of shape 3 × H × W, each value scaled to 0–1 (pixel / 255), like the CNN lecture's input example.",
  },
  {
    id: 'command',
    name: 'Command',
    kind: 'io',
    status: 'live',
    x: 16, y: 218, w: 118, h: 48,
    lines: ['Command'],
    role: "What the person wants, typed in plain English.",
    input: "The user's text",
    output: 'A sentence, for example "move 3 rocks from the rock pile to the crusher"',
    haul: "The text box on the Site tab. Working today.",
    under: "Text is split into tokens, and each token becomes an ID number from the model's vocabulary. The LLM tab shows this step.",
  },
  {
    id: 'vision',
    name: 'Vision encoder',
    kind: 'ai',
    status: 'planned',
    x: 196, y: 98, w: 126, h: 48,
    lines: ['Computer', 'vision'],
    role: "Turns the image into a list of feature vectors the language model can read.",
    input: "The camera image",
    output: "Image tokens: one feature vector per image patch",
    haul: "The Computer Vision tab already shows the truck's photo and a rock count, but the count is scripted from the simulation for now. A trained model will replace it.",
    under: "A vision Transformer cuts a 224 × 224 image into 16 × 16 patches, giving 14 × 14 = 196 patch tokens. A CNN does the same job with stacked convolution and pooling layers that build up feature maps.",
  },
  {
    id: 'llm',
    name: 'Language model (LLM)',
    kind: 'ai',
    status: 'live',
    x: 196, y: 218, w: 126, h: 48,
    lines: ['LLM'],
    role: "Reads the command and works out what the person is asking for.",
    input: "Text tokens",
    output: "A vector for every token, carrying its meaning in context",
    haul: "A local Ollama model reads each command and returns a plan. Working today; the LLM tab traces it step by step.",
    under: "Each token ID is looked up as a vector (an embedding). Transformer layers use attention so every token can look at every other token in the sentence.",
  },
  {
    id: 'fusion',
    name: 'Multimodal fusion',
    kind: 'ai',
    status: 'planned',
    x: 342, y: 158, w: 112, h: 48,
    lines: ['Multimodal', 'fusion'],
    role: "Combines what the robot sees with what it was told, so words can be tied to things in the image.",
    input: "Image tokens and text tokens",
    output: "One shared representation of the scene and the request",
    haul: 'Would let a command like "go to the red site" be matched to what the camera sees. Planned.',
    under: 'Image tokens and text tokens are joined into one sequence. Attention lets a word like "crusher" attend to the image patches that show the crusher.',
  },
  {
    id: 'decoder',
    name: 'Action decoder',
    kind: 'ai',
    status: 'live',
    x: 478, y: 158, w: 118, h: 48,
    lines: ['Action', 'decoder'],
    role: "Turns the model's understanding into concrete robot commands.",
    input: "The fused representation",
    output: "Actions the robot can carry out",
    haul: "The LLM's plan becomes moveTo, pickUp, dropOff or moveRocks, then a safety check and the trip planner. Working today.",
    under: "Robot VLAs such as RT-2 output actions as tokens: each motion value is split into 256 bins, and the model predicts a bin like a word. Haul Control uses named actions instead, checked against the real site before the truck moves.",
  },
  {
    id: 'truck',
    name: 'Haul truck',
    kind: 'io',
    status: 'live',
    x: 642, y: 158, w: 102, h: 48,
    lines: ['Haul truck'],
    role: "The robot that carries out the actions.",
    input: "Robot actions",
    output: "Movement in the world, and a new state",
    haul: "The 3D haul truck on the Site tab drives, loads and dumps rocks. Working today.",
    under: "Each action is run in order; driving waits until the truck arrives before the next step starts.",
  },
  {
    id: 'state',
    name: 'Robot state',
    kind: 'io',
    status: 'live',
    x: 470, y: 316, w: 134, h: 40,
    lines: ['Robot state'],
    role: "What the robot knows about itself after acting. It feeds into the next decision, closing the loop.",
    input: "The truck after its last action",
    output: "Position and load, sent with the next command",
    haul: "Rock counts at each site and the truck load (for example 3 / 6) are sent with every command. Working today.",
    under: "Sent as JSON with each request, for example rocksAt: { rockPile: 10, crusher: 0 } and onTruck: 0.",
  },
]

const STATUS_LABEL: Record<Status, string> = { live: 'Working in Haul Control', planned: 'Planned' }

const CSS = `
.vla { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: minmax(260px, 0.75fr) minmax(0, 1.6fr); grid-auto-rows: max-content; align-items: start; gap: 32px; padding: 4px 4px 24px; }
@media (max-width: 1000px) { .vla { grid-template-columns: minmax(0, 1fr); } }
.vla-left { display: flex; flex-direction: column; gap: 16px; min-width: 0; position: sticky; top: 0; }
.vla-eyebrow { margin: 0; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #8a5a00; }
.vla-title { margin: -8px 0 0; font-size: 2rem; line-height: 1.15; }
.vla-lead { margin: 0; font-size: 1.05rem; line-height: 1.55; }
.vla-card { background: white; border: 1px solid #c9c2b4; border-radius: 6px; padding: 12px 14px; }
.vla-card small { display: block; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: #5f5a52; margin-bottom: 8px; }
.vla-status { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.vla-status td { padding: 5px 0; border-bottom: 1px solid #ebe5da; }
.vla-status tr:last-child td { border-bottom: none; }
.vla-status td:last-child { text-align: right; }
.vla-pill { padding: 2px 8px; border-radius: 10px; font-size: 0.78rem; font-weight: 600; white-space: nowrap; }
.vla-pill.live { background: #e3f0e3; color: #1e5c24; }
.vla-pill.planned { background: #fbf1d9; color: #6b4500; }
.vla-links { margin: 0; padding-left: 18px; font-size: 0.9rem; line-height: 1.7; }
.vla-links a { color: #8a5a00; }
.vla-panel { background: white; border: 1px solid #c9c2b4; border-radius: 8px; min-width: 0; }
.vla-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 18px; border-bottom: 1px solid #c9c2b4; }
.vla-panel-head h3 { margin: 0; font-size: 1.05rem; }
.vla-hint { font-size: 0.85rem; color: #5f5a52; }
.vla-diagram { padding: 12px 12px 4px; }
.vla-diagram svg { width: 100%; height: auto; display: block; }
.vla-node { cursor: pointer; }
.vla-node:focus { outline: none; }
.vla-node:focus-visible rect.vla-box { stroke: #2b2a28; stroke-width: 3; }
.vla-detail { border-top: 1px solid #c9c2b4; padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 12px; }
.vla-detail-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.vla-detail-head h4 { margin: 0; font-size: 1.2rem; }
.vla-role { margin: 0; font-size: 1rem; line-height: 1.5; }
.vla-io { display: grid; grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr); gap: 8px; align-items: stretch; }
.vla-io > div { background: #f3efe8; border: 1px solid #c9c2b4; border-radius: 6px; padding: 8px 10px; font-size: 0.9rem; line-height: 1.45; }
.vla-io > span { display: flex; align-items: center; justify-content: center; color: #8a5a00; font-weight: 700; }
.vla-io b, .vla-block b { display: block; font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: #5f5a52; margin-bottom: 2px; }
.vla-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
@media (max-width: 1200px) { .vla-two { grid-template-columns: minmax(0, 1fr); } }
.vla-block { font-size: 0.92rem; line-height: 1.5; }
.vla-block p { margin: 0; }
.vla-under { background: #2b2a28; color: #f3efe8; border-radius: 6px; padding: 10px 12px; }
.vla-under b { color: #c9c2b4; }
`

function onKey(e: KeyboardEvent, fn: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

export default function VLA() {
  const [selected, setSelected] = useState('llm')
  const part = PARTS.find((p) => p.id === selected) ?? PARTS[0]

  const ink = '#2b2a28'
  const brown = '#8a5a2b'
  const gold = '#e0a526'
  const arrow = '#6b655c'

  return (
    <div className="vla">
      <style>{CSS}</style>

      {/* LEFT: what a VLA is, and where Haul Control stands */}
      <div className="vla-left">
        <p className="vla-eyebrow">VLA · Vision-Language-Action model</p>
        <h2 className="vla-title">How a robot sees, reads and acts</h2>
        <p className="vla-lead">
          A VLA model takes a camera image and a command, and outputs actions for a robot. Inside, a vision model
          and a language model (together, a VLM) are fused, then an action decoder turns the result into motion.
          Click any block to look inside it.
        </p>

        <div className="vla-card">
          <small>Haul Control today</small>
          <table className="vla-status">
            <tbody>
              {PARTS.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>
                    <span className={`vla-pill ${p.status}`}>{p.status === 'live' ? 'Working' : 'Planned'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="vla-card">
          <small>Further reading</small>
          <ul className="vla-links">
            <li>
              <a href="https://arxiv.org/abs/2307.15818" target="_blank" rel="noreferrer">
                RT-2 (Brohan et al., 2023)
              </a>
            </li>
            <li>
              <a href="https://arxiv.org/abs/2406.09246" target="_blank" rel="noreferrer">
                OpenVLA (Kim et al., 2024)
              </a>
            </li>
            <li>
              <a href="https://arxiv.org/abs/2010.11929" target="_blank" rel="noreferrer">
                Vision Transformer (Dosovitskiy et al., 2021)
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* RIGHT: the diagram and the selected part */}
      <section className="vla-panel" aria-label="VLA model diagram">
        <div className="vla-panel-head">
          <h3>Inside a VLA model</h3>
          <span className="vla-hint">Click a block</span>
        </div>

        <div className="vla-diagram">
          <svg viewBox="0 0 760 372" role="group" aria-label="VLA model: camera image and command go through computer vision and the LLM, are fused, decoded into actions for the haul truck, and the robot state loops back">
            <defs>
              <marker id="vla-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill={arrow} />
              </marker>
            </defs>

            {/* VLA and VLM containers */}
            <rect x="166" y="44" width="452" height="252" rx="12" fill="#fbf4e2" stroke={gold} strokeWidth="4" />
            <text x="606" y="70" textAnchor="end" fontSize="20" fontWeight="700" fill="#8a5a00">VLA</text>
            <rect x="182" y="80" width="284" height="200" rx="10" fill="#f3ece2" stroke={brown} strokeWidth="2.5" strokeDasharray="6 4" />
            <text x="456" y="102" textAnchor="end" fontSize="16" fontWeight="700" fill={brown}>VLM</text>

            {/* arrows */}
            <g fill="none" stroke={arrow} strokeWidth="1.8">
              <path d="M134 122 H192" markerEnd="url(#vla-arrow)" />
              <path d="M134 242 H192" markerEnd="url(#vla-arrow)" />
              <path d="M322 122 H332 V172 H338" markerEnd="url(#vla-arrow)" />
              <path d="M322 242 H332 V192 H338" markerEnd="url(#vla-arrow)" />
              <path d="M454 182 H474" markerEnd="url(#vla-arrow)" />
              <path d="M596 182 H638" markerEnd="url(#vla-arrow)" />
              <path d="M693 206 V336 H608" markerEnd="url(#vla-arrow)" />
              <path d="M470 336 H392 V300" markerEnd="url(#vla-arrow)" />
            </g>
            <text x="700" y="270" fontSize="12" fill="#5f5a52">new state</text>

            {/* blocks */}
            {PARTS.map((p) => {
              const on = p.id === selected
              const fill = p.kind === 'ai' ? (on ? '#f6e3c2' : '#ffffff') : on ? '#f6e3c2' : '#ffffff'
              const stroke = on ? gold : p.kind === 'ai' ? brown : ink
              const cx = p.x + p.w / 2
              const cy = p.y + p.h / 2
              return (
                <g
                  key={p.id}
                  className="vla-node"
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  aria-label={`${p.name}, ${STATUS_LABEL[p.status]}`}
                  onClick={() => setSelected(p.id)}
                  onKeyDown={(e) => onKey(e, () => setSelected(p.id))}
                >
                  <rect
                    className="vla-box"
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    rx="8"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={on ? 3 : 1.6}
                    strokeDasharray={p.status === 'planned' ? '5 3' : undefined}
                  />
                  {p.lines.map((line, i) => (
                    <text
                      key={line}
                      x={cx}
                      y={cy + 5 + (i - (p.lines.length - 1) / 2) * 17}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="600"
                      fill={ink}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )
            })}

            {/* legend */}
            <g fontSize="12" fill="#5f5a52">
              <rect x="16" y="330" width="22" height="14" rx="3" fill="white" stroke={ink} strokeWidth="1.6" />
              <text x="44" y="341">Working</text>
              <rect x="110" y="330" width="22" height="14" rx="3" fill="white" stroke={ink} strokeWidth="1.6" strokeDasharray="5 3" />
              <text x="138" y="341">Planned</text>
            </g>
          </svg>
        </div>

        <div className="vla-detail" aria-live="polite">
          <div className="vla-detail-head">
            <h4>{part.name}</h4>
            <span className={`vla-pill ${part.status}`}>{STATUS_LABEL[part.status]}</span>
          </div>
          <p className="vla-role">{part.role}</p>

          <div className="vla-io">
            <div>
              <b>Goes in</b>
              {part.input}
            </div>
            <span aria-hidden="true">→</span>
            <div>
              <b>Comes out</b>
              {part.output}
            </div>
          </div>

          <div className="vla-two">
            <div className="vla-block">
              <b>In Haul Control</b>
              <p>{part.haul}</p>
            </div>
            <div className="vla-block vla-under">
              <b>Under the hood</b>
              <p>{part.under}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}