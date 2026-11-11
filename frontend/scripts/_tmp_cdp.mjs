// Drives headless Chrome over CDP: screenshots, LCP/CLS, network requests for 3D models.
// Usage: node scripts/_tmp_cdp.mjs <outDir> <url> <width> <height> <label> [mobile|desktop]
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const [outDir, url, wStr, hStr, label, mode = "desktop"] = process.argv.slice(2);
const width = Number(wStr), height = Number(hStr);
mkdirSync(outDir, { recursive: true });

const userDataDir = join(outDir, `.chrome-${label}-${width}`);
if (existsSync(userDataDir)) rmSync(userDataDir, { recursive: true, force: true });

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--mute-audio",
  "--window-size=1200,800", "about:blank",
], { stdio: "ignore" });

async function getWsUrl() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(150);
  }
  throw new Error("chrome did not start");
}

const ws = new WebSocket(await getWsUrl());
await new Promise((res) => ws.addEventListener("open", res, { once: true }));
let id = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method) {
    for (const l of listeners) l(msg);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Page.enable");
await send("Network.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width, height, deviceScaleFactor: 1, mobile: mode === "mobile",
});
if (mode === "mobile") await send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });

const requests = [];
const types = new Map();
listeners.push((m) => {
  if (m.method === "Network.requestWillBeSent") requests.push({ url: m.params.request.url, t0: m.params.timestamp, type: m.params.type });
  if (m.method === "Network.responseReceived") types.set(m.params.requestId, m.params.response.mimeType);
});
await send("Network.setCacheDisabled", { cacheDisabled: true });

const metricsScript = `
(() => {
  window.__metrics = { lcp: 0, lcpElement: null, cls: 0 };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__metrics.lcp = e.startTime; window.__metrics.lcpElement = e.element ? (e.element.tagName + '.' + (e.element.className || '').toString().slice(0, 60) + '|' + (e.url || '').slice(0,120)) : null; } }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) window.__metrics.cls += e.value; } }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
})();
`;
await send("Page.addScriptToEvaluateOnNewDocument", { source: metricsScript });

const t0 = Date.now();
await send("Page.navigate", { url });
await sleep(9000); // allow lazy content + 3D to settle

// scroll through the page to trigger lazy loading + intersection observers
const { result: pageH } = await send("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true });
for (let y = 0; y < pageH.value; y += Math.floor(height * 0.8)) {
  await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${y})` });
  await sleep(450);
}
await sleep(3500);
await send("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" });
await sleep(1200);

const { result: metrics } = await send("Runtime.evaluate", { expression: "JSON.stringify(window.__metrics)", returnByValue: true });
const { result: nav } = await send("Runtime.evaluate", {
  expression: `JSON.stringify(performance.getEntriesByType('navigation').map(n => ({dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd})))`,
  returnByValue: true,
});
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
writeFileSync(join(outDir, `${label}-${width}.png`), Buffer.from(shot.data, "base64"));

// below-the-fold shot too (full page)
const { cssContentSize: contentSize } = await send("Page.getLayoutMetrics");
const full = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: Math.min(contentSize.height, 12000), scale: 1 } });
writeFileSync(join(outDir, `${label}-${width}-full.png`), Buffer.from(full.data, "base64"));

const glbs = requests.filter((r) => /\.glb/.test(r.url));
const jsBytes = [];
const report = {
  url, label, width,
  lcp: JSON.parse(metrics.value).lcp,
  lcpElement: JSON.parse(metrics.value).lcpElement,
  cls: JSON.parse(metrics.value).cls,
  nav: JSON.parse(nav.value),
  glbRequests: glbs.map((g) => g.url.replace(/^http:\/\/localhost:\d+/, "")),
  jsRequests: requests.filter((r) => r.type === "Script" || /\.js(\?|$)/.test(r.url)).length,
  totalRequests: requests.length,
  elapsed: Date.now() - t0,
};
writeFileSync(join(outDir, `${label}-${width}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
ws.close();
chrome.kill();
