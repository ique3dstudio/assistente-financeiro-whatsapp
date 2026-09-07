import "dotenv/config";
import { interpretarMensagem } from "../src/core/ai.js";

const texto = process.argv.slice(2).join(" ");

if (!texto) {
  console.error('Uso: node scripts/test-ai.js "gastei 50 reais no mercado"');
  process.exit(1);
}

const resultado = await interpretarMensagem(texto);
console.log(resultado);
