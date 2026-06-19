// Real CDP mouse click at the center of the element matched by a selector-fn.
// Usage: node scripts/cdp-click.mjs "<js returning an element rect {x,y,w,h}>"
import { writeFileSync } from "node:fs";

const PAGE_ID = "822B1BB194818A72CBE5005F04F200CA";
const WS = `ws://localhost:9222/devtools/page/${PAGE_ID}`;
const rectExpr = process.argv[2];
const out = process.argv[3] || "click.png";

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
  const r = await send("Runtime.evaluate", {
    expression: rectExpr,
    returnByValue: true,
  });
  const rect = r?.result?.value;
  if (!rect) {
    console.log("no rect:", JSON.stringify(r?.result));
    ws.close();
    process.exit(1);
  }
  const x = rect.x + rect.w / 2;
  const y = rect.y + rect.h / 2;
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
  console.log("clicked at", x.toFixed(0), y.toFixed(0));
  await sleep(2000);
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(data, "base64"));
  ws.close();
  process.exit(0);
});
