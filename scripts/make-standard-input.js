// scripts/make-standard-input.js
const fs = require("fs");
const path = require("path");

function latestBuildInfo(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!files.length) throw new Error("Nenhum build-info em " + dir);
  return path.join(dir, files[0].f);
}

const biDir = path.join("artifacts", "build-info");
const biPath = latestBuildInfo(biDir);
console.log("Usando build-info:", biPath);

const raw = JSON.parse(fs.readFileSync(biPath, "utf8"));
if (!raw.input) throw new Error("Campo .input ausente no build-info");

const std = {
  language: "Solidity",
  sources: raw.input.sources,   // conteúdos literais
  settings: raw.input.settings  // mesmas opções do build (optimizer, evmVersion etc.)
};

const out = "timelock-standard-input.json";
fs.writeFileSync(out, JSON.stringify(std, null, 2), "utf8");
console.log("Gerado:", out);
