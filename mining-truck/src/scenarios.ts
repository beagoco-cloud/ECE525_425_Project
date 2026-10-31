import type { Command } from './interpret'
 
// Landmark ids: check these against landmarks.ts and change them if needed
export const PILE = 'rockPile'
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
    match: /^(?!.*\bback\b).*\b(go|drive)\b.*\brock pile\b/,
    commands: [{ action: 'moveTo', target: PILE }],
    reply: 'Driving to the rock pile. The truck will take a photo when it arrives.',
  },
  {
    id: 2,
    title: 'Move a few rocks',
    prompt: 'move 3 rocks from the rock pile to the crusher',
    match: /\bmove\b.*\b(3|three)\b.*\brocks?\b/,
    commands: [{ action: 'moveRocks', from: PILE, to: DEST, count: 3 }],
    reply: 'Moving 3 rocks to the crusher. Watch the photo and rock count at each stop.',
  },
  {
    id: 3,
    title: 'Go back to the pile',
    prompt: 'go back to the rock pile',
    match: /\bback\b.*\brock pile\b/,
    commands: [{ action: 'moveTo', target: PILE }],
    reply: 'Heading back to the rock pile. The new photo should show fewer rocks.',
  },
  {
    id: 4,
    title: 'Move the rest',
    prompt: 'pick up the rest of the rocks and take them to the crusher',
    match: /\b(rest|remaining|all|every)\b.*\bcrusher\b/,
    commands: [{ action: 'moveRocks', from: PILE, to: DEST }],
    reply: 'Taking the rest of the rocks to the crusher.',
  },
]
 
export function findScenario(text: string): Scenario | null {
  const t = text.toLowerCase()
  return SCENARIOS.find((s) => s.match.test(t)) ?? null
}
 