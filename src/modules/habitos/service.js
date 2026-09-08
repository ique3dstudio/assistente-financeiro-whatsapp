import { getSupabase } from "../../core/supabase.js";
import { hoje, somarDias, ultimosDias } from "../../core/datas.js";
import { calcularStreak, descreverFrequencia, devido, diaBom, inicioDaSemana } from "./regras.js";

const PERIODOS = ["manha", "tarde", "noite", "qualquer"];
const JANELA_DIAS = 400;

const CAMPOS_EDITAVEIS = [
  "nome",
  "emoji",
  "cor",
  "periodo",
  "horario",
  "duracao_min",
  "frequencia",
  "meta_qtd",
  "unidade",
  "nao_negociavel",
  "ordem",
  "ativo",
];

function validar(dados) {
  if (!dados.nome || !String(dados.nome).trim()) throw new Error("O hábito precisa de um nome");
  if (dados.periodo && !PERIODOS.includes(dados.periodo)) throw new Error("Período inválido");

  const tipo = dados.frequencia?.tipo;
  if (tipo && !["diaria", "dias_semana", "vezes_semana", "cada_n_dias"].includes(tipo)) {
    throw new Error("Frequência inválida");
  }
  if (tipo === "dias_semana" && !(dados.frequencia.dias || []).length) {
    throw new Error("Escolha pelo menos um dia da semana");
  }
}

function apenasEditaveis(dados) {
  return Object.fromEntries(
    Object.entries(dados).filter(([chave]) => CAMPOS_EDITAVEIS.includes(chave))
  );
}

export async function criar(usuario, dados) {
  validar(dados);

  const { data, error } = await getSupabase()
    .from("habitos")
    .insert({ user_id: usuario, ...apenasEditaveis(dados) })
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar hábito: ${error.message}`);
  return data;
}

export async function atualizar(usuario, id, dados) {
  if (dados.nome !== undefined || dados.frequencia !== undefined || dados.periodo !== undefined) {
    validar({ nome: dados.nome ?? "ok", ...dados });
  }

  const { data, error } = await getSupabase()
    .from("habitos")
    .update(apenasEditaveis(dados))
    .eq("user_id", usuario)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar hábito: ${error.message}`);
  return data;
}

// Arquivar em vez de apagar: o histórico do que você já fez continua valendo.
export async function arquivar(usuario, id) {
  return atualizar(usuario, id, { ativo: false });
}

export async function excluir(usuario, id) {
  const { error } = await getSupabase().from("habitos").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir hábito: ${error.message}`);
  return { ok: true };
}

// Uma leitura só do banco alimenta checklist, sequências e heatmap.
async function carregarJanela(usuario, dias = JANELA_DIAS) {
  const supabase = getSupabase();
  const desde = somarDias(hoje(), -dias);

  const [habitosRes, logsRes, folgasRes] = await Promise.all([
    supabase.from("habitos").select("*").eq("user_id", usuario).order("ordem").order("criado_em"),
    supabase.from("habitos_log").select("habito_id, data, concluido, quantidade").eq("user_id", usuario).gte("data", desde),
    supabase.from("habitos_folgas").select("habito_id, data").eq("user_id", usuario).gte("data", desde),
  ]);

  for (const resposta of [habitosRes, logsRes, folgasRes]) {
    if (resposta.error) throw new Error(`Falha ao ler hábitos: ${resposta.error.message}`);
  }

  const porHabito = new Map();
  for (const habito of habitosRes.data) {
    porHabito.set(habito.id, {
      concluidos: new Set(),
      folgas: new Set(),
      quantidades: new Map(),
      feitosPorSemana: {},
    });
  }

  for (const log of logsRes.data) {
    const dados = porHabito.get(log.habito_id);
    if (!dados || !log.concluido) continue;
    dados.concluidos.add(log.data);
    if (log.quantidade !== null) dados.quantidades.set(log.data, Number(log.quantidade));
    const semana = inicioDaSemana(log.data);
    dados.feitosPorSemana[semana] = (dados.feitosPorSemana[semana] || 0) + 1;
  }

  for (const folga of folgasRes.data) {
    const dados = porHabito.get(folga.habito_id);
    if (dados) dados.folgas.add(folga.data);
  }

  return { habitos: habitosRes.data, porHabito };
}

function montarItem(habito, dados, data) {
  const semana = inicioDaSemana(data);
  const concluido = dados.concluidos.has(data);

  return {
    id: habito.id,
    nome: habito.nome,
    emoji: habito.emoji,
    cor: habito.cor,
    periodo: habito.periodo,
    horario: habito.horario ? habito.horario.slice(0, 5) : null,
    duracao_min: habito.duracao_min,
    meta_qtd: habito.meta_qtd === null ? null : Number(habito.meta_qtd),
    unidade: habito.unidade,
    nao_negociavel: habito.nao_negociavel,
    frequencia: habito.frequencia,
    frequencia_texto: descreverFrequencia(habito.frequencia),
    concluido,
    quantidade: dados.quantidades.get(data) ?? null,
    de_folga: dados.folgas.has(data),
    feitos_na_semana: dados.feitosPorSemana[semana] || 0,
    streak: calcularStreak(habito, dados, data),
  };
}

export async function checklist(usuario, data = hoje()) {
  const { habitos, porHabito } = await carregarJanela(usuario);

  const itens = habitos
    .filter((habito) => habito.ativo)
    .map((habito) => ({ habito, dados: porHabito.get(habito.id) }))
    .filter(({ habito, dados }) =>
      devido(habito, data, {
        feitoNoDia: dados.concluidos.has(data),
        feitosNaSemana: dados.feitosPorSemana[inicioDaSemana(data)] || 0,
      })
    )
    .map(({ habito, dados }) => montarItem(habito, dados, data));

  const ordem = { manha: 0, tarde: 1, noite: 2, qualquer: 3 };
  itens.sort(
    (a, b) =>
      ordem[a.periodo] - ordem[b.periodo] ||
      (a.horario || "99").localeCompare(b.horario || "99") ||
      a.nome.localeCompare(b.nome)
  );

  const feitos = itens.filter((item) => item.concluido).length;

  return {
    data,
    itens,
    total: itens.length,
    feitos,
    progresso: itens.length ? feitos / itens.length : 0,
    sequencia_geral: sequenciaGeral(habitos, porHabito, data),
  };
}

// Dias bons consecutivos, olhando todos os hábitos juntos.
function sequenciaGeral(habitos, porHabito, hojeISO, janela = 400) {
  const ativos = habitos.filter((h) => h.ativo);
  let sequencia = 0;

  for (let i = 0; i < janela; i++) {
    const data = somarDias(hojeISO, -i);

    const doDia = ativos
      .map((habito) => ({ habito, dados: porHabito.get(habito.id) }))
      .filter(({ habito, dados }) =>
        devido(habito, data, {
          feitoNoDia: dados.concluidos.has(data),
          feitosNaSemana: dados.feitosPorSemana[inicioDaSemana(data)] || 0,
        })
      )
      .map(({ habito, dados }) => ({
        nao_negociavel: habito.nao_negociavel,
        concluido: dados.concluidos.has(data) || dados.folgas.has(data),
      }));

    if (doDia.length === 0) continue;

    if (diaBom(doDia)) sequencia++;
    else if (i === 0) continue; // hoje ainda em aberto
    else break;
  }

  return sequencia;
}

export async function marcar(usuario, habitoId, { concluido = true, quantidade = null, nota = null } = {}, data = hoje()) {
  const supabase = getSupabase();

  if (!concluido) {
    const { error } = await supabase.from("habitos_log").delete().eq("user_id", usuario).eq("habito_id", habitoId).eq("data", data);
    if (error) throw new Error(`Falha ao desmarcar hábito: ${error.message}`);
    return { concluido: false };
  }

  const { data: registro, error } = await supabase
    .from("habitos_log")
    .upsert({ user_id: usuario, habito_id: habitoId, data, concluido: true, quantidade, nota }, { onConflict: "habito_id,data" })
    .select()
    .single();

  if (error) throw new Error(`Falha ao marcar hábito: ${error.message}`);
  return registro;
}

const FOLGAS_POR_MES = 2;

export async function folgar(usuario, habitoId, data = hoje()) {
  const supabase = getSupabase();
  const mes = data.slice(0, 7);

  const { count, error: erroConta } = await supabase
    .from("habitos_folgas")
    .select("*", { count: "exact", head: true })
    .eq("user_id", usuario)
    .gte("data", `${mes}-01`)
    .lte("data", `${mes}-31`);

  if (erroConta) throw new Error(`Falha ao contar folgas: ${erroConta.message}`);
  if ((count || 0) >= FOLGAS_POR_MES) {
    throw new Error(`Você já usou as ${FOLGAS_POR_MES} folgas deste mês`);
  }

  const { data: registro, error } = await supabase
    .from("habitos_folgas")
    .upsert({ user_id: usuario, habito_id: habitoId, data }, { onConflict: "user_id,habito_id,data" })
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar folga: ${error.message}`);
  return registro;
}

export async function historico(usuario, habitoId, dias = 365) {
  const { habitos, porHabito } = await carregarJanela(usuario);
  const habito = habitos.find((h) => h.id === habitoId);
  if (!habito) throw new Error("Hábito não encontrado");

  const dados = porHabito.get(habitoId);
  const datas = ultimosDias(dias);

  return {
    habito: { id: habito.id, nome: habito.nome, emoji: habito.emoji, cor: habito.cor },
    streak: calcularStreak(habito, dados, hoje()),
    dias: datas.map((data) => ({
      data,
      devido: devido(habito, data),
      concluido: dados.concluidos.has(data),
      folga: dados.folgas.has(data),
    })),
  };
}

// Rotina guiada: os hábitos de um período, na ordem, com o que já foi feito.
export async function ritual(usuario, periodo, data = hoje()) {
  const { itens } = await checklist(usuario, data);
  const doPeriodo = itens.filter((item) => item.periodo === periodo);

  return {
    periodo,
    data,
    total: doPeriodo.length,
    feitos: doPeriodo.filter((item) => item.concluido).length,
    minutos_estimados: doPeriodo.reduce((soma, item) => soma + (item.duracao_min || 0), 0),
    itens: doPeriodo,
  };
}

export async function registrarFoco(usuario, { tipo = "pomodoro", habito_id = null, periodo = null, minutos = 0, concluido = false }) {
  const { data, error } = await getSupabase()
    .from("foco_sessoes")
    .insert({ user_id: usuario, tipo, habito_id, periodo, data: hoje(), minutos: Math.round(minutos), concluido })
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar foco: ${error.message}`);
  return data;
}

export async function focoDoDia(usuario, data = hoje()) {
  const { data: sessoes, error } = await getSupabase()
    .from("foco_sessoes")
    .select("minutos, tipo")
    .eq("user_id", usuario)
    .eq("data", data);

  if (error) throw new Error(`Falha ao ler sessões de foco: ${error.message}`);

  return {
    minutos: sessoes.reduce((soma, s) => soma + s.minutos, 0),
    sessoes: sessoes.length,
  };
}

export async function listar(usuario) {
  const { habitos, porHabito } = await carregarJanela(usuario);
  const hojeISO = hoje();
  return habitos.map((habito) => montarItem(habito, porHabito.get(habito.id), hojeISO));
}
