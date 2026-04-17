import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { zipSync } from "fflate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");
const isWatch = process.argv.includes("--watch");

function copyStatic() {
  const files = [
    ["src/manifest.json",        "dist/manifest.json"],
    ["src/popup/popup.html",     "dist/popup/popup.html"],
    ["src/popup/popup.css",      "dist/popup/popup.css"],
    ["src/results/results.html", "dist/results/results.html"],
    ["src/results/results.css",  "dist/results/results.css"],
  ];
  for (const [from, to] of files) {
    const f = path.join(root, from);
    const t = path.join(root, to);
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.copyFileSync(f, t);
  }
  const pub = path.join(root, "public");
  if (fs.existsSync(pub)) {
    for (const f of fs.readdirSync(pub)) {
      const src = path.join(pub, f);
      const dst = path.join(dist, f);
      if (fs.statSync(src).isFile()) fs.copyFileSync(src, dst);
    }
  }
  console.log("copied static files");
}

function collectDirEntries(dir, prefix = "") {
  const entries = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      Object.assign(entries, collectDirEntries(full, name));
    } else {
      entries[name] = new Uint8Array(fs.readFileSync(full));
    }
  }
  return entries;
}

function writeExtensionZip() {
  const downloadsDir = path.join(root, "downloads");
  fs.mkdirSync(downloadsDir, { recursive: true });
  const zipPath = path.join(downloadsDir, "creatorgraph-extension.zip");
  const archive = zipSync(collectDirEntries(dist, "creatorgraph"), { level: 9 });
  fs.writeFileSync(zipPath, Buffer.from(archive));
  console.log("  packaged downloads/creatorgraph-extension.zip");
}

const shared = {
  bundle: true,
  platform: "browser",
  target: "chrome110",
  minify: !isWatch,
  sourcemap: isWatch ? "inline" : false,
  logLevel: "info",
};

const entries = [
  { in: path.join(src, "background.ts"),           out: path.join(dist, "background.js") },
  { in: path.join(src, "scanner.ts"),              out: path.join(dist, "scanner.js") },
  { in: path.join(src, "popup", "popup.ts"),       out: path.join(dist, "popup", "popup.js") },
  { in: path.join(src, "results", "results.ts"),   out: path.join(dist, "results", "results.js") },
];

async function run() {
  fs.mkdirSync(path.join(dist, "popup"), { recursive: true });
  fs.mkdirSync(path.join(dist, "results"), { recursive: true });
  copyStatic();

  if (isWatch) {
    const ctxs = await Promise.all(
      entries.map(({ in: e, out }) =>
        esbuild.context({ ...shared, entryPoints: [e], outfile: out })
      )
    );
    await Promise.all(ctxs.map((c) => c.watch()));
    console.log("watching...");
    process.on("SIGINT", async () => {
      await Promise.all(ctxs.map((c) => c.dispose()));
      process.exit(0);
    });
  } else {
    await Promise.all(
      entries.map(({ in: e, out }) =>
        esbuild.build({ ...shared, entryPoints: [e], outfile: out })
      )
    );
    console.log("build complete -> dist/");
  }
  writeExtensionZip();
}

run().catch((e) => { console.error(e); process.exit(1); });
