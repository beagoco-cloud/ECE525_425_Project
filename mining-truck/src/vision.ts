// // loads rock-detector file and return rock count (not incorporated yet)

// import * as ort from "onnxruntime-web";
 
// // One detected rock in the captured image
// export type Detection = {
//   x: number; // bounding box, normalized 0–1 (fraction of image width/height)
//   y: number;
//   width: number;
//   height: number;
//   confidence: number;
// };
 
// export type DetectionResult = {
//   count: number;
//   detections: Detection[];
//   imageDataUrl: string; // the photo this result came from, for display
// };
 
// const MODEL_URL = "/models/rock-detector.onnx"; // served from public/models/
// const INPUT_SIZE = 640; // must match what the model was trained/exported with
// const CONFIDENCE_THRESHOLD = 0.4;
 
// let sessionPromise: Promise<ort.InferenceSession> | null = null;
 
// // Loads the model once and reuses it — ONNX sessions are expensive to create,
// // so don't call this fresh on every detection.
// function getSession(): Promise<ort.InferenceSession> {
//   if (!sessionPromise) {
//     sessionPromise = ort.InferenceSession.create(MODEL_URL);
//   }
//   return sessionPromise;
// }
 
// // Turns a captured data URL into the Float32Array tensor YOLO expects:
// // shape [1, 3, INPUT_SIZE, INPUT_SIZE], RGB channels, values 0–1.
// async function preprocess(imageDataUrl: string): Promise<ort.Tensor> {
//   const img = new Image();
//   img.src = imageDataUrl;
//   await img.decode();
 
//   const canvas = document.createElement("canvas");
//   canvas.width = INPUT_SIZE;
//   canvas.height = INPUT_SIZE;
//   const ctx = canvas.getContext("2d")!;
//   ctx.drawImage(img, 0, 0, INPUT_SIZE, INPUT_SIZE);
//   const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE); // RGBA, 0–255
 
//   // Convert HWC RGBA -> CHW RGB, normalized to 0–1
//   const floatData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
//   const pixelCount = INPUT_SIZE * INPUT_SIZE;
//   for (let i = 0; i < pixelCount; i++) {
//     floatData[i] = data[i * 4] / 255; // R
//     floatData[pixelCount + i] = data[i * 4 + 1] / 255; // G
//     floatData[2 * pixelCount + i] = data[i * 4 + 2] / 255; // B
//   }
 
//   return new ort.Tensor("float32", floatData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
// }
 
// // Turns the model's raw output tensor into clean Detection objects.
// // NOTE: exact parsing depends on your model's output shape/format — this is a
// // placeholder until the real exported model's output layout is confirmed.
// function postprocess(output: ort.Tensor): Detection[] {
//   const detections: Detection[] = [];
 
//   // TODO: replace with real parsing once the model is exported and its
//   // output shape is known (commonly [1, num_boxes, 5+num_classes] for YOLO).
//   // For each candidate box: filter by CONFIDENCE_THRESHOLD, convert box
//   // coords to normalized 0–1, push into `detections`.
 
//   return detections;
// }
 
// // Main entry point: capture a frame -> run it through this -> get a count.
// export async function detectRocks(
//   imageDataUrl: string,
// ): Promise<DetectionResult> {
//   const session = await getSession();
//   const inputTensor = await preprocess(imageDataUrl);
 
//   const feeds: Record<string, ort.Tensor> = {
//     [session.inputNames[0]]: inputTensor,
//   };
//   const results = await session.run(feeds);
//   const output = results[session.outputNames[0]];
 
//   const detections = postprocess(output);
 
//   return {
//     count: detections.length,
//     detections,
//     imageDataUrl,
//   };
// }