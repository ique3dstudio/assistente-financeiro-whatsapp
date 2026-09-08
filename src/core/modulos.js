// Registro dos módulos do Life OS.
// Para adicionar um módulo novo: crie a pasta em src/modules/<id>/ seguindo o
// molde do módulo Água e acrescente o import na lista abaixo. Nada mais.
import habitos from "../modules/habitos/index.js";
import agua from "../modules/agua/index.js";
import metas from "../modules/metas/index.js";
import agenda from "../modules/agenda/index.js";
import diario from "../modules/diario/index.js";
import financas from "../modules/financas/index.js";

export const MODULOS = [habitos, agua, agenda, metas, financas, diario];

// Abas da barra inferior, na ordem da especificação.
export const ABAS = [
  { id: "hoje", nome: "Hoje", emoji: "☀️" },
  { id: "metas", nome: "Metas", emoji: "🎯" },
  { id: "corpo", nome: "Corpo", emoji: "💪" },
  { id: "dinheiro", nome: "Dinheiro", emoji: "💰" },
  { id: "eu", nome: "Eu", emoji: "🧠" },
];

export function acharModulo(id) {
  return MODULOS.find((modulo) => modulo.id === id);
}

// O dashboard nunca quebra por causa de um módulo só: se a tabela ainda não foi
// criada no Supabase, o card aparece marcado como indisponível.
export async function dashboard(usuario, desligados = []) {
  const cards = await Promise.all(
    MODULOS.filter((modulo) => !desligados.includes(modulo.id)).map(async (modulo) => {
      const base = { id: modulo.id, nome: modulo.nome, emoji: modulo.emoji };
      try {
        return { ...base, ...(await modulo.resumoDoDia(usuario)) };
      } catch (erro) {
        return { ...base, indisponivel: true, erro: erro.message };
      }
    })
  );

  return { cards };
}
