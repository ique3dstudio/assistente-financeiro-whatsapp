import { getSupabase } from "../../core/supabase.js";
import { hoje, somarDias, ultimosDias } from "../../core/datas.js";
import { diaSemana } from "../habitos/regras.js";
import { ALVO_SEMANAL_SERIES, EQUIPAMENTOS, MUSCULOS } from "./musculos.js";
import { REGRAS, detectarEstagnacao, ehPR, epley1RM, melhor1RM, sugerir, volume } from "./progressao.js";

// ---------- biblioteca de exercícios ----------

export async function exercicios(usuario, { musculo = null, equipamento = null, busca = null, nivel = null } = {}) {
  let consulta = getSupabase()
    .from("exercicios")
    .select("*")
    .in("user_id", [usuario, "sistema"])
    .eq("ativo", true)
    .order("nome");

  if (musculo) consulta = consulta.or(`musculo_primario.eq.${musculo},musculos_secundarios.cs.{${musculo}}`);
  if (equipamento) consulta = consulta.eq("equipamento", equipamento);
  if (nivel) consulta = consulta.eq("nivel", nivel);
  if (busca) consulta = consulta.ilike("nome", `%${busca}%`);

  const { data, error } = await consulta;
  if (error) throw new Error(`Falha ao ler exercícios: ${error.message}`);
  return data;
}

export async function criarExercicio(usuario, dados) {
  if (!dados.nome?.trim()) throw new Error("O exercício precisa de um nome");
  if (!MUSCULOS.some((m) => m.id === dados.musculo_primario)) throw new Error("Músculo primário inválido");

  const { data, error } = await getSupabase()
    .from("exercicios")
    .insert({
      user_id: usuario,
      nome: dados.nome.trim(),
      musculo_primario: dados.musculo_primario,
      musculos_secundarios: dados.musculos_secundarios || [],
      equipamento: dados.equipamento || "barra",
      tipo: dados.tipo || "composto",
      nivel: dados.nivel || "iniciante",
      instrucoes: dados.instrucoes || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar exercício: ${error.message}`);
  return data;
}

// Quantos exercícios existem por músculo — alimenta o mapa corporal.
export async function mapaCorporal(usuario) {
  const lista = await exercicios(usuario);
  return MUSCULOS.map((musculo) => ({
    ...musculo,
    exercicios: lista.filter(
      (e) => e.musculo_primario === musculo.id || (e.musculos_secundarios || []).includes(musculo.id)
    ).length,
  }));
}

// ---------- rotinas ----------

export async function rotinas(usuario) {
  const supabase = getSupabase();

  const [rotinasRes, itensRes] = await Promise.all([
    supabase.from("treino_rotinas").select("*").eq("user_id", usuario).eq("ativo", true).order("ordem"),
    supabase
      .from("treino_rotina_exercicios")
      .select("*, exercicio:exercicios(id, nome, musculo_primario, equipamento, tipo)")
      .eq("user_id", usuario)
      .order("ordem"),
  ]);

  if (rotinasRes.error) throw new Error(`Falha ao ler rotinas: ${rotinasRes.error.message}`);
  if (itensRes.error) throw new Error(`Falha ao ler exercícios da rotina: ${itensRes.error.message}`);

  return rotinasRes.data.map((rotina) => ({
    ...rotina,
    itens: itensRes.data.filter((item) => item.rotina_id === rotina.id),
  }));
}

export async function criarRotina(usuario, dados) {
  if (!dados.nome?.trim()) throw new Error("A rotina precisa de um nome");

  const { data, error } = await getSupabase()
    .from("treino_rotinas")
    .insert({
      user_id: usuario,
      nome: dados.nome.trim(),
      tipo: dados.tipo || "livre",
      dias_semana: dados.dias_semana || [],
      observacao: dados.observacao || null,
      ordem: dados.ordem || 0,
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar rotina: ${error.message}`);
  return data;
}

export async function atualizarRotina(usuario, id, dados) {
  const campos = ["nome", "tipo", "dias_semana", "observacao", "ordem", "ativo"];
  const limpos = Object.fromEntries(Object.entries(dados).filter(([chave]) => campos.includes(chave)));

  const { data, error } = await getSupabase()
    .from("treino_rotinas")
    .update(limpos)
    .eq("user_id", usuario)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar rotina: ${error.message}`);
  return data;
}

export async function excluirRotina(usuario, id) {
  const { error } = await getSupabase().from("treino_rotinas").delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir rotina: ${error.message}`);
  return { ok: true };
}

export async function adicionarExercicio(usuario, rotinaId, dados) {
  if (!dados.exercicio_id) throw new Error("Escolha um exercício");

  const { data: existentes } = await getSupabase()
    .from("treino_rotina_exercicios")
    .select("ordem")
    .eq("rotina_id", rotinaId)
    .order("ordem", { ascending: false })
    .limit(1);

  const { data, error } = await getSupabase()
    .from("treino_rotina_exercicios")
    .insert({
      user_id: usuario,
      rotina_id: rotinaId,
      exercicio_id: dados.exercicio_id,
      series_alvo: dados.series_alvo || 3,
      reps_min: dados.reps_min || 8,
      reps_max: dados.reps_max || 12,
      rir_alvo: dados.rir_alvo ?? 2,
      descanso_seg: dados.descanso_seg || 90,
      regra_progressao: dados.regra_progressao || "dupla",
      incremento_kg: dados.incremento_kg ?? 2.5,
      percentual_1rm: dados.percentual_1rm || null,
      agrupamento: dados.agrupamento || null,
      ordem: (existentes?.[0]?.ordem ?? 0) + 1,
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao adicionar exercício: ${error.message}`);
  return data;
}

export async function atualizarItem(usuario, itemId, dados) {
  const campos = [
    "series_alvo", "reps_min", "reps_max", "rir_alvo", "descanso_seg",
    "regra_progressao", "incremento_kg", "percentual_1rm", "agrupamento", "ordem", "notas",
  ];
  const limpos = Object.fromEntries(Object.entries(dados).filter(([chave]) => campos.includes(chave)));

  const { data, error } = await getSupabase()
    .from("treino_rotina_exercicios")
    .update(limpos)
    .eq("user_id", usuario)
    .eq("id", itemId)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar exercício da rotina: ${error.message}`);
  return data;
}

export async function removerItem(usuario, itemId) {
  const { error } = await getSupabase().from("treino_rotina_exercicios").delete().eq("user_id", usuario).eq("id", itemId);
  if (error) throw new Error(`Falha ao remover exercício: ${error.message}`);
  return { ok: true };
}

export async function rotinaDoDia(usuario, data = hoje()) {
  const lista = await rotinas(usuario);
  const dia = diaSemana(data);
  return lista.find((rotina) => (rotina.dias_semana || []).includes(dia)) || null;
}

// ---------- execução ----------

// Séries de sessões anteriores, agrupadas por exercício e por sessão.
async function historicoSeries(usuario, exercicioIds, { excluirSessao = null, dias = 180 } = {}) {
  if (exercicioIds.length === 0) return new Map();

  const { data, error } = await getSupabase()
    .from("treino_series")
    .select("*, sessao:treino_sessoes(id, data)")
    .eq("user_id", usuario)
    .in("exercicio_id", exercicioIds)
    .gte("criado_em", `${somarDias(hoje(), -dias)}T00:00:00Z`)
    .order("criado_em");

  if (error) throw new Error(`Falha ao ler histórico de séries: ${error.message}`);

  const porExercicio = new Map();
  for (const serie of data) {
    if (excluirSessao && serie.sessao_id === excluirSessao) continue;

    if (!porExercicio.has(serie.exercicio_id)) porExercicio.set(serie.exercicio_id, new Map());
    const sessoes = porExercicio.get(serie.exercicio_id);
    const chave = serie.sessao_id;

    if (!sessoes.has(chave)) sessoes.set(chave, { sessao_id: chave, data: serie.sessao?.data, series: [] });
    sessoes.get(chave).series.push({ peso: Number(serie.peso), reps: serie.reps, rir: serie.rir === null ? null : Number(serie.rir), tipo: serie.tipo });
  }

  return porExercicio;
}

export async function iniciarSessao(usuario, rotinaId = null, data = hoje()) {
  const supabase = getSupabase();

  // Se já existe sessão aberta hoje, continua nela em vez de criar outra.
  const { data: aberta } = await supabase
    .from("treino_sessoes")
    .select("id")
    .eq("user_id", usuario)
    .eq("data", data)
    .is("concluida_em", null)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (aberta) return planoDaSessao(usuario, aberta.id);

  const rotina = rotinaId ? null : await rotinaDoDia(usuario, data);

  const { data: sessao, error } = await supabase
    .from("treino_sessoes")
    .insert({ user_id: usuario, rotina_id: rotinaId || rotina?.id || null, data })
    .select()
    .single();

  if (error) throw new Error(`Falha ao iniciar treino: ${error.message}`);
  return planoDaSessao(usuario, sessao.id);
}

// O plano de hoje: para cada exercício, o que você fez da última vez e a
// sugestão calculada pela regra de progressão.
export async function planoDaSessao(usuario, sessaoId) {
  const supabase = getSupabase();

  const { data: sessao, error } = await supabase
    .from("treino_sessoes")
    .select("*")
    .eq("user_id", usuario)
    .eq("id", sessaoId)
    .single();

  if (error) throw new Error(`Falha ao ler a sessão: ${error.message}`);

  const [{ data: feitas, error: erroFeitas }, listaRotinas] = await Promise.all([
    supabase.from("treino_series").select("*").eq("sessao_id", sessaoId).order("criado_em"),
    rotinas(usuario),
  ]);

  if (erroFeitas) throw new Error(`Falha ao ler séries da sessão: ${erroFeitas.message}`);

  const rotina = listaRotinas.find((r) => r.id === sessao.rotina_id) || null;
  const itens = rotina?.itens || [];

  // Exercícios da rotina + qualquer um que você registrou fora dela.
  const idsExtras = [...new Set(feitas.map((s) => s.exercicio_id))].filter(
    (id) => !itens.some((item) => item.exercicio_id === id)
  );

  const [historico, extras] = await Promise.all([
    historicoSeries(usuario, [...itens.map((i) => i.exercicio_id), ...idsExtras], { excluirSessao: sessaoId }),
    idsExtras.length
      ? supabase.from("exercicios").select("id, nome, musculo_primario, equipamento").in("id", idsExtras)
      : Promise.resolve({ data: [] }),
  ]);

  function montar(exercicioId, exercicio, config) {
    const sessoesAnteriores = [...(historico.get(exercicioId)?.values() || [])].sort((a, b) =>
      String(a.data).localeCompare(String(b.data))
    );
    const ultima = sessoesAnteriores[sessoesAnteriores.length - 1] || null;
    const seriesFeitas = feitas
      .filter((s) => s.exercicio_id === exercicioId)
      .map((s) => ({ id: s.id, serie: s.serie, peso: Number(s.peso), reps: s.reps, rir: s.rir === null ? null : Number(s.rir), tipo: s.tipo, is_pr: s.is_pr }));

    return {
      exercicio_id: exercicioId,
      item_id: config?.id || null,
      nome: exercicio?.nome || "Exercício",
      musculo_primario: exercicio?.musculo_primario || null,
      equipamento: exercicio?.equipamento || null,
      config: config
        ? {
            series_alvo: config.series_alvo,
            reps_min: config.reps_min,
            reps_max: config.reps_max,
            rir_alvo: Number(config.rir_alvo),
            descanso_seg: config.descanso_seg,
            regra_progressao: config.regra_progressao,
            incremento_kg: Number(config.incremento_kg),
            percentual_1rm: config.percentual_1rm === null ? null : Number(config.percentual_1rm),
            agrupamento: config.agrupamento,
          }
        : null,
      ultima_vez: ultima
        ? { data: ultima.data, series: ultima.series.filter((s) => s.tipo === "normal"), um_rm: melhor1RM(ultima.series) }
        : null,
      sugestao: sugerir(
        config
          ? {
              regra: config.regra_progressao,
              series_alvo: config.series_alvo,
              reps_min: config.reps_min,
              reps_max: config.reps_max,
              rir_alvo: Number(config.rir_alvo),
              incremento_kg: Number(config.incremento_kg),
              percentual_1rm: config.percentual_1rm,
            }
          : { regra: "dupla" },
        ultima
      ),
      estagnacao: detectarEstagnacao(sessoesAnteriores, { incremento_kg: Number(config?.incremento_kg || 2.5) }),
      series: seriesFeitas,
    };
  }

  const plano = [
    ...itens.map((item) => montar(item.exercicio_id, item.exercicio, item)),
    ...(extras.data || []).map((exercicio) => montar(exercicio.id, exercicio, null)),
  ];

  return {
    sessao,
    rotina: rotina ? { id: rotina.id, nome: rotina.nome, tipo: rotina.tipo } : null,
    plano,
    total_series: feitas.length,
    volume: volume(plano.flatMap((p) => p.series)),
    regras: REGRAS,
  };
}

export async function registrarSerie(usuario, sessaoId, dados) {
  const supabase = getSupabase();
  const exercicioId = dados.exercicio_id;
  if (!exercicioId) throw new Error("Informe o exercício");

  const peso = Number(dados.peso ?? 0);
  const reps = Number(dados.reps ?? 0);
  if (reps < 0 || reps > 500) throw new Error("Repetições inválidas");
  if (peso < 0 || peso > 1000) throw new Error("Peso inválido");

  const historico = await historicoSeries(usuario, [exercicioId], { excluirSessao: null, dias: 3650 });
  const todasAnteriores = [...(historico.get(exercicioId)?.values() || [])].flatMap((s) => s.series);

  const tipo = dados.tipo || "normal";
  const pr = tipo === "normal" && ehPR({ peso, reps }, todasAnteriores);

  const { data: existentes } = await supabase
    .from("treino_series")
    .select("serie")
    .eq("sessao_id", sessaoId)
    .eq("exercicio_id", exercicioId)
    .order("serie", { ascending: false })
    .limit(1);

  const { data, error } = await supabase
    .from("treino_series")
    .insert({
      user_id: usuario,
      sessao_id: sessaoId,
      exercicio_id: exercicioId,
      serie: dados.serie || (existentes?.[0]?.serie ?? 0) + 1,
      peso,
      reps,
      rir: dados.rir === undefined || dados.rir === null || dados.rir === "" ? null : Number(dados.rir),
      tipo,
      is_pr: pr,
      nota: dados.nota || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar série: ${error.message}`);
  return { ...data, is_pr: pr };
}

export async function apagarSerie(usuario, serieId) {
  const { error } = await getSupabase().from("treino_series").delete().eq("user_id", usuario).eq("id", serieId);
  if (error) throw new Error(`Falha ao apagar série: ${error.message}`);
  return { ok: true };
}

export async function concluirSessao(usuario, sessaoId, dados = {}) {
  const { data, error } = await getSupabase()
    .from("treino_sessoes")
    .update({
      concluida_em: new Date().toISOString(),
      duracao_min: dados.duracao_min || null,
      sensacao: dados.sensacao || null,
      nota: dados.nota || null,
    })
    .eq("user_id", usuario)
    .eq("id", sessaoId)
    .select()
    .single();

  if (error) throw new Error(`Falha ao concluir treino: ${error.message}`);
  return data;
}

export async function sessaoDeHoje(usuario, data = hoje()) {
  const { data: sessao, error } = await getSupabase()
    .from("treino_sessoes")
    .select("*")
    .eq("user_id", usuario)
    .eq("data", data)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao ler o treino de hoje: ${error.message}`);
  return sessao;
}

// ---------- estatísticas e gráficos (E2.6) ----------

export async function estatisticas(usuario, dias = 90) {
  const supabase = getSupabase();
  const desde = somarDias(hoje(), -dias);

  const [seriesRes, sessoesRes, exerciciosRes] = await Promise.all([
    supabase
      .from("treino_series")
      .select("peso, reps, tipo, is_pr, exercicio_id, criado_em, sessao:treino_sessoes(data)")
      .eq("user_id", usuario)
      .gte("criado_em", `${desde}T00:00:00Z`),
    supabase.from("treino_sessoes").select("id, data, duracao_min").eq("user_id", usuario).gte("data", desde),
    supabase.from("exercicios").select("id, nome, musculo_primario, musculos_secundarios").in("user_id", [usuario, "sistema"]),
  ]);

  for (const resposta of [seriesRes, sessoesRes, exerciciosRes]) {
    if (resposta.error) throw new Error(`Falha ao ler estatísticas: ${resposta.error.message}`);
  }

  const porId = new Map(exerciciosRes.data.map((e) => [e.id, e]));
  const series = seriesRes.data.filter((s) => s.tipo === "normal");

  // Volume por semana (domingo como início)
  const porSemana = {};
  for (const serie of series) {
    const data = serie.sessao?.data || serie.criado_em.slice(0, 10);
    const semana = somarDias(data, -diaSemana(data));
    porSemana[semana] = (porSemana[semana] || 0) + Number(serie.peso) * serie.reps;
  }

  // Séries por grupo muscular na semana atual (mapa de calor)
  const semanaAtual = somarDias(hoje(), -diaSemana(hoje()));
  const porMusculo = {};
  for (const serie of series) {
    const data = serie.sessao?.data || serie.criado_em.slice(0, 10);
    if (data < semanaAtual) continue;

    const exercicio = porId.get(serie.exercicio_id);
    if (!exercicio) continue;

    porMusculo[exercicio.musculo_primario] = (porMusculo[exercicio.musculo_primario] || 0) + 1;
    for (const secundario of exercicio.musculos_secundarios || []) {
      porMusculo[secundario] = (porMusculo[secundario] || 0) + 0.5; // secundário conta metade
    }
  }

  // Evolução do 1RM estimado, por exercício mais treinado
  const porExercicio = {};
  for (const serie of series) {
    const data = serie.sessao?.data || serie.criado_em.slice(0, 10);
    porExercicio[serie.exercicio_id] ||= { series: 0, pontos: {} };
    porExercicio[serie.exercicio_id].series++;
    const estimado = epley1RM(serie.peso, serie.reps);
    porExercicio[serie.exercicio_id].pontos[data] = Math.max(porExercicio[serie.exercicio_id].pontos[data] || 0, estimado);
  }

  const maisTreinados = Object.entries(porExercicio)
    .sort((a, b) => b[1].series - a[1].series)
    .slice(0, 6)
    .map(([id, dados]) => ({
      exercicio_id: id,
      nome: porId.get(id)?.nome || "Exercício",
      series: dados.series,
      curva: Object.entries(dados.pontos)
        .sort()
        .map(([data, um_rm]) => ({ data, um_rm: Number(um_rm.toFixed(1)) })),
    }));

  return {
    dias,
    sessoes: sessoesRes.data.length,
    series_totais: series.length,
    volume_total: series.reduce((soma, s) => soma + Number(s.peso) * s.reps, 0),
    volume_por_semana: Object.entries(porSemana)
      .sort()
      .map(([semana, total]) => ({ semana, total })),
    mapa_muscular: MUSCULOS.map((musculo) => {
      const feitas = porMusculo[musculo.id] || 0;
      const alvo = ALVO_SEMANAL_SERIES[musculo.id] || 8;
      return { ...musculo, series: feitas, alvo, proporcao: Math.min(1.5, feitas / alvo) };
    }),
    mais_treinados: maisTreinados,
    prs: seriesRes.data
      .filter((s) => s.is_pr)
      .map((s) => ({
        exercicio: porId.get(s.exercicio_id)?.nome || "Exercício",
        peso: Number(s.peso),
        reps: s.reps,
        data: s.sessao?.data || s.criado_em.slice(0, 10),
      }))
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 10),
    frequencia: ultimosDias(28).map((data) => ({
      data,
      treinou: sessoesRes.data.some((s) => s.data === data),
    })),
  };
}

// ---------- medidas corporais (E2.8) ----------

export async function salvarMedida(usuario, dados) {
  const campos = ["peso_kg", "gordura_pct", "braco_cm", "peito_cm", "cintura_cm", "quadril_cm", "coxa_cm", "panturrilha_cm", "nota"];
  const limpos = Object.fromEntries(
    Object.entries(dados)
      .filter(([chave, valor]) => campos.includes(chave) && valor !== "" && valor !== null && valor !== undefined)
      .map(([chave, valor]) => [chave, chave === "nota" ? valor : Number(valor)])
  );

  if (Object.keys(limpos).length === 0) throw new Error("Preencha pelo menos uma medida");

  const { data, error } = await getSupabase()
    .from("medidas_corporais")
    .upsert({ user_id: usuario, data: dados.data || hoje(), ...limpos }, { onConflict: "user_id,data" })
    .select()
    .single();

  if (error) throw new Error(`Falha ao salvar medidas: ${error.message}`);
  return data;
}

export async function medidas(usuario, limite = 30) {
  const { data, error } = await getSupabase()
    .from("medidas_corporais")
    .select("*")
    .eq("user_id", usuario)
    .order("data", { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Falha ao ler medidas: ${error.message}`);
  return data;
}

export async function painel(usuario) {
  const [listaRotinas, sessao, prevista, stats, listaMedidas] = await Promise.all([
    rotinas(usuario),
    sessaoDeHoje(usuario),
    rotinaDoDia(usuario),
    estatisticas(usuario, 90),
    medidas(usuario, 10),
  ]);

  return {
    data: hoje(),
    rotinas: listaRotinas,
    sessao_hoje: sessao,
    rotina_prevista: prevista,
    estatisticas: stats,
    medidas: listaMedidas,
    musculos: MUSCULOS,
    equipamentos: EQUIPAMENTOS,
    regras: REGRAS,
  };
}
