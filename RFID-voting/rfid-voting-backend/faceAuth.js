// faceAuth.js
import { spawn } from "child_process";

// IMPORTANT: Use the exact venv python path
// Replace this with YOUR actual printed path:
const PY_PATH = "C:\\Users\\KIIT0001\\Documents\\Arduino\\ESP-code\\rfid-voting\\rfid-voting-backend\\.venv310\\Scripts\\python.exe";

export function verifyFaceForTag(tagId) {
  return new Promise((resolve) => {
    console.log("[faceAuth] Using Python:", PY_PATH);

    const child = spawn(PY_PATH, ["./face_verify.py", tagId], {
      cwd: process.cwd(),
    });

    let output = "";

    child.stdout.on("data", (data) => {
      console.log("[face_verify stdout]", data.toString().trim());
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      console.error("[face_verify stderr]", data.toString().trim());
    });

    child.on("close", (code) => {
      console.log("[faceAuth] Python exited with code:", code);

      if (code === 0 && output.includes("VERIFIED")) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    child.on("error", (err) => {
      console.error("[faceAuth] Failed to spawn python:", err);
      resolve(false);
    });
  });
}
