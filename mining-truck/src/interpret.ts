import { LANDMARKS } from './landmarks'

// A command is one structured step for the truck.
export type Command =
  | { action: 'moveTo'; target: string }
  | { action: 'pickUp'; count?: number }
  | { action: 'dropOff' }
  | { action: 'moveRocks'; from: string; to: string; count?: number }

export type Interpretation = {
  commands: Command[]
  reply: string
}

type RawCommand = {
  action?: string
  target?: string
  from?: string
  to?: string
  count?: number
}
type RawResponse = { commands?: RawCommand[]; reply?: string }

// Small models often spell out a round trip by hand (go, pick up, go, drop off)
// instead of using moveRocks. Spot that pattern and turn it into one moveRocks
// command, so the app can plan as many trips as are really needed.
function simplify(cmds: Command[]): Command[] {
  const out: Command[] = []
  for (let i = 0; i < cmds.length; i++) {
    const [a, b, c, d] = cmds.slice(i, i + 4)
    if (
      a?.action === 'moveTo' &&
      b?.action === 'pickUp' &&
      c?.action === 'moveTo' &&
      d?.action === 'dropOff' &&
      a.target !== c.target
    ) {
      const trip: Command = { action: 'moveRocks', from: a.target, to: c.target, count: b.count }
      const last = out[out.length - 1]
      if (last?.action === 'moveRocks' && last.from === trip.from && last.to === trip.to) {
        // The same trip written out twice: combine them into one
        last.count =
          last.count !== undefined && trip.count !== undefined
            ? last.count + trip.count
            : undefined
      } else {
        out.push(trip)
      }
      i += 3 // skip the three steps we just folded in
    } else {
      out.push(cmds[i])
    }
  }
  return out
}

// What the AI needs to know about the world right now
export type WorldState = {
  rocksAt: Record<string, number> // landmark id -> number of rocks lying there
  onTruck: number
}

// Sends the user's text to our server, which asks the AI to turn it into commands.
export async function interpret(
  text: string,
  capacity: number,
  state: WorldState
): Promise<Interpretation> {
  const res = await fetch('/api/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: text,
      capacity,
      state,
      landmarks: LANDMARKS.map(({ id, label }) => ({ id, label })),
    }),
  })
  if (!res.ok) throw new Error(`Server error ${res.status}`)

  const data = (await res.json()) as RawResponse

  // Never trust the response blindly: keep only commands we actually understand.
  const known = new Set(LANDMARKS.map((l) => l.id))

  // Small models sometimes put the truck's capacity in "count" when the user said
  // "all". So only trust a count if the user actually asked for an amount.
  const saidAll = /\b(all|every|everything|rest|remaining)\b/i.test(text)
  const saidAmount =
    /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|couple|few|several|some|half)\b/i.test(
      text
    )
  const countAllowed = saidAmount && !saidAll

  function toCommand(c: RawCommand): Command | null {
    const count =
      countAllowed && typeof c.count === 'number' && c.count > 0
        ? Math.floor(c.count)
        : undefined

    if (c.action === 'moveTo' && typeof c.target === 'string' && known.has(c.target)) {
      return { action: 'moveTo', target: c.target }
    }
    if (c.action === 'pickUp') return { action: 'pickUp', count }
    if (c.action === 'dropOff') return { action: 'dropOff' }
    if (
      c.action === 'moveRocks' &&
      typeof c.from === 'string' &&
      typeof c.to === 'string' &&
      known.has(c.from) &&
      known.has(c.to)
    ) {
      return { action: 'moveRocks', from: c.from, to: c.to, count }
    }
    return null
  }

  const commands = simplify(
    (data.commands ?? []).map(toCommand).filter((c): c is Command => c !== null)
  )

  return { commands, reply: typeof data.reply === 'string' ? data.reply : '' }
}
