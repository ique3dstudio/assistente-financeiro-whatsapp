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

import { HOJE, RESPOSTAS } from "./fixtures.js";


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
  saude: await import("../public/telas/saude.js"),
  vicios: await import("../public/telas/vicios.js"),
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
  contem(html, "Boa noite, Gustavo", "12 dias", "Manhã", "Beber água", "Pagar cartão", "âncora",
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
  contem(html, "Beber água", "todo dia", "manhã", "Novo hábito");
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
  contem(html, "1,8 L", "de 2,8 L", "400 ml atrás do ritmo", "Garrafa", "500 ml", "Café conta 60%", "3 dias seguidos");
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
  contem(html, "Supino 80 kg x 5", "70 / 80 kg", "50%", "84 dias restantes", "1/1 marcos", "Curto prazo", "1 meta ·");
});

await teste("formulário de meta oferece as métricas automáticas", async () => {
  const html = await telas.metas.render("nova");
  contem(html, "Nova meta", "Dias seguidos batendo a água (agora: 3)", "atualizo na mão", "Por que isso importa");
});

await teste("painel do Dinheiro: entra/sai/sobra, projeção, cartão, envelopes e alertas", async () => {
  const html = await telas.dinheiro.render();
  contem(html, "R$\u00a05.000", "R$\u00a03.215", "R$\u00a01.786", "Previsto para o fim do mês", "R$\u00a01.790,35",
    "Visa Infinite", "Delivery", "estourou", "Onde foi o dinheiro", "almoço", "acima da sua média",
    "setembro de 2026");
});

await teste("lançamento com parcelas e crédito", async () => {
  const html = await telas.dinheiro.render("lancar");
  contem(html, "Novo lançamento", "l-valor", "Parcelas", "Forma de pagamento", "Crédito", "Visa Infinite",
    "respeitando o", "Gasto", "Entrada");
});

await teste("fatura do cartão com compras e parcela", async () => {
  const html = await telas.dinheiro.render("fatura/cc1");
  contem(html, "Visa Infinite", "fatura de setembro de 2026", "R$\u00a01.840,90", "notebook 1/10",
    "Registrar pagamento", "2 compras");
});

await teste("cartões mostram fechamento, vencimento e limite", async () => {
  const html = await telas.dinheiro.render("cartoes");
  contem(html, "Cartões", "fecha dia 20", "vence dia 1", "R$\u00a08.000,00", "próxima fatura", "R$\u00a01.240,80");
});

await teste("orçamento com envelopes e regra 50/30/20", async () => {
  const html = await telas.dinheiro.render("orcamento");
  contem(html, "Orçamento", "Regra 50/30/20", "Essenciais", "R$\u00a02.500,00", "Envelopes", "Delivery", "140%");
});

await teste("relatórios com mês a mês, categorias e dia da semana", async () => {
  const html = await telas.dinheiro.render("relatorios");
  contem(html, "Relatórios", "Gasto por mês", "Por categoria", "Por forma de pagamento",
    "Por dia da semana", "Maiores gastos", "notebook");
});

await teste("dívidas comparam avalanche e bola de neve", async () => {
  const html = await telas.dinheiro.render("dividas");
  contem(html, "Dívidas", "Cartão antigo", "R$\u00a05.000,00", "Avalanche", "Bola de neve", "12 meses até quitar",
    "R$\u00a02.100,50 de juros");
});

await teste("metas financeiras com progresso e aporte", async () => {
  const html = await telas.dinheiro.render("metas");
  contem(html, "Reserva de emergência", "R$\u00a04.200,00", "R$\u00a015.000,00", "28%", "Registrar aporte");
});

await teste("contas somam saldo", async () => {
  const html = await telas.dinheiro.render("contas");
  contem(html, "Contas", "Nubank", "R$\u00a03.810,35", "Carteira", "saldo somado");
});

await teste("aba Eu: humor, perfil e módulos", async () => {
  const html = await telas.eu.render();
  contem(html, "4,0 / 5", "1 dias com check-in", 'value="Gustavo Ique"', 'value="80"', "Módulos", "Diagnóstico do banco");
});

await teste("rotina guiada mostra o item atual com cronômetro", async () => {
  const html = await telas.foco.render("manha");
  contem(html, "Ler 10 páginas", "foco-relogio", "Feito", "Pular este", "10:00");
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
    "mesmo peso, tentando 10 repetições", "PR 🏆", "repetir última série", "3 sessões sem avanço",
    "Deload: volte para 55 kg", "Concluir treino");
  assert.ok(html.includes('data-acao="serie-salvar:x1:90"'), "botão de salvar série precisa levar o descanso");
});

await teste("rotinas e edição de rotina", async () => {
  const lista = await telas.treino.render("rotinas");
  contem(lista, "Rotinas", "Treino A — Peito e tríceps", "1 exercício", "Nova rotina");

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

await teste("painel da Saúde: doses, rotina vencida, exames e sono", async () => {
  const html = await telas.saude.render();
  contem(html, "Saúde", "Vitamina D", "08:00", "Ômega 3", "estoque para 5 dias", "Rotina vencida", "Dentista",
    "Últimos exames", "34,2", "Sono", "7h10", "Modo consulta");
});

await teste("marcador mostra evolução e faixa de referência", async () => {
  const html = await telas.saude.render("marcador/Vitamina%20D");
  contem(html, "Vitamina D", "referência 30–60", "18,5", "34,2", "polyline", "não é diagnóstico");
});

await teste("consulta guarda perguntas e o que foi dito", async () => {
  const html = await telas.saude.render("consulta/cs1");
  contem(html, "Dentista", "Dra. Ana", "Perguntas que quero fazer", "perguntar sobre o siso",
    "O que foi dito", "Prescrição", "Marcar retorno");
});

await teste("exames listam marcadores e avisam do bucket pendente", async () => {
  const html = await telas.saude.render("exames");
  contem(html, "Exames", "Vitamina D", "2 medições", "variação +15,7", "Lab X", "Storage");
});

await teste("modo consulta monta o resumo para levar ao médico", async () => {
  const html = await telas.saude.render("resumo");
  contem(html, "Modo consulta", "Medicamentos em uso", "Vitamina D", "Últimos exames", "Medições",
    "Sintomas recentes", "dor de cabeça", "Salvar em PDF");
});

await teste("medições classificam a pressão com a ressalva", async () => {
  const html = await telas.saude.render("sinais");
  contem(html, "Medições", "Normal", "não substitui avaliação médica", "128", "80,5");
});

await teste("painel do Controle: contador, apoio e aviso de que não é tratamento", async () => {
  const html = await telas.vicios.render();
  contem(html, "Controle", "Cigarro", "30d 02:30:45", "faltam 30 dias para 60", "R$\u00a0450,00",
    "recorde 47d", "Rede de apoio", "Irmão", "não é tratamento", "CVV pelo 188",
    "Estou com vontade agora");
});

await teste("detalhe do vício: marcos, economia, linha do tempo e mapa de gatilhos", async () => {
  const html = await telas.vicios.render("vc1");
  contem(html, "Cigarro", "2 tentativas", "seu recorde é 47 dias — ele não sumiu", "Compromisso de hoje",
    "O que você recuperou", "R$\u00a05.475,00", "Marcos", "Meus porquês", "respirar melhor na escada",
    "Linha do tempo", "paladar e olfato", "Onde a vontade te pega", "estresse", "cedeu em 25%",
    "Registrar uma recaída", "o seu recorde continua guardado");
});

await teste("SOS: respiração, porquês, ações e apoio", async () => {
  const html = await telas.vicios.render("sos");
  contem(html, "Um minuto", "a vontade passa", "Inspire", "60s", "Por que você começou isso",
    "respirar melhor na escada", "Em vez disso, agora", "Beber um copo de água devagar",
    "Ligar para alguém", "Irmão", "CVV pelo 188");
});

await teste("rede de apoio e ações alternativas", async () => {
  const html = await telas.vicios.render("apoio");
  contem(html, "Rede de apoio", "Irmão", "Ações alternativas", "Caminhar 10 minutos", "não é tratamento");
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
    "ver-ponto": 1,
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
    await telas.saude.render(),
    await telas.saude.render("medicamentos"),
    await telas.saude.render("consultas"),
    await telas.saude.render("consulta/cs1"),
    await telas.saude.render("exames"),
    await telas.saude.render("marcador/Vitamina%20D"),
    await telas.saude.render("sinais"),
    await telas.saude.render("sono"),
    await telas.saude.render("resumo"),
    await telas.vicios.render(),
    await telas.vicios.render("vc1"),
    await telas.vicios.render("sos"),
    await telas.vicios.render("apoio"),
    await telas.hoje.render(),
    await telas.habitos.render(),
    await telas.habitos.render("novo"),
    await telas.agua.render(),
    await telas.agenda.render(),
    await telas.agenda.render("novo"),
    await telas.metas.render(),
    await telas.metas.render("nova"),
    await telas.dinheiro.render(),
    await telas.dinheiro.render("lancar"),
    await telas.dinheiro.render("extrato"),
    await telas.dinheiro.render("contas"),
    await telas.dinheiro.render("cartoes"),
    await telas.dinheiro.render("fatura/cc1"),
    await telas.dinheiro.render("orcamento"),
    await telas.dinheiro.render("relatorios"),
    await telas.dinheiro.render("metas"),
    await telas.dinheiro.render("dividas"),
    await telas.eu.render(),
    await telas.foco.render("manha"),
    await telas.foco.render("pomodoro"),
  ].join("\n");

  const usadas = [...htmls.matchAll(/data-acao="([^":]+)/g)].map((m) => m[1]);
  const faltando = [...new Set(usadas)].filter((nome) => !(nome in acoes));
  assert.deepEqual(faltando, [], `ações sem função: ${faltando.join(", ")}`);
});

console.log(`\n${passou} telas/testes passaram. ${pedidos.length} chamadas de API cobertas.`);
