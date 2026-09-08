import { getSupabase } from "../../core/supabase.js";
import { hoje, horaAgora, somarDias, ultimosDias } from "../../core/datas.js";
import { diaSemana } from "../habitos/regras.js";
import {
  MARCADORES, TIPOS_SINAL, classificarMarcador, classificarPressao, dosesDoDia,
  duracaoSono, estoque, proximaRecorrencia,
} from "./calculos.js";

async function ler(tabela, usuario, ordem = "criado_em", ascendente = false) {
  const { data, error } = await getSupabase()
    .from(tabela)
    .select("*")
    .eq("user_id", usuario)
    .order(ordem, { ascending: ascendente, nullsFirst: false });

  if (error) throw new Error(`Falha ao ler ${tabela}: ${error.message}`);
  return data;
}

async function criar(tabela, usuario, dados, campos, rotulo) {
  const limpos = Object.fromEntries(
    Object.entries(dados).filter(([chave, valor]) => campos.includes(chave) && valor !== undefined && valor !== "")
  );

  const { data, error } = await getSupabase().from(tabela).insert({ user_id: usuario, ...limpos }).select().single();
  if (error) throw new Error(`Falha ao criar ${rotulo}: ${error.message}`);
  return data;
}

async function atualizar(tabela, usuario, id, dados, campos, rotulo) {
  const limpos = Object.fromEntries(Object.entries(dados).filter(([chave]) => campos.includes(chave)));
  const { data, error } = await getSupabase().from(tabela).update(limpos).eq("user_id", usuario).eq("id", id).select().single();
  if (error) throw new Error(`Falha ao atualizar ${rotulo}: ${error.message}`);
  return data;
}

async function excluir(tabela, usuario, id, rotulo) {
  const { error } = await getSupabase().from(tabela).delete().eq("user_id", usuario).eq("id", id);
  if (error) throw new Error(`Falha ao excluir ${rotulo}: ${error.message}`);
  return { ok: true };
}

const CAMPOS_MEDICAMENTO = ["nome", "dose", "horarios", "frequencia", "dias_semana", "inicio", "fim", "estoque_atual", "estoque_alerta", "unidade", "observacao", "ativo"];
const CAMPOS_CONSULTA = ["especialidade", "profissional", "local", "data", "hora", "motivo", "perguntas", "resumo", "prescricao", "retorno_em"];
const CAMPOS_RECORRENCIA = ["nome", "tipo", "cada_meses", "ultima_em"];
const CAMPOS_EXAME = ["tipo", "data", "laboratorio", "arquivo_url", "observacao"];
const CAMPOS_SINAL = ["data", "hora", "tipo", "valor", "valor2", "nota"];
const CAMPOS_SONO = ["data", "dormiu_em", "acordou_em", "duracao_min", "qualidade", "nota"];
const CAMPOS_SINTOMA = ["data", "hora", "nome", "intensidade", "nota"];
const CAMPOS_VACINA = ["nome", "data", "dose", "proxima_em", "local"];
const CAMPOS_CONTATO = ["nome", "especialidade", "telefone", "observacao"];

export const criarMedicamento = (u, d) => criar("medicamentos", u, d, CAMPOS_MEDICAMENTO, "medicamento");
export const atualizarMedicamento = (u, id, d) => atualizar("medicamentos", u, id, d, CAMPOS_MEDICAMENTO, "medicamento");
export const excluirMedicamento = (u, id) => excluir("medicamentos", u, id, "medicamento");
export const criarConsulta = (u, d) => criar("saude_consultas", u, d, CAMPOS_CONSULTA, "consulta");
export const atualizarConsulta = (u, id, d) => atualizar("saude_consultas", u, id, d, CAMPOS_CONSULTA, "consulta");
export const excluirConsulta = (u, id) => excluir("saude_consultas", u, id, "consulta");
export const criarRecorrencia = (u, d) => criar("saude_recorrencias", u, d, CAMPOS_RECORRENCIA, "rotina");
export const atualizarRecorrencia = (u, id, d) => atualizar("saude_recorrencias", u, id, d, CAMPOS_RECORRENCIA, "rotina");
export const criarSinal = (u, d) => criar("sinais_log", u, d, CAMPOS_SINAL, "medição");
export const criarSintoma = (u, d) => criar("sintomas", u, d, CAMPOS_SINTOMA, "sintoma");
export const criarVacina = (u, d) => criar("vacinas", u, d, CAMPOS_VACINA, "vacina");
export const criarContato = (u, d) => criar("saude_contatos", u, d, CAMPOS_CONTATO, "contato");

export async function registrarSono(usuario, dados) {
  const duracao = dados.duracao_min ?? duracaoSono(dados.dormiu_em, dados.acordou_em);

  const { data, error } = await getSupabase()
    .from("sono_log")
    .upsert(
      {
        user_id: usuario,
        data: dados.data || hoje(),
        dormiu_em: dados.dormiu_em || null,
        acordou_em: dados.acordou_em || null,
        duracao_min: duracao,
        qualidade: dados.qualidade || null,
        nota: dados.nota || null,
      },
      { onConflict: "user_id,data" }
    )
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar sono: ${error.message}`);
  return data;
}

// ---------- medicamentos do dia ----------

export async function medicamentosDoDia(usuario, data = hoje()) {
  const supabase = getSupabase();

  const [medicamentosRes, logRes] = await Promise.all([
    supabase.from("medicamentos").select("*").eq("user_id", usuario).eq("ativo", true).order("nome"),
    supabase.from("medicamentos_log").select("*").eq("user_id", usuario).eq("data", data),
  ]);

  if (medicamentosRes.error) throw new Error(`Falha ao ler medicamentos: ${medicamentosRes.error.message}`);
  if (logRes.error) throw new Error(`Falha ao ler doses tomadas: ${logRes.error.message}`);

  const dia = diaSemana(data);
  const itens = [];

  for (const medicamento of medicamentosRes.data) {
    for (const horario of dosesDoDia(medicamento, data, dia)) {
      const tomado = logRes.data.some(
        (log) => log.medicamento_id === medicamento.id && String(log.horario).slice(0, 5) === horario && log.tomado
      );

      itens.push({
        medicamento_id: medicamento.id,
        nome: medicamento.nome,
        dose: medicamento.dose,
        horario,
        tomado,
        ...estoque(medicamento),
      });
    }
  }

  return itens.sort((a, b) => a.horario.localeCompare(b.horario));
}

// Marcar a dose baixa o estoque; desmarcar devolve.
export async function marcarDose(usuario, medicamentoId, horario, data = hoje(), tomado = true) {
  const supabase = getSupabase();

  if (!tomado) {
    const { error } = await supabase
      .from("medicamentos_log")
      .delete()
      .eq("user_id", usuario)
      .eq("medicamento_id", medicamentoId)
      .eq("data", data)
      .eq("horario", horario);

    if (error) throw new Error(`Falha ao desmarcar dose: ${error.message}`);
    await mexerEstoque(usuario, medicamentoId, +1);
    return { tomado: false };
  }

  const { error } = await supabase
    .from("medicamentos_log")
    .upsert({ user_id: usuario, medicamento_id: medicamentoId, data, horario, tomado: true }, { onConflict: "medicamento_id,data,horario" });

  if (error) throw new Error(`Falha ao marcar dose: ${error.message}`);
  await mexerEstoque(usuario, medicamentoId, -1);
  return { tomado: true };
}

async function mexerEstoque(usuario, medicamentoId, delta) {
  const supabase = getSupabase();
  const { data: medicamento } = await supabase
    .from("medicamentos")
    .select("estoque_atual")
    .eq("user_id", usuario)
    .eq("id", medicamentoId)
    .maybeSingle();

  if (!medicamento || medicamento.estoque_atual === null) return;

  await supabase
    .from("medicamentos")
    .update({ estoque_atual: Math.max(0, Number(medicamento.estoque_atual) + delta) })
    .eq("id", medicamentoId);
}

// ---------- exames e marcadores ----------

// Um exame pode chegar com vários marcadores de uma vez.
export async function criarExame(usuario, dados) {
  const exame = await criar("saude_exames", usuario, dados, CAMPOS_EXAME, "exame");

  const marcadores = (dados.marcadores || []).filter((m) => m.marcador && m.valor !== "" && m.valor !== null);
  if (marcadores.length > 0) {
    const { error } = await getSupabase().from("saude_marcadores").insert(
      marcadores.map((m) => ({
        user_id: usuario,
        exame_id: exame.id,
        data: dados.data,
        marcador: m.marcador,
        valor: Number(m.valor),
        unidade: m.unidade || null,
        ref_min: m.ref_min ?? null,
        ref_max: m.ref_max ?? null,
      }))
    );

    if (error) throw new Error(`Falha ao salvar os marcadores: ${error.message}`);
  }

  return exame;
}

export async function evolucaoMarcadores(usuario) {
  const { data, error } = await getSupabase()
    .from("saude_marcadores")
    .select("*")
    .eq("user_id", usuario)
    .order("data");

  if (error) throw new Error(`Falha ao ler marcadores: ${error.message}`);

  const porMarcador = {};
  for (const linha of data) {
    porMarcador[linha.marcador] ||= { marcador: linha.marcador, unidade: linha.unidade, ref_min: linha.ref_min, ref_max: linha.ref_max, pontos: [] };
    porMarcador[linha.marcador].pontos.push({
      data: linha.data,
      valor: Number(linha.valor),
      situacao: classificarMarcador(linha.valor, linha.ref_min, linha.ref_max),
    });
  }

  return Object.values(porMarcador)
    .map((serie) => ({
      ...serie,
      ultimo: serie.pontos[serie.pontos.length - 1],
      variacao: serie.pontos.length > 1 ? Number((serie.pontos[serie.pontos.length - 1].valor - serie.pontos[0].valor).toFixed(2)) : null,
    }))
    .sort((a, b) => a.marcador.localeCompare(b.marcador));
}

// ---------- painel ----------

export async function painel(usuario) {
  const hojeISO = hoje();

  const [doses, consultas, recorrencias, exames, marcadores, sinais, sono, sintomas, listaVacinas, contatos, medicamentos] =
    await Promise.all([
      medicamentosDoDia(usuario, hojeISO),
      ler("saude_consultas", usuario, "data"),
      ler("saude_recorrencias", usuario, "nome", true),
      ler("saude_exames", usuario, "data"),
      evolucaoMarcadores(usuario),
      ler("sinais_log", usuario, "data"),
      ler("sono_log", usuario, "data"),
      ler("sintomas", usuario, "data"),
      ler("vacinas", usuario, "data"),
      ler("saude_contatos", usuario, "nome", true),
      ler("medicamentos", usuario, "nome", true),
    ]);

  const ultimoSinal = (tipo) => sinais.find((s) => s.tipo === tipo) || null;
  const pressao = ultimoSinal("pressao");

  const sonoRecente = sono.filter((s) => s.data >= somarDias(hojeISO, -7) && s.duracao_min);
  const mediaSono = sonoRecente.length
    ? Math.round(sonoRecente.reduce((total, s) => total + s.duracao_min, 0) / sonoRecente.length)
    : null;

  return {
    data: hojeISO,
    hora: horaAgora(),
    doses,
    medicamentos: medicamentos.map((medicamento) => ({ ...medicamento, ...estoque(medicamento) })),
    consultas: consultas.slice(0, 20),
    proximas_consultas: consultas.filter((c) => c.data >= hojeISO).sort((a, b) => a.data.localeCompare(b.data)),
    recorrencias: recorrencias.map((recorrencia) => ({ ...recorrencia, ...proximaRecorrencia(recorrencia, hojeISO) })),
    exames: exames.slice(0, 20),
    marcadores,
    sinais: sinais.slice(0, 40),
    ultimos_sinais: TIPOS_SINAL.map((tipo) => ({ ...tipo, ultimo: ultimoSinal(tipo.id) })),
    pressao_classificada: pressao ? classificarPressao(pressao.valor, pressao.valor2) : null,
    sono: sono.slice(0, 30),
    media_sono_7d: mediaSono,
    linha_sono: ultimosDias(14).map((data) => {
      const registro = sono.find((s) => s.data === data);
      return { data, minutos: registro?.duracao_min || 0, qualidade: registro?.qualidade || null };
    }),
    sintomas: sintomas.slice(0, 30),
    vacinas: listaVacinas,
    contatos,
    tipos_sinal: TIPOS_SINAL,
    marcadores_conhecidos: MARCADORES,
  };
}

// Resumo para levar na consulta (E4.2). O PDF sai da impressão do navegador —
// é o caminho que funciona no iPhone sem instalar nada.
export async function resumoParaConsulta(usuario) {
  const dados = await painel(usuario);

  return {
    gerado_em: new Date().toISOString(),
    medicamentos: dados.medicamentos.filter((m) => m.ativo).map((m) => ({ nome: m.nome, dose: m.dose, horarios: m.horarios })),
    ultimos_exames: dados.marcadores.map((serie) => ({
      marcador: serie.marcador,
      valor: serie.ultimo?.valor,
      unidade: serie.unidade,
      data: serie.ultimo?.data,
      situacao: serie.ultimo?.situacao,
    })),
    consultas_recentes: dados.consultas.slice(0, 5).map((c) => ({ data: c.data, especialidade: c.especialidade, resumo: c.resumo })),
    sintomas_recentes: dados.sintomas.slice(0, 10),
    sinais: dados.ultimos_sinais.filter((s) => s.ultimo).map((s) => ({ nome: s.nome, valor: s.ultimo.valor, valor2: s.ultimo.valor2, unidade: s.unidade, data: s.ultimo.data })),
    media_sono_7d: dados.media_sono_7d,
    vacinas: dados.vacinas,
  };
}
