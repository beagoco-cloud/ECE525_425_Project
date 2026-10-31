import type { Command } from './interpret'

// Landmark ids: check these against landmarks.ts and change them if needed
const PILE = 'rockPile'
const DEST = 'crusher'

// A scripted scenario for the guided tutorial. If what the user types matches,
// these commands run as if the model had learned them.
export type Scenario = {
  id: number
  title: string
  prompt: string // what the tutorial tells the user to type
  match: RegExp // loose match, so small wording changes still work
  commands: Command[]
  reply: string
}

export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    title: 'Look at the pile',
    prompt: 'drive to the rock pile',
    match: /\b(go|drive)\b.*\brock pile\b/,
    commands: [{ action: 'moveTo', target: PILE }],
    reply: 'Driving to the rock pile. The truck will take a photo when it arrives.',
  },
  {
    id: 2,
    title: 'Move a few rocks',
    prompt: 'move 3 rocks from the rock pile to the crusher',
    match: /\bmove\b.*\b(3|three)\b.*\brocks?\b/,
    commands: [{ action: 'moveRocks', from: PILE, to: DEST, count: 3 }],
    reply: 'Moving 3 rocks. Watch the photo and rock count at each stop.',
  },
  {
    id: 3,
    title: 'Move all the rocks',
    prompt: 'move all the rocks from the rock pile to the crusher',
    match: /\bmove\b.*\b(all|every)\b.*\brocks?\b/,
    commands: [{ action: 'moveRocks', from: PILE, to: DEST }],
    reply: 'Moving every rock. The truck photographs the pile on each trip.',
  },
]

export function findScenario(text: string): Scenario | null {
  const t = text.toLowerCase()
  return SCENARIOS.find((s) => s.match.test(t)) ?? null
}
