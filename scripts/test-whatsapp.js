import "dotenv/config";
import { enviarMensagem } from "../src/services/whatsapp.js";

const numero = process.argv[2];
const texto = process.argv.slice(3).join(" ") || "Mensagem de teste do assistente financeiro!";

if (!numero) {
  console.error('Uso: node scripts/test-whatsapp.js 5511999999999 "mensagem opcional"');
  process.exit(1);
}

const resultado = await enviarMensagem(numero, texto);
console.log(resultado);
