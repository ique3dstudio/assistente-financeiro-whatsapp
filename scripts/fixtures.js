// Respostas de mentira no formato exato do servidor.
// Usadas pelos testes de tela (scripts/test-telas.js) e pelas fotos das telas
// (scripts/telas-foto.js) — um lugar só, para as duas coisas não divergirem.

export const HOJE = "2026-09-08";

export const RESPOSTAS = {
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
          { id: "t1", tipo: "tarefa", nome: "Pagar cartão", emoji: "", cor: "#f87171", periodo: "manha", horario: null, concluido: false, streak: 0, frequencia_texto: "atrasada desde 2026-09-05" },
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
