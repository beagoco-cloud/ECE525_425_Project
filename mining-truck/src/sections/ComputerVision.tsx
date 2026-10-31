// // The Computer Vision section
// export default function ComputerVision() {
//   return (
//     <div className="placeholder">
//       <h2>Computer Vision</h2>
//       <p>This section is coming soon.</p>
//     </div>
//   )
// }

// import DatasetGenerator from '../DatasetGenerator'

// export default function ComputerVision() {
//   return <DatasetGenerator />
// }

import { SCENARIOS } from '../scenarios'
import { useSnapshot } from '../visionStore'
import { LANDMARKS } from '../landmarks'

// The Computer Vision section: a guided tutorial, plus what the truck's camera saw.
export default function ComputerVision() {
  const snap = useSnapshot()
  const placeLabel = snap
    ? (LANDMARKS.find((l) => l.id === snap.place)?.label ?? snap.place)
    : ''

  return (
    <div>
      <h2>Computer Vision</h2>
      <p>
        A computer vision model looks at a picture and finds objects in it. Here the truck
        takes a photo each time it arrives at a location, then counts the rocks it can see.
      </p>

      <h3>Try it</h3>
      <p>
        Go to the Mining Site Visualization section and type these commands, in order:
      </p>
      <ol>
        {SCENARIOS.map((s) => (
          <li key={s.id}>
            <strong>{s.title}:</strong> <code>{s.prompt}</code>
          </li>
        ))}
      </ol>

      <h3>What the truck saw</h3>
      {snap ? (
        <>
          <img
            src={snap.imageDataUrl}
            alt={`The truck's view at ${placeLabel}`}
            width={320}
            height={320}
          />
          <p>
            Photo taken at {placeLabel}. Rocks counted: <strong>{snap.rockCount}</strong>
          </p>
          <p>
            <em>
              Tutorial demo: this count is scripted for the lesson, not yet produced by a
              trained model.
            </em>
          </p>
        </>
      ) : (
        <p>No photo yet. Run a command to send the truck to a location.</p>
      )}
    </div>
  )
}
