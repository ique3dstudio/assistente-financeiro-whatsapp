// Registro dos módulos do Vida OS.
// Para adicionar um módulo novo: crie a pasta em src/modules/<id>/ seguindo o
// molde do módulo Água e acrescente o import na lista abaixo. Nada mais.
import agua from "../modules/agua/index.js";
import financas from "../modules/financas/index.js";

export const MODULOS = [agua, financas];

export function acharModulo(id) {
  return MODULOS.find((modulo) => modulo.id === id);
}

// O dashboard nunca quebra por causa de um módulo só: se a tabela ainda não foi
// criada no Supabase, o card aparece marcado como indisponível.
export async function dashboard(usuario) {
  const cards = await Promise.all(
    MODULOS.map(async (modulo) => {
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
