import express from "express";
import cors from "cors";
import multer from "multer";
import net from "node:net";
import os from "node:os";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });

const PRINTERS_FILE = path.join(DATA_DIR, "printers.json");
const HISTORY_FILE = path.join(DATA_DIR, "printHistory.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch { return fallback; }
}
async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.json({ limit: "30mb" }));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// ---------- Helpers ----------

function getLocalSubnets() {
  const ifaces = os.networkInterfaces();
  const subnets = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        const parts = iface.address.split(".");
        subnets.push({ iface: name, address: iface.address, base: `${parts[0]}.${parts[1]}.${parts[2]}` });
      }
    }
  }
  return subnets;
}

function probeHost(ip, port, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, ip);
  });
}

async function scanSubnet(base, ports = [9100, 631], onProgress) {
  const found = [];
  const ips = Array.from({ length: 254 }, (_, i) => `${base}.${i + 1}`);
  const concurrency = 64;
  let cursor = 0;
  let done = 0;
  const total = ips.length;

  async function worker() {
    while (cursor < ips.length) {
      const ip = ips[cursor++];
      for (const port of ports) {
        const open = await probeHost(ip, port);
        if (open) {
          found.push({ ip, port });
          break;
        }
      }
      done++;
      if (onProgress && done % 16 === 0) onProgress(done, total);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return found;
}

// ---------- Routes ----------

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Network scan: scans every detected local subnet for open print ports.
app.get("/api/printers/network", async (req, res) => {
  const subnetParam = req.query.subnet; // e.g. "192.168.1"
  const subnets = subnetParam
    ? [{ base: subnetParam, iface: "manual", address: `${subnetParam}.x` }]
    : getLocalSubnets();

  if (subnets.length === 0) {
    return res.json({ subnets: [], printers: [] });
  }

  try {
    const all = [];
    for (const s of subnets) {
      const hits = await scanSubnet(s.base);
      hits.forEach(({ ip, port }) => {
        all.push({
          id: `net-${ip}`,
          name: `Network Printer ${ip}`,
          ip,
          port,
          location: `Subnet ${s.base}.0/24`,
          status: "online",
          type: "bw",
          discoveredVia: port === 631 ? "IPP" : "RAW/9100",
        });
      });
    }
    res.json({ subnets, printers: all });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Scan failed", message: String(e) });
  }
});

// Probe a single IP (used by Manual IP entry)
app.get("/api/printers/probe", async (req, res) => {
  const ip = String(req.query.ip || "");
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return res.status(400).json({ error: "Invalid IP" });
  const ports = [9100, 631, 515];
  for (const port of ports) {
    const open = await probeHost(ip, port, 800);
    if (open) return res.json({ ip, port, online: true, protocol: port === 631 ? "IPP" : port === 515 ? "LPD" : "RAW" });
  }
  res.json({ ip, online: false });
});

// Get all stored printers
app.get("/api/printers", async (_req, res) => {
  const printers = await readJson(PRINTERS_FILE, []);
  res.json(printers);
});

// Save a printer
app.post("/api/printers", async (req, res) => {
  const printers = await readJson(PRINTERS_FILE, []);
  const printer = { id: req.body.id || `p-${randomUUID().slice(0, 8)}`, ...req.body };
  const next = [printer, ...printers.filter(p => p.id !== printer.id)];
  await writeJson(PRINTERS_FILE, next);
  res.json(printer);
});

// Delete a saved printer
app.delete("/api/printers/:id", async (req, res) => {
  const printers = await readJson(PRINTERS_FILE, []);
  await writeJson(PRINTERS_FILE, printers.filter(p => p.id !== req.params.id));
  res.json({ ok: true });
});

// Send a print job to a printer over TCP port 9100 (RAW). Works with any IP printer that speaks RAW.
app.post("/api/print", upload.single("file"), async (req, res) => {
  try {
    const { printerIp, printerName, copies = 1, colorMode = "bw", pageSize = "A4", duplex = "false", userId = "anonymous", username = "anonymous" } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!printerIp) return res.status(400).json({ error: "printerIp required" });

    const filePath = req.file.path;
    const fileBuffer = await fs.readFile(filePath);

    const sent = await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(8000);
      socket.once("error", reject);
      socket.once("timeout", () => { socket.destroy(); reject(new Error("Connection timeout")); });
      socket.connect(9100, printerIp, () => {
        for (let i = 0; i < Number(copies); i++) socket.write(fileBuffer);
        socket.end();
      });
      socket.once("close", () => resolve(true));
    }).catch(err => ({ error: err.message }));

    const job = {
      id: randomUUID(),
      userId,
      username,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      printerName: printerName || `Printer @ ${printerIp}`,
      printerIP: printerIp,
      copies: Number(copies),
      colorMode,
      pageSize,
      duplex: duplex === "true" || duplex === true,
      status: sent === true ? "completed" : "failed",
      error: sent && sent.error ? sent.error : undefined,
      createdAt: new Date().toISOString(),
    };

    const history = await readJson(HISTORY_FILE, []);
    await writeJson(HISTORY_FILE, [job, ...history]);

    if (job.status === "completed") res.json({ ok: true, job });
    else res.status(502).json({ ok: false, job, error: job.error });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// History
app.get("/api/history", async (req, res) => {
  const history = await readJson(HISTORY_FILE, []);
  const { userId, printer, from, to } = req.query;
  let filtered = history;
  if (userId) filtered = filtered.filter(h => h.userId === userId);
  if (printer) filtered = filtered.filter(h => (h.printerName || "").toLowerCase().includes(String(printer).toLowerCase()));
  if (from) filtered = filtered.filter(h => h.createdAt >= from);
  if (to) filtered = filtered.filter(h => h.createdAt <= to);
  res.json(filtered);
});

// Stats
app.get("/api/stats", async (_req, res) => {
  const history = await readJson(HISTORY_FILE, []);
  const printerCount = {};
  history.forEach(h => { printerCount[h.printerName] = (printerCount[h.printerName] || 0) + 1; });
  const mostUsed = Object.entries(printerCount).sort((a, b) => b[1] - a[1])[0];
  res.json({
    totalPrints: history.length,
    activeUsers: new Set(history.map(h => h.userId)).size,
    mostUsedPrinter: mostUsed ? { name: mostUsed[0], count: mostUsed[1] } : null,
    byStatus: history.reduce((acc, h) => { acc[h.status] = (acc[h.status] || 0) + 1; return acc; }, {}),
  });
});

// Users (simple JSON store)
app.get("/api/users", async (_req, res) => res.json(await readJson(USERS_FILE, [])));
app.post("/api/users", async (req, res) => {
  const users = await readJson(USERS_FILE, []);
  const user = { id: req.body.id || `u-${randomUUID().slice(0, 8)}`, ...req.body };
  await writeJson(USERS_FILE, [user, ...users.filter(u => u.id !== user.id)]);
  res.json(user);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Print API running at http://0.0.0.0:${PORT}`);
  const subs = getLocalSubnets();
  console.log(`Detected local subnets: ${subs.map(s => s.base + ".0/24").join(", ") || "(none)"}`);
});
