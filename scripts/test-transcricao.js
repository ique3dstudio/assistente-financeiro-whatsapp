import "dotenv/config";
import fs from "node:fs";
import { transcrever } from "../src/core/transcricao.js";

const caminho = process.argv[2];

if (!caminho) {
  console.error("Uso: node scripts/test-transcricao.js caminho/para/audio.ogg");
  process.exit(1);
}

const buffer = fs.readFileSync(caminho);
const texto = await transcrever(buffer, caminho.split("/").pop());
console.log(texto);
