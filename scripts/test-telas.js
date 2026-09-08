// Renderiza todas as telas do app num DOM de verdade (jsdom), com respostas de
// mentira no lugar do servidor:
//
//   node scripts/test-telas.js
//
// Serve para pegar erro de template, campo inexistente e ação sem tratamento
// ANTES do deploy — sem precisar abrir o celular.
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";

const html = fs.readFileSync("public/index.html", "utf8");
const dom = new JSDOM(html, { url: "http://localhost/" });

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
// crypto e navigator só têm getter no Node: usamos defineProperty
Object.defineProperty(global, "crypto", { value: { randomUUID: () => "id-de-teste" }, configurable: true });
global.CustomEvent = dom.window.CustomEvent;
global.prompt = () => null;
global.confirm = () => false;

// ---------- respostas de mentira, no mesmo formato do servidor ----------

const HOJE = "2026-09-08";

const RESPOSTAS = {
  "/hoje": {
    data: HOJE,
    hora: 21,
    saudacao: "Boa noite",
    nome: "Gustavo Ique",
    sequencia_geral: 12,
    aneis: [
      { id: "habitos", nome: "Rotina", emoji: "🔁", principal: "3/5", apoio: "hábitos de hoje", progresso: 0.6, sequencia: 12 },
      { id: "agua", nome: "Água", emoji: "💧", principal: "1,8 L", apoio: "faltam 400 ml para o ritmo", progresso: 0.64 },
      { id: "financas", nome: "Finanças", emoji: "💰", indisponivel: true, erro: "Finanças: tabela não criada" },
    ],
    compromissos: [
      { id: "e1", titulo: "Dentista", emoji: "🩺", cor: "#f472b6", hora: "15:00", hora_fim: "16:00", local: "Centro", falta: "em 2h30" },
    ],
    periodos: [
      {
        id: "manha",
        nome: "Manhã",
        itens: [
          { id: "h1", tipo: "habito", nome: "Beber água", emoji: "💧", cor: "#3ba9f4", periodo: "manha", horario: "07:00", concluido: true, streak: 12, frequencia_texto: "todo dia", nao_negociavel: true, meta_qtd: null, de_folga: false },
          { id: "h2", tipo: "habito", nome: "Ler 10 páginas", emoji: "📖", cor: "#fbbf24", periodo: "manha", horario: null, concluido: false, streak: 0, frequencia_texto: "seg, qua, sex", meta_qtd: 10, unidade: "páginas", de_folga: false },
          { id: "h3", tipo: "habito", nome: "Alongar", emoji: "🧘", cor: "#4ade80", periodo: "manha", horario: null, concluido: false, streak: 4, frequencia_texto: "todo dia", meta_qtd: null, duracao_min: 8, de_folga: false },
          { id: "t1", tipo: "tarefa", nome: "Pagar cartão", emoji: "🔴", cor: "#f87171", periodo: "manha", horario: null, concluido: false, streak: 0, frequencia_texto: "atrasada desde 2026-09-05" },
        ],
      },
    ],
    total: 4,
    feitos: 1,
    progresso: 0.33,
    mostrar_fechamento: true,
    erros: ["Finanças: tabela não criada"],
  },

  "/diario/hoje": { data: HOJE, humor: { nota: 4, emocoes: ["grato"], fatores: ["sono"] }, anotacoes: [{ id: "a1", tipo: "gratidao", conteudo: "dia bom", data: HOJE }] },

  "/habitos": {
    habitos: [
      { id: "h1", nome: "Beber água", emoji: "💧", cor: "#3ba9f4", periodo: "manha", horario: "07:00", frequencia: { tipo: "diaria" }, frequencia_texto: "todo dia", streak: 12, nao_negociavel: true, meta_qtd: null, unidade: null },
    ],
  },

  "/habitos/h1/historico?dias=182": {
    habito: { id: "h1", nome: "Beber água", emoji: "💧", cor: "#3ba9f4" },
    streak: 12,
    dias: [{ data: HOJE, devido: true, concluido: true, folga: false }],
  },

  "/habitos/ritual/manha": {
    periodo: "manha",
    data: HOJE,
    total: 2,
    feitos: 0,
    minutos_estimados: 15,
    itens: [{ id: "h2", nome: "Ler 10 páginas", emoji: "📖", concluido: false, duracao_min: 10, meta_qtd: 10, unidade: "páginas" }],
  },

  "/agua": {
    data: HOJE,
    total: 1800,
    bruto: 2000,
    meta: 2800,
    progresso: 0.64,
    esperado_agora: 2200,
    atraso: 400,
    sequencia: 3,
    recipientes: [{ id: "r1", nome: "Garrafa", volume_ml: 500, bebida: "agua", emoji: "💧" }],
    bebidas: {
      agua: { nome: "Água", emoji: "💧", fator: 1 },
      cha: { nome: "Chá", emoji: "🍵", fator: 1 },
      suco: { nome: "Suco", emoji: "🧃", fator: 0.9 },
      refrigerante: { nome: "Refrigerante", emoji: "🥤", fator: 0.8 },
      cafe: { nome: "Café", emoji: "☕", fator: 0.6 },
      alcool: { nome: "Álcool", emoji: "🍺", fator: -0.5 },
    },
    historico: [{ data: HOJE, total: 1800, bateu: false }],
  },

  "/agenda": {
    data: HOJE,
    tipos: [{ id: "consulta", nome: "Consulta", emoji: "🩺", cor: "#f472b6" }, { id: "pessoal", nome: "Pessoal", emoji: "📌", cor: "#3ba9f4" }],
    prioridades: [{ id: 1, nome: "Alta", emoji: "🔴" }, { id: 2, nome: "Média", emoji: "🟡" }],
    eventos: [
      { id: "e1", titulo: "Dentista", tipo: "consulta", tipo_nome: "Consulta", emoji: "🩺", cor: "#f472b6", data: HOJE, hora: "15:00", hora_fim: "16:00", local: "Centro", repetido: false, pauta: "levar exame" },
    ],
    tarefas: [
      { id: "t1", titulo: "Pagar cartão", prazo: "2026-09-05", prioridade: 1, prioridade_info: { id: 1, nome: "Alta", emoji: "🔴" }, atrasada: true, concluida_em: null },
    ],
    conflitos_hoje: [["Dentista", "Treino"]],
  },

  "/metas": {
    data: HOJE,
    horizontes: [
      {
        id: "curto",
        nome: "Curto prazo",
        detalhe: "até 3 meses",
        metas: [
          {
            id: "m1", titulo: "Supino 80 kg x 5", horizonte: "curto", area: "saude", unidade: "kg",
            valor_inicial: 60, valor_atual: 70, valor_alvo: 80, progresso: 0.5, metrica_id: null, metrica_nome: null,
            automatica: false, prazo: "2026-12-01", motivo: "porque quero", marcos: [{ id: "mc1", titulo: "70 kg x 5", concluido_em: HOJE }],
            vinculos: 1, situacao: { id: "andando", texto: "84 dias restantes" }, orfa: false,
            ritmo: { falta: 10, por_dia: 0.12, por_semana: 0.83, dias: 84 },
          },
        ],
      },
      { id: "medio", nome: "Médio prazo", detalhe: "3 a 12 meses", metas: [] },
      { id: "longo", nome: "Longo prazo", detalhe: "1 a 5 anos", metas: [] },
    ],
    areas: [{ id: "saude", nome: "Saúde", emoji: "💪" }, { id: "financeiro", nome: "Financeiro", emoji: "💰" }],
    metricas: [{ id: "agua.sequencia", nome: "Dias seguidos batendo a água", valor: 3, modulo: "agua" }],
    total: 1,
    concluidas: 0,
    orfas: 0,
  },

  "/financas": {
    mes: "2026-09",
    despesas: 1234.5,
    receitas: 5000,
    por_categoria: [{ categoria: "alimentacao", total: 800 }],
    lancamentos: [{ id: "l1", data: HOJE, valor: 45.9, tipo: "despesa", categoria: "alimentacao", descricao: "almoço" }],
  },

  "/perfil": { user_id: "eu", nome: "Gustavo Ique", peso_kg: 80, altura_cm: 178, nascimento: "1995-05-10", modulos_inativos: [] },

  "/diario?dias=30": {
    humores: [{ data: HOJE, nota: 4 }],
    anotacoes: [{ id: "a1", data: HOJE, tipo: "gratidao", conteudo: "dia bom" }],
    media_humor: 4,
    dias_registrados: 1,
    linha: [{ data: HOJE, nota: 4 }],
    emocoes_opcoes: ["calmo", "grato"],
    fatores_opcoes: ["sono", "treino"],
  },

  "/diario?dias=1": { emocoes_opcoes: ["calmo", "grato"], fatores_opcoes: ["sono", "treino"], linha: [], anotacoes: [], humores: [], media_humor: null, dias_registrados: 0 },
  "/treino": {
    data: HOJE,
    rotinas: [
      {
        id: "r1", nome: "Treino A — Peito e tríceps", tipo: "abc", dias_semana: [1, 4], ativo: true,
        itens: [
          {
            id: "i1", rotina_id: "r1", exercicio_id: "x1", series_alvo: 3, reps_min: 8, reps_max: 12,
            rir_alvo: 2, descanso_seg: 90, regra_progressao: "dupla", incremento_kg: 2.5, ordem: 1,
            exercicio: { id: "x1", nome: "Supino reto com barra", musculo_primario: "peito", equipamento: "barra", tipo: "composto" },
          },
        ],
      },
    ],
    sessao_hoje: null,
    rotina_prevista: { id: "r1", nome: "Treino A — Peito e tríceps", dias_semana: [1, 4], itens: [{ id: "i1" }] },
    estatisticas: {
      dias: 90, sessoes: 12, series_totais: 210, volume_total: 84000,
      volume_por_semana: [{ semana: "2026-08-30", total: 12000 }, { semana: "2026-09-06", total: 15000 }],
      mapa_muscular: [
        { id: "peito", nome: "Peito", regiao: "frente", series: 12, alvo: 12, proporcao: 1 },
        { id: "dorsal", nome: "Dorsal", regiao: "costas", series: 4, alvo: 14, proporcao: 0.28 },
        { id: "quadriceps", nome: "Quadríceps", regiao: "frente", series: 0, alvo: 12, proporcao: 0 },
      ],
      mais_treinados: [
        { exercicio_id: "x1", nome: "Supino reto com barra", series: 40, curva: [{ data: "2026-07-01", um_rm: 80 }, { data: "2026-09-01", um_rm: 92.5 }] },
      ],
      prs: [{ exercicio: "Supino reto com barra", peso: 75, reps: 8, data: "2026-09-01" }],
      frequencia: [{ data: HOJE, treinou: true }, { data: "2026-09-07", treinou: false }],
    },
    medidas: [{ data: HOJE, peso_kg: 80.5, gordura_pct: 18, braco_cm: 36, peito_cm: null, cintura_cm: 84, quadril_cm: null, coxa_cm: null, panturrilha_cm: null }],
    musculos: [{ id: "peito", nome: "Peito", regiao: "frente" }],
    equipamentos: [{ id: "barra", nome: "Barra" }, { id: "halter", nome: "Halteres" }],
    regras: [{ id: "dupla", nome: "Dupla progressão", detalhe: "sobe reps, depois o peso" }, { id: "linear", nome: "Linear", detalhe: "bateu o alvo, sobe" }],
  },

  "/treino/sessoes": {
    sessao: { id: "s1", data: HOJE, rotina_id: "r1", concluida_em: null },
    rotina: { id: "r1", nome: "Treino A — Peito e tríceps", tipo: "abc" },
    total_series: 2,
    volume: 1080,
    regras: [{ id: "dupla", nome: "Dupla progressão", detalhe: "sobe reps, depois o peso" }],
    plano: [
      {
        exercicio_id: "x1", item_id: "i1", nome: "Supino reto com barra", musculo_primario: "peito", equipamento: "barra",
        config: { series_alvo: 3, reps_min: 8, reps_max: 12, rir_alvo: 2, descanso_seg: 90, regra_progressao: "dupla", incremento_kg: 2.5, percentual_1rm: null, agrupamento: null },
        ultima_vez: { data: "2026-09-01", series: [{ peso: 60, reps: 10 }, { peso: 60, reps: 9 }], um_rm: 80 },
        sugestao: { peso: 60, reps: 10, series: 3, motivo: "mesmo peso, tentando 10 repetições" },
        estagnacao: { estagnado: true, sessoes_sem_avanco: 3, sugestoes: ["Deload: volte para 55 kg por uma semana e suba de novo.", "Trocar a variação."] },
        series: [{ id: "sr1", serie: 1, peso: 60, reps: 10, rir: 2, tipo: "normal", is_pr: true }],
      },
    ],
  },

  "/treino/exercicios": {
    exercicios: [
      { id: "x1", nome: "Supino reto com barra", musculo_primario: "peito", musculos_secundarios: ["triceps"], equipamento: "barra", tipo: "composto", nivel: "iniciante", instrucoes: "Desça até o meio do peito.", erros_comuns: "Soltar o quadril do banco." },
    ],
  },

  "/treino/mapa": {
    mapa: [
      { id: "peito", nome: "Peito", regiao: "frente", exercicios: 10 },
      { id: "dorsal", nome: "Dorsal", regiao: "costas", exercicios: 9 },
    ],
  },

  "/treino/estatisticas?dias=180": null, // preenchido abaixo
  "/treino/medidas": { medidas: [{ data: HOJE, peso_kg: 80.5, gordura_pct: 18, braco_cm: 36, peito_cm: null, cintura_cm: 84, quadril_cm: null, coxa_cm: null, panturrilha_cm: null }] },

  "/diagnostico": { configurado: { url_usada: "https://x.supabase.co" }, tabelas: { perfil: "ok" } },
  "/abas": {
    abas: [
      { id: "hoje", nome: "Hoje", emoji: "☀️" },
      { id: "metas", nome: "Metas", emoji: "🎯" },
      { id: "corpo", nome: "Corpo", emoji: "💪" },
      { id: "dinheiro", nome: "Dinheiro", emoji: "💰" },
      { id: "eu", nome: "Eu", emoji: "🧠" },
    ],
    modulos: [{ id: "habitos", nome: "Rotina", emoji: "🔁", aba: "hoje" }, { id: "agua", nome: "Água", emoji: "💧", aba: "hoje" }],
  },
};

RESPOSTAS["/treino/estatisticas?dias=180"] = RESPOSTAS["/treino"].estatisticas;

const pedidos = [];

global.fetch = async (url, opcoes = {}) => {
  const caminho = String(url).replace("/api", "");
  pedidos.push(`${opcoes.method || "GET"} ${caminho}`);

  if (!(caminho in RESPOSTAS)) {
    throw new Error(`FIXTURE FALTANDO para ${opcoes.method || "GET"} ${caminho}`);
  }

  return {
    ok: true,
    status: 200,
    json: async () => RESPOSTAS[caminho],
    headers: new dom.window.Headers(),
  };
};

// ---------- os testes ----------

const ui = await import("../public/ui.js");
ui.estado.abas = RESPOSTAS["/abas"].abas;
ui.estado.modulos = RESPOSTAS["/abas"].modulos;

const telas = {
  hoje: await import("../public/telas/hoje.js"),
  habitos: await import("../public/telas/habitos.js"),
  agua: await import("../public/telas/agua.js"),
  agenda: await import("../public/telas/agenda.js"),
  metas: await import("../public/telas/metas.js"),
  dinheiro: await import("../public/telas/dinheiro.js"),
  eu: await import("../public/telas/eu.js"),
  foco: await import("../public/telas/foco.js"),
  treino: await import("../public/telas/treino.js"),
};

let passou = 0;
async function teste(nome, funcao) {
  await funcao();
  passou++;
  console.log(`  ok  ${nome}`);
}

function contem(html, ...pedacos) {
  for (const pedaco of pedacos) {
    assert.ok(html.includes(pedaco), `esperava encontrar "${pedaco}" no HTML gerado`);
  }
  assert.ok(!html.includes("undefined"), 'o HTML gerado contém "undefined"');
  assert.ok(!html.includes("[object Object]"), 'o HTML gerado contém "[object Object]"');
  assert.ok(!html.includes("NaN"), 'o HTML gerado contém "NaN"');
}

await teste("tela Hoje: saudação, sequência, checklist, agenda, foco e fechamento", async () => {
  const html = await telas.hoje.render();
  contem(html, "Boa noite, Gustavo", "🔥 12 dias", "Manhã", "Beber água", "Pagar cartão", "âncora",
    "Dentista", "em 2h30", "Foco agora", "Fechamento do dia", "iniciar rotina");
  assert.ok(html.includes('data-acao="habito-marcar:h2"'), "hábito precisa de ação de marcar");
  assert.ok(html.includes('data-acao="tarefa-concluir:t1"'), "tarefa precisa de ação de concluir");
});

await teste("tela Hoje sem nada cadastrado não vira tela punitiva", async () => {
  const original = RESPOSTAS["/hoje"];
  RESPOSTAS["/hoje"] = { ...original, total: 0, periodos: [], compromissos: [], sequencia_geral: 0, erros: [] };
  const html = await telas.hoje.render();
  contem(html, "Criar meu primeiro hábito", "sequência nasce do fácil");
  RESPOSTAS["/hoje"] = original;
});

await teste("lista de hábitos", async () => {
  const html = await telas.habitos.render();
  contem(html, "Beber água", "todo dia", "manhã", "🔥 12", "Novo hábito");
});

await teste("formulário de hábito novo", async () => {
  const html = await telas.habitos.render("novo");
  contem(html, "Novo hábito", "f-nome", "f-freq-tipo", "Não-negociável");
});

await teste("formulário de hábito existente vem preenchido", async () => {
  const html = await telas.habitos.render("h1");
  contem(html, "Editar hábito", 'value="Beber água"', "Excluir hábito");
});

await teste("tela de água mostra hidratação real e atraso do ritmo", async () => {
  const html = await telas.agua.render();
  contem(html, "1,8 L", "de 2,8 L", "400 ml atrás do ritmo", "Garrafa", "500 ml", "Café conta 60%", "🔥 3 dias");
});

await teste("agenda com conflito, evento e tarefa atrasada", async () => {
  const html = await telas.agenda.render();
  contem(html, "Dentista", "15:00–16:00", "Conflito hoje", "Pagar cartão", "atrasada", "Novo compromisso");
});

await teste("formulário de compromisso", async () => {
  const html = await telas.agenda.render("novo");
  contem(html, "Novo compromisso", "e-titulo", "Repetir", "Consulta");
});

await teste("metas com barra, ritmo e marcos", async () => {
  const html = await telas.metas.render();
  contem(html, "Supino 80 kg x 5", "70 / 80 kg", "50%", "84 dias restantes", "1/1 marcos", "Curto prazo");
});

await teste("formulário de meta oferece as métricas automáticas", async () => {
  const html = await telas.metas.render("nova");
  contem(html, "Nova meta", "Dias seguidos batendo a água (agora: 3)", "atualizo na mão", "Por que isso importa");
});

await teste("dinheiro mostra entra/sai/sobra", async () => {
  const html = await telas.dinheiro.render();
  contem(html, "R$ 5000,00", "R$ 1234,50", "R$ 3765,50", "almoço", "alimentacao");
});

await teste("aba Eu: humor, perfil e módulos", async () => {
  const html = await telas.eu.render();
  contem(html, "4,0 / 5", "1 dias com check-in", 'value="Gustavo Ique"', 'value="80"', "Módulos", "Diagnóstico do banco");
});

await teste("rotina guiada mostra o item atual com cronômetro", async () => {
  const html = await telas.foco.render("manha");
  contem(html, "Ler 10 páginas", "foco-relogio", "Feito ✓", "Pular este", "10:00");
});

await teste("pomodoro", async () => {
  const html = await telas.foco.render("pomodoro");
  contem(html, "25:00", "Começar", "25 minutos, uma coisa só");
});

await teste("painel do Corpo: treino previsto, mapa muscular e PRs", async () => {
  const html = await telas.treino.render();
  contem(html, "Treino A — Peito e tríceps", "Iniciar treino", "seg, qui", "Esta semana, por músculo",
    "Peito", "Em déficit", "Últimos recordes", "75 kg × 8", "Minhas rotinas (1)");
});

await teste("execução: última vez, sugestão, série feita, PR e estagnação", async () => {
  const html = await telas.treino.render("exec");
  contem(html, "Supino reto com barra", "última vez", "60×10", "hoje: 60 kg × 10",
    "mesmo peso, tentando 10 repetições", "🏆 PR", "repetir última série", "3 sessões sem avanço",
    "Deload: volte para 55 kg", "Concluir treino");
  assert.ok(html.includes('data-acao="serie-salvar:x1:90"'), "botão de salvar série precisa levar o descanso");
});

await teste("rotinas e edição de rotina", async () => {
  const lista = await telas.treino.render("rotinas");
  contem(lista, "Rotinas", "Treino A — Peito e tríceps", "1 exercícios", "Nova rotina");

  const edicao = await telas.treino.render("rotina/r1");
  contem(edicao, "Dias da semana", "Supino reto com barra", "3×8-12", "RIR 2", "dupla", "90s", "+ Adicionar exercício");
});

await teste("biblioteca de exercícios com mapa corporal", async () => {
  const html = await telas.treino.render("biblioteca");
  contem(html, "Exercícios", "Frente do corpo", "Costas do corpo", "Peito", "Supino reto com barra", "barra");
});

await teste("gráficos: volume por semana, frequência e 1RM", async () => {
  const html = await telas.treino.render("stats");
  contem(html, "Volume por semana", "Frequência", "1RM estimado", "Supino reto com barra", "80 → 92,5 kg", "polyline");
});

await teste("medidas mostram a última como referência", async () => {
  const html = await telas.treino.render("medidas");
  contem(html, "Medidas", "Peso (kg)", "Cintura (cm)", 'placeholder="80,5"', "Histórico", "Salvar medidas");
});

await teste("trocar de tela mata o cronômetro anterior", async () => {
  await telas.foco.render("manha"); // inicia rotina guiada (timer via setTimeout)
  await telas.foco.render("pomodoro"); // troca de tela antes do timer começar
  await new Promise((resolve) => setTimeout(resolve, 1100)); // se vazar, estoura aqui
  ui.limparTimer();
});

await teste("toda ação usada nas telas tem função registrada", async () => {
  const acoes = {
    ir: 1, "fechar-painel": 1, recarregar: 1, "em-breve": 1, mais: 1, "rapido-agua": 1,
    "rapido-gasto": 1, "salvar-gasto": 1, "rapido-nota": 1, avisar: 1, "rapido-treino": 1,
  };
  for (const tela of Object.values(telas)) Object.assign(acoes, tela.acoes || {});

  const htmls = [
    await telas.treino.render(),
    await telas.treino.render("exec"),
    await telas.treino.render("rotinas"),
    await telas.treino.render("rotina/r1"),
    await telas.treino.render("biblioteca"),
    await telas.treino.render("biblioteca/escolher"),
    await telas.treino.render("stats"),
    await telas.treino.render("medidas"),
    await telas.hoje.render(),
    await telas.habitos.render(),
    await telas.habitos.render("novo"),
    await telas.agua.render(),
    await telas.agenda.render(),
    await telas.agenda.render("novo"),
    await telas.metas.render(),
    await telas.metas.render("nova"),
    await telas.dinheiro.render(),
    await telas.eu.render(),
    await telas.foco.render("manha"),
    await telas.foco.render("pomodoro"),
  ].join("\n");

  const usadas = [...htmls.matchAll(/data-acao="([^":]+)/g)].map((m) => m[1]);
  const faltando = [...new Set(usadas)].filter((nome) => !(nome in acoes));
  assert.deepEqual(faltando, [], `ações sem função: ${faltando.join(", ")}`);
});

console.log(`\n${passou} telas/testes passaram. ${pedidos.length} chamadas de API cobertas.`);
