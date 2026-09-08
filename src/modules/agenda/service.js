import { getSupabase } from "../../core/supabase.js";
import { hoje, horaAgora, somarDias } from "../../core/datas.js";
import { PRIORIDADES, TIPOS, conflitos, faltaTexto, minutosDoDia, ocorrencias, somarMinutos } from "./regras.js";

const CAMPOS_EVENTO = [
  "titulo", "tipo", "data", "hora", "duracao_min", "dia_inteiro",
  "local", "participantes", "pauta", "notas", "recorrencia", "lembretes", "meta_id",
];
const CAMPOS_TAREFA = ["titulo", "nota", "prazo", "hora", "prioridade", "periodo", "meta_id", "evento_id"];

function limpar(dados, campos) {
  const limpos = Object.fromEntries(Object.entries(dados).filter(([chave]) => campos.includes(chave)));
  for (const [chave, valor] of Object.entries(limpos)) {
    if (valor === "") limpos[chave] = null;
  }
  if (limpos.duracao_min) limpos.duracao_min = Number(limpos.duracao_min);
  if (limpos.prioridade) limpos.prioridade = Number(limpos.prioridade);
  return limpos;
}

// ---------- eventos ----------

export async function criarEvento(usuario, dados) {
  if (!dados.titulo?.trim()) throw new Error("O compromisso precisa de um título");
  if (!dados.data) throw new Error("O compromisso precisa de uma data");
  if (dados.tipo && !TIPOS.some((t) => t.id === dados.tipo)) throw new Error("Tipo de compromisso inválido");

  const { data, error } = await getSupabase()
    .from("agenda_eventos")
    .insert({ user_id: usuario, ...limpar(dados, CAMPOS_EVENTO) })
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar compromisso: ${error.message}`);
  return data;
}

export async function atualizarEvento(usuario, id, dados) {
  const { data, error } = await getSupabase()
    .from("agenda_eventos")
    .update(limpar(dados, CAMPOS_EVENTO))
    .eq("user_id", usuario)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar compromisso: ${error.message}`);
  return data;
}

export async function excluirEvento(usuario, id) {
  const { error } = await getSupabase().from("agenda_eventos").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir compromisso: ${error.message}`);
  return { ok: true };
}

// Todos os eventos que podem cair no intervalo, já com a recorrência expandida.
async function eventosNoIntervalo(usuario, deISO, ateISO) {
  const { data, error } = await getSupabase()
    .from("agenda_eventos")
    .select("*")
    .eq("user_id", usuario)
    .lte("data", ateISO);

  if (error) throw new Error(`Falha ao ler agenda: ${error.message}`);

  const expandidos = [];
  for (const evento of data) {
    for (const dataOcorrencia of ocorrencias(evento, deISO, ateISO)) {
      const tipo = TIPOS.find((t) => t.id === evento.tipo) || TIPOS[3];
      expandidos.push({
        ...evento,
        data: dataOcorrencia,
        repetido: dataOcorrencia !== evento.data,
        emoji: tipo.emoji,
        cor: tipo.cor,
        tipo_nome: tipo.nome,
        hora_fim: evento.hora ? somarMinutos(evento.hora.slice(0, 5), evento.duracao_min || 60) : null,
        hora: evento.hora ? evento.hora.slice(0, 5) : null,
      });
    }
  }

  return expandidos.sort(
    (a, b) => a.data.localeCompare(b.data) || (minutosDoDia(a.hora) ?? 1441) - (minutosDoDia(b.hora) ?? 1441)
  );
}

export async function eventosDoDia(usuario, data = hoje()) {
  return eventosNoIntervalo(usuario, data, data);
}

// Os próximos compromissos, com contagem regressiva — bloco da tela Hoje.
export async function proximos(usuario, quantidade = 3, dias = 14) {
  const hojeISO = hoje();
  const agora = horaAgora() * 60;
  const eventos = await eventosNoIntervalo(usuario, hojeISO, somarDias(hojeISO, dias));

  return eventos
    .filter((evento) => evento.data > hojeISO || evento.dia_inteiro || (minutosDoDia(evento.hora) ?? 1441) >= agora - 60)
    .slice(0, quantidade)
    .map((evento) => {
      const diasAte = Math.round((Date.parse(`${evento.data}T12:00:00Z`) - Date.parse(`${hojeISO}T12:00:00Z`)) / 86400000);
      const minutos = evento.hora ? diasAte * 1440 + minutosDoDia(evento.hora) - agora : null;
      return { ...evento, dias_ate: diasAte, falta: evento.hora ? faltaTexto(minutos) : diasAte === 0 ? "hoje" : `em ${diasAte} dias` };
    });
}

// ---------- tarefas ----------

export async function criarTarefa(usuario, dados) {
  if (!dados.titulo?.trim()) throw new Error("A tarefa precisa de um título");

  const { data, error } = await getSupabase()
    .from("tarefas")
    .insert({ user_id: usuario, ...limpar(dados, CAMPOS_TAREFA) })
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar tarefa: ${error.message}`);
  return data;
}

export async function atualizarTarefa(usuario, id, dados) {
  const { data, error } = await getSupabase()
    .from("tarefas")
    .update(limpar(dados, CAMPOS_TAREFA))
    .eq("user_id", usuario)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar tarefa: ${error.message}`);
  return data;
}

export async function concluirTarefa(usuario, id, concluida = true) {
  const { data, error } = await getSupabase()
    .from("tarefas")
    .update({ concluida_em: concluida ? hoje() : null })
    .eq("user_id", usuario)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao concluir tarefa: ${error.message}`);
  return data;
}

export async function excluirTarefa(usuario, id) {
  const { error } = await getSupabase().from("tarefas").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir tarefa: ${error.message}`);
  return { ok: true };
}

export async function tarefas(usuario, { incluirConcluidas = false } = {}) {
  let consulta = getSupabase()
    .from("tarefas")
    .select("*")
    .eq("user_id", usuario)
    .order("prazo", { nullsFirst: false })
    .order("prioridade");

  if (!incluirConcluidas) consulta = consulta.is("concluida_em", null);

  const { data, error } = await consulta;
  if (error) throw new Error(`Falha ao ler tarefas: ${error.message}`);

  const hojeISO = hoje();
  return data.map((tarefa) => ({
    ...tarefa,
    hora: tarefa.hora ? tarefa.hora.slice(0, 5) : null,
    atrasada: Boolean(tarefa.prazo && !tarefa.concluida_em && tarefa.prazo < hojeISO),
    prioridade_info: PRIORIDADES.find((p) => p.id === tarefa.prioridade) || PRIORIDADES[1],
  }));
}

// Tarefas que entram no checklist de hoje: vencendo hoje, atrasadas ou sem prazo
// mas de prioridade alta.
export async function tarefasDoDia(usuario, data = hoje()) {
  const lista = await tarefas(usuario, { incluirConcluidas: true });

  return lista.filter((tarefa) => {
    if (tarefa.concluida_em) return tarefa.concluida_em === data;
    if (tarefa.prazo) return tarefa.prazo <= data;
    return tarefa.prioridade === 1;
  });
}

export async function painel(usuario) {
  const hojeISO = hoje();
  const [eventos, lista] = await Promise.all([
    eventosNoIntervalo(usuario, hojeISO, somarDias(hojeISO, 30)),
    tarefas(usuario, { incluirConcluidas: false }),
  ]);

  return {
    data: hojeISO,
    tipos: TIPOS,
    prioridades: PRIORIDADES,
    eventos,
    tarefas: lista,
    conflitos_hoje: conflitos(eventos.filter((e) => e.data === hojeISO)),
  };
}
