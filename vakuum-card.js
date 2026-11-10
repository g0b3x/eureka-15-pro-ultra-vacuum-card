/* ==========================================================================
   VACUUM CARD — Home Assistant Lovelace card for Valetudo robot vacuums
   (built for the Eureka J15 Pro Ultra, works with any Valetudo robot)

   Single file, no dependencies.
   Install:   /config/www/vakuum-card/vakuum-card.js
   Resource:  /local/vakuum-card/vakuum-card.js   (type: JavaScript module)

   Minimal config:
     type: custom:vakuum-card
     entity: vacuum.valetudo_talltotalfalcon   # Valetudo vacuum entity
     topic: valetudo/TallTotalFalcon           # <topic prefix>/<identifier> from Valetudo → MQTT

   Data sources:
   - Map: Valetudo camera entity "Map data" (PNG with an embedded zTXt chunk
     = ValetudoMap JSON). Found automatically on the same device.
   - State, battery, presets, dock, consumables: autodiscovery entities.
   - Rooms / zone / go-to: mqtt.publish to the Valetudo topics.
   - Renaming rooms: a Home Assistant service (rest_command, see the package).
   ========================================================================== */

const VK_VERSION = "2.2.1";

/* ---------- Icons (custom line icons) ---------- */
const VK_ICONS = {
  logo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="9.2" r="2.2"/><path d="M7.5 15.2h9"/>',
  cube: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
  flat: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z"/><path d="M9 4v13.5M15 6.5V20"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/>',
  station: '<path d="M5 21V9a7 7 0 0 1 14 0v12"/><path d="M3 21h18M9 15h6"/>',
  care: '<path d="M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
  play: '<path d="M8.5 5.6v12.8a.9.9 0 0 0 1.36.77l10.4-6.4a.9.9 0 0 0 0-1.54L9.86 4.83A.9.9 0 0 0 8.5 5.6Z"/>',
  pause: '<rect x="6.5" y="5" width="4" height="14" rx="1.4"/><rect x="13.5" y="5" width="4" height="14" rx="1.4"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="3"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  bin: '<path d="M6 8h12l-1.2 12H7.2L6 8Z"/><path d="M4 8h16M10 4h4M10 12v5M14 12v5"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.5-.5-2.4 2.4-2.6Z"/>',
  locate: '<path d="M12 4v2M12 18v2M4 12h2M18 12h2"/><circle cx="12" cy="12" r="5"/><path d="M19 5l-2 2M5 19l2-2"/>',
  camera: '<path d="M3.5 8.5h3.2l1.8-2.5h7l1.8 2.5h3.2v10.5h-17V8.5Z"/><circle cx="12" cy="13.5" r="3.6"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  pad: '<path d="M7 9h10a4 4 0 0 1 3.9 4.9l-.8 3.4a2 2 0 0 1-3.4.9L14.5 16h-5l-2.2 2.2a2 2 0 0 1-3.4-.9l-.8-3.4A4 4 0 0 1 7 9Z"/><path d="M8 12v2.5M6.75 13.25h2.5"/><circle cx="15.5" cy="12.5" r=".6"/><circle cx="17" cy="14" r=".6"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/>',
};
const vkIc = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${VK_ICONS[n] || ""}</svg>`;

/* ---------- Texts ---------- */
const VK_STATUS = { docked: "Docked", idle: "Ready", cleaning: "Cleaning", returning: "Returning", paused: "Paused",
  error: "Error", unavailable: "Unavailable", unknown: "Unknown", on: "Active", off: "Ready" };
const VK_FAN = { off: "Off", min: "Min", low: "Quiet", medium: "Standard", high: "Strong", max: "Max", turbo: "Turbo", custom: "Custom" };
const VK_WATER = { off: "Off", min: "Min", low: "Low", medium: "Medium", high: "High", max: "Max", custom: "Custom" };
const VK_OP = { vacuum_and_mop: "Vacuum & mop", vacuum: "Vacuum only", mop: "Mop only", vacuum_then_mop: "Vacuum, then mop" };
const VK_DOCKACT = {
  wash: { title: "Washing mop pads", short: "Mop wash", sub: "Hot-water wash" },
  dry: { title: "Drying mop pads", short: "Drying", sub: "Warm-air drying" },
  empty: { title: "Emptying the dust bin", short: "Emptying", sub: "Dock is emptying" } };
/* Valetudo DockStatusStateAttribute: error, idle, pause, emptying, cleaning, drying */
const VK_DOCKSTATUS = { cleaning: "wash", washing: "wash", drying: "dry", emptying: "empty" };
const VK_DOCKVAL = { ok: ["OK", ""], empty: ["Empty", "warn"], full: ["Full", "warn"], missing: ["Missing", "bad"], unknown: ["Unknown", ""] };
const VK_NAMES = [
  [/main.?brush|brush.?main|hauptb/i, "Main brush"], [/side.?brush|brush.?side|seitenb/i, "Side brush"],
  [/filter/i, "Filter"], [/mop/i, "Mop pads"], [/sensor/i, "Sensors"], [/fresh.?water|clean.?water/i, "Fresh water"],
  [/waste.?water|dirty.?water/i, "Waste water"], [/dust.?bag|dustbag|dustbin/i, "Dust bag"], [/detergent/i, "Detergent"] ];
const vkEsc = v => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const VK_ROOM_SUGG = ["Living room", "Kitchen", "Hallway", "Bathroom", "Bedroom", "Kids room", "Dining room", "Office", "Guest room", "Guest WC", "Entrance", "Storage room", "Utility room", "Laundry room", "Dressing room", "Balcony"];
/* Valetudo sends the run as several paths. Midea "vendorPathType": 100 = cleaning lane, 80 = turn,
   0 / 30 / 50 = travel without cleaning (approach, room change, return). Without a type everything counts as cleaning. */
const VK_TRAVEL = new Set([0, 30, 50]);
function vkSplitPaths(ents){ const clean = [], travel = [];
  for (const e of ents) if (e.type === "path" && e.points.length >= 4) { const t = e.metaData?.vendorPathType; (t !== undefined && VK_TRAVEL.has(t) ? travel : clean).push(e.points); }
  return { clean, travel }; }
const VK_SEG_COLORS = ["#7a63f2", "#38b8c8", "#5b8cff", "#c08cf5", "#f0a35c", "#45c48a", "#ec7aa0", "#8fd0ff"];
const vkNf0 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const vkNf1 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const vkDur = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const vkBuzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };   // light haptic feedback (Android)

/* ---------- Helpers ---------- */
function vkHexA(hex, a){ hex = (hex || "").trim(); if (hex[0] === "#" && hex.length >= 7) { const n = parseInt(hex.slice(1, 7), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; } return hex; }
async function vkInflate(u8){
  const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate"));
  return await new Response(s).text();
}
/* Valetudo embeds the ValetudoMap as a zTXt chunk in the camera entity's PNG */
async function vkExtractMap(buf){
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  if (u8[0] !== 0x89 || u8[1] !== 0x50) throw new Error("Not a PNG");
  let o = 8;
  while (o + 8 <= dv.byteLength) {
    const len = dv.getUint32(o), type = String.fromCharCode(u8[o + 4], u8[o + 5], u8[o + 6], u8[o + 7]);
    if (type === "zTXt") { const data = u8.subarray(o + 8, o + 8 + len), z = data.indexOf(0);
      return JSON.parse(await vkInflate(data.subarray(z + 2))); }
    if (type === "IEND") break;
    o += 12 + len;
  }
  return null;
}
function vkParseMap(m){
  if (!m || !m.layers) return null;
  const ps = m.pixelSize || 5;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const l of m.layers) { const cp = l.compressedPixels || []; for (let i = 0; i < cp.length; i += 3) { const x = cp[i], y = cp[i + 1], c = cp[i + 2];
    if (x < minX) minX = x; if (y < minY) minY = y; if (x + c > maxX) maxX = x + c; if (y + 1 > maxY) maxY = y + 1; } }
  if (!isFinite(minX)) return null;
  minX -= 2; minY -= 2; maxX += 2; maxY += 2;
  const W = maxX - minX, H = maxY - minY;
  const floorPath = new Path2D(), wallPath = new Path2D(), basePath = new Path2D(), segments = [];
  const segIndex = W * H < 6_000_000 ? new Uint16Array(W * H) : null, idxToSeg = [];
  let ci = 0;
  for (const l of m.layers) {
    const cp = l.compressedPixels || [];
    if (l.type === "floor" || l.type === "wall") {
      const p = l.type === "floor" ? floorPath : wallPath;
      for (let i = 0; i < cp.length; i += 3) { p.rect(cp[i], cp[i + 1], cp[i + 2], 1); basePath.rect(cp[i], cp[i + 1], cp[i + 2], 1); }
    } else if (l.type === "segment") {
      const id = String(l.metaData?.segmentId ?? ("seg" + segments.length));
      const seg = { id, name: l.metaData?.name || ("Room " + id), named: !!l.metaData?.name, color: VK_SEG_COLORS[ci++ % VK_SEG_COLORS.length], path: new Path2D(), n: 0 };
      const slot = segments.length + 1; let sx = 0, sy = 0;
      for (let i = 0; i < cp.length; i += 3) { const x = cp[i], y = cp[i + 1], c = cp[i + 2];
        seg.path.rect(x, y, c, 1); basePath.rect(x, y, c, 1); sx += (x + c / 2) * c; sy += (y + .5) * c; seg.n += c;
        if (segIndex) { const base = (y - minY) * W + (x - minX); for (let k = 0; k < c; k++) segIndex[base + k] = slot; } }
      seg.area = seg.n * ps * ps / 10000; seg.centroid = { x: seg.n ? sx / seg.n : 0, y: seg.n ? sy / seg.n : 0 };
      segments.push(seg); idxToSeg[slot] = seg;
    }
  }
  const sig = segments.map(s => s.id + ":" + s.name).join("|");
  return { pixelSize: ps, minX, minY, W, H, floorPath, wallPath, basePath, segments, sig, entities: m.entities || [], segIndex, idxToSeg,
    totalArea: segments.reduce((a, s) => a + s.area, 0) };
}

/* ---------- Styles ---------- */
const VK_CSS = `
:host { display: block; height: 100%; }
*, *::before, *::after { box-sizing: border-box; }
ha-card { display: block; position: relative; overflow: hidden; height: var(--vk-h, 620px); max-height: 100%; isolation: isolate; container: vk / inline-size; border-radius: var(--ha-card-border-radius, 16px); }
.root { position: absolute; inset: 0; font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, inherit));
  --a1: var(--vk-accent-1, #36e2cf); --a2: var(--vk-accent-2, #8a7dff); --water: #5cc8ff; --heat: #ff9b4f; --on-accent: #fff;
  --good: #47d68a; --warn: #f5c35a; --bad: #ff6b7d; --r: 16px;
  --bg: #070a12; --bg2: #0f1529; --glass: rgba(18,24,40,.6); --glass-hi: rgba(22,29,48,.93);
  --stroke: rgba(255,255,255,.08); --stroke2: rgba(255,255,255,.15); --fg: #eef1fb; --muted: #8f99b5;
  --floor: #2c3553; --slab: #0a0f1d; --wall-top: #b4bee2; --wall-side: #333c5e; --label-bg: rgba(10,14,28,.8); --label-fg: #e9edfb;
  --seg-alpha: .74; --aur1: rgba(122,96,255,.3); --aur2: rgba(38,214,196,.16);
  --shadow: 0 14px 40px rgba(0,0,0,.5); --shadow-sm: 0 5px 16px rgba(0,0,0,.35);
  color: var(--fg); font-size: 14px; line-height: 1.4; }
.root.light { --a1: var(--vk-accent-1, #0fb3a4); --a2: var(--vk-accent-2, #6a58f0); --water: #1f9be0; --heat: #e8751f;
  --good: #1f9d58; --warn: #b98309; --bad: #d93e50;
  --bg: #eef1f8; --bg2: #e1e6f3; --glass: rgba(255,255,255,.66); --glass-hi: rgba(255,255,255,.95);
  --stroke: rgba(20,30,60,.08); --stroke2: rgba(20,30,60,.14); --fg: #121829; --muted: #5b6580;
  --floor: #dde3f1; --slab: #b9c2d8; --wall-top: #6f7a9c; --wall-side: #aab3cb; --label-bg: rgba(255,255,255,.9); --label-fg: #1a2034;
  --seg-alpha: .62; --aur1: rgba(122,96,255,.15); --aur2: rgba(38,200,186,.13);
  --shadow: 0 14px 40px rgba(30,40,80,.16); --shadow-sm: 0 5px 16px rgba(30,40,80,.12); }
[hidden] { display: none !important; }
button { font-family: inherit; }
svg.i { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.stage { position: absolute; inset: 0; overflow: hidden; touch-action: pan-y; background: radial-gradient(120% 90% at 50% 0%, var(--bg2), var(--bg) 70%); }
.stage.zoning { touch-action: none; }
.aurora { position: absolute; inset: -20%; pointer-events: none; filter: blur(60px); }
.aurora i { position: absolute; border-radius: 50%; }
.aurora i:nth-child(1) { width: 55%; height: 55%; left: 22%; top: 8%; background: var(--aur1); animation: d1 26s ease-in-out infinite alternate; }
.aurora i:nth-child(2) { width: 42%; height: 45%; left: 48%; top: 38%; background: var(--aur2); animation: d2 32s ease-in-out infinite alternate; }
@keyframes d1 { to { transform: translate(8%, 6%) scale(1.08); } } @keyframes d2 { to { transform: translate(-10%, -4%) scale(.92); } }
canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#cvFx { pointer-events: none; }
.fade { position: absolute; left: 0; right: 0; bottom: 0; height: 220px; pointer-events: none; background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--bg) 88%, transparent)); }
.ui { pointer-events: auto; }
.glass { background: var(--glass); backdrop-filter: blur(16px) saturate(140%); -webkit-backdrop-filter: blur(16px) saturate(140%); border: 1px solid var(--stroke); box-shadow: var(--shadow-sm); }
.nomap { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; padding: 0 40px; color: var(--muted); font-size: 13px; pointer-events: none; }

.top { position: absolute; z-index: 5; top: 0; left: 0; right: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; pointer-events: none; padding: 14px 14px 0; transition: padding-right .35s cubic-bezier(.2,.8,.2,1); }
.lcol { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.hdr { display: flex; align-items: center; gap: 11px; padding: 9px 15px 9px 9px; border-radius: var(--r); min-width: 0; }
.logo { width: 38px; height: 38px; border-radius: 12px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(140deg, var(--a1), var(--a2)); }
.logo svg.i { width: 22px; height: 22px; }
.hdr b.n { font-weight: 600; font-size: 15px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hst { display: flex; align-items: center; gap: 7px; margin-top: 2px; font-size: 12.5px; color: var(--muted); white-space: nowrap; }
.hst b { color: var(--fg); font-weight: 500; }
.sdot { width: 8px; height: 8px; border-radius: 50%; background: var(--good); flex: none; }
.sdot.busy { background: var(--a1); box-shadow: 0 0 0 4px color-mix(in srgb, var(--a1) 25%, transparent); animation: pulse 1.4s ease-in-out infinite; }
.sdot.warn { background: var(--warn); } .sdot.bad { background: var(--bad); }
@keyframes pulse { 50% { opacity: .45; } }
.stats { display: flex; padding: 10px 2px; border-radius: var(--r); }
.stat { padding: 0 16px; text-align: center; min-width: 80px; }
.stat:not([hidden]) ~ .stat:not([hidden]) { border-left: 1px solid var(--stroke2); }
.stat b { display: block; font-weight: 300; font-size: 32px; line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
.stat b small { font-size: 11px; font-weight: 500; color: var(--muted); margin-left: 3px; letter-spacing: 0; }
.stat span { display: block; margin-top: 6px; font-size: 9.5px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: .1em; }
.stats.live b { background: linear-gradient(120deg, var(--fg) 30%, var(--a1)); -webkit-background-clip: text; background-clip: text; color: transparent; }

.activity { appearance: none; border: 0; cursor: pointer; color: var(--fg); display: flex; align-items: center; gap: 10px; padding: 8px 13px 9px 9px; border-radius: var(--r); text-align: left; font: inherit; }
.activity .av { width: 34px; height: 34px; border-radius: 10px; flex: none; display: grid; place-items: center; position: relative; overflow: hidden; }
.activity.wash .av { background: color-mix(in srgb, var(--water) 22%, transparent); color: var(--water); }
.activity.dry .av { background: color-mix(in srgb, var(--heat) 22%, transparent); color: var(--heat); }
.activity.empty .av { background: color-mix(in srgb, var(--a2) 24%, transparent); color: var(--a2); }
.activity b { display: block; font-weight: 500; font-size: 13px; white-space: nowrap; }
.activity small { display: block; font-size: 10.5px; color: var(--muted); margin-top: 2px; }
.activity .pb { display: block; width: 100%; height: 3px; border-radius: 2px; background: var(--stroke2); margin-top: 6px; overflow: hidden; }
.activity .pb i { display: block; height: 100%; width: 35%; border-radius: 2px; animation: indet 1.4s ease-in-out infinite; }
.activity.wash .pb i { background: var(--water); } .activity.dry .pb i { background: var(--heat); } .activity.empty .pb i { background: var(--a2); }
@keyframes indet { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
.av .drop { position: absolute; top: -8px; width: 5px; height: 7px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; background: currentColor; animation: fall 1.1s linear infinite; }
.av .drop:nth-child(1) { left: 8px; } .av .drop:nth-child(2) { left: 15px; animation-delay: .37s; } .av .drop:nth-child(3) { left: 22px; animation-delay: .74s; }
@keyframes fall { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(44px); opacity: 0; } }
.av .heat { display: grid; animation: heat 1.6s ease-in-out infinite; }
@keyframes heat { 0%, 100% { transform: translateY(3px); opacity: .55; } 50% { transform: translateY(-3px); opacity: 1; } }
.av .swirl { width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid currentColor; border-right-color: transparent; border-bottom-color: transparent; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.legend { position: absolute; z-index: 5; left: 14px; bottom: 18px; display: flex; flex-direction: column; gap: 7px; padding: 10px 13px; border-radius: 13px; font-size: 11px; color: var(--muted); pointer-events: none; }
.legend span { display: flex; align-items: center; gap: 9px; }
.legend .l1 { width: 22px; height: 2px; border-radius: 1px; background: var(--fg); opacity: .7; }
.legend .l3 { width: 22px; height: 2px; background: repeating-linear-gradient(90deg, var(--muted) 0 4px, transparent 4px 7px); }
.legend .l4 { width: 22px; height: 11px; border-radius: 3px; border: 1px solid color-mix(in srgb, var(--fg) 30%, transparent);
  background: repeating-linear-gradient(45deg, color-mix(in srgb, var(--fg) 28%, transparent) 0 1.5px, transparent 1.5px 4.5px); }
.legend .l2 { width: 22px; height: 9px; border-radius: 5px; background: linear-gradient(90deg, color-mix(in srgb, var(--water) 30%, transparent), color-mix(in srgb, var(--water) 75%, transparent)); }

.rail { position: absolute; z-index: 6; top: 50%; right: 14px; transform: translateY(-50%); display: flex; flex-direction: column; gap: 3px; padding: 5px; border-radius: 20px; transition: right .35s cubic-bezier(.2,.8,.2,1); }
.rb { appearance: none; position: relative; width: 52px; padding: 8px 0 6px; border: 0; border-radius: 15px; background: transparent; color: var(--fg); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.rb em { font-size: 9.5px; font-style: normal; color: var(--muted); }
.rb:hover { background: var(--stroke); }
.rb[aria-pressed="true"] { background: linear-gradient(140deg, var(--a1), var(--a2)); color: var(--on-accent); }
.rb[aria-pressed="true"] em { color: var(--on-accent); }
.rb .dot { position: absolute; top: 6px; right: 11px; width: 7px; height: 7px; border-radius: 50%; background: var(--warn); }

.dock { position: absolute; z-index: 6; left: 50%; transform: translateX(-50%); bottom: 14px; width: min(580px, calc(100% - 28px)); display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: none; }
.ctx { height: 38px; width: 100%; display: flex; align-items: center; justify-content: center; }
.chips { display: flex; gap: 7px; overflow-x: auto; scrollbar-width: none; max-width: 100%; padding: 2px 4px; mask-image: linear-gradient(to right, transparent, #000 16px, #000 calc(100% - 16px), transparent); -webkit-mask-image: linear-gradient(to right, transparent, #000 16px, #000 calc(100% - 16px), transparent); }
.chips::-webkit-scrollbar { display: none; }
.chip { appearance: none; flex: none; display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px 7px 9px; border-radius: 999px; border: 1px solid var(--stroke2); background: var(--glass); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: var(--fg); font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.chip .d { width: 10px; height: 10px; border-radius: 4px; }
.chip small { font-size: 10.5px; color: var(--muted); }
.chip[aria-pressed="true"] { border-color: transparent; background: linear-gradient(140deg, color-mix(in srgb, var(--a1) 85%, transparent), color-mix(in srgb, var(--a2) 85%, transparent)); color: var(--on-accent); }
.chip[aria-pressed="true"] small { color: rgba(255,255,255,.8); }
.chip.sum { background: var(--fg); color: var(--bg); border-color: transparent; }
.chip.sum svg.i { width: 13px; height: 13px; }
.info { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; font-size: 12.5px; color: var(--muted); }
.info b { color: var(--fg); font-weight: 500; }
.info button { appearance: none; border: 0; background: var(--stroke2); color: var(--fg); width: 22px; height: 22px; border-radius: 50%; cursor: pointer; display: grid; place-items: center; margin-right: -6px; }
.info button svg.i, .info > svg.i { width: 13px; height: 13px; }
.tabs { display: flex; gap: 4px; }
.tabs button { appearance: none; position: relative; border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: 14.5px; font-weight: 500; padding: 7px 15px 11px; }
.tabs button::after { content: ""; position: absolute; left: 50%; bottom: 2px; width: 0; height: 3px; border-radius: 3px; background: linear-gradient(90deg, var(--a1), var(--a2)); transform: translateX(-50%); transition: width .25s cubic-bezier(.2,.8,.2,1); }
.tabs button[aria-pressed="true"] { color: var(--fg); font-weight: 600; }
.tabs button[aria-pressed="true"]::after { width: 22px; }
.controls { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 18px; width: 100%; }
.side { appearance: none; border: 0; background: transparent; color: var(--fg); cursor: pointer; display: flex; align-items: center; gap: 10px; min-width: 0; justify-self: end; padding: 4px; }
.side.right { justify-self: start; }
.side .sic { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; flex: none; }
.side .slbl { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.side .slbl.r { text-align: right; align-items: flex-end; }
.side .slbl b { font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.side .slbl small { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.orbwrap { position: relative; }
.orb { appearance: none; position: relative; width: 78px; height: 78px; border-radius: 50%; border: 0; cursor: pointer; color: #fff; display: grid; place-items: center;
  background: radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--a1) 80%, #fff 20%), var(--a2) 72%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.25), inset 0 -10px 24px rgba(20,0,80,.35), 0 12px 36px color-mix(in srgb, var(--a2) 55%, transparent), 0 0 60px color-mix(in srgb, var(--a1) 28%, transparent); }
.orb:active { transform: scale(.95); }
.orb svg.i { width: 28px; height: 28px; stroke: none; fill: currentColor; }
.orb::before { content: ""; position: absolute; inset: -8px; border-radius: 50%; opacity: 0; transition: opacity .3s;
  background: conic-gradient(from 0deg, transparent 0 35%, var(--a1) 60%, var(--a2) 85%, transparent);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px)); mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px)); }
.orb.busy::before { opacity: 1; animation: spin 2.2s linear infinite; }
.ministop { appearance: none; position: absolute; right: -12px; top: -6px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: var(--bad); display: grid; place-items: center; }
.ministop svg.i { width: 13px; height: 13px; stroke: none; fill: currentColor; }
.badge { position: absolute; left: -6px; top: -4px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: var(--fg); color: var(--bg); font-size: 12px; font-weight: 600; line-height: 22px; text-align: center; }

.toasts { position: absolute; z-index: 30; left: 50%; transform: translateX(-50%); top: 92px; display: flex; flex-direction: column; gap: 7px; align-items: center; pointer-events: none; }
.toast { padding: 9px 15px; border-radius: 999px; font-size: 12.5px; display: flex; align-items: center; gap: 8px; white-space: nowrap; animation: rise .25s cubic-bezier(.2,.8,.2,1); }
.toast::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--a1); }
.toast.err::before { background: var(--bad); } .toast.ok::before { background: var(--good); }
@keyframes rise { from { opacity: 0; transform: translateY(-8px); } }

.scrim { position: absolute; inset: 0; z-index: 19; background: rgba(2,4,10,.45); opacity: 0; pointer-events: none; transition: opacity .3s; }
.sheet { position: absolute; z-index: 20; display: flex; flex-direction: column; background: var(--glass-hi); backdrop-filter: blur(26px) saturate(150%); -webkit-backdrop-filter: blur(26px) saturate(150%);
  border: 1px solid var(--stroke2); box-shadow: var(--shadow); visibility: hidden;
  left: 0; right: 0; bottom: 0; max-height: 84%; border-radius: 24px 24px 0 0; transform: translateY(105%);
  transition: transform .4s cubic-bezier(.2,.8,.2,1), opacity .3s, visibility 0s linear .4s; }
.sheet.open { visibility: visible; transform: none; transition: transform .4s cubic-bezier(.2,.8,.2,1), opacity .3s, visibility 0s; }
.stage.drawer .scrim { opacity: 1; pointer-events: auto; }
.sh-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 18px 4px; }
.sh-head h3 { margin: 0; font-size: 19px; font-weight: 600; letter-spacing: -.02em; }
.x { appearance: none; width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--stroke2); background: transparent; color: var(--fg); cursor: pointer; display: grid; place-items: center; }
.x svg.i { width: 15px; height: 15px; }
.sh-body { overflow-y: auto; padding: 8px 18px 18px; }
.sh-body section { display: flex; flex-direction: column; gap: 18px; }
.lbl { margin: 0 0 8px; display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 500; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
.lbl .val { color: var(--a1); text-transform: none; letter-spacing: 0; font-size: 12px; }
.seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; padding: 4px; border-radius: 13px; background: var(--stroke); }
.seg button { appearance: none; border: 0; background: transparent; color: var(--muted); cursor: pointer; border-radius: 9px; padding: 9px 3px; font-size: 12px; font-weight: 500; line-height: 1.15; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.seg button[aria-pressed="true"] { background: var(--glass-hi); color: var(--fg); box-shadow: var(--shadow-sm); }
.lv { display: flex; align-items: flex-end; gap: 2px; height: 12px; }
.lv i { width: 3px; border-radius: 2px; background: var(--stroke2); }
.lv i.on { background: linear-gradient(var(--a1), var(--a2)); }
.cta { appearance: none; border: 0; border-radius: 15px; padding: 15px; cursor: pointer; color: #fff; font-size: 14.5px; font-weight: 600; background: linear-gradient(120deg, var(--a1), var(--a2)); }
.tanks { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 8px; }
.tank { padding: 12px; border-radius: 13px; background: var(--stroke); }
.tank .k { font-size: 10px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
.tank .v { margin-top: 7px; font-weight: 500; display: flex; align-items: center; gap: 7px; }
.tank .v::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--good); }
.tank.warn .v::before { background: var(--warn); } .tank.bad .v::before { background: var(--bad); }
.tile.off { opacity: .55; }
.tile.off .ti { filter: grayscale(1); }
.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.cams { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.cam { appearance: none; position: relative; display: block; padding: 0; border: 1px solid var(--stroke2); border-radius: 15px; overflow: hidden; background: var(--stroke); color: #fff; cursor: pointer; aspect-ratio: 16 / 10; text-align: left; }
.cam img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cam .cn { position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 10px 8px; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
  background: linear-gradient(to top, rgba(0,0,0,.72), transparent); }
.cam .cn i { width: 7px; height: 7px; border-radius: 50%; background: var(--good); flex: none; }
.cam.off .cn i { background: var(--muted); }
.cam.off img { opacity: .35; filter: grayscale(1); }
/* Manual control (joystick) */
.drive { position: absolute; z-index: 7; left: 50%; bottom: 14px; transform: translateX(-50%); display: none; align-items: center; gap: 18px; padding: 14px 16px 14px 20px; border-radius: 28px; max-width: calc(100% - 20px); }
.stage.driving .drive { display: flex; }
.stage.driving .dock, .stage.driving .legend { display: none; }
.drive .dcol { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.drive .dst { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; white-space: nowrap; }
.drive .dst i { width: 8px; height: 8px; border-radius: 50%; background: var(--warn); flex: none; }
.drive.on .dst i { background: var(--good); box-shadow: 0 0 0 4px color-mix(in srgb, var(--good) 25%, transparent); }
.drive .dval { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
.drive .seg { min-width: 190px; }
.drive .dbtns { display: flex; gap: 8px; }
.drive .dbtn { appearance: none; display: flex; align-items: center; gap: 6px; padding: 9px 12px; border-radius: 12px; border: 1px solid var(--stroke2); background: var(--stroke); color: var(--fg); font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer; }
.drive .dbtn svg.i { width: 16px; height: 16px; }
.drive .dbtn.stop { background: color-mix(in srgb, var(--bad) 22%, var(--stroke)); border-color: color-mix(in srgb, var(--bad) 45%, transparent); }
.joy { position: relative; flex: none; width: 150px; height: 150px; border-radius: 50%; touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none;
  background: radial-gradient(circle at 50% 50%, transparent 0 30%, color-mix(in srgb, var(--fg) 6%, transparent) 31% 100%), var(--stroke); border: 1px solid var(--stroke2); }
.joy::before, .joy::after { content: ""; position: absolute; left: 50%; top: 50%; background: var(--stroke2); transform: translate(-50%, -50%); }
.joy::before { width: 1px; height: 78%; } .joy::after { width: 78%; height: 1px; }
.joy .arw { position: absolute; color: var(--muted); font-size: 10px; line-height: 1; }
.joy .knob { position: absolute; z-index: 1; left: 50%; top: 50%; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, var(--a1) 45%, var(--a2)); box-shadow: 0 8px 22px rgba(0,0,0,.45), inset 0 -3px 8px rgba(0,0,0,.25); transition: transform .18s cubic-bezier(.2,.8,.2,1); }
.joy.drag { cursor: grabbing; } .joy.drag .knob { transition: none; }
.drive:not(.on) .joy { opacity: .45; pointer-events: none; }
.stage[data-lay="phone"] .drive { bottom: 10px; gap: 14px; padding: 12px 12px 12px 14px; width: calc(100% - 20px); justify-content: space-between; }
.stage[data-lay="phone"] .drive .seg { min-width: 0; }
.stage[data-lay="phone"] .drive .dcol { flex: 1; }
.stage[data-lay="phone"] .drive .dbtn { padding: 9px 10px; }
.stage[data-lay="phone"] .drive #dDock span { display: none; }
.stage[data-lay="phone"] .drive .dbtn.stop { flex: 1; justify-content: center; }
.stage[data-lay="phone"] .joy { width: 136px; height: 136px; }
.stage[data-lay="short"] .drive { bottom: 6px; padding: 10px 14px; }
.stage[data-lay="short"] .joy { width: 120px; height: 120px; }
.rcam { position: absolute; z-index: 25; inset: 10px; display: flex; flex-direction: column; border-radius: 20px; overflow: hidden; background: #000; border: 1px solid var(--stroke2); box-shadow: var(--shadow);
  opacity: 0; transform: scale(.97); pointer-events: none; transition: opacity .25s, transform .25s; }
.rcam.open { opacity: 1; transform: none; pointer-events: auto; }
.rcam header { display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 16px; background: var(--glass-hi); color: var(--fg); }
.rcam header b { flex: 1; font-size: 14px; display: flex; align-items: center; gap: 8px; }
.rcam header b i { width: 8px; height: 8px; border-radius: 50%; background: var(--bad); animation: vkrec 1.4s infinite; }
@keyframes vkrec { 50% { opacity: .25; } }
.rcam header a, .rcam header button { appearance: none; width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--stroke2); background: transparent; color: var(--fg); cursor: pointer; display: grid; place-items: center; }
.rcam iframe { flex: 1; width: 100%; border: 0; background: #000; }
.rcam .hint { flex: 1; display: grid; place-items: center; padding: 24px; text-align: center; color: #c9cfe2; font-size: 13px; line-height: 1.55; }
.cam.robot { background: radial-gradient(120% 120% at 30% 20%, color-mix(in srgb, var(--a2) 45%, #000), #05070d); }
.cam.robot .ph { color: #fff; font-weight: 600; gap: 4px; }
.cam .ph { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); font-size: 11.5px; }
.tile { appearance: none; border: 1px solid var(--stroke); border-radius: 17px; padding: 14px; min-height: 100px; background: var(--stroke); color: var(--fg); cursor: pointer; text-align: left; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }
.tile:hover:not(:disabled) { border-color: var(--a1); } .tile:disabled { opacity: .45; cursor: not-allowed; }
.tile.run { border-color: var(--a1); box-shadow: inset 0 0 0 1px var(--a1); }
.tile.run .ti { animation: pulse 1.2s ease-in-out infinite; }
.tile .ti, .care-sum .ti { width: 36px; height: 36px; border-radius: 11px; flex: none; display: grid; place-items: center; color: #fff; background: linear-gradient(140deg, var(--a1), var(--a2)); }
.tile b { font-weight: 500; font-size: 13.5px; display: block; } .tile small { font-size: 10.5px; color: var(--muted); }
.note { margin: 0; font-size: 11.5px; color: var(--muted); line-height: 1.5; }
.dockviz { position: relative; height: 200px; border-radius: 19px; overflow: hidden; background: radial-gradient(120% 100% at 50% 0%, var(--stroke2), transparent 70%), var(--stroke); }
.dv-cap { position: absolute; left: 14px; right: 14px; bottom: 12px; display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.dv-cap b { display: block; font-weight: 600; font-size: 14.5px; } .dv-cap small { font-size: 11px; color: var(--muted); }
.dv-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--stroke2); overflow: hidden; }
.dv-bar i { display: block; height: 100%; width: 35%; background: linear-gradient(90deg, var(--a1), var(--a2)); animation: indet 1.6s ease-in-out infinite; }
.care-sum { padding: 14px; border-radius: 15px; background: var(--stroke); display: flex; gap: 12px; align-items: center; }
.care-sum b { font-weight: 500; display: block; } .care-sum small { color: var(--muted); font-size: 12px; }
.cons { display: flex; flex-direction: column; gap: 13px; }
.c { display: grid; grid-template-columns: 1fr auto; gap: 6px 10px; align-items: baseline; }
.c .nm { font-size: 13.5px; } .c .vl { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
.c .bar { grid-column: 1 / -1; height: 6px; border-radius: 3px; background: var(--stroke2); overflow: hidden; }
.c .bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--a1), var(--a2)); }
.c .bar i.low { background: var(--warn); } .c .bar i.crit { background: var(--bad); }
:focus-visible { outline: 2px solid var(--a1); outline-offset: 2px; }

@container vk (min-width: 761px) {
  .sheet { left: auto; top: 12px; bottom: 12px; right: 12px; width: 350px; max-height: none; border-radius: 22px; transform: translateX(calc(100% + 30px)); opacity: 0; }
  .sheet.open { opacity: 1; }
  .stage.drawer .scrim { opacity: 0; pointer-events: none; }
  .stage.drawer .rail { right: 376px; }
  .stage.drawer .top { padding-right: 376px; }
}
/* ---------- Mobile: layout via data-lay (phone = narrow card, short = low/landscape) ---------- */
.stage, .stage button { -webkit-tap-highlight-color: transparent; }
.stage { -webkit-user-select: none; user-select: none; }
.stage.zoomed { touch-action: none; }
.sh-body { overscroll-behavior: contain; flex: 1 1 auto; min-height: 0; }
.sh-head, .shtabs { flex: none; }
.shtabs { overflow-x: auto; scrollbar-width: none; }
.shtabs::-webkit-scrollbar { display: none; }
/* Room editor */
.rnlist { display: flex; flex-direction: column; gap: 8px; }
.rn { display: flex; align-items: center; gap: 11px; padding: 9px 9px 9px 13px; border-radius: 14px; background: var(--stroke); border: 1px solid transparent; transition: border-color .15s, background .15s; }
.rn.on { border-color: var(--a1); background: color-mix(in srgb, var(--a1) 12%, var(--stroke)); }
.rn .d { width: 12px; height: 12px; border-radius: 4px; flex: none; }
.rnf { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; cursor: text; }
.rnf input { width: 100%; border: 0; background: transparent; color: var(--fg); font: 500 16px/1.25 inherit; font-family: inherit; padding: 2px 0; outline: none; }
.rnf input::placeholder { color: var(--muted); font-style: italic; }
.rnf input:disabled { opacity: .7; }
.rnf small { font-size: 10.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.rnsave { appearance: none; border: 0; border-radius: 10px; padding: 10px 13px; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; color: #fff; background: linear-gradient(120deg, var(--a1), var(--a2)); flex: none; }
.rnsave:disabled { background: var(--stroke2); color: var(--muted); cursor: default; }
.sugg { display: flex; flex-wrap: wrap; gap: 7px; }
.sugg .chip { padding: 9px 12px; }
.rnhelp { padding: 12px 14px; border-radius: 13px; background: color-mix(in srgb, var(--warn) 14%, var(--stroke)); font-size: 12px; line-height: 1.5; }
.rnhelp code { font-size: 11.5px; padding: 1px 5px; border-radius: 5px; background: var(--stroke2); }
.stage.editing .scrim { opacity: 0 !important; pointer-events: none !important; }
.stage.editing[data-lay="phone"] .sheet { max-height: 56%; }
.stage.editing[data-lay="phone"] .stats, .stage.editing[data-lay="phone"] .activity { display: none; }
.stage.editing[data-lay="short"] .sheet { left: auto; right: 8px; top: 8px; bottom: 8px; width: min(360px, 50%); max-height: none; border-radius: 20px; transform: translateX(calc(100% + 20px)); }
.stage.editing[data-lay="short"] .sheet.open { transform: none; }
.stage.editing[data-lay="short"] .sheet::before { display: none; }
.sh-head { touch-action: none; }
.sheet::before { content: ""; display: block; width: 38px; height: 4px; border-radius: 2px; background: var(--stroke2); margin: 9px auto 0; }
.sheet.dragging { transition: none !important; }
.shtabs { display: flex; gap: 4px; padding: 4px; margin: 4px 18px 6px; border-radius: 13px; background: var(--stroke); }
.shtabs button { appearance: none; flex: 1; border: 0; background: transparent; color: var(--muted); cursor: pointer; border-radius: 9px; padding: 10px 4px; font-size: 12.5px; font-weight: 500; white-space: nowrap; }
.shtabs button[aria-pressed="true"] { background: var(--glass-hi); color: var(--fg); box-shadow: var(--shadow-sm); }
.sic { position: relative; }
.sic .dot { position: absolute; top: 3px; right: 3px; width: 9px; height: 9px; border-radius: 50%; background: var(--warn); box-shadow: 0 0 0 2px var(--bg); }

.stage[data-lay="phone"] .top, .stage[data-lay="short"] .top { flex-wrap: nowrap; gap: 8px; padding: 10px 10px 0; }
.stage[data-lay="phone"] .lcol, .stage[data-lay="short"] .lcol { flex: 1 1 auto; width: auto; }
.stage[data-lay="phone"] .hdr, .stage[data-lay="short"] .hdr { width: auto; padding: 7px 11px 7px 7px; gap: 9px; }
.stage[data-lay="phone"] .logo, .stage[data-lay="short"] .logo { width: 34px; height: 34px; border-radius: 11px; }
.stage[data-lay="phone"] .logo svg.i, .stage[data-lay="short"] .logo svg.i { width: 20px; height: 20px; }
.stage[data-lay="phone"] .hdr b.n, .stage[data-lay="short"] .hdr b.n { font-size: 14.5px; }
.stage[data-lay="phone"] .hst, .stage[data-lay="short"] .hst { font-size: 12px; overflow: hidden; }
.stage[data-lay="phone"] .stats, .stage[data-lay="short"] .stats { width: auto; flex: none; padding: 8px 0; }
.stage[data-lay="phone"] .stat, .stage[data-lay="short"] .stat { padding: 0 9px; min-width: 0; flex: none; }
.stage[data-lay="phone"] .stat b, .stage[data-lay="short"] .stat b { font-size: 21px; }
.stage[data-lay="phone"] .stat b small, .stage[data-lay="short"] .stat b small { font-size: 9.5px; margin-left: 2px; }
.stage[data-lay="phone"] .stat span, .stage[data-lay="short"] .stat span { font-size: 8.5px; margin-top: 5px; letter-spacing: .06em; }
.stage[data-lay="phone"] .rail, .stage[data-lay="short"] .rail { top: var(--rail-top, 80px); bottom: auto; right: 10px; transform: none; flex-direction: row; gap: 2px; padding: 4px; border-radius: 999px; }
.stage[data-lay="short"] .rail { top: 10px; }
/* Wide: rail between header and controls; drops labels when there are many buttons */
.stage[data-lay="wide"] .rail { top: var(--rail-y, 50%); transform: none; }
.stage.railc .rb em { display: none; }
.stage.railc .rb { padding: 10px 0; }
.stage[data-lay="phone"] .rb, .stage[data-lay="short"] .rb { width: 42px; height: 42px; padding: 0; justify-content: center; border-radius: 50%; }
.stage[data-lay="phone"] .rb em, .stage[data-lay="short"] .rb em { display: none; }
.stage[data-lay="phone"] .rb .dot, .stage[data-lay="short"] .rb .dot { top: 5px; right: 5px; }
.stage[data-lay="phone"] .rb.deskonly { display: none; }
.stage[data-lay="phone"] .legend, .stage[data-lay="short"] .legend { display: none; }
.stage[data-lay="phone"] .toasts, .stage[data-lay="short"] .toasts { top: var(--toast-top, 130px); }
.stage[data-lay="phone"][data-xs="1"] .top { flex-wrap: wrap; }
.stage[data-lay="phone"][data-xs="1"] .lcol { width: 100%; }
.stage[data-lay="phone"][data-xs="1"] .stats { width: 100%; justify-content: space-around; }

.stage[data-lay="phone"] .dock { width: calc(100% - 20px); gap: 8px; bottom: 10px; }
.stage[data-lay="phone"] .ctx { height: 46px; }
.stage[data-lay="phone"] .chip { padding: 12px 15px 12px 12px; font-size: 13.5px; }
.stage[data-lay="phone"] .info { padding: 12px 16px; font-size: 13px; }
.stage[data-lay="phone"] .tabs button { padding: 10px 15px 13px; }
.stage[data-lay="phone"] .controls { gap: 20px; }
.stage[data-lay="phone"] .side .slbl { display: none; }
.stage[data-lay="phone"] .side .sic { width: 54px; height: 54px; }
.stage[data-lay="phone"] .orb { width: 74px; height: 74px; }
.stage[data-lay="phone"] .fade { height: 240px; }

.stage[data-lay="short"] .top { padding-right: calc(var(--rail-w, 200px) + 20px); }
.stage[data-lay="short"] .dock { flex-direction: row; flex-wrap: wrap; justify-content: center; align-items: center; width: calc(100% - 28px); gap: 2px 22px; bottom: 6px; }
.stage[data-lay="short"] .ctx { width: 100%; height: 42px; }
.stage[data-lay="short"] .controls { display: flex; width: auto; gap: 14px; }
.stage[data-lay="short"] .side .slbl { display: none; }
.stage[data-lay="short"] .side .sic { width: 46px; height: 46px; }
.stage[data-lay="short"] .orb { width: 60px; height: 60px; }
.stage[data-lay="short"] .orb svg.i { width: 24px; height: 24px; }
.stage[data-lay="short"] .tabs button { padding: 8px 12px 11px; }
.stage[data-lay="short"] .fade { height: 150px; }

@container vk (max-width: 760px) {
  .stage[data-lay="phone"] .sheet { max-height: 88%; }
  .stage[data-lay="phone"] .sh-head { padding: 12px 16px 2px; }
  .stage[data-lay="phone"] .shtabs { margin: 4px 14px 4px; }
  .stage[data-lay="phone"] .sh-body { padding: 8px 14px 16px; }
  .stage[data-lay="short"] .sheet { left: 50%; right: auto; width: min(620px, 100%); max-height: 94%; transform: translate(-50%, 105%); }
  .stage[data-lay="short"] .sheet.open { transform: translate(-50%, 0); }
}
@container vk (min-width: 761px) { .sheet::before { display: none; } }
@media (prefers-reduced-motion: reduce) { *, *::before { animation: none !important; transition: none !important; } }
`;

/* ---------- Card ---------- */
class VakuumCard extends HTMLElement {
  static getStubConfig(hass){
    const v = Object.keys(hass?.states || {}).find(e => e.startsWith("vacuum."));
    return { entity: v || "vacuum.valetudo", topic: "valetudo/ROBOTER_ID" };
  }
  constructor(){
    super();
    this.attachShadow({ mode: "open" });
    this._st = { status: "idle", mode: "rooms", gotoMode: false, selected: new Set(), zone: null, goto: null, iterations: 1 };
    this._model = null; this._view = null; this._view3d = 0; this._COL = {};
    this._trailMop = null; this._trailCaptured = false; this._dockAct = null; this._sheet = null;
    this._pollN = 0; this._lastVacState = null; this._reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this._dv = { rot: 0, last: 0, parts: [] };
    this._zoom = { z: 1, tx: 0, ty: 0 }; this._lay = "wide"; this._pinch = null;
    this._editSeg = null; this._drafts = {}; this._pendNames = {};
    this._drv = { on: false, enabled: false, v: 0, a: 0, x: 0, y: 0, last: { v: null, a: null, t: 0 }, busy: false, pend: false, spd: .65, keys: new Set() };
  }
  setConfig(config){
    if (!config || !config.entity || !String(config.entity).startsWith("vacuum.")) throw new Error("Please set 'entity' to a vacuum.* entity");
    // default height follows the screen (phone ≈ full height, desktop max. 680 px)
    this._config = Object.assign({ height: "clamp(460px, calc(100vh - 140px), 680px)", view_3d: false, theme: "auto" }, config);
    this._config.topic = (this._config.topic || "").replace(/\/+$/, "");
    const cams = this._config.cameras ? [].concat(this._config.cameras) : [];
    const rc = String(this._config.robot_camera || "").trim().replace(/\/+$/, "");
    this._rcamUrl = !rc ? "" : rc.includes("#") ? rc : (/^https?:\/\//.test(rc) ? rc : "http://" + rc) + "/#/robot/camera";
    this._cams = cams.map(c => typeof c === "string" ? { entity: c } : c).filter(c => c && String(c.entity || "").startsWith("camera."));
    this._ent = null; this._sig = null;
    if (!this._built) this._build();
    const h = this._config.height;
    this.style.setProperty("--vk-h", typeof h === "number" ? h + "px" : h);
    this._view3d = this._config.view_3d ? 1 : 0;
    this._setRail3d();
    if (this._hass) this._update();
  }
  set hass(h){ const first = !this._hass; this._hass = h; if (!this._built || !this._config) return; this._update(); if (first) this._fetchMap(); }
  getCardSize(){ return 9; }
  getGridOptions(){ return { columns: "full", rows: "auto", min_columns: 6 }; }
  connectedCallback(){
    this._timer = setInterval(() => this._tick(), 2500);
    const loop = () => { this._raf = requestAnimationFrame(loop);
      if (this._model && !this._reduce && (this._cleaning || this._st.goto || this._dockAct)) this._drawFx(); };
    this._raf = requestAnimationFrame(loop);
    if (this._stage && !this._ro) { this._ro = new ResizeObserver(() => this._redraw()); this._ro.observe(this._stage); }
  }
  disconnectedCallback(){ if (this._drv?.on) this._setDrive(false); this.$("rcamFrame")?.removeAttribute("src"); clearInterval(this._timer); cancelAnimationFrame(this._raf); cancelAnimationFrame(this._dvRaf); this._ro?.disconnect(); this._ro = null; }
  $(id){ return this.shadowRoot.getElementById(id); }

  /* ---------- DOM ---------- */
  _build(){
    this._built = true;
    this.shadowRoot.innerHTML = `<style>${VK_CSS}</style>
<ha-card><div class="root" id="root"><div class="stage" id="stage">
  <div class="aurora"><i></i><i></i></div>
  <canvas id="cvBase"></canvas><canvas id="cvFx"></canvas>
  <div class="fade"></div>
  <div class="nomap" id="nomap">Loading map…</div>
  <div class="legend glass" id="legend" hidden><span id="lgVac"><i class="l1"></i>Vacuumed</span><span id="lgMop"><i class="l2"></i>Mopped</span><span id="lgTravel"><i class="l3"></i>Travel</span><span id="lgCarpet"><i class="l4"></i>Carpet</span></div>
  <div class="top" id="top">
    <div class="lcol">
      <div class="hdr glass ui"><span class="logo">${vkIc("logo")}</span>
        <div style="min-width:0"><b class="n" id="name">Robot vacuum</b><div class="hst"><span class="sdot" id="sdot"></span><b id="stText">—</b><span id="stSub"></span></div></div></div>
      <button class="activity glass ui" id="activity" hidden></button>
    </div>
    <div class="stats glass ui" id="stats">
      <div class="stat"><b id="sArea">—</b><span>Area</span></div>
      <div class="stat"><b id="sTime">—</b><span>Time</span></div>
      <div class="stat"><b id="sBatt">—</b><span id="sBattL">Battery</span></div>
    </div>
  </div>
  <nav class="rail glass ui" id="rail">
    <button class="rb" id="rb3d" title="2D/3D view"></button>
    <button class="rb" id="rbGoto" title="Go to a point">${vkIc("target")}<em>Go to</em></button>
    <button class="rb" id="rbFit" title="Reset view" hidden>${vkIc("fit")}<em>Fit</em></button>
    <button class="rb deskonly" id="rbStation" title="Dock">${vkIc("station")}<em>Dock</em></button>
    <button class="rb deskonly" id="rbCare" title="Care">${vkIc("care")}<em>Care</em></button>
    <button class="rb" id="rbCam" title="Cameras" hidden>${vkIc("camera")}<em>Camera</em></button>
    <button class="rb" id="rbRooms" title="Rename rooms">${vkIc("pencil")}<em>Rooms</em></button>
    <button class="rb" id="rbDrive" title="Manual control" hidden>${vkIc("pad")}<em>Drive</em></button>
    <button class="rb" id="rbLocate" title="Locate robot">${vkIc("locate")}<em>Locate</em></button>
  </nav>
  <div class="dock" id="dock">
    <div class="ctx ui" id="ctx"></div>
    <div class="tabs ui" id="tabs">
      <button data-mode="rooms" aria-pressed="true">Rooms</button><button data-mode="full" aria-pressed="false">All</button><button data-mode="zone" aria-pressed="false">Zone</button>
    </div>
    <div class="controls ui">
      <button class="side" id="bOpt" title="Cleaning options"><span class="slbl r"><b id="optTop">Options</b><small id="optSub"></small></span><span class="sic glass">${vkIc("sliders")}</span></button>
      <div class="orbwrap"><button class="orb" id="bPlay"></button><span class="badge" id="badge" hidden></span><button class="ministop glass" id="bStop" title="Stopp" hidden>${vkIc("stop")}</button></div>
      <button class="side right" id="bHome" title="Back to dock"><span class="sic glass">${vkIc("home")}</span><span class="slbl"><b>Back to dock</b><small id="homeSub">Charge &amp; care</small></span></button>
    </div>
  </div>
  <div class="rcam" id="rcam" aria-hidden="true"><header><b><i></i>Robot camera · live</b>
    <a id="rcamExt" target="_blank" rel="noopener" title="Open in a new tab">${vkIc("ext")}</a><button id="rcamX" aria-label="Close">${vkIc("close")}</button></header>
    <iframe id="rcamFrame" title="Robot camera" allow="fullscreen" referrerpolicy="no-referrer"></iframe><div class="hint" id="rcamHint" hidden></div></div>
  <div class="drive glass ui" id="drive">
    <div class="joy" id="joy" aria-label="Joystick: drag to drive"><span class="knob" id="knob"></span></div>
    <div class="dcol">
      <div><div class="dst"><i></i><span id="dSt">Enabling manual control…</span></div><div class="dval" id="dVal">Drag the stick · arrow keys / WASD</div></div>
      <div class="seg" id="segSpd"></div>
      <div class="dbtns"><button class="dbtn" id="dLoc" title="Beep">${vkIc("locate")}</button><button class="dbtn" id="dDock" title="Back to dock">${vkIc("home")}<span>Dock</span></button><button class="dbtn stop" id="dExit">${vkIc("close")}Exit</button></div>
    </div>
  </div>
  <div class="toasts" id="toasts"></div>
  <div class="scrim" id="scrim"></div>
  <aside class="sheet ui" id="sheet">
    <header class="sh-head"><h3 id="shTitle"></h3><button class="x" id="shClose" aria-label="Close">${vkIc("close")}</button></header>
    <div class="shtabs" id="shTabs"><button data-sec="clean">Cleaning</button><button data-sec="station">Dock</button><button data-sec="care">Care</button><button data-sec="rooms">Rooms</button><button data-sec="cams">Cameras</button></div>
    <div class="sh-body">
      <section data-sec="clean">
        <div id="gOp" hidden><p class="lbl">Mode</p><div class="seg" id="segOp"></div></div>
        <div id="gFan" hidden><p class="lbl">Suction <span class="val" id="vFan"></span></p><div class="seg" id="segFan"></div></div>
        <div id="gWater" hidden><p class="lbl">Water flow <span class="val" id="vWater"></span></p><div class="seg" id="segWater"></div></div>
        <div><p class="lbl">Passes</p><div class="seg" id="segIt"></div></div>
        <button class="cta" id="cta">Clean everything</button>
      </section>
      <section data-sec="station">
        <div class="dockviz"><canvas id="cvDock"></canvas>
          <div class="dv-cap"><div><b id="dvT">Dock ready</b><small id="dvS">Mop pads clean and dry</small></div></div>
          <div class="dv-bar" id="dvBar" hidden><i></i></div></div>
        <div id="gTanks"><p class="lbl">Tanks</p><div class="tanks" id="tanks"></div></div>
        <div><p class="lbl">Actions</p><div class="tiles" id="tiles"></div></div>
      </section>
      <section data-sec="care"><div class="care-sum" id="careSum"></div><div class="cons" id="cons"></div></section>
      <section data-sec="cams"><div class="cams" id="cams"></div><p class="note">Tap a picture for the live view.</p></section>
      <section data-sec="rooms">
        <p class="note" id="rnNote"></p>
        <div class="rnhelp" id="rnHelp" hidden></div>
        <div class="rnlist" id="rnList"></div>
        <div id="rnSuggWrap"><p class="lbl">Suggestions</p><div class="sugg" id="rnSugg"></div></div>
      </section>
    </div>
  </aside>
</div></div></ha-card>`;
    this._stage = this.$("stage"); this._cvB = this.$("cvBase"); this._cvF = this.$("cvFx"); this._cvD = this.$("cvDock");
    this._bctx = this._cvB.getContext("2d"); this._fctx = this._cvF.getContext("2d"); this._dctx = this._cvD.getContext("2d");
    this._bindEvents();
    if (this.isConnected && !this._ro) { this._ro = new ResizeObserver(() => this._redraw()); this._ro.observe(this._stage); }
  }
  _setRail3d(){ const b = this.$("rb3d"); if (!b) return; const on = this._view3d > .5;
    b.innerHTML = vkIc(on ? "flat" : "cube") + `<em>${on ? "2D" : "3D"}</em>`; b.setAttribute("aria-pressed", on); }

  _bindEvents(){
    const S = this._stage;
    this.shadowRoot.querySelectorAll("#tabs button").forEach(b => b.addEventListener("click", () => { this._setGoto(false); this._setMode(b.dataset.mode); }));
    this.$("bPlay").addEventListener("click", () => this._intent().run());
    this.$("bStop").addEventListener("click", () => this._svc("vacuum", "stop", {}, "Stopped"));
    this.$("bHome").addEventListener("click", () => this._svc("vacuum", "return_to_base", {}, "Returning to dock"));
    this.$("bOpt").addEventListener("click", () => this._openSheet("clean"));
    this.$("cta").addEventListener("click", () => { const it = this._intent(); this._closeSheet(); it.run(); });
    this.$("rb3d").addEventListener("click", () => this._set3D(this._view3d < .5));
    this.$("rbGoto").addEventListener("click", () => this._setGoto(!this._st.gotoMode));
    this.$("rbStation").addEventListener("click", () => this._openSheet("station"));
    this.$("rbCare").addEventListener("click", () => this._openSheet("care"));
    this.$("rbRooms").addEventListener("click", () => this._openSheet("rooms"));
    this.$("rbDrive").addEventListener("click", () => this._setDrive(!this._drv.on));
    this.$("dExit").addEventListener("click", () => this._setDrive(false));
    this.$("dDock").addEventListener("click", async () => { await this._setDrive(false); this._svc("vacuum", "return_to_base", {}, "Returning to dock"); });
    this.$("dLoc").addEventListener("click", () => this._hass.callService("valetudo_control", "play_sound", {}).catch(() => {}));
    this._bindJoystick();
    // one camera → live view right away; several → overview with snapshots
    this.$("rbCam").addEventListener("click", () => {
      const n = this._cams.length + (this._rcamUrl ? 1 : 0);
      if (n === 1) this._rcamUrl ? this._openRcam() : this._moreInfo(this._cams[0].entity); else this._openSheet("cams"); });
    this.$("rcamX").addEventListener("click", () => this._closeRcam());
    this.$("cams").addEventListener("click", e => { if (e.target.closest("[data-rcam]")) { this._closeSheet(); this._openRcam(); return; }
      const b = e.target.closest("[data-cam]"); if (b) this._moreInfo(b.dataset.cam); });
    const rl = this.$("rnList");
    rl.addEventListener("input", e => { const i = e.target.closest("input"); if (!i) return; this._drafts[i.dataset.id] = i.value; this._updateRoomButtons(); this._drawFx(); });
    rl.addEventListener("focusin", e => { const i = e.target.closest("input"); if (i) this._focusRoom(i.dataset.id, true); });
    rl.addEventListener("keydown", e => { const i = e.target.closest("input"); if (i && e.key === "Enter") { e.preventDefault(); this._saveRoom(i.dataset.id); } });
    rl.addEventListener("click", e => { const b = e.target.closest(".rnsave"); if (b) this._saveRoom(b.dataset.id); });
    this.$("rnSugg").addEventListener("pointerdown", e => { if (e.target.closest("[data-sugg]")) e.preventDefault(); });   // keep focus in the input
    this.$("rnSugg").addEventListener("mousedown", e => { if (e.target.closest("[data-sugg]")) e.preventDefault(); });
    this.$("rnSugg").addEventListener("click", e => { const b = e.target.closest("[data-sugg]"); if (!b) return;
      if (!this._editSeg) { this._toast("Tap a room first"); return; }
      const inp = this.$("rn-" + this._editSeg); if (!inp || inp.disabled) return; inp.value = b.dataset.sugg; this._drafts[this._editSeg] = inp.value; this._updateRoomButtons(); this._drawFx(); });
    this.$("rbLocate").addEventListener("click", () => this._ent?.locate
      ? this._svc("button", "press", { entity_id: this._ent.locate }, "Robot is beeping")
      : this._svc("vacuum", "locate", {}, "Robot is beeping"));
    this.$("activity").addEventListener("click", () => this._openSheet("station"));
    this.$("shClose").addEventListener("click", () => this._closeSheet());
    this.$("scrim").addEventListener("click", () => this._closeSheet());
    this.$("ctx").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.seg) this._toggleRoom(b.dataset.seg);
      else if (b.dataset.act === "clear") { this._st.selected.clear(); this._st.zone = null; this._st.goto = null; this._updateUI(); } });
    /* Gestures: tap = room/target · drag = zone (or pan when zoomed) · two fingers = zoom/pan
       · Ctrl/⌘ + mouse wheel or trackpad pinch = zoom. One finger without zoom keeps scrolling the dashboard. */
    const local = e => { const r = S.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const T = new Map(), bottomSheet = () => S.getBoundingClientRect().width <= 760;
    S.addEventListener("pointerdown", e => {
      if (!this._model || !this._view?.M || e.target.closest(".ui") || (this._sheet && this._sheet !== "rooms" && bottomSheet())) return;
      const p = local(e); T.set(e.pointerId, p);
      if (T.size === 2) { const P = this._ptr; if (P?.drawing) this._st.zone = P.prevZone; this._ptr = null;
        const [a, b] = [...T.values()], Z = this._zoom; this._pinch = { z0: Z.z, tx0: Z.tx, ty0: Z.ty, c0: mid(a, b), d0: dist(a, b) || 1 };
        try { for (const id of T.keys()) S.setPointerCapture(id); } catch (_) {} this._drawFx(); return; }
      if (T.size > 2 || this._pinch) return;
      const zoneDraw = this._st.mode === "zone" && !this._st.gotoMode;
      this._ptr = { x0: p.x, y0: p.y, moved: false, m0: this._unproj(p.x, p.y), tx0: this._zoom.tx, ty0: this._zoom.ty, prevZone: this._st.zone, zoneDraw };
      if (zoneDraw || this._zoom.z > 1 || e.pointerType === "mouse") { try { S.setPointerCapture(e.pointerId); } catch (_) {} }
    });
    S.addEventListener("pointermove", e => { if (!T.has(e.pointerId)) return; const p = local(e); T.set(e.pointerId, p);
      const Pi = this._pinch, Z = this._zoom;
      if (Pi && T.size >= 2) { const [a, b] = [...T.values()], c = mid(a, b), z = Math.min(6, Math.max(1, Pi.z0 * dist(a, b) / Pi.d0));
        const bx = (Pi.c0.x - Pi.tx0) / Pi.z0, by = (Pi.c0.y - Pi.ty0) / Pi.z0; Z.z = z; Z.tx = c.x - z * bx; Z.ty = c.y - z * by; this._redraw(); return; }
      const P = this._ptr; if (!P) return;
      if (Math.hypot(p.x - P.x0, p.y - P.y0) > 6) P.moved = true; if (!P.moved) return;
      if (P.zoneDraw) { const m = this._unproj(p.x, p.y); this._st.zone = { x0: P.m0.x, y0: P.m0.y, x1: m.x, y1: m.y }; P.drawing = true; this._drawFx(); }
      else if (Z.z > 1) { Z.tx = P.tx0 + (p.x - P.x0); Z.ty = P.ty0 + (p.y - P.y0); this._redraw(); } });
    const end = (e, cancel) => { if (!T.has(e.pointerId)) return; T.delete(e.pointerId);
      if (this._pinch) { if (T.size < 2) { this._pinch = null; this._ptr = null; } return; }
      const P = this._ptr; if (!P) return; this._ptr = null;
      if (cancel) { if (P.drawing) this._st.zone = P.prevZone; this._updateUI(); return; }
      const p = local(e), m = this._unproj(p.x, p.y), ps = this._model.pixelSize;
      if (!P.moved) { if (this._st.gotoMode) { this._st.goto = { x: m.x * ps, y: m.y * ps }; vkBuzz(10); this._updateUI(); }
        else if (this._sheet === "rooms") { const seg = this._segAt(m); if (seg) this._focusRoom(seg.id); }
        else if (this._st.mode === "rooms") { const seg = this._segAt(m); if (seg) this._toggleRoom(seg.id); } }
      else if (P.drawing && this._st.zone) { const z = this._normZone(this._st.zone);
        if ((z.x1 - z.x0) * ps < 30 || (z.y1 - z.y0) * ps < 30) this._st.zone = P.prevZone; else vkBuzz(10); this._updateUI(); } };
    S.addEventListener("pointerup", e => end(e, false));
    // in the editor: tapping the map must not steal focus from the input (keyboard stays open)
    S.addEventListener("mousedown", e => { if (this._sheet === "rooms" && !e.target.closest(".ui")) e.preventDefault(); });
    S.addEventListener("pointercancel", e => end(e, true));
    S.addEventListener("wheel", e => { if (!(e.ctrlKey || e.metaKey) || !this._model || !this._view?.M || e.target.closest(".ui")) return;
      e.preventDefault(); const p = local(e); this._zoomAt(p.x, p.y, this._zoom.z * Math.exp(-e.deltaY * .01)); }, { passive: false });
    this.$("rbFit").addEventListener("click", () => this._resetZoom());
    this.shadowRoot.querySelectorAll("#shTabs button").forEach(b => b.addEventListener("click", () => this._showSheet(b.dataset.sec)));
    // swipe the bottom sheet down to close
    const sh = this.$("sheet"), head = sh.querySelector(".sh-head"); let d = null;
    head.addEventListener("pointerdown", e => { if (!bottomSheet() || e.target.closest("button") || (this._lay === "short" && this._sheet === "rooms")) return;
      d = { y0: e.clientY, dy: 0 }; try { head.setPointerCapture(e.pointerId); } catch (_) {} sh.classList.add("dragging"); });
    head.addEventListener("pointermove", e => { if (!d) return; d.dy = Math.max(0, e.clientY - d.y0);
      sh.style.transform = (this._lay === "short" && this._sheet !== "rooms" ? "translateX(-50%) " : "") + `translateY(${d.dy}px)`; });
    const dEnd = () => { if (!d) return; sh.classList.remove("dragging"); sh.style.transform = ""; if (d.dy > 90) this._closeSheet(); d = null; };
    head.addEventListener("pointerup", dEnd); head.addEventListener("pointercancel", dEnd);
  }

  /* ---------- Find entities ---------- */
  _discover(){
    const h = this._hass, c = this._config, reg = h.entities || {}, E = c.entities || {};
    const dev = reg[c.entity]?.device_id;
    const base = c.entity.split(".")[1];
    let sib = dev ? Object.values(reg).filter(e => e.device_id === dev).map(e => e.entity_id) : [];
    if (!sib.length) sib = Object.keys(h.states).filter(id => id.split(".")[1].startsWith(base.split("_").slice(0, 2).join("_")));
    const pick = (dom, inc, exc) => sib.find(id => id.startsWith(dom + ".") && inc.test(id) && !(exc && exc.test(id)));
    this._ent = {
      map: c.map || E.map || pick("camera", /map/) || sib.find(id => id.startsWith("camera.")),
      battery: E.battery || pick("sensor", /battery/),
      dock: E.dock_status || pick("sensor", /dock_status|dockstatus/),
      fan: E.fan || pick("select", /fan/),
      water: E.water || pick("select", /water/),
      mode: E.mode || pick("select", /(^|_)mode$|operation/, /carpet/),
      area: E.area || pick("sensor", /current.*area|area.*current/),
      time: E.time || pick("sensor", /current.*(time|duration)|(time|duration).*current/),
      empty: E.auto_empty || pick("button", /empty/),
      locate: E.locate || pick("button", /locate/),
      mopAttach: pick("binary_sensor", /mop/),
      error: E.error || pick("sensor", /error/),
      tanks: E.dock_components || sib.filter(id => id.startsWith("sensor.") && /fresh|waste|dust_?bag|detergent/.test(id) && !/status/.test(id)),
      consumables: c.consumables || sib.filter(id => id.startsWith("sensor.") && /brush|filter|mop|sensor_clean|sensor_sensor|cleaning_tray|consumable/.test(id) && !/attach|statistic/.test(id)),
    };
  }
  _short(id){
    const st = this._hass.states[id]; let n = st?.attributes?.friendly_name || id.split(".")[1].replace(/_/g, " ");
    const dn = this._hass.states[this._config.entity]?.attributes?.friendly_name;
    if (dn && n.toLowerCase().startsWith(dn.toLowerCase())) n = n.slice(dn.length).trim();
    for (const [re, de] of VK_NAMES) if (re.test(n)) return de;
    return n.charAt(0).toUpperCase() + n.slice(1);
  }

  /* ---------- State from HA ---------- */
  _update(){
    const h = this._hass, c = this._config; if (!h) return;
    if (!this._ent) this._discover();
    const E = this._ent, S = id => id ? h.states[id] : undefined;
    const dark = c.theme === "dark" ? true : c.theme === "light" ? false : (h.themes?.darkMode ?? true);
    const v = S(c.entity);
    const watch = [v, S(E.battery), S(E.dock), S(E.fan), S(E.water), S(E.mode), S(E.area), S(E.time), S(E.map), S(E.error), ...E.tanks.map(S), ...E.consumables.map(S)];
    const sig = watch.map(s => s ? s.state + "|" + s.last_updated : "-").join(";") + "|" + dark;
    if (sig === this._sig) return; this._sig = sig;
    this.$("root").classList.toggle("light", !dark);
    if (this._dark !== dark) { this._dark = dark; requestAnimationFrame(() => { this._refreshColors(); this._redraw(); }); }
    if (!v) { this.$("stText").textContent = "Entity missing"; this.$("stSub").textContent = c.entity; return; }
    this.$("name").textContent = c.title || v.attributes.friendly_name || "Robot vacuum";

    const status = v.state; this._st.status = status;
    const wasCleaning = this._cleaning; this._cleaning = status === "cleaning";
    if (status !== this._lastVacState) { this._lastVacState = status; this._fetchMap(); }
    this.$("stText").textContent = VK_STATUS[status] || status;
    const err = S(E.error)?.state; const hasErr = status === "error" && err && !["none", "unknown", "unavailable", ""].includes(err);
    this.$("sdot").className = "sdot " + (this._cleaning ? "busy" : status === "error" || status === "unavailable" ? "bad" : ["paused", "returning"].includes(status) ? "warn" : "");

    // Battery
    const bs = S(E.battery); const bl = bs ? parseFloat(bs.state) : v.attributes.battery_level;
    this.$("sBatt").innerHTML = (isFinite(bl) ? vkNf0.format(bl) : "—") + "<small>%</small>";
    const charging = v.attributes.battery_icon?.includes("charging") || (status === "docked" && bl < 100);
    this.$("sBattL").textContent = charging ? "Charging" : "Battery";

    // statistics (Valetudo reports area in cm² or m², time in s or min)
    const conv = (st, kind) => { if (!st || !isFinite(parseFloat(st.state))) return null; const x = parseFloat(st.state), u = (st.attributes.unit_of_measurement || "").toLowerCase();
      if (kind === "area") return u.includes("cm") ? x / 10000 : x;
      return u === "s" ? x / 60 : u === "h" ? x * 60 : u === "ms" ? x / 60000 : x; };
    const ar = conv(S(E.area), "area"), tm = conv(S(E.time), "time");
    this.$("sArea").innerHTML = (ar != null ? vkNf0.format(ar) : "—") + "<small>m²</small>";
    this.$("sTime").innerHTML = (tm != null ? vkNf0.format(Math.round(tm)) : "—") + "<small>min</small>";
    this.$("stats").classList.toggle("live", this._cleaning);
    // robots without statistics sensors (e.g. J15 Pro Ultra): hide area/time instead of "—"
    this.$("sArea").parentElement.hidden = !E.area; this.$("sTime").parentElement.hidden = !E.time;

    // Presets
    const sel = id => { const s = S(id); return s ? { cur: s.state, opts: s.attributes.options || [] } : null; };
    this._fan = sel(E.fan) || (v.attributes.fan_speed_list ? { cur: v.attributes.fan_speed, opts: v.attributes.fan_speed_list, vac: true } : null);
    this._water = sel(E.water); this._op = sel(E.mode);

    // mop trail: remember the mode at the start of the run
    const mopOn = this._op ? this._op.cur !== "vacuum" : (S(E.mopAttach) ? S(E.mopAttach).state === "on" : true);
    if (this._trailMop === null) this._trailMop = mopOn;
    if (this._cleaning && !this._trailCaptured) { this._trailMop = mopOn; this._trailCaptured = true; }
    if (!this._cleaning && !["paused", "returning"].includes(status)) this._trailCaptured = false;

    // Dock
    const ds = S(E.dock)?.state, dk = VK_DOCKSTATUS[ds];
    this._dockAct = dk ? { kind: dk } : null;
    this.$("stSub").textContent = hasErr ? "· " + err : this._dockAct && status === "docked" ? "· " + VK_DOCKACT[dk].short : status === "docked" ? (bl >= 100 ? "· fully charged" : "· charging") : "";
    this.$("homeSub").textContent = status === "docked" ? "At the dock" : "Charge & care";
    this.$("rbGoto").hidden = !c.topic || c.go_to === false;   // go_to: false for robots without GoToLocationCapability (e.g. J15)
    this.$("rbStation").hidden = !E.dock && !E.tanks.length && !E.empty;
    this.$("rbCare").hidden = !E.consumables.length;
    this.$("rbCam").hidden = !this._cams.length && !this._rcamUrl;
    this.$("rbDrive").hidden = !this._driveOk();
    if (this._drv.on) this._drvStatus();

    this._renderClean(); this._renderStation(); this._renderCare(); this._renderActivity(); this._updateDock();
    if (wasCleaning !== this._cleaning) this._drawFx();
  }
  _tick(){
    if (this._sheet === "cams") this._renderCams();
    this._pollN++;
    const busy = this._drv.on || this._cleaning || ["returning", "paused"].includes(this._st.status) || this._dockAct;
    if (busy || this._pollN % 8 === 0) this._fetchMap();
  }
  async _fetchMap(){
    const E = this._ent, h = this._hass; if (!E || !h || this._mapBusy) return;
    const st = E.map && h.states[E.map];
    if (!st) { this.$("nomap").textContent = "No map entity found. Enable MQTT and Home Assistant autodiscovery in Valetudo, or set “map:” in the card."; return; }
    const url = st.attributes.entity_picture; if (!url) return;
    this._mapBusy = true;
    try {
      const r = await fetch(h.hassUrl ? h.hassUrl(url) : url, { cache: "no-store", credentials: "same-origin" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const m = await vkExtractMap(await r.arrayBuffer());
      const parsed = m && vkParseMap(m);
      if (parsed) { this._applyPending(parsed); const first = !this._model, segChanged = !this._model || this._model.sig !== parsed.sig; this._model = parsed;
        this.$("nomap").hidden = true;
        if (first) { this._refreshColors(); this._redraw(); } else { this._drawBase(); this._drawFx(); }
        if (segChanged) { this._renderCtx(); if (this._sheet === "rooms" && !this.shadowRoot.activeElement?.closest?.("#rnList")) this._renderRooms(); } }
      else if (!this._model) this.$("nomap").textContent = "The map has no data yet. Start a mapping run once.";
    } catch (e) { if (!this._model) this.$("nomap").textContent = "Could not load the map (" + e.message + ")."; }
    finally { this._mapBusy = false; }
  }

  /* ---------- Commands ---------- */
  async _svc(domain, service, data, ok){
    try { await this._hass.callService(domain, service, Object.assign(domain === "vacuum" ? { entity_id: this._config.entity } : {}, data)); if (ok) this._toast(ok, "ok"); }
    catch (e) { this._toast("Error: " + (e.message || e), "err"); }
    setTimeout(() => this._fetchMap(), 800);
  }
  _mqtt(cap, payload, ok){
    if (!this._config.topic) { this._toast("Set “topic:” in the card for rooms, zones and go-to", "err"); return; }
    return this._svc("mqtt", "publish", { topic: `${this._config.topic}/${cap}/set`, payload: typeof payload === "string" ? payload : JSON.stringify(payload) }, ok);
  }
  _select(id, option, ok){ return this._svc("select", "select_option", { entity_id: id, option }, ok); }
  _intent(){
    const st = this._st, n = st.selected.size;
    if (this._cleaning) return { label: "Pause", run: () => this._svc("vacuum", "pause", {}, "Paused") };
    if (st.gotoMode && st.goto) return { label: "Go here", run: () => { const g = st.goto; this._setGoto(false);
      this._mqtt("GoToLocationCapability/go", { coordinates: { x: Math.round(g.x), y: Math.round(g.y) } }, "Driving to the target"); } };
    if (st.mode === "rooms" && n) { const ids = [...st.selected];
      return { label: `Clean ${n} room${n > 1 ? "s" : ""}`, run: () => { st.selected.clear(); this._updateUI();
        this._mqtt("MapSegmentationCapability/clean", { segment_ids: ids, iterations: st.iterations, customOrder: true }, `Cleaning ${n} room${n > 1 ? "s" : ""}`); } }; }
    if (st.mode === "zone" && st.zone) { const z = this._normZone(st.zone), ps = this._model.pixelSize, R = Math.round;
      const pts = { pA: { x: R(z.x0 * ps), y: R(z.y0 * ps) }, pB: { x: R(z.x1 * ps), y: R(z.y0 * ps) }, pC: { x: R(z.x1 * ps), y: R(z.y1 * ps) }, pD: { x: R(z.x0 * ps), y: R(z.y1 * ps) } };
      return { label: "Clean zone", run: () => { st.zone = null; this._updateUI();
        this._mqtt("ZoneCleaningCapability/start", { zones: [{ points: pts }], iterations: st.iterations }, "Zone cleaning started"); } }; }
    if (st.status === "paused") return { label: "Resume", run: () => this._svc("vacuum", "start", {}, "Resumed") };
    if (st.mode === "rooms") return { label: "Pick rooms", run: () => this._toast("Tap rooms on the map first") };
    if (st.mode === "zone") return { label: "Draw a zone", run: () => this._toast("Draw a zone on the map first") };
    return { label: "Clean everything", run: () => this._svc("vacuum", "start", {}, "Full cleaning started") };
  }

  /* ---------- UI ---------- */
  _toast(msg, kind){ const t = document.createElement("div"); t.className = "toast glass" + (kind ? " " + kind : ""); t.textContent = msg; this.$("toasts").appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 2400); }
  _setMode(m){ const st = this._st; st.mode = m; st.zone = null; if (m !== "rooms") st.selected.clear();
    this.shadowRoot.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === m));
    this._stage.classList.toggle("zoning", m === "zone"); this._updateUI(); }
  _setGoto(on){ this._st.gotoMode = on; if (!on) this._st.goto = null; this.$("rbGoto").setAttribute("aria-pressed", on); this._updateUI(); }
  _toggleRoom(id){ if (this._st.mode !== "rooms") this._setMode("rooms"); const s = this._st.selected; s.has(id) ? s.delete(id) : s.add(id); vkBuzz(8); this._updateUI(); }
  _updateUI(){ this._renderCtx(); this._updateDock(); this._drawFx(); }
  _renderCtx(){
    const row = this.$("ctx"), st = this._st, M = this._model; let html = "";
    const prev = row.querySelector(".chips")?.scrollLeft || 0;
    if (st.gotoMode) html = st.goto ? `<span class="info glass">${vkIc("target")}<b>Target set</b> · press start to go <button data-act="clear" aria-label="Clear target">${vkIc("close")}</button></span>`
                                    : `<span class="info glass">${vkIc("target")}Tap a point on the map</span>`;
    else if (!M) html = `<span class="info glass">Loading map…</span>`;
    else if (st.mode === "rooms") { html = `<div class="chips">`;
      if (st.selected.size) { const a = M.segments.filter(s => st.selected.has(s.id)).reduce((x, s) => x + s.area, 0);
        html += `<button class="chip sum" data-act="clear">${vkIc("close")} ${st.selected.size} · ${vkNf1.format(a)} m²</button>`; }
      for (const s of M.segments) html += `<button class="chip" data-seg="${s.id}" aria-pressed="${st.selected.has(s.id)}"><span class="d" style="background:${s.color}"></span>${vkEsc(s.name)}<small>${(s.area < 10 ? vkNf1 : vkNf0).format(s.area)} m²</small></button>`;
      html += `</div>`; }
    else if (st.mode === "full") html = `<span class="info glass"><b>All ${M.segments.length} rooms</b> · ${vkNf0.format(M.totalArea)} m²</span>`;
    else if (st.mode === "zone") { if (st.zone && !this._ptr) { const z = this._normZone(st.zone), ps = M.pixelSize;
        html = `<span class="info glass"><b>Zone ${vkNf1.format((z.x1 - z.x0) * ps / 100)} × ${vkNf1.format((z.y1 - z.y0) * ps / 100)} m</b> <button data-act="clear" aria-label="Clear zone">${vkIc("close")}</button></span>`; }
      else html = `<span class="info glass">Drag a rectangle on the map</span>`; }
    row.innerHTML = html; const ch = row.querySelector(".chips"); if (ch) ch.scrollLeft = prev;
  }
  _updateDock(){
    const it = this._intent(), orb = this.$("bPlay"), st = this._st;
    orb.innerHTML = vkIc(this._cleaning ? "pause" : "play"); orb.title = it.label; orb.setAttribute("aria-label", it.label);
    orb.classList.toggle("busy", !!this._cleaning);
    this.$("bStop").hidden = !["cleaning", "paused", "returning"].includes(st.status);
    const n = st.mode === "rooms" ? st.selected.size : 0; this.$("badge").hidden = !n; this.$("badge").textContent = n;
    this.$("optTop").textContent = this._op ? (VK_OP[this._op.cur] || this._op.cur) : "Options";
    this.$("optSub").textContent = [this._fan && (VK_FAN[this._fan.cur] || this._fan.cur), st.iterations + "×"].filter(Boolean).join(" · ");
    this.$("cta").textContent = it.label;
    const t = this.shadowRoot.querySelector('#tabs [data-mode="zone"]'), r = this.shadowRoot.querySelector('#tabs [data-mode="rooms"]');
    t.hidden = r.hidden = !this._config.topic;
    if (!this._config.topic && st.mode !== "full") this._setMode("full");
  }
  _segBtns(el, items, cur, onPick, label, extra){
    el.innerHTML = "";
    items.forEach((p, i) => { const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-pressed", p === cur);
      b.innerHTML = (extra ? extra(i) : "") + `<span>${label ? label(p) : p}</span>`; b.addEventListener("click", () => onPick(p)); el.appendChild(b); });
  }
  _renderClean(){
    const lv = (i, n) => { const k = n <= 1 ? 4 : Math.round(i / (n - 1) * 4); let s = `<span class="lv">`; for (let j = 0; j < 4; j++) s += `<i class="${j < k ? "on" : ""}" style="height:${4 + j * 2.6}px"></i>`; return s + "</span>"; };
    const E = this._ent;
    this.$("gOp").hidden = !this._op;
    if (this._op) this._segBtns(this.$("segOp"), this._op.opts, this._op.cur, p => this._select(E.mode, p, VK_OP[p] || p), p => VK_OP[p] || p);
    this.$("gFan").hidden = !this._fan; this.$("vFan").textContent = this._fan ? (VK_FAN[this._fan.cur] || this._fan.cur) : "";
    if (this._fan) this._segBtns(this.$("segFan"), this._fan.opts, this._fan.cur,
      p => this._fan.vac ? this._svc("vacuum", "set_fan_speed", { fan_speed: p }, "Suction: " + (VK_FAN[p] || p)) : this._select(E.fan, p, "Suction: " + (VK_FAN[p] || p)),
      p => VK_FAN[p] || p, i => lv(i, this._fan.opts.length));
    this.$("gWater").hidden = !this._water; this.$("vWater").textContent = this._water ? (VK_WATER[this._water.cur] || this._water.cur) : "";
    if (this._water) this._segBtns(this.$("segWater"), this._water.opts, this._water.cur, p => this._select(E.water, p, "Water: " + (VK_WATER[p] || p)), p => VK_WATER[p] || p, i => lv(i + 1, this._water.opts.length + 1));
    this._segBtns(this.$("segIt"), [1, 2, 3], this._st.iterations, p => { this._st.iterations = p; this._renderClean(); this._updateDock(); }, p => p + "×");
  }
  _renderStation(){
    const E = this._ent, h = this._hass;
    this.$("gTanks").hidden = !E.tanks.length;
    this.$("tanks").innerHTML = E.tanks.map(id => { const s = h.states[id]; const [v, cls] = VK_DOCKVAL[s?.state] || [s?.state ?? "—", ""];
      return `<div class="tank ${cls}"><div class="k">${this._short(id)}</div><div class="v">${v}</div></div>`; }).join("");
    const tiles = [];
    if (E.empty || this._config.topic) tiles.push({ kind: "empty", icon: "bin", name: "Empty bin", sub: "Empty the dust bin",
      run: () => E.empty ? this._svc("button", "press", { entity_id: E.empty }, "Dock is emptying") : this._mqtt("AutoEmptyDockManualTriggerCapability/trigger", "PERFORM", "Dock is emptying") });
    // Mop wash / dry: Valetudo offers these only over REST → rest_command from the package
    const svcOk = n => { const [d, sv] = String(n).split("."); return !!h.services?.[d]?.[sv]; };
    const dockCmd = (n, kind, label) => { const [d, sv] = n.split("."), act = this._dockAct?.kind === kind ? "stop" : "start";
      return this._hass.callService(d, sv, { action: act }, undefined, false, d === "rest_command")
        .then(r => { const code = r?.response?.status; if (code && code >= 400) throw new Error("robot answered with HTTP " + code + (code === 400 ? " (maybe not possible right now, e.g. robot not docked)" : ""));
          this._toast(act === "stop" ? label + " stopped" : label + " started", "ok"); vkBuzz(10); })
        .catch(e => this._toast(label + " failed: " + (e.message || e), "err")); };
    const wash = this._config.mop_wash_service || "rest_command.vacuum_mop_wash", dry = this._config.mop_dry_service || "rest_command.vacuum_mop_dry";
    // Always shown (unless mop_buttons: false), so a missing setup is visible instead of silently hiding the tiles
    const setup = n => () => this._toast(`${n} not found: add it from vacuum.yaml (rest_command), set ROBOT_IP, restart HA`, "err");
    if (this._config.mop_buttons !== false) {
      tiles.push({ kind: "wash", icon: "care", name: "Wash mops", sub: svcOk(wash) ? "Clean the mop pads now" : "Setup needed · tap for info", off: !svcOk(wash), run: svcOk(wash) ? () => dockCmd(wash, "wash", "Mop wash") : setup(wash) });
      tiles.push({ kind: "dry", icon: "wind", name: "Dry mops", sub: svcOk(dry) ? "Start hot-air drying" : "Setup needed · tap for info", off: !svcOk(dry), run: svcOk(dry) ? () => dockCmd(dry, "dry", "Mop drying") : setup(dry) }); }
    tiles.push({ icon: "home", name: "Back to dock", sub: "Charge & care", run: () => this._svc("vacuum", "return_to_base", {}, "Returning to dock") });
    const box = this.$("tiles"); box.innerHTML = "";
    for (const t of tiles) { const run = t.kind && this._dockAct?.kind === t.kind, b = document.createElement("button");
      b.className = "tile" + (run ? " run" : "") + (t.off ? " off" : ""); b.innerHTML = `<span class="ti">${vkIc(t.icon)}</span><span><b>${t.name}</b><small>${run ? (t.kind === "empty" ? "Running…" : "Running… · tap to stop") : t.sub}</small></span>`;
      b.addEventListener("click", t.run); box.appendChild(b); }
  }
  _renderCare(){
    const h = this._hass, seen = new Map();
    for (const id of this._ent.consumables) { const s = h.states[id]; if (!s || !isFinite(parseFloat(s.state))) continue;
      const name = this._short(id), u = s.attributes.unit_of_measurement || "", val = parseFloat(s.state);
      const isPct = u === "%"; const info = { name, pct: isPct ? val : Math.max(0, Math.min(100, val / (u === "h" ? 5 : 300) * 100)),
        label: isPct ? vkNf0.format(val) + " %" : u === "h" ? vkNf1.format(val) + " h" : (val >= 60 ? Math.floor(val / 60) + " h " : "") + Math.round(val % 60) + " min" };
      if (!seen.has(name) || isPct) seen.set(name, info); }
    const list = [...seen.values()];
    const low = list.filter(c => c.pct < 25);
    const rb = this.$("rbCare"); rb.querySelector(".dot")?.remove(); if (low.length) rb.insertAdjacentHTML("beforeend", `<span class="dot"></span>`);
    const oi = this.$("bOpt").querySelector(".sic"); oi.querySelector(".dot")?.remove(); if (low.length) oi.insertAdjacentHTML("beforeend", `<span class="dot"></span>`);
    const worst = list.slice().sort((a, b) => a.pct - b.pct)[0];
    this.$("careSum").innerHTML = `<span class="ti">${vkIc("wrench")}</span><div><b>${worst ? (worst.pct < 25 ? worst.name + " due soon" : "All good") : "No data"}</b><small>${worst ? "Next up: " + worst.name + " · " + worst.label : ""}</small></div>`;
    this.$("cons").innerHTML = list.map(c => `<div class="c"><span class="nm">${c.name}</span><span class="vl">${c.label}</span><span class="bar"><i class="${c.pct < 10 ? "crit" : c.pct < 25 ? "low" : ""}" style="width:${c.pct}%"></i></span></div>`).join("");
  }
  _renderActivity(){
    const el = this.$("activity"), a = this._dockAct, was = el.hidden;
    el.hidden = !a;
    if (a && el.dataset.kind !== a.kind) { const d = VK_DOCKACT[a.kind];
      const anim = a.kind === "wash" ? '<span class="drop"></span><span class="drop"></span><span class="drop"></span>' : a.kind === "dry" ? `<span class="heat">${vkIc("wind")}</span>` : '<span class="swirl"></span>';
      el.className = "activity glass ui " + a.kind; el.dataset.kind = a.kind;
      el.innerHTML = `<span class="av">${anim}</span><span style="min-width:0;flex:1"><b>${d.title}</b><small>${d.sub}</small><span class="pb"><i></i></span></span>`; }
    if (!a) el.dataset.kind = "";
    if (was === !!a) setTimeout(() => this._redraw(), 60);
  }

  /* ---------- Sheets ---------- */
  _openSheet(name){ if (this._sheet === name) { this._closeSheet(); return; } this._showSheet(name); }
  _showSheet(name){
    this._sheet = name; this.$("shTitle").textContent = { clean: "Cleaning", station: "Dock", care: "Care", rooms: "Rename rooms", cams: "Cameras" }[name];
    if (name !== "rooms") { this._editSeg = null; this._drafts = {}; } else this._renderRooms();
    this._stage.classList.toggle("editing", name === "rooms");
    this.shadowRoot.querySelectorAll("#shTabs button").forEach(b => { b.setAttribute("aria-pressed", b.dataset.sec === name);
      b.hidden = (b.dataset.sec === "station" && this.$("rbStation").hidden) || (b.dataset.sec === "care" && this.$("rbCare").hidden) || (b.dataset.sec === "cams" && !this._cams.length && !this._rcamUrl); });
    if (name === "cams") this._renderCams(true);
    this.shadowRoot.querySelectorAll(".sh-body section").forEach(s => s.hidden = s.dataset.sec !== name);
    this.$("sheet").classList.add("open"); this._stage.classList.add("drawer");
    ["rbStation", "rbCare", "rbRooms", "rbCam"].forEach(id => this.$(id).setAttribute("aria-pressed", id === { station: "rbStation", care: "rbCare", rooms: "rbRooms", cams: "rbCam" }[name]));
    this._drawFx();
    if (name === "station") this._dvRun();
    setTimeout(() => this._redraw(), 30); setTimeout(() => this._redraw(), 420);
  }
  _closeSheet(){
    if (!this._sheet) return; this._sheet = null; this._editSeg = null; this._drafts = {};
    this.$("sheet").classList.remove("open"); this._stage.classList.remove("drawer", "editing");
    ["rbStation", "rbCare", "rbRooms", "rbCam"].forEach(id => this.$(id).setAttribute("aria-pressed", "false"));
    this.shadowRoot.activeElement?.blur?.(); this._drawFx();
    setTimeout(() => this._redraw(), 30); setTimeout(() => this._redraw(), 420);
  }

  /* ---------- Manual control (Valetudo Control integration: valetudo_control.*) ----------
     Joystick math follows the integration's own card: x/y in -1…1, dead zone 0.15,
     straight up/down = drive, sideways = turn on the spot, diagonal = drive in a curve. */
  _driveOk(){ return !!this._hass?.services?.valetudo_control?.send_command; }
  _driveSwitch(){ const h = this._hass, c = this._config.manual_control; if (c) return c;
    return Object.keys(h?.states || {}).find(id => id.startsWith("switch.") && /manual_control$/.test(id)); }
  async _setDrive(on){
    const D = this._drv; if (on === D.on) return;
    if (on) {
      if (!this._driveOk()) { this._toast("Install the Valetudo Control integration for manual control", "err"); return; }
      if (this._cleaning) { this._toast("Pause or stop the cleaning first", "err"); return; }
      this._closeSheet(); this._setGoto(false);
      D.on = true; D.enabled = false; D.failed = false; this._stage.classList.add("driving"); this.$("rbDrive").setAttribute("aria-pressed", "true");
      this._renderSpeed(); this._drvStatus(); setTimeout(() => this._redraw(), 30);
      this._drvKeys = e => this._drvKey(e); window.addEventListener("keydown", this._drvKeys); window.addEventListener("keyup", this._drvKeys);
      this._drvVis = () => { if (document.hidden) this._drvRelease(); }; document.addEventListener("visibilitychange", this._drvVis);
      this._drvTimer = setInterval(() => this._drvTick(), 250);
      try { await this._hass.callService("valetudo_control", "set_manual_control_state", { enable: true });
        // The integration does not report failures, so confirm via its "Manual Control" switch (if found)
        const sw = this._driveSwitch(), t0 = Date.now();
        while (D.on && sw && this._hass.states[sw]?.state !== "on" && Date.now() - t0 < 7000) await new Promise(r => setTimeout(r, 400));
        if (!D.on) return;
        if (sw && this._hass.states[sw]?.state !== "on") { D.failed = true; this._drvStatus(); return; }
        D.enabled = true; D.failed = false; vkBuzz(15); this._drvStatus(); }
      catch (e) { this._toast("Could not enable manual control: " + (e.message || e), "err"); this._setDrive(false); }
    } else {
      this._drvRelease(); D.on = false; D.enabled = false; D.keys.clear();
      clearInterval(this._drvTimer); window.removeEventListener("keydown", this._drvKeys); window.removeEventListener("keyup", this._drvKeys);
      document.removeEventListener("visibilitychange", this._drvVis);
      this._stage.classList.remove("driving"); this.$("rbDrive").setAttribute("aria-pressed", "false"); setTimeout(() => this._redraw(), 30);
      try { await this._hass.callService("valetudo_control", "send_command", { velocity: 0, angle: 0 }); } catch (_) {}
      try { await this._hass.callService("valetudo_control", "set_manual_control_state", { enable: false }); } catch (_) {}
    }
  }
  _drvStatus(){
    const D = this._drv, sw = this._driveSwitch(), st = sw && this._hass.states[sw]?.state;
    const on = D.enabled; this.$("drive").classList.toggle("on", on);
    this.$("dSt").textContent = on ? "Manual control on" : D.failed ? "Robot did not accept manual control" : "Enabling manual control…";
    if (D.failed) this.$("dVal").textContent = sw ? `${sw} stayed off. Check the HA log for valetudo_control.` : "";
  }
  _renderSpeed(){
    const D = this._drv, levels = [[.35, "Slow"], [.65, "Normal"], [1, "Fast"]];
    this._segBtns(this.$("segSpd"), levels.map(l => l[0]), D.spd, p => { D.spd = p; this._renderSpeed(); this._drvCalc(D.x, D.y); }, p => levels.find(l => l[0] === p)[1]);
    if (!levels.some(l => l[0] === D.spd)) { D.spd = .65; this._renderSpeed(); }
  }
  _drvCalc(x, y){
    const D = this._drv, dz = .15, ax = Math.abs(x), ay = Math.abs(y), n = v => Math.min(1, Math.max(0, v - dz) / (1 - dz)), clamp = v => Math.max(-1, Math.min(1, v));
    D.x = x; D.y = y;
    if (ax < dz && ay < dz) { D.v = 0; D.a = 0; }
    else if (ay > dz && ax < dz * 1.5) { D.v = clamp(n(ay) * D.spd * Math.sign(y)); D.a = 0; }
    else if (ax > dz && ay < dz * 1.5) { D.v = 0; D.a = x > 0 ? 90 : -90; }
    else { D.a = Math.atan2(y < 0 ? -x : x, y) * 180 / Math.PI; D.v = clamp(n(Math.hypot(x, y)) * D.spd * Math.sign(y)); }
    this.$("dVal").textContent = D.v || D.a ? `${D.v >= 0 ? "Forward" : "Back"} ${Math.round(Math.abs(D.v) * 100)} % · ${D.a > 0 ? "right" : D.a < 0 ? "left" : "straight"} ${Math.round(Math.abs(D.a))}°` : "Drag the stick · arrow keys / WASD";
    this._drvSend(false);
  }
  _drvSend(force){
    const D = this._drv; if (!D.on || !D.enabled) return;
    const v = Math.round((Math.abs(D.v) < .02 ? 0 : D.v) * 1000) / 1000, a = Math.round(D.a * 10) / 10, L = D.last, now = Date.now();
    const changed = L.v === null || Math.abs(v - L.v) > .02 || Math.abs(a - L.a) > 3;
    if (!force && !changed) return;
    if (v === 0 && a === 0 && L.v === 0 && L.a === 0) return;      // already stopped
    if (D.busy) { D.pend = true; return; }                          // one call at a time, latest value wins
    D.busy = true; L.v = v; L.a = a; L.t = now;
    this._hass.callService("valetudo_control", "send_command", { velocity: v, angle: a }).catch(() => {})
      .finally(() => { D.busy = false; if (D.pend) { D.pend = false; this._drvSend(true); } });
  }
  _drvTick(){ const D = this._drv; if (D.v || D.a) this._drvSend(true); }    // keep-alive while moving (like the integration: every 250 ms)
  _drvRelease(){
    const D = this._drv; this._drvJoy = null; this.$("joy").classList.remove("drag"); this.$("knob").style.transform = "";
    D.keys.clear(); this._drvCalc(0, 0); this._drvSend(true);
  }
  _bindJoystick(){
    const J = this.$("joy"), K = this.$("knob");
    const at = e => { const r = J.getBoundingClientRect(), R = r.width / 2; let dx = e.clientX - r.left - R, dy = e.clientY - r.top - R;
      const d = Math.hypot(dx, dy), max = R - 22; if (d > max) { dx *= max / d; dy *= max / d; }
      K.style.transform = `translate(${dx}px, ${dy}px)`; this._drvCalc(dx / max, -dy / max); };
    J.addEventListener("pointerdown", e => { if (!this._drv.enabled) return; e.preventDefault(); this._drvJoy = e.pointerId;
      try { J.setPointerCapture(e.pointerId); } catch (_) {} J.classList.add("drag"); vkBuzz(8); at(e); });
    J.addEventListener("pointermove", e => { if (this._drvJoy === e.pointerId) at(e); });
    const up = e => { if (this._drvJoy === e.pointerId) this._drvRelease(); };
    J.addEventListener("pointerup", up); J.addEventListener("pointercancel", up); J.addEventListener("lostpointercapture", up);
  }
  _drvKey(e){
    const D = this._drv, map = { ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" }, k = map[e.code];
    if (!k || !D.enabled || e.target?.closest?.("input, textarea") || e.composedPath?.().some(n => n.tagName === "INPUT" || n.tagName === "TEXTAREA")) return;
    e.preventDefault(); if (e.type === "keydown") D.keys.add(k); else D.keys.delete(k);
    const x = (D.keys.has("r") ? 1 : 0) - (D.keys.has("l") ? 1 : 0), y = (D.keys.has("u") ? 1 : 0) - (D.keys.has("d") ? 1 : 0);
    const max = this.$("joy").getBoundingClientRect().width / 2 - 22;
    this.$("knob").style.transform = x || y ? `translate(${x * max * (y ? .71 : 1)}px, ${-y * max * (x ? .71 : 1)}px)` : "";
    this._drvCalc(x, y);
    if (!x && !y) this._drvSend(true);
  }

  /* ---------- Cameras ---------- */
  _openRcam(){
    const u = this._rcamUrl, el = this.$("rcam"), fr = this.$("rcamFrame"), hint = this.$("rcamHint");
    this.$("rcamExt").href = u;
    // HA over https (e.g. remote) cannot embed an http page → show a note instead of an empty frame
    const blocked = location.protocol === "https:" && u.startsWith("http:");
    fr.hidden = blocked; hint.hidden = !blocked;
    if (blocked) hint.innerHTML = `Home Assistant is open over <b>https</b>, but the robot camera is only reachable over <b>http</b>, so the browser blocks embedding it.<br><br>Open Home Assistant via <code>http://</code> at home, or use the button at the top right to open it in a new tab.`;
    else if (fr.src !== u) fr.src = u;
    el.classList.add("open"); el.setAttribute("aria-hidden", "false"); vkBuzz(8);
  }
  _closeRcam(){ const el = this.$("rcam"); el.classList.remove("open"); el.setAttribute("aria-hidden", "true");
    setTimeout(() => { if (!el.classList.contains("open")) this.$("rcamFrame").removeAttribute("src"); }, 300); }   // stop the stream
  _moreInfo(entityId){ this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true })); }
  _renderCams(full){
    const box = this.$("cams"), h = this._hass; if (!h) return;
    const head = this._rcamUrl ? `<button class="cam robot" data-rcam="1"><span class="ph">${vkIc("camera")}<span>Live view from the robot</span></span><span class="cn"><i></i><span>Robot</span></span></button>` : "";
    const off0 = this._rcamUrl ? 1 : 0;
    if (full || box.children.length !== this._cams.length + off0) box.innerHTML = head + this._cams.map(c => `<button class="cam" data-cam="${vkEsc(c.entity)}"><span class="ph">No image</span><img alt="" hidden><span class="cn"><i></i><span></span></span></button>`).join("");
    this._cams.forEach((c, i) => { const st = h.states[c.entity], el = box.children[i + off0], img = el.querySelector("img");
      const off = !st || ["unavailable", "unknown", "off"].includes(st.state);
      el.classList.toggle("off", off); el.querySelector(".cn span").textContent = c.name || st?.attributes.friendly_name || c.entity;
      const pic = st?.attributes.entity_picture;
      if (pic && !off) { const u = (h.hassUrl ? h.hassUrl(pic) : pic) + (pic.includes("?") ? "&" : "?") + "t=" + Date.now();
        const pre = new Image(); pre.onload = () => { img.src = pre.src; img.hidden = false; }; pre.src = u; }
      else img.hidden = true; });
  }

  /* ---------- Rename rooms (Valetudo MapSegmentRenameCapability via a HA service) ---------- */
  _renameSvc(){
    const has = n => { const [d, sv] = n.split("."); return !!(d && sv && this._hass?.services?.[d]?.[sv]); };
    let n = String(this._config.rename_service || "rest_command.vacuum_rename_room");
    if (!this._config.rename_service && !has(n) && has("rest_command.vakuum_raum_umbenennen")) n = "rest_command.vakuum_raum_umbenennen";   // older package
    const [d, sv] = n.split("."); return { name: n, domain: d, service: sv, ok: has(n) }; }
  _curName(id){ const sg = this._model?.segments.find(x => x.id === id); return sg && sg.named ? sg.name : ""; }
  _applyPending(parsed){
    const P = this._pendNames, now = Date.now(); let touched = false;
    for (const sg of parsed.segments) { const p = P[sg.id]; if (!p) continue;
      if (sg.name === p.name || now - p.t > 120000) { delete P[sg.id]; continue; }
      sg.name = p.name; sg.named = true; touched = true; }
    if (touched) parsed.sig = parsed.segments.map(s => s.id + ":" + s.name).join("|");
  }
  _renderRooms(){
    const box = this.$("rnList"), M = this._model, R = this._renameSvc(), can = R.ok;
    if (!M) { box.innerHTML = `<p class="note">Loading map…</p>`; this.$("rnSuggWrap").hidden = true; return; }
    this.$("rnNote").textContent = can ? "Tap a room on the map or in the list, type a name and save. The name is stored in the robot and used everywhere, including the scripts."
                                       : "You can type names already, but saving needs a service that is not set up yet:";
    const help = this.$("rnHelp"); help.hidden = can;
    if (!can) help.innerHTML = `Service <code>${vkEsc(R.name)}</code> not found. The package <code>vacuum.yaml</code> has it under <code>rest_command:</code>. Replace <code>ROBOT_IP</code> there with the robot's IP address and restart Home Assistant.`;
    box.innerHTML = M.segments.map(sg => `<div class="rn${this._editSeg === sg.id ? " on" : ""}" data-id="${vkEsc(sg.id)}">
        <span class="d" style="background:${sg.color}"></span>
        <label class="rnf"><input id="rn-${vkEsc(sg.id)}" data-id="${vkEsc(sg.id)}" value="${vkEsc(this._drafts[sg.id] ?? this._curName(sg.id))}" placeholder="Room ${vkEsc(sg.id)}" maxlength="32" autocomplete="off" enterkeyhint="done">
          <small>${(sg.area < 10 ? vkNf1 : vkNf0).format(sg.area)} m² · Segment ${vkEsc(sg.id)}</small></label>
        <button class="rnsave" data-id="${vkEsc(sg.id)}" disabled>Save</button></div>`).join("");
    this.$("rnSugg").innerHTML = VK_ROOM_SUGG.map(n => `<button class="chip" data-sugg="${vkEsc(n)}">${vkEsc(n)}</button>`).join("");
    this.$("rnSuggWrap").hidden = false;
    this._updateRoomButtons();
  }
  _updateRoomButtons(){ const can = this._renameSvc().ok;
    this.shadowRoot.querySelectorAll("#rnList .rnsave").forEach(b => { const id = b.dataset.id, v = (this._drafts[id] ?? this._curName(id)).trim(); b.disabled = !can || !v || v === this._curName(id); }); }
  _focusRoom(id, fromList){
    this._editSeg = id; this.shadowRoot.querySelectorAll("#rnList .rn").forEach(r => r.classList.toggle("on", r.dataset.id === id));
    if (!fromList) { const inp = this.$("rn-" + id); if (inp) { inp.focus({ preventScroll: true }); inp.closest(".rn").scrollIntoView({ block: "nearest", behavior: this._reduce ? "auto" : "smooth" }); } }
    vkBuzz(8); this._drawFx();
  }
  async _saveRoom(id){
    const name = (this._drafts[id] ?? "").trim(), R = this._renameSvc(); if (!name || name === this._curName(id)) return;
    if (!R.ok) { this._toast("Service " + R.name + " is missing, see the note", "err"); return; }
    try {
      const data = { segment_id: String(id), name }, wantResp = R.domain === "rest_command";
      const res = await this._hass.callService(R.domain, R.service, data, undefined, false, wantResp);
      const code = res?.response?.status; if (code && code >= 400) throw new Error("Robot answered with HTTP " + code);
      delete this._drafts[id]; this._pendNames[id] = { name, t: Date.now() };
      const sg = this._model?.segments.find(x => x.id === id); if (sg) { sg.name = name; sg.named = true; this._model.sig = this._model.segments.map(s => s.id + ":" + s.name).join("|"); }
      this._toast("Saved: " + name, "ok"); vkBuzz(12); this._renderRooms(); this._renderCtx(); this._drawFx();
      setTimeout(() => this._fetchMap(), 1500); setTimeout(() => this._fetchMap(), 6000);
    } catch (e) { this._toast("Saving failed: " + (e.message || e), "err"); }
  }

  /* ---------- Renderer (affine 2D/3D projection) ---------- */
  _refreshColors(){
    const cs = getComputedStyle(this.$("root")), g = n => cs.getPropertyValue(n).trim();
    this._COL = { floor: g("--floor"), slab: g("--slab"), wallTop: g("--wall-top"), wallSide: g("--wall-side"), a1: g("--a1"), a2: g("--a2"),
      labelBg: g("--label-bg"), labelFg: g("--label-fg"), good: g("--good"), bad: g("--bad"), bg: g("--bg"), fg: g("--fg"),
      water: g("--water"), heat: g("--heat"), segAlpha: parseFloat(g("--seg-alpha")) || .7, font: cs.fontFamily || "sans-serif" };
  }
  _computeView(){
    const r = this._stage.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const cv of [this._cvB, this._cvF]) { const w = Math.round(r.width * dpr), hh = Math.round(r.height * dpr); if (cv.width !== w) cv.width = w; if (cv.height !== hh) cv.height = hh; }
    const V = this._view = { dpr, cw: r.width, ch: r.height, t: this._view3d, M: null, s: 1, wallH: 0 };
    const M0 = this._model; if (!M0 || !r.width) return;
    const top = this.$("top").getBoundingClientRect(), dock = this.$("dock").getBoundingClientRect(), railEl = this.$("rail"), rail = railEl.getBoundingClientRect(), railW = railEl.offsetWidth;
    const wide = r.width > 760, editing = this._sheet === "rooms", sheetR = editing ? this.$("sheet").getBoundingClientRect() : null;
    const drawer = this._sheet && wide ? 362 : editing && this._lay === "short" ? Math.max(0, r.right - sheetR.left) + 4 : 0;
    let bottom = r.bottom - (this._drv.on ? this.$("drive").getBoundingClientRect().top : dock.top) + 4; if (editing && this._lay === "phone") bottom = Math.max(bottom, r.bottom - sheetR.top + 8);
    const P = this._lay === "phone" ? { top: rail.bottom - r.top + 10, bottom, left: 10, right: 10 }
            : this._lay === "short" ? { top: Math.max(top.bottom, rail.bottom) - r.top + 8, bottom, left: 14, right: 14 + drawer }
            : { top: top.bottom - r.top + 14, bottom, left: wide ? 24 : 12, right: railW + (wide ? 32 : 20) + drawer };
    const t = this._view3d, th = t * 36 * Math.PI / 180, q = 1 - t * .44, cs = Math.cos(th), sn = Math.sin(th);
    const la = cs, lc = -sn, lb = sn * q, ld = cs * q;
    let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    for (const [u, v] of [[0, 0], [M0.W, 0], [0, M0.H], [M0.W, M0.H]]) { const x = la * u + lc * v, y = lb * u + ld * v;
      if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; }
    const wallH = t * 11, slab = t * 8, L = P.left, R = r.width - P.right, T = P.top + wallH, B = r.height - P.bottom - slab;
    const s = Math.max(.05, Math.min((R - L) / (mxx - mnx), (B - T) / (mxy - mny)));
    const ox = L + ((R - L) - (mxx - mnx) * s) / 2 - mnx * s, oy = T + ((B - T) - (mxy - mny) * s) / 2 - mny * s;
    const a = la * s, b = lb * s, c = lc * s, d = ld * s;
    V.base = { x0: ox + mnx * s, x1: ox + mxx * s, y0: oy + mny * s, y1: oy + mxy * s };
    this._clampZoom();
    const Z = this._zoom, z = Z.z;
    V.M = { a: a * z, b: b * z, c: c * z, d: d * z, e: (ox - (a * M0.minX + c * M0.minY)) * z + Z.tx, f: (oy - (b * M0.minX + d * M0.minY)) * z + Z.ty };
    V.s = s * z; V.wallH = wallH * z; V.z = z;
  }
  _layout(){
    const S = this._stage, r = S.getBoundingClientRect(); if (!r.width) return;
    const nl = r.height < 520 && r.width > r.height * 1.25 ? "short" : r.width <= 760 ? "phone" : "wide";
    if (S.dataset.lay !== nl) S.dataset.lay = nl; this._lay = nl;
    const xs = r.width < 380 ? "1" : "0"; if (S.dataset.xs !== xs) S.dataset.xs = xs;
    const tb = this.$("top").getBoundingClientRect().bottom - r.top;
    if (nl === "phone") { S.style.setProperty("--rail-top", (tb + 8) + "px"); S.style.setProperty("--toast-top", (tb + 62) + "px"); }
    else if (nl === "wide") { const rl = this.$("rail"), t = tb + 10, b = this.$("dock").getBoundingClientRect().top - r.top - 10;
      S.classList.remove("railc"); let h = rl.offsetHeight; if (h > b - t) { S.classList.add("railc"); h = rl.offsetHeight; }
      S.style.setProperty("--rail-y", Math.max(t, t + (b - t - h) / 2) + "px"); }
    else if (nl === "short") { S.style.setProperty("--rail-w", this.$("rail").offsetWidth + "px"); S.style.setProperty("--toast-top", (this.$("top").getBoundingClientRect().bottom - r.top + 10) + "px"); }
  }
  _clampZoom(){
    const V = this._view, B = V.base, Z = this._zoom, m = 50;
    Z.z = Math.min(6, Math.max(1, Z.z));
    if (Z.z <= 1.01) { Z.z = 1; Z.tx = 0; Z.ty = 0; }
    else { Z.tx = Math.min(V.cw - m - Z.z * B.x0, Math.max(m - Z.z * B.x1, Z.tx)); Z.ty = Math.min(V.ch - m - Z.z * B.y0, Math.max(m - Z.z * B.y1, Z.ty)); }
    const f = this.$("rbFit"); if (f.hidden !== (Z.z === 1)) f.hidden = Z.z === 1;
    this._stage.classList.toggle("zoomed", Z.z > 1);
  }
  _zoomAt(px, py, z){ const Z = this._zoom, z0 = Z.z, bx = (px - Z.tx) / z0, by = (py - Z.ty) / z0;
    Z.z = Math.min(6, Math.max(1, z)); Z.tx = px - Z.z * bx; Z.ty = py - Z.z * by; this._redraw(); }
  _resetZoom(){
    const Z = this._zoom, from = { ...Z }, t0 = performance.now(), dur = this._reduce ? 0 : 260;
    const f = now => { const k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
      Z.z = from.z + (1 - from.z) * e; Z.tx = from.tx * (1 - e); Z.ty = from.ty * (1 - e); if (k >= 1) { Z.z = 1; Z.tx = 0; Z.ty = 0; }
      this._redraw(); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  _proj(px, py){ const M = this._view.M; return [M.a * px + M.c * py + M.e, M.b * px + M.d * py + M.f]; }
  _projCm(x, y){ return this._proj(x / this._model.pixelSize, y / this._model.pixelSize); }
  _unproj(x, y){ const M = this._view.M, det = M.a * M.d - M.b * M.c, X = x - M.e, Y = y - M.f; return { x: (M.d * X - M.c * Y) / det, y: (-M.b * X + M.a * Y) / det }; }
  _setM(ctx, dy){ const M = this._view.M, r = this._view.dpr; ctx.setTransform(r * M.a, r * M.b, r * M.c, r * M.d, r * M.e, r * (M.f + dy)); }
  _normZone(z){ return { x0: Math.min(z.x0, z.x1), y0: Math.min(z.y0, z.y1), x1: Math.max(z.x0, z.x1), y1: Math.max(z.y0, z.y1) }; }
  _segAt(p){ const M = this._model; if (!M?.segIndex) return null; const ix = Math.floor(p.x) - M.minX, iy = Math.floor(p.y) - M.minY;
    if (ix < 0 || iy < 0 || ix >= M.W || iy >= M.H) return null; const s = M.segIndex[iy * M.W + ix]; return s ? M.idxToSeg[s] : null; }
  _redraw(){ if (!this._stage) return; this._layout(); this._computeView(); this._drawBase(); this._drawFx(); }
  _set3D(on){
    const from = this._view3d, to = on ? 1 : 0, t0 = performance.now(), dur = this._reduce ? 0 : 700;
    this._zoom.z = 1; this._zoom.tx = 0; this._zoom.ty = 0;
    this._view3d = to; this._setRail3d(); this._view3d = from;
    cancelAnimationFrame(this._a3);
    const f = now => { const k = dur ? Math.min(1, (now - t0) / dur) : 1, e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this._view3d = from + (to - from) * e; this._redraw(); if (k < 1) this._a3 = requestAnimationFrame(f); };
    this._a3 = requestAnimationFrame(f);
  }
  _drawBase(){
    const V = this._view, M = this._model, C = this._COL, ctx = this._bctx; if (!V) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this._cvB.width, this._cvB.height);
    if (!M || !V.M) return;
    if (V.t > .01) { ctx.fillStyle = C.slab; for (let k = Math.max(1, Math.round(V.t * 8)); k >= 1; k--) { this._setM(ctx, k * (V.z || 1)); ctx.fill(M.basePath); } }
    this._setM(ctx, 0); ctx.fillStyle = C.floor; ctx.fill(M.floorPath);
    for (const seg of M.segments) { ctx.fillStyle = vkHexA(seg.color, C.segAlpha); ctx.fill(seg.path); }
    const carpets = M.entities.filter(e => e.type === "carpet");
    if (carpets.length) { ctx.beginPath();
      for (const e of carpets) { for (let i = 0; i < e.points.length; i += 2) { const x = e.points[i] / M.pixelSize, y = e.points[i + 1] / M.pixelSize; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }
      ctx.fillStyle = vkHexA(C.fg, .06); ctx.fill(); const pat = this._carpetPattern(); if (pat) { ctx.fillStyle = pat; ctx.fill(); }
      ctx.lineWidth = 1 / V.s; ctx.strokeStyle = vkHexA(C.fg, .28); ctx.stroke(); }
    if (V.wallH > .6) { ctx.fillStyle = C.wallSide; for (let k = 0; k < Math.ceil(V.wallH); k++) { this._setM(ctx, -k); ctx.fill(M.wallPath); }
      this._setM(ctx, -V.wallH); ctx.fillStyle = C.wallTop; ctx.fill(M.wallPath); }
    else { this._setM(ctx, 0); ctx.fillStyle = C.wallTop; ctx.fill(M.wallPath); }
  }
  _carpetPattern(){
    const C = this._COL; if (this._cpat && this._cpatKey === C.fg) return this._cpat;
    const c = document.createElement("canvas"); c.width = c.height = 8; const g = c.getContext("2d");
    g.strokeStyle = vkHexA(C.fg, .24); g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 8); g.lineTo(8, 0); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(6, 10); g.lineTo(10, 6); g.stroke();
    const p = this._bctx.createPattern(c, "repeat"); try { p.setTransform(new DOMMatrix().scale(.4)); } catch (_) {}
    this._cpat = p; this._cpatKey = C.fg; return p;
  }
  _pill(ctx, x, y, text, active, k = 1){
    const C = this._COL; ctx.font = `600 ${Math.round(12 * k)}px ${C.font}`;
    const w = ctx.measureText(text).width + 20 * k, h = 24 * k;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2) : ctx.rect(x - w / 2, y - h / 2, w, h);
    if (active) { const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, C.a1); g.addColorStop(1, C.a2); ctx.fillStyle = g; } else ctx.fillStyle = C.labelBg;
    ctx.fill(); ctx.fillStyle = active ? "#fff" : C.labelFg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y + .5);
  }
  _drawFx(){
    const V = this._view, M = this._model, C = this._COL, ctx = this._fctx, st = this._st; if (!V) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this._cvF.width, this._cvF.height);
    if (!M || !V.M) return;
    const s = V.s, now = performance.now(), ps = M.pixelSize, rm = this._reduce;
    const editing = this._sheet === "rooms";
    const hl = editing ? (this._editSeg ? new Set([this._editSeg]) : null) : (st.selected.size && st.mode === "rooms" ? st.selected : null);
    if (hl) { this._setM(ctx, 0);
      for (const seg of M.segments) if (!hl.has(seg.id)) { ctx.fillStyle = vkHexA(C.bg, .5); ctx.fill(seg.path); }
      ctx.save(); ctx.shadowColor = C.a1; ctx.shadowBlur = 16 * V.dpr;
      for (const seg of M.segments) if (hl.has(seg.id)) { ctx.fillStyle = vkHexA(C.a1, .32); ctx.fill(seg.path); } ctx.restore(); }
    for (const e of M.entities) if (["no_go_area", "no_mop_area", "active_zone"].includes(e.type)) { this._setM(ctx, 0); ctx.beginPath();
      for (let i = 0; i < e.points.length; i += 2) { const x = e.points[i] / ps, y = e.points[i + 1] / ps; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
      const col = e.type === "active_zone" ? C.a1 : C.bad; ctx.fillStyle = vkHexA(col, .16); ctx.fill(); ctx.lineWidth = 1.4 / s; ctx.setLineDash([4 / s, 3 / s]); ctx.strokeStyle = col; ctx.stroke(); ctx.setLineDash([]); }
    // driving path + water trail
    const PT = vkSplitPaths(M.entities), hasPath = PT.clean.length + PT.travel.length > 0, wet = !!this._trailMop, hasCarpet = M.entities.some(e => e.type === "carpet");
    const lg = this.$("legend"), showLg = hasPath || hasCarpet; if (lg.hidden === showLg) lg.hidden = !showLg;
    this.$("lgVac").hidden = !PT.clean.length; this.$("lgMop").hidden = !wet || !PT.clean.length; this.$("lgTravel").hidden = !PT.travel.length; this.$("lgCarpet").hidden = !hasCarpet;
    if (hasPath) {
      const poly = pts => { for (let i = 0; i < pts.length / 2; i++) { const x = pts[2 * i] / ps, y = pts[2 * i + 1] / ps; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } };
      const trace = list => { ctx.beginPath(); for (const pts of list) poly(pts); };
      const tail = k => { const out = []; let left = k; for (let j = PT.clean.length - 1; j >= 0 && left > 0; j--) { const pts = PT.clean[j], n = pts.length / 2, from = Math.max(0, n - left); out.unshift(from ? pts.slice(from * 2) : pts); left -= n - from; } return out; };
      this._setM(ctx, 0); ctx.lineJoin = "round"; ctx.lineCap = "round";
      if (PT.travel.length) { trace(PT.travel); ctx.lineWidth = 1.2 / s; ctx.setLineDash([3 / s, 4 / s]); ctx.strokeStyle = vkHexA(C.fg, .4); ctx.stroke(); ctx.setLineDash([]); }
      if (PT.clean.length) {
        if (wet) { const band = 34 / ps;                                           // ~34 cm mop width
          trace(PT.clean); ctx.lineWidth = band; ctx.strokeStyle = vkHexA(C.water, .16); ctx.stroke();   // dried
          trace(tail(80)); ctx.strokeStyle = vkHexA(C.water, .2); ctx.stroke();                          // still damp
          trace(tail(24)); ctx.strokeStyle = vkHexA(C.water, .2); ctx.stroke();                          // fresh and wet
          trace(PT.clean); ctx.lineWidth = band * .22; ctx.setLineDash([10 / s, 34 / s]); ctx.lineDashOffset = -(now / 45) / s; ctx.strokeStyle = "rgba(255,255,255,.32)"; ctx.stroke(); ctx.setLineDash([]); }
        trace(PT.clean); ctx.lineWidth = 1.3 / s; ctx.strokeStyle = vkHexA(C.fg, wet ? .55 : .78); ctx.stroke(); } }
    if (st.zone) { const z = this._normZone(st.zone); this._setM(ctx, 0);
      ctx.fillStyle = vkHexA(C.a1, .2); ctx.fillRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0); ctx.lineWidth = 1.8 / s; ctx.strokeStyle = C.a1; ctx.strokeRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0);
      ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
      for (const [px, py] of [[z.x0, z.y0], [z.x1, z.y0], [z.x1, z.y1], [z.x0, z.y1]]) { const [x, y] = this._proj(px, py); ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.a1; ctx.stroke(); } }
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    if (PT.clean.length && wet) { const pts = [].concat(...PT.clean), n = pts.length / 2;
      for (let i = 3; i < n; i += 7) { const tw = rm ? .6 : .5 + .5 * Math.sin(now / 380 + i * 1.7), age = (n - i) / n;
        const [x, y] = this._proj(pts[2 * i] / ps + Math.sin(i * 12.9) * 2.4, pts[2 * i + 1] / ps + Math.cos(i * 7.3) * 2.4);
        ctx.beginPath(); ctx.arc(x, y, 1.1 + tw * 1.3, 0, 7); ctx.fillStyle = vkHexA(C.water, (.25 + tw * .6) * (1 - age * .7)); ctx.fill(); } }
    { const k = Math.max(.78, Math.min(1, V.s / 3.2)), placed = [];
      ctx.font = `600 ${Math.round(12 * k)}px ${C.font}`;
      const order = M.segments.slice().sort((p, q) => (hl && hl.has(q.id)) - (hl && hl.has(p.id)) || q.area - p.area);
      for (const seg of order) { const txt = (editing && this._drafts[seg.id]?.trim()) || seg.name, on = !!hl && hl.has(seg.id);
        let [x, y] = this._proj(seg.centroid.x, seg.centroid.y); const w = ctx.measureText(txt).width + 20 * k, h = 24 * k;
        const hit = yy => placed.some(r => Math.abs(r.x - x) < (r.w + w) / 2 + 2 && Math.abs(r.y - yy) < (r.h + h) / 2 + 2);
        let tries = 0; while (hit(y) && tries < 4) { y += (tries % 2 ? -1 : 1) * (h + 3) * (tries + 1); tries++; }
        if (hit(y) && !on) continue;
        placed.push({ x, y, w, h }); this._pill(ctx, x, y, txt, on, k); } }
    const ch = M.entities.find(e => e.type === "charger_location");
    if (ch && this._dockAct && !rm) { const [cx, cy] = this._projCm(ch.points[0], ch.points[1]), k = this._dockAct.kind, sq = 1 - V.t * .45;
      if (k === "wash") for (const off of [0, .33, .66]) { const ph = ((now / 1500) + off) % 1, rr = 10 + ph * 30; ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * sq, 0, 0, 7); ctx.strokeStyle = vkHexA(C.water, (1 - ph) * .75); ctx.lineWidth = 2; ctx.stroke(); }
      else if (k === "dry") { const pulse = .5 + .5 * Math.sin(now / 500), g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 42);
        g.addColorStop(0, vkHexA(C.heat, .2 + .45 * pulse)); g.addColorStop(1, vkHexA(C.heat, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 42, 0, 7); ctx.fill();
        for (let i = 0; i < 3; i++) { const ph = ((now / 1800) + i / 3) % 1; ctx.beginPath(); for (let j = 0; j <= 10; j++) { const yy = cy - 10 - ph * 30 - j * 1.6, xx = cx - 8 + i * 8 + Math.sin(j * .8 + now / 300) * 2; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
          ctx.strokeStyle = vkHexA(C.heat, (1 - ph) * .85); ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.stroke(); } }
      else if (k === "empty") for (let i = 0; i < 12; i++) { const ph = ((now / 1200) + i / 12) % 1, a = i * 2.4 + ph * 6, rr = 28 * (1 - ph);
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq - ph * 18, 1.7, 0, 7); ctx.fillStyle = vkHexA(C.a2, ph * .95); ctx.fill(); } }
    if (ch) { const [x, y0] = this._projCm(ch.points[0], ch.points[1]), y = y0 - V.t * 4; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 9, y - 9, 18, 18, 6) : ctx.rect(x - 9, y - 9, 18, 18);
      ctx.fillStyle = C.good; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 1.5, y - 5); ctx.lineTo(x - 3, y + .5); ctx.lineTo(x, y + .5); ctx.lineTo(x - 1.5, y + 5); ctx.lineTo(x + 3, y - .5); ctx.lineTo(x, y - .5); ctx.closePath(); ctx.fillStyle = "#fff"; ctx.fill(); }
    if (st.goto) { const [x, y] = this._projCm(st.goto.x, st.goto.y), ph = rm ? .5 : (now / 1200) % 1;
      ctx.beginPath(); ctx.arc(x, y, 8 + ph * 14, 0, 7); ctx.strokeStyle = vkHexA(C.a1, 1 - ph); ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fillStyle = C.a1; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#fff"; ctx.stroke(); }
    const rb = M.entities.find(e => e.type === "robot_position");
    if (rb) { const [x, y0] = this._projCm(rb.points[0], rb.points[1]), y = y0 - V.t * 7;
      const ang = (rb.metaData?.angle || 0) * Math.PI / 180, [x2, y2] = this._projCm(rb.points[0] + Math.cos(ang) * 40, rb.points[1] + Math.sin(ang) * 40), ha = Math.atan2(y2 - y0, x2 - x);
      ctx.beginPath(); ctx.ellipse(x, y0 + 2, 12, 12 * (1 - V.t * .45), 0, 0, 7); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill();
      if (this._cleaning && !rm) for (const off of [0, .5]) { const ph = ((now / 1600) + off) % 1; ctx.beginPath(); ctx.arc(x, y, 12 + ph * 26, 0, 7); ctx.strokeStyle = vkHexA(wet ? C.water : C.a1, (1 - ph) * .6); ctx.lineWidth = 2; ctx.stroke(); }
      const g = ctx.createRadialGradient(x - 4, y - 4, 1, x, y, 13); g.addColorStop(0, "#fff"); g.addColorStop(.35, C.a1); g.addColorStop(1, C.a2);
      ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#fff"; ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.rotate(ha); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(1.5, -3.5); ctx.lineTo(1.5, 3.5); ctx.closePath(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore(); }
  }

  /* ---------- Dock animation ---------- */
  _dvRun(){
    cancelAnimationFrame(this._dvRaf); this._dv.last = performance.now();
    const f = now => { this._dvFrame(now); if (this._sheet === "station" && this.isConnected) this._dvRaf = requestAnimationFrame(f); };
    this._dvRaf = requestAnimationFrame(f);
  }
  _dvFrame(now){
    const cv = this._cvD, r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(devicePixelRatio || 1, 2), W = r.width, H = r.height, C = this._COL, D = this._dv;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = this._dctx; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const dt = Math.min(.05, (now - D.last) / 1000); D.last = now;
    const k = this._dockAct?.kind || null, rm = this._reduce;
    if (!rm) D.rot += (k === "wash" ? 9 : k === "dry" ? 1.4 : 0) * dt;
    const R = Math.min(48, H * .25), cy = H * .4, cx1 = W / 2 - R - 12, cx2 = W / 2 + R + 12, by = cy + R * .6 + 10;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(W * .08, by - 4, W * .84, H - by - 38, 14) : ctx.rect(W * .08, by - 4, W * .84, H - by - 38); ctx.fillStyle = vkHexA(C.fg, .05); ctx.fill();
    if (k === "wash") { ctx.beginPath(); ctx.moveTo(W * .08, H - 42);
      for (let x = W * .08; x <= W * .92; x += 4) ctx.lineTo(x, by + 10 + Math.sin(x / 14 + now / 260) * 3 + Math.sin(x / 7 - now / 170) * 1.4);
      ctx.lineTo(W * .92, H - 42); ctx.closePath(); const g = ctx.createLinearGradient(0, by, 0, H - 42); g.addColorStop(0, vkHexA(C.water, .55)); g.addColorStop(1, vkHexA(C.water, .08)); ctx.fillStyle = g; ctx.fill(); }
    if (k === "dry") { const pulse = .6 + .4 * Math.sin(now / 600);
      for (const cx of [cx1, cx2]) { const g = ctx.createRadialGradient(cx, cy, R * .4, cx, cy, R * 1.9); g.addColorStop(0, vkHexA(C.heat, .5 * pulse)); g.addColorStop(1, vkHexA(C.heat, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.9, 0, 7); ctx.fill(); } }
    if (k === "empty") { ctx.strokeStyle = vkHexA(C.a2, .85); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(W / 2 - 26, 14); ctx.lineTo(W / 2 - 9, 36); ctx.moveTo(W / 2 + 26, 14); ctx.lineTo(W / 2 + 9, 36); ctx.stroke(); }
    if (!rm && k) { const emit = k === "wash" ? 3.2 : k === "dry" ? .45 : 2.4; for (let i = 0; i < Math.ceil(emit); i++) if (Math.random() < emit - i) D.parts.push(this._dvSpawn(k, W, H, cx1, cx2, cy, R)); }
    D.parts = D.parts.filter(p => (p.life -= dt) > 0 && p.kind === k).slice(-420);
    const behind = D.parts.filter(p => p.kind === "dry" || p.bubble), front = D.parts.filter(p => !(p.kind === "dry" || p.bubble));
    for (const p of behind) { this._dvStep(p, dt, W, H); this._dvDraw(ctx, p); }
    this._drawPad(ctx, cx1, cy, R, D.rot, k); this._drawPad(ctx, cx2, cy, R, -D.rot, k);
    for (const p of front) { this._dvStep(p, dt, W, H); this._dvDraw(ctx, p); }
    const d = k ? VK_DOCKACT[k] : null;
    this.$("dvT").textContent = d ? d.title : this._st.status === "docked" ? "Dock ready" : "Robot is out";
    this.$("dvS").textContent = d ? d.sub : "Mop pads clean and dry";
    this.$("dvBar").hidden = !k;
  }
  _drawPad(ctx, cx, cy, R, rot, k){
    const C = this._COL;
    ctx.save(); ctx.translate(cx, cy + 7); ctx.scale(1, .6); ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fillStyle = "#7c849c"; ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, .6); ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fillStyle = "#e4e8f3"; ctx.fill();
    ctx.rotate(rot); ctx.strokeStyle = "rgba(118,128,158,.5)"; ctx.lineWidth = 1.3;
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * .68, Math.sin(a) * R * .68); ctx.lineTo(Math.cos(a + .06) * R * .97, Math.sin(a + .06) * R * .97); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0, R * .6, 0, 7); ctx.fillStyle = "#262c40"; ctx.fill();
    ctx.fillStyle = "#3d4565"; for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.fillRect(R * .12, -R * .07, R * .4, R * .14); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0, 0, R * .12, 0, 7); ctx.fillStyle = "#d4d9e8"; ctx.fill(); ctx.rotate(-rot);
    if (k === "wash") { ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fillStyle = vkHexA(C.water, .3); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, R * .88, Math.PI * 1.1, Math.PI * 1.45); ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 3; ctx.stroke(); }
    if (k === "dry") { ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fillStyle = vkHexA(C.heat, .2); ctx.fill(); }
    ctx.restore();
  }
  _dvSpawn(k, W, H, cx1, cx2, cy, R){
    const cx = Math.random() < .5 ? cx1 : cx2;
    if (k === "wash") { if (Math.random() < .3) return { kind: k, bubble: true, x: W * .15 + Math.random() * W * .7, y: H - 46, life: 1.4, max: 1.4, r: 1 + Math.random() * 2 };
      const a = Math.random() * Math.PI * 2, out = cx === cx1 ? -1 : 1;
      return { kind: k, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R * .6, vx: out * (30 + Math.random() * 70), vy: -50 - Math.random() * 90, life: .8 + Math.random() * .5, max: 1.3, r: 1.4 + Math.random() * 1.8 }; }
    if (k === "dry") return { kind: k, x: cx + (Math.random() - .5) * R * 1.5, y: cy - R * .35, vy: -24 - Math.random() * 16, life: 1.6 + Math.random(), max: 2.6, ph: Math.random() * 6 };
    return { kind: k, ang: Math.random() * 6.28, rad: 30 + Math.random() * 80, x: W / 2, y: H - 48 - Math.random() * 18, life: 1.4 + Math.random() * .6, max: 2, r: 1 + Math.random() * 1.8 };
  }
  _dvStep(p, dt, W, H){
    if (p.kind === "wash") { if (p.bubble) { p.y -= 24 * dt; p.x += Math.sin(p.y / 6) * .4; } else { p.vy += 280 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
    else if (p.kind === "dry") { p.y += p.vy * dt; p.ph += dt * 3; }
    else { p.ang += dt * 4.4; p.rad *= Math.pow(.4, dt); p.y -= (H - 70) * dt * .55; p.x = W / 2 + Math.cos(p.ang) * p.rad; }
  }
  _dvDraw(ctx, p){
    const C = this._COL, f = Math.max(0, p.life / p.max);
    if (p.kind === "wash") { if (p.bubble) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 1, 0, 7); ctx.strokeStyle = vkHexA(C.water, .75 * f); ctx.lineWidth = 1; ctx.stroke(); }
      else { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * .8, p.r * 1.35, Math.atan2(p.vy, p.vx) + Math.PI / 2, 0, 7); ctx.fillStyle = vkHexA(C.water, .9 * Math.min(1, f * 1.6)); ctx.fill(); } }
    else if (p.kind === "dry") { ctx.beginPath(); for (let j = 0; j <= 8; j++) { const yy = p.y - j * 2.2, xx = p.x + Math.sin(p.ph + j * .7) * 3; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.strokeStyle = vkHexA(C.heat, .8 * Math.min(1, f * 1.5)); ctx.lineWidth = 1.7; ctx.lineCap = "round"; ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = vkHexA(C.a2, .9 * Math.min(1, f * 2)); ctx.fill(); }
  }
}

if (!customElements.get("vakuum-card")) customElements.define("vakuum-card", VakuumCard);
if (!customElements.get("vacuum-card")) customElements.define("vacuum-card", class extends VakuumCard {});   // English alias: type: custom:vacuum-card
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "vakuum-card"))
  window.customCards.push({ type: "vakuum-card", name: "Vacuum Card", description: "Valetudo robot vacuum: 2D/3D map, rooms, zones, dock, care, cameras, room editor", preview: false });
console.info(`%c VACUUM CARD %c ${VK_VERSION} `, "background:#5b53c9;color:#fff;border-radius:3px 0 0 3px;padding:2px 4px", "background:#0c8f95;color:#fff;border-radius:0 3px 3px 0;padding:2px 4px");
