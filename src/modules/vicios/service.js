import { getSupabase } from "../../core/supabase.js";
import { hoje } from "../../core/datas.js";
import {
  MARCOS, TIPOS, aplicarRecaida, contador, economia, linhaRecuperacao, mapaGatilhos,
  marcosAlcancados, proximoMarco, sequenciaPledge,
} from "./calculos.js";

const CAMPOS_VICIO = ["nome", "tipo", "data_inicio", "custo_diario", "tempo_diario_min", "motivos", "ativo"];
const CAMPOS_APOIO = ["nome", "telefone", "tipo", "observacao"];

export async function criarVicio(usuario, dados) {
  if (!dados.nome?.trim()) throw new Error("Dê um nome ao hábito que você está deixando");

  const { data, error } = await getSupabase()
    .from("vicios")
    .insert({
      user_id: usuario,
      nome: dados.nome.trim(),
      tipo: dados.tipo || "outro",
      data_inicio: dados.data_inicio || new Date().toISOString(),
      custo_diario: Number(dados.custo_diario) || 0,
      tempo_diario_min: Number(dados.tempo_diario_min) || 0,
      motivos: dados.motivos || [],
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar: ${error.message}`);
  return data;
}

export async function atualizarVicio(usuario, id, dados) {
  const limpos = Object.fromEntries(Object.entries(dados).filter(([chave]) => CAMPOS_VICIO.includes(chave)));

  const { data, error } = await getSupabase()
    .from("vicios")
    .update(limpos)
    .eq("user_id", usuario)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar: ${error.message}`);
  return data;
}

export async function excluirVicio(usuario, id) {
  const { error } = await getSupabase().from("vicios").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir: ${error.message}`);
  return { ok: true };
}

export async function adicionarMotivo(usuario, id, texto) {
  const supabase = getSupabase();
  const { data: vicio } = await supabase.from("vicios").select("motivos").eq("user_id", usuario).eq("id", id).single();

  const motivos = [...(vicio.motivos || []), { texto, foto_url: null }];
  return atualizarVicio(usuario, id, { motivos });
}

// ---------- compromisso do dia ----------

export async function registrarPledge(usuario, vicioId, { cumprido = null, revisao = null, data = hoje() } = {}) {
  const { data: registro, error } = await getSupabase()
    .from("vicios_pledges")
    .upsert({ user_id: usuario, vicio_id: vicioId, data, cumprido, revisao }, { onConflict: "vicio_id,data" })
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar o compromisso: ${error.message}`);
  return registro;
}

// ---------- fissura ----------

export async function registrarFissura(usuario, dados) {
  const { data, error } = await getSupabase()
    .from("vicios_fissuras")
    .insert({
      user_id: usuario,
      vicio_id: dados.vicio_id || null,
      data: dados.data || hoje(),
      hora: dados.hora || new Date().toTimeString().slice(0, 5),
      gatilho: dados.gatilho || null,
      local: dados.local || null,
      intensidade: Number(dados.intensidade) || 5,
      emocao: dados.emocao || null,
      cedeu: Boolean(dados.cedeu),
      nota: dados.nota || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar a fissura: ${error.message}`);
  return data;
}

// ---------- recaída ----------

// Registra a recaída, guarda o recorde anterior e reinicia o contador.
// O histórico não é apagado: é isso que faz a diferença nesse módulo.
export async function registrarRecaida(usuario, vicioId, aprendizado = null) {
  const supabase = getSupabase();

  const { data: vicio, error: erroLeitura } = await supabase
    .from("vicios")
    .select("*")
    .eq("user_id", usuario)
    .eq("id", vicioId)
    .single();

  if (erroLeitura) throw new Error(`Hábito não encontrado: ${erroLeitura.message}`);

  const resultado = aplicarRecaida(vicio);

  const { error: erroRecaida } = await supabase.from("vicios_recaidas").insert({
    user_id: usuario,
    vicio_id: vicioId,
    data: hoje(),
    aprendizado,
    recorde_anterior_dias: resultado.dias_perdidos,
  });

  if (erroRecaida) throw new Error(`Falha ao registrar a recaída: ${erroRecaida.message}`);

  const { error } = await supabase
    .from("vicios")
    .update({ data_inicio: resultado.data_inicio, recorde_dias: resultado.recorde_dias })
    .eq("id", vicioId);

  if (error) throw new Error(`Falha ao reiniciar o contador: ${error.message}`);

  return { ...resultado, recorde_preservado: resultado.recorde_dias };
}

// ---------- apoio e ações alternativas ----------

export async function criarApoio(usuario, dados) {
  const limpos = Object.fromEntries(Object.entries(dados).filter(([chave]) => CAMPOS_APOIO.includes(chave)));
  const { data, error } = await getSupabase().from("vicios_apoio").insert({ user_id: usuario, ...limpos }).select().single();
  if (error) throw new Error(`Falha ao salvar contato de apoio: ${error.message}`);
  return data;
}

export async function excluirApoio(usuario, id) {
  const { error } = await getSupabase().from("vicios_apoio").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir contato: ${error.message}`);
  return { ok: true };
}

export async function criarAcao(usuario, texto) {
  const { data, error } = await getSupabase().from("vicios_acoes").insert({ user_id: usuario, texto }).select().single();
  if (error) throw new Error(`Falha ao salvar ação: ${error.message}`);
  return data;
}

// ---------- painel ----------

export async function painel(usuario) {
  const supabase = getSupabase();
  const hojeISO = hoje();

  const [viciosRes, pledgesRes, fissurasRes, recaidasRes, marcosRes, apoioRes, acoesRes] = await Promise.all([
    supabase.from("vicios").select("*").eq("user_id", usuario).eq("ativo", true).order("data_inicio"),
    supabase.from("vicios_pledges").select("*").eq("user_id", usuario).order("data", { ascending: false }).limit(400),
    supabase.from("vicios_fissuras").select("*").eq("user_id", usuario).order("data", { ascending: false }).limit(300),
    supabase.from("vicios_recaidas").select("*").eq("user_id", usuario).order("data", { ascending: false }),
    supabase.from("vicios_marcos").select("*").eq("user_id", usuario),
    supabase.from("vicios_apoio").select("*").eq("user_id", usuario).order("nome"),
    supabase.from("vicios_acoes").select("*").eq("user_id", usuario).order("ordem"),
  ]);

  for (const resposta of [viciosRes, pledgesRes, fissurasRes, recaidasRes, marcosRes, apoioRes, acoesRes]) {
    if (resposta.error) throw new Error(`Falha ao ler o módulo: ${resposta.error.message}`);
  }

  const agora = new Date();

  const vicios = viciosRes.data.map((vicio) => {
    const tempo = contador(vicio.data_inicio, agora);
    const pledges = pledgesRes.data.filter((p) => p.vicio_id === vicio.id);
    const fissuras = fissurasRes.data.filter((f) => f.vicio_id === vicio.id);
    const recaidas = recaidasRes.data.filter((r) => r.vicio_id === vicio.id);

    return {
      ...vicio,
      tipo_info: TIPOS.find((t) => t.id === vicio.tipo) || TIPOS[TIPOS.length - 1],
      contador: tempo,
      recorde_dias: Math.max(Number(vicio.recorde_dias) || 0, tempo.dias),
      proximo_marco: proximoMarco(tempo.dias),
      marcos_alcancados: marcosAlcancados(tempo.dias),
      marcos_registrados: marcosRes.data.filter((m) => m.vicio_id === vicio.id),
      economia: economia(vicio.custo_diario, vicio.tempo_diario_min, tempo.dias),
      linha_recuperacao: linhaRecuperacao(vicio.tipo, tempo.dias),
      pledge_hoje: pledges.find((p) => p.data === hojeISO) || null,
      sequencia_pledge: sequenciaPledge(pledges, hojeISO),
      mapa: mapaGatilhos(fissuras),
      fissuras: fissuras.slice(0, 20),
      recaidas,
      tentativas: recaidas.length + 1,
    };
  });

  return {
    data: hojeISO,
    vicios,
    apoio: apoioRes.data,
    acoes: acoesRes.data,
    tipos: TIPOS,
    marcos: MARCOS,
    // Fica sempre visível na tela: o app acompanha, não trata.
    aviso:
      "Este módulo acompanha o seu progresso — não é tratamento. Nos momentos difíceis, fale com alguém: " +
      "a sua rede de apoio, um profissional, ou o CVV pelo 188 (24h, gratuito).",
  };
}

// Compromisso do dia ainda não confirmado entra no checklist da tela Hoje.
export async function pledgesPendentes(usuario, data = hoje()) {
  const dados = await painel(usuario);
  return dados.vicios
    .filter((vicio) => !vicio.pledge_hoje || vicio.pledge_hoje.cumprido === null)
    .map((vicio) => ({ id: vicio.id, nome: `Compromisso: ${vicio.nome}`, dias: vicio.contador.dias }));
}
