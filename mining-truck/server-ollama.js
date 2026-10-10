// Same job as server.js, but uses an open-source model running on your own
// computer through Ollama. No API key and no internet needed once it's set up.
import express from 'express'

const OLLAMA_URL = 'http://localhost:11434/api/chat'
const MODEL = 'llama3.1:8b' // change this to any model you've pulled with Ollama

const app = express()
app.use(express.json())

app.post('/api/command', async (req, res) => {
  const { prompt, landmarks, capacity, state } = req.body ?? {}
  if (typeof prompt !== 'string' || !Array.isArray(landmarks)) {
    return res.status(400).json({ error: 'Bad request' })
  }

  const cap = Number.isInteger(capacity) ? capacity : 6
  const ids = landmarks.map((l) => l.id)
  const rocksAt = state?.rocksAt ?? {}
  const onTruck = Number.isInteger(state?.onTruck) ? state.onTruck : 0
  const rockList = landmarks
    .map((l) => `- ${l.label} (${l.id}): ${rocksAt[l.id] ?? 0} rocks`)
    .join('\n')
  const placeList = landmarks.map((l) => `- ${l.id}: ${l.label}`).join('\n')

  // Ollama forces the model's answer to match this shape.
  // Note: it does NOT show the model the field descriptions, so the
  // instructions have to be in the system prompt below.
  const schema = {
    type: 'object',
    properties: {
      commands: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['moveTo', 'pickUp', 'dropOff', 'moveRocks'] },
            target: { type: 'string', enum: ids },
            from: { type: 'string', enum: ids },
            to: { type: 'string', enum: ids },
            count: { type: 'integer' },
          },
          required: ['action'],
        },
      },
      reply: { type: 'string' },
    },
    required: ['commands', 'reply'],
  }

  const system = `You control a mining truck in a 3D simulation.
The truck can do four things:
- moveTo: drive to a location. Needs "target", one of the location ids below.
- pickUp: load rocks lying at the location where the truck is parked. Optional "count" = how many rocks.
- dropOff: unload every rock on the truck at the location where it is parked.
- moveRocks: carry rocks from one location to another. Needs "from" and "to". Optional "count".

Locations:
${placeList}

Rocks right now (this is up to date):
${rockList}
- On the truck: ${onTruck}

Rules:
- The truck holds at most ${cap} rocks at a time.
- Use the rock counts above. Only say there are no rocks somewhere if its count above is 0.
- If the user doesn't say where the rocks are, use the location that has them.
- The truck must moveTo a location before it can pickUp or dropOff there.
- To carry rocks from one location to another, use a single moveRocks command. Leave out "count" when the user says all, every, or everything, and never use the truck's capacity as the count. The app plans the trips itself, so never repeat steps to make several trips.
- Use moveTo, pickUp, and dropOff on their own only for simple requests (like "drive to the camp" or "pick up two rocks").
- "from X to Y" always means from = X and to = Y. "from" is where the rocks are now; "to" is where they should end up.
- People use short names, like "the pile" for the Rock pile.
- If a request includes something the truck cannot do, do the parts you can and say what you can't in the reply.
- Never invent locations.

Reply with JSON with two fields:
- "commands": the steps for the truck, in order. Use an empty list if nothing can be done.
- "reply": one short, friendly sentence saying what the truck will do, or why it cannot.

Examples:
"move 3 rocks from the rock pile to the crusher" ->
{"commands":[{"action":"moveRocks","from":"rockPile","to":"crusher","count":3}],"reply":"Taking 3 rocks from the rock pile to the crusher."}
"move all the rocks from the pile to the camp" ->
{"commands":[{"action":"moveRocks","from":"rockPile","to":"camp"}],"reply":"Moving all the rocks from the rock pile to the camp."}
"take all the rocks to the camp" ->
{"commands":[{"action":"moveRocks","from":"rockPile","to":"camp"}],"reply":"Taking all the rocks from the rock pile to the camp."}
"drive to the camp" ->
{"commands":[{"action":"moveTo","target":"camp"}],"reply":"Heading to the camp."}`

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        format: schema,
        options: { temperature: 0 }, // less randomness = more consistent commands
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt.slice(0, 500) },
        ],
      }),
    })
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`)

    const data = await response.json()
    res.json(JSON.parse(data.message.content)) // { commands: [...], reply: "..." }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'The AI request failed' })
  }
})

app.listen(3001, () => console.log('Ollama API server running on http://localhost:3001'))
