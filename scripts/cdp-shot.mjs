// Quick CDP helper: navigate the SPA and screenshot.
// Usage: node scripts/cdp-shot.mjs <outfile> [evalExpr]
import { writeFileSync } from "node:fs";

const PAGE_ID = "822B1BB194818A72CBE5005F04F200CA";
const WS = `ws://localhost:9222/devtools/page/${PAGE_ID}`;
const out = process.argv[2] || "shot.png";
const evalExpr = process.argv[3] || null;

const ws = new WebSocket(WS);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res) => {
    const mid = ++id;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
});

ws.addEventListener("open", async () => {
  await send("Page.enable");
  await send("Runtime.enable");
  if (evalExpr) {
    const r = await send("Runtime.evaluate", {
      expression: evalExpr,
      awaitPromise: true,
      returnByValue: true,
    });
    console.log("eval:", JSON.stringify(r?.result?.value));
    await sleep(700);
  }
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(data, "base64"));
  console.log("saved", out);
  ws.close();
  process.exit(0);
});
