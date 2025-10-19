// scripts/make-standard-json.js
// Gera um Standard-JSON-Input a partir do build-info mais recente do Hardhat,
// garantindo que TODO source tenha { content } (sem "urls"), inclusive os de node_modules.

const fs = require("fs");
const path = require("path");

function findLatestBuildInfo(artifactsDir) {
  const buildInfoDir = path.join(artifactsDir, "build-info");
  const files = fs
    .readdirSync(buildInfoDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(buildInfoDir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (files.length === 0) {
    throw new Error("Nenhum build-info encontrado em artifacts/build-info");
  }
  return files[0];
}

function readJson(file) {
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw);
}

function ensureContentForSources(baseDir, input) {
  // Clona para não mutar o original
  const sources = JSON.parse(JSON.stringify(input.sources || {}));

  for (const [sourcePath, entry] of Object.entries(sources)) {
    // Se já tem content literal, ótimo
    if (entry && typeof entry.content === "string") continue;

    // Tenta resolver arquivo no disco e embutir o conteúdo
    let diskPath;
    if (sourcePath.startsWith("@")) {
      // biblioteca em node_modules
      diskPath = path.join(baseDir, "node_modules", sourcePath);
    } else {
      // caminho relativo ao projeto
      diskPath = path.join(baseDir, sourcePath);
    }

    if (!fs.existsSync(diskPath)) {
      // Alguns build-info trazem "urls": [ "…" ], mas o verificador não aceita.
      // Se existir .urls, não copiamos; preferimos tentar o arquivo local.
      // Se não achar, falhamos explicitamente para você corrigir o caminho.
      throw new Error(
        `Não foi possível localizar o arquivo no disco para inlining:\n` +
          `  source: ${sourcePath}\n  tentado: ${diskPath}\n` +
          `Verifique se o caminho existe no projeto ou em node_modules.`
      );
    }

    const content = fs.readFileSync(diskPath, "utf8");
    sources[sourcePath] = { content };
  }
  return sources;
}

function main() {
  const projectRoot = process.cwd();
  const artifactsDir = path.join(projectRoot, "artifacts");

  // Params CLI
  // ex.: node scripts/make-standard-json.js --out timelock-standard-input.json
  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--out");
  const outFile =
    outIdx >= 0 && args[outIdx + 1]
      ? args[outIdx + 1]
      : "standard-input.json"; // default

  const buildInfoFile = findLatestBuildInfo(artifactsDir);
  const buildInfo = readJson(buildInfoFile);

  if (!buildInfo.input || !buildInfo.solcVersion) {
    throw new Error(
      "build-info inválido: campos .input e/ou .solcVersion ausentes."
    );
  }

  // Inlinar todos os sources
  const sources = ensureContentForSources(projectRoot, buildInfo.input);

  // Montar Standard JSON com MESMAS settings do build
  const standardInput = {
    language: "Solidity",
    sources,                 // todos com { content }
    settings: buildInfo.input.settings || {},
  };

  // Dica no console: versão do solc a usar na UI
  console.log("solcVersion (use EXACTAMENTE esta na UI):", buildInfo.solcVersion);

  // Salvar arquivo
  const dest = path.isAbsolute(outFile) ? outFile : path.join(projectRoot, outFile);
  fs.writeFileSync(dest, JSON.stringify(standardInput, null, 2), "utf8");
  console.log("Standard-JSON escrito em:", dest);

  // Mostra algumas flags-chave para conferir na UI
  const s = standardInput.settings || {};
  const opt = (s.optimizer || {});
  console.log("optimizer.enabled:", opt.enabled);
  console.log("optimizer.runs   :", opt.runs);
  if ("viaIR" in s) console.log("viaIR            :", s.viaIR);
  if ("evmVersion" in s) console.log("evmVersion       :", s.evmVersion);
}

main();
