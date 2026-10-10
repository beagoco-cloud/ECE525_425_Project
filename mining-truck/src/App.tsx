import { useRef, useState, type FormEvent } from "react";
import Scene from "./Scene";
import type { Target } from "./Truck";
import { LANDMARKS } from "./landmarks";
import { interpret, type Command } from "./interpret";
import { CAPACITY, makeRocks, scatter, type Rock } from "./rocks";
import { planTrips } from "./trips";

const TABS = ["Site", "Command log", "Help"] as const;
type Tab = (typeof TABS)[number];

function labelOf(id: string) {
  return LANDMARKS.find((l) => l.id === id)?.label ?? id;
}

// Plain-English version of a command, for the log
function describe(cmd: Command): string {
  switch (cmd.action) {
    case "moveTo":
      return `drive to ${labelOf(cmd.target)}`;
    case "pickUp":
      return cmd.count ? `pick up ${cmd.count}` : "pick up";
    case "dropOff":
      return "drop off";
    case "moveRocks":
      return `move ${cmd.count ?? "all"} rocks from ${labelOf(cmd.from)} to ${labelOf(cmd.to)}`;
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>("Site");
  const [target, setTarget] = useState<Target | null>(null);
  const [selected, setSelected] = useState(LANDMARKS[0].id);
  const [log, setLog] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(""); // what the AI said about your request
  const [status, setStatus] = useState(""); // what just happened in the simulation
  const [busy, setBusy] = useState(false); // true while waiting for the AI
  const [rocks, setRocksState] = useState<Rock[]>(() =>
    makeRocks("rockPile", 10),
  );

  // Refs hold the "live" values so a list of commands can run one after another
  // without waiting for React to re-render between steps.
  const rocksRef = useRef<Rock[]>(rocks);
  const placeRef = useRef<string | null>(null); // landmark the truck is parked at
  const destRef = useRef<string | null>(null); // landmark it is driving to
  const queueRef = useRef<Command[]>([]); // steps waiting for the truck to arrive

  function setRocks(next: Rock[]) {
    rocksRef.current = next;
    setRocksState(next);
  }

  function note(msg: string) {
    setStatus(msg);
    setLog((prev) => [...prev, msg]);
  }

  function doPickUp(count?: number) {
    const here = placeRef.current;
    if (!here) {
      note("Can't pick up rocks: the truck isn't parked at a location.");
      return;
    }
    const current = rocksRef.current;
    const onTruck = current.filter((r) => r.place === null).length;
    const available = current.filter((r) => r.place === here);
    const n = Math.min(count ?? CAPACITY, available.length, CAPACITY - onTruck);

    if (n <= 0) {
      note(
        onTruck >= CAPACITY
          ? "The truck is full."
          : `There are no rocks at ${labelOf(here)}.`,
      );
      return;
    }
    const taking = new Set(available.slice(0, n).map((r) => r.id));
    setRocks(
      current.map((r) => (taking.has(r.id) ? { ...r, place: null } : r)),
    );
    note(`Picked up ${n} rock${n === 1 ? "" : "s"} at ${labelOf(here)}.`);
  }

  function doDropOff() {
    const here = placeRef.current;
    if (!here) {
      note("Can't drop off rocks: the truck isn't parked at a location.");
      return;
    }
    const current = rocksRef.current;
    const carried = current.filter((r) => r.place === null).length;
    if (carried === 0) {
      note("The truck has no rocks to drop off.");
      return;
    }
    setRocks(
      current.map((r) =>
        r.place === null ? { ...r, place: here, ...scatter() } : r,
      ),
    );
    note(
      `Dropped off ${carried} rock${carried === 1 ? "" : "s"} at ${labelOf(here)}.`,
    );
  }

  // Runs commands in order. Rock actions happen instantly; a moveTo pauses the
  // rest of the list until the truck arrives. Returns true if a drive started.
  function runCommands(cmds: Command[]): boolean {
    for (let i = 0; i < cmds.length; i++) {
      const cmd = cmds[i];
      if (cmd.action === "moveTo") {
        const place = LANDMARKS.find((l) => l.id === cmd.target);
        if (!place) continue;
        placeRef.current = null; // on the road now
        destRef.current = place.id;
        queueRef.current = cmds.slice(i + 1); // everything after this waits
        setTarget({ x: place.x, z: place.z });
        setLog((prev) => [...prev, `Go to ${place.label}`]);
        return true;
      }
      if (cmd.action === "moveRocks") {
        if (cmd.from === cmd.to) {
          note("The rocks are already there.");
          continue;
        }
        // Work out how many round trips are needed, using the real rock counts
        const plan = planTrips(cmd.from, cmd.to, cmd.count, rocksRef.current);
        if (plan.length === 0) {
          const where = LANDMARKS.filter((l) =>
            rocksRef.current.some((r) => r.place === l.id),
          ).map((l) => l.label);
          note(
            `There are no rocks at ${labelOf(cmd.from)}.` +
              (where.length > 0 ? ` Rocks are at: ${where.join(", ")}.` : ""),
          );
          continue;
        }
        const trips = plan.length / 4;
        note(
          `Moving rocks from ${labelOf(cmd.from)} to ${labelOf(cmd.to)}: ${trips} trip${trips === 1 ? "" : "s"}.`,
        );
        return runCommands([...plan, ...cmds.slice(i + 1)]);
      }
      if (cmd.action === "pickUp") doPickUp(cmd.count);
      else doDropOff();
    }
    queueRef.current = [];
    return false;
  }

  // When the truck arrives, carry on with the waiting steps
  function handleArrive() {
    placeRef.current = destRef.current;
    const started = runCommands(queueRef.current);
    if (!started) setTarget(null);
  }

  // A snapshot of where the rocks are, so the AI isn't guessing
  function worldState() {
    const rocksAt: Record<string, number> = {};
    for (const l of LANDMARKS) {
      rocksAt[l.id] = rocksRef.current.filter((r) => r.place === l.id).length;
    }
    return {
      rocksAt,
      onTruck: rocksRef.current.filter((r) => r.place === null).length,
    };
  }

  async function handlePrompt(e: FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    const text = prompt.trim();
    if (!text || busy) return;

    setBusy(true);
    setLog((prev) => [...prev, `You said: "${text}"`]);

    try {
      const { commands, reply } = await interpret(text, CAPACITY, worldState());
      setReply(
        reply ||
          (commands.length > 0
            ? "On it."
            : "I couldn't turn that into a command."),
      );
      setStatus("");
      if (commands.length > 0) {
        // Show what the AI decided, which makes mistakes easy to spot
        setLog((prev) => [
          ...prev,
          `AI plan: ${commands.map(describe).join(", then ")}`,
        ]);
        runCommands(commands);
      }
      setPrompt("");
    } catch {
      setReply(
        "I couldn't reach the AI. Check that the server is running and your API key is set.",
      );
    } finally {
      setBusy(false);
    }
  }

  const onTruck = rocks.filter((r) => r.place === null).length;

  return (
    <div className="app">
      <header className="header">
        <h1>Haul Control</h1>
      </header>

      <div className="body">
        <nav className="sidebar" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t}
              className={t === tab ? "tab active" : "tab"}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>

        <main className="content">
          {/* Kept mounted (just hidden) so the scene doesn't reset when you switch tabs */}
          <div className="site" hidden={tab !== "Site"}>
            <div className="scene-box">
              <Scene target={target} rocks={rocks} onArrive={handleArrive} />
            </div>

            <form className="prompt-form" onSubmit={handlePrompt}>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Tell the truck what to do, e.g. "move 3 rocks from the rock pile to the crusher"'
                aria-label="Instruction for the truck"
              />
              <button type="submit" className="go" disabled={busy}>
                {busy ? "Thinking…" : "Send"}
              </button>
            </form>
            {reply && <p className="reply">{reply}</p>}
            {status && <p className="reply">{status}</p>}

            <div className="controls">
              <label htmlFor="destination">Manual control</label>
              <select
                id="destination"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {LANDMARKS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                className="go"
                onClick={() => {
                  queueRef.current = []; // cancel anything the AI had lined up
                  runCommands([{ action: "moveTo", target: selected }]);
                }}
              >
                Go to
              </button>
              <span className="load">
                Truck load: {onTruck} / {CAPACITY}
              </span>
            </div>
          </div>

          {tab === "Command log" && (
            <div>
              {log.length === 0 ? (
                <p>No commands yet.</p>
              ) : (
                <ol>
                  {log.map((entry, i) => (
                    <li key={i}>{entry}</li>
                  ))}
                </ol>
              )}
            </div>
          )}
          {tab === "Help" && (
            <p>
              Type an instruction like "move 3 rocks from the rock pile to the
              crusher" and press Send, or use the manual dropdown. The truck
              holds up to {CAPACITY} rocks.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
