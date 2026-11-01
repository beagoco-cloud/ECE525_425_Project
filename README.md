# Haul Control (mining-truck)

An interactive website that shows how AI can help run a mine. A 3D haul truck drives around a mining site, and you control it by typing plain-English commands such as "move 3 rocks from the rock pile to the crusher". A language model running on your own computer (through Ollama) turns each command into truck actions.

Built with React, TypeScript, Vite, and React Three Fiber.

## What's on the site

| Tab | What it shows |
| --- | --- |
| **Mining Site Visualization** | The 3D site. Drive the truck with the manual dropdown or by typing commands. Also has a command log and a help tab. |
| **LLM** | Traces how a command is turned into an action plan, step by step. |
| **Computer Vision** | The photo the truck takes when it arrives at a location, and a rock count. (The count is scripted for the lesson; a trained model is not connected yet.) |
| **VLA** | A clickable diagram of how vision and language models come together to turn input into action. |

There is also a **Play tutorial** button (top right) that walks you through LLMs, computer vision, and VLAs with short quizzes, then lets you drive the truck. A **Give feedback** button next to it opens a feedback form.

## What you need to install

1. **Git** or **GitHub Desktop**, to download the project
2. **Node.js** (the LTS version), from [nodejs.org](https://nodejs.org). This also installs `npm`.
3. **VS Code** (recommended), from [code.visualstudio.com](https://code.visualstudio.com)
4. **Ollama**, from [ollama.com](https://ollama.com). It runs the AI model on your computer.

> **Ollama is optional for a quick look.** The tutorial, the manual controls, the Computer Vision tab, the VLA tab, and the four guided Computer Vision commands all work without it. You only need Ollama for free-form typed commands on the Site tab and for live mode on the LLM tab. The LLM tab also has an **Example mode** checkbox that works without Ollama.

## Setup (first time only)

1. **Download the project.** In GitHub Desktop, choose File → Clone repository and pick this repo, or run:
   ```
   git clone <https://github.com/beagoco-cloud/ECE525_425_Project.git>
   ```
2. **Open the project folder** (the one containing `package.json`, named `mining-truck`) in VS Code.
3. **Open a terminal in VS Code** (Terminal → New Terminal) and install the project's dependencies:
   ```
   npm install
   ```
   This can take a minute or two. You may see warnings about security audits or install scripts. They can be ignored.
4. **Download the AI model** (about 5 GB, so it takes a few minutes):
   ```
   ollama pull llama3.1:8b
   ```
   Check that it worked with `ollama list`. The model needs roughly 8 GB of free memory to run.

## Running the project

You'll have up to three things running at once. Start them in this order.

1. **Ollama.** On Windows and Mac it usually starts by itself after install and runs in the background (look for the llama icon near the clock or in the menu bar). To check, open <http://localhost:11434> in your browser. It should say "Ollama is running." If it isn't running, open Ollama from the Start menu, or run `ollama serve` in a terminal and leave it open.
2. **The AI server.** In a VS Code terminal, from the project folder:
   ```
   node server-ollama.js
   ```
   Leave it running. It should print `Ollama API server running on http://localhost:3001`. This small server sits between the website and Ollama.
3. **The website.** Open a **second** terminal (click the `+` in the terminal panel) and run:
   ```
   npm run dev
   ```
   Open the address it prints (usually <http://localhost:5173>) in your browser.

To stop anything, click in its terminal and press `Ctrl + C`.

> No API key or account is needed. Everything runs on your own computer.

## Trying it out

- Click **Play tutorial** in the top right for a guided tour.
- On the Site tab, use the **Manual control** dropdown and **Go to**, or type a command like `move 3 rocks from the rock pile to the crusher` and press **Send**.
- The four guided commands on the Computer Vision tab always work, even without Ollama.
- Places on the map: Rock pile, Crusher, Camp, Quarry. The truck holds up to 6 rocks.
- Refresh the page to reset the site (all rocks go back to the rock pile).

## Troubleshooting

**`npm` is not recognized.** Node.js isn't installed or the terminal doesn't know about it yet. Install Node.js (LTS), then fully close and reopen VS Code.

**PowerShell says "running scripts is disabled."** Run this once in the VS Code terminal, then open a new terminal:
```
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Alternatively, switch the terminal to Command Prompt from the dropdown next to the `+` button.

**`vite` is not recognized.** Dependencies aren't installed. Run `npm install` in the `mining-truck` folder.

**Could not read `package.json` (ENOENT).** The terminal is in the wrong folder. Move into the folder that contains `package.json` (for example `cd mining-truck`).

**The page is blank, or an import error shows after editing files.** Hard refresh the browser with `Ctrl + Shift + R`. If it persists, stop `npm run dev` with `Ctrl + C` and start it again.

**"I couldn't reach the AI" on the website.** Check that Ollama is running, that `node server-ollama.js` is running in its own terminal, and look at that terminal for an error when you send a command. (No API key is needed, even though the message mentions one.)

**`Error: Ollama returned 500` with a CUDA error.** Ollama is crashing on an NVIDIA graphics driver that's too old. The best fix is to install the latest driver from [nvidia.com/drivers](https://www.nvidia.com/drivers) and restart. As a temporary workaround, quit Ollama (right-click the llama icon in the system tray, then Quit) and start it on the CPU in PowerShell:
```
$env:CUDA_VISIBLE_DEVICES="-1"
ollama serve
```
If that still fails, also set `$env:OLLAMA_VULKAN="0"` before `ollama serve`. These settings only last for that terminal window. Test the model on its own with `ollama run llama3.1:8b`.

**Responses are very slow.** The 8B model needs about 8 GB of free memory and is much slower without a supported GPU. You can switch to a smaller model: run `ollama pull llama3.2:3b` and change the `MODEL` line at the top of `server-ollama.js`.

**Thousands of changed files in GitHub Desktop.** `node_modules` is being tracked. Make sure `.gitignore` contains `node_modules`, `dist`, and `.env`.

**Slow installs or odd errors in a OneDrive folder.** OneDrive tries to sync every file in `node_modules`. Cloning the project to a folder outside OneDrive (for example `C:\Projects`) avoids this.

## Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the site in development mode |
| `npm run build` | Checks the TypeScript and builds the site into `dist/` |
| `npm run preview` | Serves the built site locally |
| `npm run lint` | Checks the code with Oxlint |

## Project layout

```
mining-truck/
├── server-ollama.js        Small Express server (port 3001) that asks Ollama to turn a command into truck actions
├── vite.config.ts          Vite settings; forwards /api requests to the server above
├── package.json            Dependencies and scripts
└── src/
    ├── App.tsx             Page layout and the four tabs
    ├── Scene.tsx           The 3D site (ground, landmarks, rocks, truck)
    ├── Truck.tsx           The truck model and its driving/loading animation
    ├── TruckCamera.tsx     Takes the photo from the truck's point of view
    ├── interpret.ts        Sends commands to the server and checks the reply
    ├── landmarks.ts        The named places on the map
    ├── rocks.ts, trips.ts  Rock positions and round-trip planning
    ├── scenarios.ts        Scripted commands for the guided Computer Vision demo
    ├── vision.ts           Rock detection (not connected yet)
    ├── components/
    │   └── Tutorial.tsx    The "Play tutorial" walkthrough, quizzes, and feedback button
    └── sections/
        ├── MiningSiteVisualization.tsx
        ├── LLM.tsx
        ├── ComputerVision.tsx
        └── VLA.tsx
```

## How a typed command works

1. The website sends your text, the list of places, and the current rock counts to `/api/command`.
2. Vite forwards that request to `server-ollama.js` on port 3001.
3. The server asks the Ollama model (`llama3.1:8b`) to reply with a list of commands in a fixed format.
4. The website checks every command against the real map, drops anything invalid, and plans round trips.
5. The truck carries out the plan.

The **LLM** tab shows each of these steps for any command you type.
