// Backend that uses an open-source model running on your own computer through Ollama.
// This version keeps the instructions short and leans on examples, which small models follow better.
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
  const placeList = landmarks
    .map((l) => `- ${l.id} (${l.label}): ${rocksAt[l.id] ?? 0} rocks`)
    .join('\n')

  // Ollama forces the model's answer to match this shape.
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

  const system = `You control a mining truck. Answer with JSON: a list of "commands" and a short "reply".

Commands:
- moveTo: drive to a place (needs "target")
- pickUp: load rocks at the place where the truck is (optional "count")
- dropOff: unload all rocks at the place where the truck is
- moveRocks: carry rocks from one place to another (needs "from" and "to"; leave out "count" to move all of them)

Places and how many rocks are there now:
${placeList}
On the truck: ${onTruck} (it holds ${cap} at most)

"from X to Y" means from = X and to = Y. "The pile" means the Rock pile.

Examples:
"go to the camp" -> {"commands":[{"action":"moveTo","target":"camp"}],"reply":"Heading to the camp."}
"move 3 rocks from the rock pile to the crusher" -> {"commands":[{"action":"moveRocks","from":"rockPile","to":"crusher","count":3}],"reply":"Taking 3 rocks to the crusher."}
"take all the rocks from the pile to the camp" -> {"commands":[{"action":"moveRocks","from":"rockPile","to":"camp"}],"reply":"Taking all the rocks to the camp."}
"sing a song" -> {"commands":[],"reply":"I can only drive and move rocks."}`

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