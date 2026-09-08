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
    data: HOJE,
    receitas: 5000,
    despesas: 3214.5,
    sobra: 1785.5,
    previstas: 400,
    saldo_total: 4210.35,
    projecao: { variavel_previsto: 620, recorrentes_previstos: -1800, saldo_previsto: 1790.35 },
    contas: [
      { id: "ct1", nome: "Nubank", tipo: "corrente", icone: "🏦", cor: "#4a3aa7", saldo: 3810.35, saldo_inicial: 1000 },
      { id: "ct2", nome: "Carteira", tipo: "carteira", icone: "👛", cor: "#eda100", saldo: 400, saldo_inicial: 400 },
    ],
    cartoes: [
      {
        id: "cc1", nome: "Visa Infinite", icone: "💳", cor: "#eda100", limite: 8000, fechamento: 20, vencimento: 1,
        fatura_atual: { mes: "2026-09", total: 1840.9, pago: 0, vencimento: "2026-09-01" },
        fatura_proxima: { mes: "2026-10", total: 620.4 },
        comprometido_futuro: 1240.8,
        limite_usado: 0.385,
      },
    ],
    recorrentes: [
      { id: "r1", descricao: "Aluguel", valor: 1800, tipo: "despesa", dia_do_mes: 5, frequencia: "mensal", inicio: "2026-01-01" },
    ],
    orcamentos: [
      { categoria: { id: "cat1", nome: "Delivery", icone: "🛵", cor: "#eb6834" }, planejado: 300, gasto: 420, resta: -120, proporcao: 1.4, situacao: "estourou" },
      { categoria: { id: "cat2", nome: "Mercado", icone: "🛒", cor: "#eb6834" }, planejado: 900, gasto: 740, resta: 160, proporcao: 0.82, situacao: "atencao" },
      { categoria: { id: "cat3", nome: "Lazer", icone: "🎬", cor: "#eda100" }, planejado: 400, gasto: 120, resta: 280, proporcao: 0.3, situacao: "ok" },
    ],
    por_categoria: [
      { id: "cat2", nome: "Mercado", icone: "🛒", cor: "#eb6834", essencial: true, total: 740 },
      { id: "cat1", nome: "Delivery", icone: "🛵", cor: "#eb6834", essencial: false, total: 420 },
      { id: "cat3", nome: "Lazer", icone: "🎬", cor: "#eda100", essencial: false, total: 120 },
    ],
    regra_502030: [
      { id: "essenciais", nome: "Essenciais", alvo: 2500, real: 2540 },
      { id: "resto", nome: "Estilo de vida", alvo: 1500, real: 540 },
      { id: "poupanca", nome: "Poupar e investir", alvo: 1000, real: 134.5 },
    ],
    metas: [{ id: "mf1", titulo: "Reserva de emergência", valor_alvo: 15000, valor_atual: 4200, prazo: "2027-06-30", progresso: 0.28 }],
    dividas: [{ id: "d1", nome: "Cartão antigo", saldo_atual: 5000, juros_mes: 12, parcela_min: 500 }],
    plano_quitacao: {
      avalanche: { meses: 12, total_juros: 2100.5, parcela_total: 500, ordem: ["Cartão antigo"], quitadas: [], nunca_quita: false },
      bola_de_neve: { meses: 12, total_juros: 2100.5, parcela_total: 500, ordem: ["Cartão antigo"], quitadas: [], nunca_quita: false },
    },
    lancamentos: [
      { id: "l1", data: HOJE, valor: 45.9, tipo: "despesa", categoria_id: "cat1", categoria: "Delivery", descricao: "almoço", forma_pagamento: "pix", parcela_num: null, parcela_total: null, efetivada: true },
      { id: "l2", data: "2026-09-05", valor: 5000, tipo: "receita", categoria_id: "cat9", categoria: "Salário", descricao: "salário", forma_pagamento: "transferencia", efetivada: true },
      { id: "l3", data: "2026-09-03", valor: 120, tipo: "despesa", categoria_id: "cat3", categoria: "Lazer", descricao: "cinema", forma_pagamento: "credito", parcela_num: 1, parcela_total: 3, efetivada: true },
    ],
    alertas: [
      { tipo: "categoria_acima", texto: "Delivery está 62% acima da sua média" },
      { tipo: "assinatura_esquecida", texto: '"Streaming" está cadastrada como fixa mas não aparece nos lançamentos' },
    ],
    formas: [
      { id: "dinheiro", nome: "Dinheiro" }, { id: "debito", nome: "Débito" }, { id: "credito", nome: "Crédito" },
      { id: "pix", nome: "Pix" }, { id: "boleto", nome: "Boleto" }, { id: "transferencia", nome: "Transferência" },
    ],
    categorias: [
      { id: "cat1", nome: "Delivery", tipo: "despesa", icone: "🛵", cor: "#eb6834", teto_mensal: 300, essencial: false },
      { id: "cat2", nome: "Mercado", tipo: "despesa", icone: "🛒", cor: "#eb6834", teto_mensal: 900, essencial: true },
      { id: "cat3", nome: "Lazer", tipo: "despesa", icone: "🎬", cor: "#eda100", teto_mensal: 400, essencial: false },
      { id: "cat9", nome: "Salário", tipo: "receita", icone: "💼", cor: "#008300", teto_mensal: null, essencial: false },
    ],
  },

  "/financas/lancamentos?mes=2026-09&limite=200&futuros=1": { lancamentos: [] },
  "/financas/categorias?tipo=despesa": { categorias: [] },
  "/financas/contas": { contas: [] },
  "/financas/cartoes/cc1/fatura?mes=2026-09": {
    mes: "2026-09",
    total: 1840.9,
    pago: 0,
    itens: [
      { id: "f1", data: "2026-08-25", valor: 620.4, tipo: "despesa", categoria_id: "cat2", descricao: "mercado do mês", parcela_num: null, parcela_total: null, efetivada: true },
      { id: "f2", data: "2026-09-01", valor: 1220.5, tipo: "despesa", categoria_id: "cat3", descricao: "notebook", parcela_num: 1, parcela_total: 10, efetivada: true },
    ],
  },
  "/financas/relatorios?meses=6": {
    meses: 6,
    por_mes: [
      { mes: "2026-08", receitas: 5000, despesas: 4100, sobra: 900 },
      { mes: "2026-09", receitas: 5000, despesas: 3214.5, sobra: 1785.5 },
    ],
    por_categoria: [{ nome: "Mercado", total: 1480 }, { nome: "Delivery", total: 820 }],
    por_forma: [{ nome: "Crédito", total: 2100 }, { nome: "Pix", total: 900 }],
    por_dia_semana: [
      { nome: "domingo", total: 210 }, { nome: "segunda", total: 180 }, { nome: "terça", total: 90 },
      { nome: "quarta", total: 140 }, { nome: "quinta", total: 160 }, { nome: "sexta", total: 320 },
      { nome: "sábado", total: 410 },
    ],
    maiores: [{ descricao: "notebook", valor: 1220.5, data: "2026-09-01" }],
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

  "/saude": {
    data: HOJE,
    hora: 21,
    doses: [
      { medicamento_id: "md1", nome: "Vitamina D", dose: "2000 UI", horario: "08:00", tomado: true, dias: 25, recomprar: false },
      { medicamento_id: "md2", nome: "Ômega 3", dose: "1 cápsula", horario: "20:00", tomado: false, dias: 5, recomprar: true },
    ],
    medicamentos: [
      { id: "md1", nome: "Vitamina D", dose: "2000 UI", horarios: ["08:00:00"], estoque_atual: 50, ativo: true, dias: 25, recomprar: false },
      { id: "md2", nome: "Ômega 3", dose: "1 cápsula", horarios: ["20:00:00"], estoque_atual: 5, ativo: true, dias: 5, recomprar: true },
    ],
    consultas: [
      { id: "cs1", especialidade: "Dentista", profissional: "Dra. Ana", local: "Centro", data: "2026-09-18", hora: "15:00:00", perguntas: "perguntar sobre o siso", resumo: null, prescricao: null, retorno_em: null },
      { id: "cs2", especialidade: "Cardiologista", profissional: "Dr. Paulo", local: null, data: "2026-06-02", hora: null, perguntas: null, resumo: "exames ok, manter caminhada", prescricao: null, retorno_em: "2027-06-02" },
    ],
    proximas_consultas: [
      { id: "cs1", especialidade: "Dentista", profissional: "Dra. Ana", data: "2026-09-18", hora: "15:00:00" },
    ],
    recorrencias: [
      { id: "rc1", nome: "Dentista", tipo: "consulta", cada_meses: 6, ultima_em: "2026-01-10", proxima: "2026-07-10", vencida: true, dias: -60 },
      { id: "rc2", nome: "Check-up", tipo: "exame", cada_meses: 12, ultima_em: "2026-06-15", proxima: "2027-06-15", vencida: false, dias: 280 },
    ],
    exames: [{ id: "ex1", tipo: "Sangue", data: "2026-09-01", laboratorio: "Lab X", arquivo_url: null }],
    marcadores: [
      {
        marcador: "Vitamina D", unidade: "ng/mL", ref_min: 30, ref_max: 60,
        pontos: [
          { data: "2026-03-01", valor: 18.5, situacao: "abaixo" },
          { data: "2026-09-01", valor: 34.2, situacao: "normal" },
        ],
        ultimo: { data: "2026-09-01", valor: 34.2, situacao: "normal" },
        variacao: 15.7,
      },
    ],
    sinais: [
      { id: "s1", data: "2026-09-07", tipo: "pressao", valor: 128, valor2: 84, nota: null },
      { id: "s2", data: "2026-09-06", tipo: "peso", valor: 80.5, valor2: null, nota: null },
    ],
    ultimos_sinais: [
      { id: "pressao", nome: "Pressão", unidade: "mmHg", dois_valores: true, ultimo: { data: "2026-09-07", valor: 128, valor2: 84 } },
      { id: "fc_repouso", nome: "Frequência de repouso", unidade: "bpm", ultimo: null },
      { id: "peso", nome: "Peso", unidade: "kg", ultimo: { data: "2026-09-06", valor: 80.5, valor2: null } },
      { id: "glicemia", nome: "Glicemia", unidade: "mg/dL", ultimo: null },
      { id: "saturacao", nome: "Saturação", unidade: "%", ultimo: null },
      { id: "temperatura", nome: "Temperatura", unidade: "°C", ultimo: null },
    ],
    pressao_classificada: { id: "normal", nome: "Normal" },
    sono: [{ data: HOJE, dormiu_em: "23:30:00", acordou_em: "07:15:00", duracao_min: 465, qualidade: 4 }],
    media_sono_7d: 430,
    linha_sono: [
      { data: "2026-09-07", minutos: 400, qualidade: 3 },
      { data: HOJE, minutos: 465, qualidade: 4 },
    ],
    sintomas: [{ id: "st1", data: "2026-09-05", nome: "dor de cabeça", intensidade: 7 }],
    vacinas: [{ id: "vc1", nome: "Influenza", data: "2026-04-10", proxima_em: "2027-04-10" }],
    contatos: [{ id: "ct1", nome: "Dra. Ana", especialidade: "Dentista", telefone: "11999999999" }],
    tipos_sinal: [
      { id: "pressao", nome: "Pressão", unidade: "mmHg", dois_valores: true },
      { id: "fc_repouso", nome: "Frequência de repouso", unidade: "bpm" },
      { id: "peso", nome: "Peso", unidade: "kg" },
      { id: "glicemia", nome: "Glicemia", unidade: "mg/dL" },
    ],
    marcadores_conhecidos: [
      { id: "vitamina_d", nome: "Vitamina D", unidade: "ng/mL", ref_min: 30, ref_max: 60 },
      { id: "tsh", nome: "TSH", unidade: "µUI/mL", ref_min: 0.4, ref_max: 4 },
    ],
  },

  "/saude/consulta-resumo": {
    gerado_em: "2026-09-08T21:00:00Z",
    medicamentos: [{ nome: "Vitamina D", dose: "2000 UI", horarios: ["08:00:00"] }],
    ultimos_exames: [{ marcador: "Vitamina D", valor: 34.2, unidade: "ng/mL", data: "2026-09-01", situacao: "normal" }],
    consultas_recentes: [{ data: "2026-06-02", especialidade: "Cardiologista", resumo: "exames ok" }],
    sintomas_recentes: [{ data: "2026-09-05", nome: "dor de cabeça", intensidade: 7 }],
    sinais: [{ nome: "Pressão", valor: 128, valor2: 84, unidade: "mmHg", data: "2026-09-07" }],
    media_sono_7d: 430,
    vacinas: [{ nome: "Influenza", data: "2026-04-10" }],
  },

  "/vicios": {
    data: HOJE,
    vicios: [
      {
        id: "vc1", nome: "Cigarro", tipo: "cigarro", tipo_info: { id: "cigarro", nome: "Cigarro", emoji: "🚭" },
        data_inicio: "2026-08-09T18:00:00Z", custo_diario: 15, tempo_diario_min: 40,
        motivos: [{ texto: "respirar melhor na escada", foto_url: null }],
        contador: { dias: 30, horas: 2, minutos: 30, segundos: 45, total_segundos: 2600000 },
        recorde_dias: 47,
        proximo_marco: { dias: 60, faltam: 30 },
        marcos_alcancados: [1, 3, 7, 14, 30],
        marcos_registrados: [],
        economia: { dinheiro: 450, dinheiro_6m: 2730, dinheiro_12m: 5475, horas: 20, dias_de_vida: 0.8 },
        linha_recuperacao: [
          { dias: 2, texto: "Em 48 horas, paladar e olfato começam a voltar.", alcancado: true },
          { dias: 90, texto: "Em 3 meses, a função pulmonar aumenta de forma perceptível.", alcancado: false },
        ],
        pledge_hoje: null,
        sequencia_pledge: 12,
        mapa: {
          total: 4, cedeu: 1, taxa_cedeu: 0.25, intensidade_media: 6.8,
          por_faixa: [
            { id: "noite", nome: "Noite (18h–24h)", de: 18, ate: 24, total: 3 },
            { id: "manha", nome: "Manhã (6h–12h)", de: 6, ate: 12, total: 1 },
          ],
          por_gatilho: [{ nome: "estresse", total: 2, cedeu: 1 }],
          por_emocao: [{ nome: "ansioso", total: 2, cedeu: 1 }],
          por_dia_semana: [{ nome: "segunda", total: 2 }],
        },
        fissuras: [{ id: "f1", data: "2026-09-07", hora: "22:10:00", gatilho: "estresse", intensidade: 8, cedeu: false }],
        recaidas: [{ id: "rc1", data: "2026-08-09", aprendizado: "foi depois da cerveja", recorde_anterior_dias: 47 }],
        tentativas: 2,
      },
    ],
    apoio: [{ id: "ap1", nome: "Irmão", telefone: "11988888888", tipo: "pessoa" }],
    acoes: [
      { id: "ac1", texto: "Beber um copo de água devagar", ordem: 1 },
      { id: "ac2", texto: "Caminhar 10 minutos, mesmo dentro de casa", ordem: 2 },
    ],
    tipos: [
      { id: "cigarro", nome: "Cigarro", emoji: "🚭" },
      { id: "acucar", nome: "Açúcar", emoji: "🍬" },
      { id: "outro", nome: "Outro", emoji: "🎯" },
    ],
    marcos: [1, 3, 7, 14, 30, 60, 90, 180, 365, 730],
    aviso:
      "Este módulo acompanha o seu progresso — não é tratamento. Nos momentos difíceis, fale com alguém: " +
      "a sua rede de apoio, um profissional, ou o CVV pelo 188 (24h, gratuito).",
  },

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
