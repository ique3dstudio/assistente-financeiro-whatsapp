// Barra de comando por IA (E6.1): uma mensagem em linguagem natural roteada
// para o módulo certo — "gastei 45 no almoço", "supino 4x8 com 60", "consulta
// com dentista quinta 15h", "bebi 500ml". A IA só escolhe QUAL ferramenta
// chamar e extrai os dados; quem decide se o resultado faz sentido e formata
// o texto de confirmação é código puro daqui, testado sem precisar de rede.
//
// Duas etapas, nunca uma só: `interpretarComando` devolve uma PRÉVIA (nada é
// gravado ainda); só depois de o usuário confirmar na tela é que
// `executarComando` grava de verdade. É o "sempre mostra o que entendeu antes
// de gravar" do roadmap.
import { interpretar } from "./ai.js";
import { hoje } from "./datas.js";
import { BEBIDAS } from "../modules/agua/bebidas.js";
import { TIPOS } from "../modules/agenda/regras.js";
import * as agenda from "../modules/agenda/service.js";
import * as agua from "../modules/agua/service.js";
import * as financas from "../modules/financas/service.js";
import * as treino from "../modules/treino/service.js";

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function diaDaSemana(dataISO) {
  return DIAS_SEMANA[new Date(`${dataISO}T12:00:00Z`).getUTCDay()];
}

export function dataCurta(dataISO) {
  return `${diaDaSemana(dataISO)}, ${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}`;
}

// ---------- achar exercício pelo nome digitado ----------

export function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Casa "supino" com "Supino reto com barra" (e vice-versa); entre vários que
// batem, prefere o nome mais curto — o mais direto/genérico.
export function acharExercicio(nomeBuscado, exercicios) {
  const alvo = normalizar(nomeBuscado);
  if (!alvo) return null;

  const candidatos = exercicios.filter((e) => {
    const nome = normalizar(e.nome);
    return nome.includes(alvo) || alvo.includes(nome);
  });
  if (candidatos.length === 0) return null;

  return candidatos.sort((a, b) => a.nome.length - b.nome.length)[0];
}

// ---------- textos de confirmação ----------

export function resumoGasto({ valor, tipo, categoria, descricao }) {
  const cifra = Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rotulo = tipo === "receita" ? "Recebimento" : "Gasto";
  return `${tipo === "receita" ? "💰" : "💸"} ${rotulo} de R$ ${cifra} em ${categoria}${descricao ? ` (${descricao})` : ""}`;
}

export function resumoAgua({ quantidade_ml, bebida }) {
  const info = BEBIDAS[bebida] || BEBIDAS.agua;
  return `${info.emoji} ${quantidade_ml} ml de ${info.nome.toLowerCase()}`;
}

export function resumoTreino({ exercicioNome, series, reps, peso }) {
  const comPeso = peso > 0 ? ` a ${peso} kg` : "";
  return `🏋️ ${series} série${series > 1 ? "s" : ""} de ${exercicioNome}: ${reps} reps${comPeso}`;
}

export function resumoAgenda({ titulo, tipo, data, hora }) {
  const rotuloTipo = TIPOS.find((t) => t.id === tipo)?.nome || "Compromisso";
  return `📅 ${rotuloTipo}: ${titulo}, ${dataCurta(data)}${hora ? ` às ${hora}` : ""}`;
}

// ---------- as 4 ferramentas que a IA pode chamar ----------

function ferramentas({ nomesCategorias, exerciciosNomes }) {
  return [
    {
      type: "function",
      function: {
        name: "registrar_gasto",
        description: "Registra um gasto ou um recebimento de dinheiro.",
        parameters: {
          type: "object",
          properties: {
            valor: { type: "number", description: "Valor em reais, sempre positivo" },
            tipo: { type: "string", enum: ["receita", "despesa"] },
            categoria: {
              type: "string",
              description: nomesCategorias.length
                ? `A categoria existente que melhor combina: ${nomesCategorias.join(", ")}. Se nenhuma combinar bem, sugira um nome curto novo.`
                : "Nome curto da categoria",
            },
            descricao: { type: "string", description: "Descrição curta, opcional" },
          },
          required: ["valor", "tipo", "categoria"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "registrar_agua",
        description: "Registra que a pessoa bebeu água ou outra bebida.",
        parameters: {
          type: "object",
          properties: {
            quantidade_ml: { type: "number", description: "Quantidade em mililitros" },
            bebida: { type: "string", enum: Object.keys(BEBIDAS), description: "Tipo de bebida; padrão 'agua'" },
          },
          required: ["quantidade_ml"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "registrar_treino",
        description: "Registra uma ou mais séries de um exercício de treino de musculação.",
        parameters: {
          type: "object",
          properties: {
            exercicio: {
              type: "string",
              description: exerciciosNomes.length
                ? `Nome do exercício, o mais parecido possível com um destes: ${exerciciosNomes.join(", ")}`
                : "Nome do exercício",
            },
            series: { type: "number", description: "Número de séries feitas; padrão 1" },
            reps: { type: "number", description: "Repetições por série" },
            peso: { type: "number", description: "Peso usado, em kg; 0 se não mencionado" },
          },
          required: ["exercicio", "reps"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "criar_compromisso",
        description: "Cria um compromisso ou evento na agenda.",
        parameters: {
          type: "object",
          properties: {
            titulo: { type: "string", description: "Título curto do compromisso" },
            tipo: { type: "string", enum: TIPOS.map((t) => t.id) },
            data: { type: "string", description: "Data no formato AAAA-MM-DD" },
            hora: { type: "string", description: "Horário HH:MM, só se foi mencionado" },
          },
          required: ["titulo", "data"],
        },
      },
    },
  ];
}

function promptSistema({ hojeISO }) {
  return `Você é o assistente do Life OS, um app pessoal em português do Brasil. Interprete o comando do usuário
e chame a ÚNICA ferramenta que melhor corresponde: registrar_gasto (dinheiro), registrar_agua (bebida),
registrar_treino (exercício/série de musculação) ou criar_compromisso (agenda). Se o comando não for claramente
uma dessas quatro coisas, não chame nenhuma ferramenta.

Hoje é ${hojeISO}, ${diaDaSemana(hojeISO)}. Converta qualquer data relativa ("quinta", "amanhã", "semana que
vem", "dia 20") para o formato AAAA-MM-DD, calculando sempre a partir de hoje.`;
}

// ---------- prévia: o que a IA entendeu, ainda sem gravar nada ----------

export function montarPreview(resultado, { exercicios }) {
  if (!resultado) return null;
  const { ferramenta, dados } = resultado;

  if (ferramenta === "registrar_gasto") {
    const valor = Number(dados.valor);
    if (!Number.isFinite(valor) || valor <= 0) return { modulo: "financas", erro: "Não entendi o valor do gasto." };
    if (!["receita", "despesa"].includes(dados.tipo)) {
      return { modulo: "financas", erro: "Não entendi se é um gasto ou um recebimento." };
    }
    const preview = { valor, tipo: dados.tipo, categoria: dados.categoria || "outros", descricao: dados.descricao || "" };
    return { modulo: "financas", acao: "registrar_gasto", dados: preview, resumo: resumoGasto(preview) };
  }

  if (ferramenta === "registrar_agua") {
    const quantidade_ml = Math.round(Number(dados.quantidade_ml));
    if (!Number.isFinite(quantidade_ml) || quantidade_ml <= 0) {
      return { modulo: "agua", erro: "Não entendi a quantidade." };
    }
    const bebida = BEBIDAS[dados.bebida] ? dados.bebida : "agua";
    const preview = { quantidade_ml, bebida };
    return { modulo: "agua", acao: "registrar_agua", dados: preview, resumo: resumoAgua(preview) };
  }

  if (ferramenta === "registrar_treino") {
    const exercicio = acharExercicio(dados.exercicio, exercicios);
    if (!exercicio) return { modulo: "treino", erro: `Não achei "${dados.exercicio}" na sua biblioteca de exercícios.` };

    const reps = Math.round(Number(dados.reps));
    if (!Number.isFinite(reps) || reps <= 0) return { modulo: "treino", erro: "Não entendi quantas repetições." };

    const series = Math.max(1, Math.round(Number(dados.series) || 1));
    const peso = Number(dados.peso) || 0;
    const preview = { exercicio_id: exercicio.id, exercicio_nome: exercicio.nome, series, reps, peso };
    return { modulo: "treino", acao: "registrar_treino", dados: preview, resumo: resumoTreino({ exercicioNome: exercicio.nome, series, reps, peso }) };
  }

  if (ferramenta === "criar_compromisso") {
    if (!dados.titulo?.trim() || !dados.data) return { modulo: "agenda", erro: "Não entendi o compromisso ou a data." };
    const tipo = TIPOS.some((t) => t.id === dados.tipo) ? dados.tipo : "pessoal";
    const preview = { titulo: dados.titulo.trim(), tipo, data: dados.data, hora: dados.hora || null };
    return { modulo: "agenda", acao: "criar_compromisso", dados: preview, resumo: resumoAgenda(preview) };
  }

  return null;
}

// ---------- orquestração (rede + banco) ----------

export async function interpretarComando(usuario, texto) {
  if (!texto?.trim()) return null;

  const [categorias, exercicios] = await Promise.all([
    financas.categorias(usuario).catch(() => []),
    treino.exercicios(usuario).catch(() => []),
  ]);

  const resultado = await interpretar(texto, {
    systemPrompt: promptSistema({ hojeISO: hoje() }),
    tools: ferramentas({
      nomesCategorias: [...new Set(categorias.map((c) => c.nome))],
      exerciciosNomes: [...new Set(exercicios.map((e) => e.nome))],
    }),
  });

  return montarPreview(resultado, { exercicios });
}

// `dados` vem do preview acima (o usuário só confirmou, ou editou algum campo
// na tela antes de confirmar) — a validação de verdade já é feita pelo
// service de cada módulo, igual a qualquer outro caminho de gravação do app.
export async function executarComando(usuario, modulo, dados) {
  if (modulo === "financas") {
    const lancado = await financas.salvarTransacao(usuario, { ...dados, origem: "manual" });
    return { ok: true, mensagem: resumoGasto(dados), resultado: lancado };
  }

  if (modulo === "agua") {
    const registro = await agua.registrar(usuario, dados.quantidade_ml, dados.bebida);
    return { ok: true, mensagem: resumoAgua(dados), resultado: registro };
  }

  if (modulo === "treino") {
    const { sessao } = await treino.iniciarSessao(usuario);
    for (let i = 0; i < dados.series; i++) {
      await treino.registrarSerie(usuario, sessao.id, { exercicio_id: dados.exercicio_id, peso: dados.peso, reps: dados.reps });
    }
    return { ok: true, mensagem: resumoTreino({ exercicioNome: dados.exercicio_nome, series: dados.series, reps: dados.reps, peso: dados.peso }) };
  }

  if (modulo === "agenda") {
    const evento = await agenda.criarEvento(usuario, dados);
    return { ok: true, mensagem: resumoAgenda(dados), resultado: evento };
  }

  throw new Error("Comando não reconhecido");
}
