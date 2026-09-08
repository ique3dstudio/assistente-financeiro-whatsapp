// A tela Hoje é uma montagem: cada módulo entrega seus itens de checklist e seu
// anel de progresso, e aqui isso vira uma única lista ordenada por período.
// Um módulo novo aparece na tela Hoje sem precisar mexer neste arquivo.
import { MODULOS } from "./modulos.js";
import { hoje, horaAgora, saudacao } from "./datas.js";
import { lerPerfil } from "./perfil.js";

const PERIODOS = [
  { id: "manha", nome: "Manhã" },
  { id: "tarde", nome: "Tarde" },
  { id: "noite", nome: "Noite" },
  { id: "qualquer", nome: "Quando der" },
];

const HORA_FECHAMENTO = 20;

async function comSeguranca(rotulo, funcao) {
  try {
    return { valor: await funcao() };
  } catch (erro) {
    return { erro: `${rotulo}: ${erro.message}` };
  }
}

export async function montarHoje(usuario) {
  const data = hoje();
  const hora = horaAgora();

  const perfilRes = await comSeguranca("perfil", () => lerPerfil(usuario));
  const perfil = perfilRes.valor || {};
  const desligados = perfil.modulos_inativos || [];
  const ativos = MODULOS.filter((m) => !desligados.includes(m.id));

  const resultados = await Promise.all(
    ativos.map(async (modulo) => ({
      modulo,
      resumo: await comSeguranca(modulo.nome, () => modulo.resumoDoDia(usuario, data)),
      itens: modulo.itensDoDia
        ? await comSeguranca(modulo.nome, () => modulo.itensDoDia(usuario, data))
        : { valor: [] },
      compromissos: modulo.compromissosDoDia
        ? await comSeguranca(modulo.nome, () => modulo.compromissosDoDia(usuario, data))
        : { valor: [] },
    }))
  );

  const aneis = [];
  const itens = [];
  const compromissos = [];
  const erros = [];

  for (const { modulo, resumo, itens: lista, compromissos: agenda } of resultados) {
    const base = { id: modulo.id, nome: modulo.nome, emoji: modulo.emoji };
    if (resumo.erro) {
      aneis.push({ ...base, indisponivel: true, erro: resumo.erro });
      erros.push(resumo.erro);
    } else {
      aneis.push({ ...base, ...resumo.valor });
    }

    if (lista.erro) erros.push(lista.erro);
    else itens.push(...(lista.valor || []));

    if (agenda.erro) erros.push(agenda.erro);
    else compromissos.push(...(agenda.valor || []));
  }

  const periodos = PERIODOS.map((periodo) => ({
    ...periodo,
    itens: itens.filter((item) => (item.periodo || "qualquer") === periodo.id),
  })).filter((periodo) => periodo.itens.length > 0);

  const feitos = itens.filter((item) => item.concluido).length;
  const habitos = aneis.find((anel) => anel.id === "habitos");

  return {
    data,
    hora,
    saudacao: saudacao(hora),
    nome: perfil.nome || null,
    sequencia_geral: habitos?.sequencia || 0,
    aneis,
    compromissos,
    periodos,
    total: itens.length,
    feitos,
    progresso: itens.length ? feitos / itens.length : 0,
    mostrar_fechamento: hora >= HORA_FECHAMENTO,
    erros,
  };
}
