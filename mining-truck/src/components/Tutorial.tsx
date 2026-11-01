import { useState, type CSSProperties } from "react";
import { LANDMARKS } from "../landmarks";
import type { Command } from "../interpret";

const FEEDBACK_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeTfPbY1JwFpwrPKsNIyaxUoiea7AR0CEA9S0reznEDmd_2UQ/viewform?usp=publish-editor";

type InfoStep = {
  kind: "info";
  title: string;
  body: string[];
};

type QuizStep = {
  kind: "quiz";
  title: string;
  question: string;
  options: string[];
  correct: number; // index of the right answer in options
  explanation: string;
};

// A step where the user runs something on the truck, then watches it
type TryStep = {
  kind: "try";
  title: string;
  body: string[];
  mode: "manual" | "samples";
};

type Step = InfoStep | QuizStep | TryStep;

// Pre-programmed "LLM" commands. These do NOT call the AI. Each one is the
// same list of actions the AI would have produced, already written out.
const SAMPLES: { text: string; plan: string; commands: Command[] }[] = [
  {
    text: "drive to the crusher, then the quarry",
    plan: "Drive to the crusher, then drive to the quarry.",
    commands: [
      { action: "moveTo", target: "crusher" },
      { action: "moveTo", target: "quarry" },
    ],
  },
  {
    text: "move 3 rocks from the rock pile to the crusher",
    plan: "Drive to the rock pile, pick up 3 rocks, drive to the crusher, drop them off.",
    commands: [{ action: "moveRocks", from: "rockPile", to: "crusher", count: 3 }],
  },
  {
    text: "take all the rocks to camp",
    plan: "Move every rock from the rock pile to camp, making as many trips as the truck needs.",
    commands: [{ action: "moveRocks", from: "rockPile", to: "camp" }],
  },
  {
    text: "bring 2 rocks to camp and 2 rocks to the crusher",
    plan: "Take 2 rocks from the rock pile to camp, then 2 more from the rock pile to the crusher.",
    commands: [
      { action: "moveRocks", from: "rockPile", to: "camp", count: 2 },
      { action: "moveRocks", from: "rockPile", to: "crusher", count: 2 },
    ],
  },
];

// Edit this list to change the tutorial. Steps play in order.
const STEPS: Step[] = [
  {
    kind: "info",
    title: "Why AI in Mining?",
    body: [
      "Mining is dangerous, expensive, and repetitive. AI helps by taking on the jobs that put people at risk or that machines can do more consistently.",
      "Autonomous trucks can haul material around the clock without fatigue, and AI can help spot hazards and plan routes to save fuel and time.",
      "You'll start by learning about three kinds of AI: LLMs, computer vision, and VLAs, each followed by a short quiz. Then you'll drive the truck yourself, first without AI and then with plain-English commands, to see the difference.",
    ],
  },

  // ---------- LLM ----------
  {
    kind: "info",
    title: "What is an LLM?",
    body: [
      "A Large Language Model (LLM) is an AI trained on huge amounts of text. It learns patterns in language so well that it can read a request written in plain English and respond in a useful way.",
      "Under the hood, an LLM works by predicting the next small piece of text (called a token), over and over, until it has written a full response.",
      "In mining, an LLM can turn a plain instruction like \"send truck 3 to the loading zone\" into structured commands a system can follow. That is what happens when you type a prompt into this project.",
      "LLMs can also be wrong or make things up, so important actions still need safety checks.",
    ],
  },
  {
    kind: "quiz",
    title: "LLM Quiz",
    question: "What is the main thing an LLM does when it writes a response?",
    options: [
      "It looks at camera images to find objects",
      "It predicts the next piece of text, one step at a time",
      "It physically controls the truck's motors directly",
      "It looks up the answer in a fixed list of replies",
    ],
    correct: 1,
    explanation:
      "Correct! An LLM generates text by repeatedly predicting what should come next.",
  },

  // ---------- Computer Vision ----------
  {
    kind: "info",
    title: "What is Computer Vision?",
    body: [
      "Computer vision is AI that learns to understand images and video. Instead of reading text, it analyzes pixels to recognize what is in a scene.",
      "These models are usually trained on thousands of labeled images, called a dataset. For example, photos where people have marked every truck, person, or rock.",
      "In mining, computer vision can detect people or vehicles near a haul road, tell ore from waste rock, estimate how finely rock was broken up after blasting, and spot damaged equipment.",
      "Because cameras never get tired, vision systems can keep watching a site continuously and raise an alert the moment something unsafe appears.",
    ],
  },
  {
    kind: "quiz",
    title: "Computer Vision Quiz",
    question: "How is a computer vision model usually trained?",
    options: [
      "On thousands of labeled images, called a dataset",
      "By reading a rulebook about mining",
      "By driving a real truck around a site first",
      "On text from websites only",
    ],
    correct: 0,
    explanation:
      "Correct! Labeled example images teach the model what to look for.",
  },

  // ---------- VLA ----------
  {
    kind: "info",
    title: "What is a VLA?",
    body: [
      "A Vision-Language-Action model (VLA) combines the ideas you just learned. It takes in what a camera sees (vision), an instruction written in plain language (language), and outputs what a machine should do next (action).",
      "An LLM only deals with text, and computer vision only deals with images. A VLA connects the two to physical behavior: it can look at a scene, understand a request like \"back up to the dump point\", and decide how to move.",
      "In mining, VLAs could let operators direct machines in everyday language while the machine uses its own cameras to handle the details of the surrounding environment.",
      "This is still a young and fast-moving area, and just like LLMs, VLAs need careful testing and safety limits before they control heavy equipment.",
    ],
  },
  {
    kind: "quiz",
    title: "VLA Quiz",
    question: "What does a VLA take in and produce?",
    options: [
      "Only text in, only text out",
      "Only images in, labels out",
      "Images and a language instruction in, an action out",
      "A rulebook in, a report out",
    ],
    correct: 2,
    explanation:
      "Correct! A VLA connects vision and language to actions a machine can perform.",
  },

  // ---------- Manual control ----------
  {
    kind: "info",
    title: "Driving Without AI",
    body: [
      "Now let's put the truck to work. First, here's what working without AI looks like. Manual control is like driving by remote control with GPS: a person picks a destination, and the truck drives there.",
      "The truck doesn't understand what you're trying to accomplish. It only follows one order at a time, and it can't plan ahead. You have to wait until it arrives before giving the next order.",
    ],
  },
  {
    kind: "try",
    title: "Try Manual Control",
    mode: "manual",
    body: [
      "Pick a destination and press Go to. This box will move out of the way so you can watch the truck drive.",
    ],
  },

  // ---------- Why an LLM ----------
  {
    kind: "info",
    title: "Why Would You Want an LLM?",
    body: [
      "Imagine you want the truck to visit the quarry and then camp. With manual control, you send it to the quarry, wait for it to arrive, then send it to camp. Moving rocks takes even more steps: drive to the pile, load, drive to the destination, unload, and repeat.",
      "A language model lets you say it all in one sentence, in plain English, and works out the steps for you.",
    ],
  },
  {
    kind: "try",
    title: "Try Plain-English Commands",
    mode: "samples",
    body: [
      "Pick a sample command and press Run. These are pre-programmed for the tutorial, so no AI is called and they start instantly. In the full app, an LLM would work out the steps from your sentence.",
    ],
  },

    // ---------- Explore the rest of the site ----------
  {
    kind: "info",
    title: "Keep Exploring!",
    body: [
      "You've seen how AI can help run a mine, and there's a lot more to learn on the rest of the site. Try out the other tabs on the left.",
      "Computer Vision shows an image of what the truck sees when it visits the rock pile.",
      "LLM traces how a language model interprets a command, breaking it down step by step into an action plan for the truck.",
      "VLA shows how LLMs and computer vision come together to turn input into action.",
      "Click Finish to close the tutorial and start exploring.",
    ],
  },
];

const buttonBase: CSSProperties = {
  padding: "10px 18px",
  fontSize: 16,
  fontWeight: 600,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const selectStyle: CSSProperties = {
  padding: "10px 12px",
  fontSize: 16,
  borderRadius: 8,
  border: "1px solid #9ca3af",
  background: "#ffffff",
  color: "#1f2937",
  maxWidth: "100%",
};

type Props = {
  onShowSite: () => void; // switch the page to the truck view
  onRun: (commands: Command[]) => void; // send commands to the truck
};

export default function Tutorial({ onShowSite, onRun }: Props) {
  // closed: nothing showing. open: the full box. minimized: small bar so the truck is visible.
  const [mode, setMode] = useState<"closed" | "open" | "minimized">("closed");
  const [stepIndex, setStepIndex] = useState(0);
  // Wrong picks per quiz step (option indexes), and which quiz steps are solved
  const [wrongPicks, setWrongPicks] = useState<Record<number, number[]>>({});
  const [solved, setSolved] = useState<Record<number, boolean>>({});
  const [manualChoice, setManualChoice] = useState(LANDMARKS[0].id);
  const [sampleChoice, setSampleChoice] = useState(0);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const canGoNext = step.kind !== "quiz" || solved[stepIndex] === true;

  function openTutorial() {
    setStepIndex(0);
    setWrongPicks({});
    setSolved({});
    setMode("open");
  }

  function pickOption(optionIndex: number) {
    if (step.kind !== "quiz" || solved[stepIndex]) return;
    if (optionIndex === step.correct) {
      setSolved({ ...solved, [stepIndex]: true });
    } else {
      const already = wrongPicks[stepIndex] ?? [];
      if (!already.includes(optionIndex)) {
        setWrongPicks({ ...wrongPicks, [stepIndex]: [...already, optionIndex] });
      }
    }
  }

  function runManual() {
    onShowSite();
    onRun([{ action: "moveTo", target: manualChoice }]);
    setMode("minimized");
  }

  function runSample() {
    onShowSite();
    onRun(SAMPLES[sampleChoice].commands);
    setMode("minimized");
  }

  function next() {
    if (!canGoNext) return;
    if (isLast) setMode("closed");
    else setStepIndex(stepIndex + 1);
  }

  function back() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  return (
    <>
    {mode === "closed" && (
    <div
        style={{
        position: "fixed",
        top: 10,
        right: 16,
        zIndex: 1000,
        display: "flex",
        gap: 8,
        }}
    >
        <a
        href={FEEDBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
            ...buttonBase,
            padding: "6px 14px",
            fontSize: 15,
            background: "#e5e7eb",
            color: "#1f2937",
            textDecoration: "none",
            display: "inline-block",
        }}
        >
        Give feedback
        </a>
        <button
        onClick={openTutorial}
        style={{
            ...buttonBase,
            padding: "6px 14px",
            fontSize: 15,
            background: "#f59e0b",
            color: "#1f2937",
        }}
        >
        Play tutorial
        </button>
    </div>
    )}

      {/* Small bar shown while the user watches the truck */}
      {mode === "minimized" && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 12,
            background: "#ffffff",
            color: "#1f2937",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
          }}
        >
          <span>Watch the truck. Ready for more?</span>
          <button
            onClick={() => setMode("open")}
            style={{ ...buttonBase, background: "#f59e0b", color: "#1f2937" }}
          >
            Continue tutorial
          </button>
          <button
            onClick={() => setMode("closed")}
            aria-label="Close tutorial"
            style={{
              border: "none",
              background: "transparent",
              fontSize: 28,
              lineHeight: 1,
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            ×
          </button>
        </div>
      )}

      {mode === "open" && (
        <div
          onClick={() => setMode("closed")}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "min(600px, 90vw)",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 32,
              borderRadius: 12,
              background: "#ffffff",
              color: "#1f2937",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
            }}
          >
            <button
              onClick={() => setMode("closed")}
              aria-label="Close tutorial"
              style={{
                position: "absolute",
                top: 10,
                right: 14,
                border: "none",
                background: "transparent",
                fontSize: 28,
                lineHeight: 1,
                cursor: "pointer",
                color: "#6b7280",
              }}
            >
              ×
            </button>

            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
              Step {stepIndex + 1} of {STEPS.length}
            </div>
            <h2 style={{ marginTop: 0 }}>{step.title}</h2>

            {(step.kind === "info" || step.kind === "try") &&
              step.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}

            {/* Manual control: a copy of the dropdown from the Site tab */}
            {step.kind === "try" && step.mode === "manual" && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <label htmlFor="tutorial-destination" style={{ fontWeight: 600 }}>
                  Manual control
                </label>
                <select
                  id="tutorial-destination"
                  value={manualChoice}
                  onChange={(e) => setManualChoice(e.target.value)}
                  style={selectStyle}
                >
                  {LANDMARKS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={runManual}
                  style={{ ...buttonBase, background: "#f59e0b", color: "#1f2937" }}
                >
                  Go to
                </button>
              </div>
            )}

            {/* Pre-programmed plain-English commands (no AI call) */}
            {step.kind === "try" && step.mode === "samples" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <label htmlFor="tutorial-sample" style={{ fontWeight: 600 }}>
                    Command
                  </label>
                  <select
                    id="tutorial-sample"
                    value={sampleChoice}
                    onChange={(e) => setSampleChoice(Number(e.target.value))}
                    style={selectStyle}
                  >
                    {SAMPLES.map((s, i) => (
                      <option key={s.text} value={i}>
                        {s.text}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={runSample}
                    style={{ ...buttonBase, background: "#f59e0b", color: "#1f2937" }}
                  >
                    Run
                  </button>
                </div>
                <p style={{ color: "#6b7280", fontSize: 14 }}>
                  What the truck will do: {SAMPLES[sampleChoice].plan}
                </p>
              </div>
            )}

            {step.kind === "quiz" && (
              <div>
                <p style={{ fontWeight: 600 }}>{step.question}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {step.options.map((option, i) => {
                    const isWrong = (wrongPicks[stepIndex] ?? []).includes(i);
                    const isRight = solved[stepIndex] && i === step.correct;
                    let background = "#e5e7eb";
                    let color = "#1f2937";
                    if (isWrong) {
                      background = "#dc2626";
                      color = "#ffffff";
                    } else if (isRight) {
                      background = "#16a34a";
                      color = "#ffffff";
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => pickOption(i)}
                        disabled={solved[stepIndex] === true}
                        style={{
                          ...buttonBase,
                          textAlign: "left",
                          background,
                          color,
                          cursor: solved[stepIndex] ? "default" : "pointer",
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {(wrongPicks[stepIndex] ?? []).length > 0 && !solved[stepIndex] && (
                  <p style={{ color: "#dc2626" }}>
                    Not quite. Try again, or press Back to re-read.
                  </p>
                )}
                {solved[stepIndex] && (
                  <p style={{ color: "#16a34a" }}>{step.explanation}</p>
                )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 24,
              }}
            >
              <button
                onClick={back}
                disabled={stepIndex === 0}
                style={{
                  ...buttonBase,
                  background: "#e5e7eb",
                  color: "#1f2937",
                  opacity: stepIndex === 0 ? 0.4 : 1,
                  cursor: stepIndex === 0 ? "default" : "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={next}
                disabled={!canGoNext}
                style={{
                  ...buttonBase,
                  background: "#f59e0b",
                  color: "#1f2937",
                  opacity: canGoNext ? 1 : 0.4,
                  cursor: canGoNext ? "pointer" : "not-allowed",
                }}
              >
                {isLast ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}