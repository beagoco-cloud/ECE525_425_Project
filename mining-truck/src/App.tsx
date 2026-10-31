import { useState } from 'react'
import type { Command } from './interpret'
import MiningSiteVisualization from './sections/MiningSiteVisualization'
import LLM from './sections/LLM'
import ComputerVision from './sections/ComputerVision'
import VLA from './sections/VLA'
import Tutorial from "./components/Tutorial";

// Main sections, listed down the left side. Each one lives in its own file in src/sections/.
const SECTIONS = ['Mining Site Visualization', 'LLM', 'Computer Vision', 'VLA'] as const
type Section = (typeof SECTIONS)[number]

export default function App() {
  const [section, setSection] = useState<Section>('Mining Site Visualization')
  const [tutorialRun, setTutorialRun] = useState<{ id: number; commands: Command[] } | null>(null)

  return (
    <div className="app">
      <header className="header">
        <h1>Haul Control</h1>
      </header>

      <Tutorial
        onShowSite={() => setSection('Mining Site Visualization')}
        onRun={(commands) =>
          setTutorialRun((prev) => ({ id: (prev?.id ?? 0) + 1, commands }))
        }
      />

      <div className="body">
        <nav className="sidebar" aria-label="Sections">
          {SECTIONS.map((sec) => (
            <button
              key={sec}
              className={sec === section ? 'tab active' : 'tab'}
              onClick={() => setSection(sec)}
            >
              {sec}
            </button>
          ))}
        </nav>

        <main className="content">
          {/* Kept mounted (just hidden) so the truck and rocks don't reset when you switch sections */}
          <div className="section" hidden={section !== 'Mining Site Visualization'}>
            <MiningSiteVisualization tutorialRun={tutorialRun} />
          </div>

          {section === 'LLM' && <LLM />}
          {section === 'Computer Vision' && <ComputerVision />}
          {section === 'VLA' && <VLA />}
        </main>
      </div>
    </div>
  )
}
