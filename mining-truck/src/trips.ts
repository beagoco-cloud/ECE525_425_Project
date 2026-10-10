import type { Command } from './interpret'
import { CAPACITY, type Rock } from './rocks'

// Turns "move rocks from A to B" into a list of round trips.
// The AI says WHAT to do; this code works out HOW, using the real rock counts.
export function planTrips(
  from: string,
  to: string,
  count: number | undefined, // undefined means "all of them"
  rocks: Rock[]
): Command[] {
  const available = rocks.filter((r) => r.place === from).length
  let remaining = Math.min(count ?? available, available)

  const plan: Command[] = []
  while (remaining > 0 && plan.length < 80) {
    const n = Math.min(CAPACITY, remaining) // one truckload
    plan.push(
      { action: 'moveTo', target: from },
      { action: 'pickUp', count: n },
      { action: 'moveTo', target: to },
      { action: 'dropOff' }
    )
    remaining -= n
  }
  return plan
}
