const STATUS_DEFS = [
  { key: "recebido", label: "📥 Pedido recebido" },
  { key: "fila", label: "🗂️ Na fila de produção" },
  { key: "produzindo", label: "🖨️ Em produção" },
  { key: "pos_processamento", label: "🎨 Pós-processamento" },
  { key: "pronto", label: "✅ Pronto" },
  { key: "entregue", label: "📦 Entregue" },
];
// Status em que o material já foi "gasto" na impressora — cruzar essa fronteira pela
// primeira vez é o gatilho da baixa automática de estoque.
const STATUS_PRE_IMPRESSAO = ["recebido", "fila", "produzindo"];
const STATUS_KEYS = STATUS_DEFS.map((s) => s.key);
const ANEXOS_BUCKET = "loja3d-anexos";

const config = window.SUPABASE_CONFIG || {};
if (!config.url || !config.anonKey) {
  document.body.innerHTML =
    '<p style="padding:24px;font-family:sans-serif;color:#f87171">' +
    "Configuração do Supabase ausente. Confira SUPABASE_URL e SUPABASE_ANON_KEY no .env do servidor." +
    "</p>";
  throw new Error("Supabase config ausente");
}

// "Manter-me conectado" decide onde a sessão é guardada: localStorage sobrevive a fechar o
// navegador, sessionStorage é esquecida junto com a aba. A escolha feita no login só passa a
// valer no próximo carregamento da página, porque o client já nasce com esse storage fixado.
const LEMBRAR_KEY = "loja3d-lembrar-conectado";
const EMAIL_LEMBRADO_KEY = "loja3d-email-lembrado";
const lembrarConectado = localStorage.getItem(LEMBRAR_KEY) !== "false";
const db = window.supabase.createClient(config.url, config.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, storage: lembrarConectado ? window.localStorage : window.sessionStorage },
});

let currentUser = null;
let clientes = [];
let pedidos = [];
let materiais = [];
let produtos = [];
let maquinas = [];
let falhas = [];
let canaisVenda = [];
let consultasCalculadora = [];
let contasFinanceiras = [];
let categoriasFinanceiras = [];
let movimentos = [];
let despesasFixas = [];
let configuracoes = null;
let filtroAtrasados = false;
let filtroTexto = "";
let anexosPendentes = []; // arquivos escolhidos no <input type=file> ainda não enviados
let anexosParaExcluir = []; // ids de anexos já salvos marcados para exclusão ao salvar

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginRememberCheckbox = document.getElementById("login-remember");
const logoutBtn = document.getElementById("logout-btn");
const board = document.getElementById("board");
const dashboard = document.getElementById("dashboard");
const financeiroEl = document.getElementById("financeiro");
const financeiroDashboardEl = document.getElementById("financeiro-dashboard");
const indicadoresDashboardEl = document.getElementById("indicadores-dashboard");
const indicadoresTabelasEl = document.getElementById("indicadores-tabelas");
const subtabButtons = document.querySelectorAll(".subtab-btn");
const movimentosListEl = document.getElementById("movimentos-list");
const movBuscaInput = document.getElementById("mov-busca");
const movFiltroConta = document.getElementById("mov-filtro-conta");
const movFiltroCategoria = document.getElementById("mov-filtro-categoria");
const movFiltroStatus = document.getElementById("mov-filtro-status");
const movFiltroResponsavel = document.getElementById("mov-filtro-responsavel");
const novoMovimentoBtn = document.getElementById("novo-movimento-btn");
const transferenciaBtn = document.getElementById("transferencia-btn");
const searchInput = document.getElementById("search-input");
const filterAtrasadosBtn = document.getElementById("filter-atrasados");
const newOrderBtn = document.getElementById("new-order-btn");
const topbarNovoMovimentoBtn = document.getElementById("topbar-novo-movimento-btn");
const exportCsvBtn = document.getElementById("export-csv-btn");
const clientesOptions = document.getElementById("clientes-options");
const tabButtons = document.querySelectorAll(".tab-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const loginThemeToggleBtn = document.getElementById("login-theme-toggle-btn");

const orderDialog = document.getElementById("order-dialog");
const orderForm = document.getElementById("order-form");
const orderDialogTitle = document.getElementById("order-dialog-title");
const orderError = document.getElementById("order-error");
const deleteOrderBtn = document.getElementById("delete-order-btn");
const cancelOrderBtn = document.getElementById("cancel-order-btn");
const closeOrderBtn = document.getElementById("close-order-btn");
const pdfOrderBtn = document.getElementById("pdf-order-btn");
const whatsappOrderBtn = document.getElementById("whatsapp-order-btn");
const trackingLinkBtn = document.getElementById("tracking-link-btn");
const pixOrderBtn = document.getElementById("pix-order-btn");
const pixDialog = document.getElementById("pix-dialog");
const closePixBtn = document.getElementById("close-pix-btn");
const pixValorLabel = document.getElementById("pix-valor-label");
const pixQrcodeCanvas = document.getElementById("pix-qrcode-canvas");
const pixPayloadText = document.getElementById("pix-payload-text");
const pixCopiarBtn = document.getElementById("pix-copiar-btn");
const pixError = document.getElementById("pix-error");
const itensList = document.getElementById("itens-list");
const addItemBtn = document.getElementById("add-item-btn");
const itemRowTemplate = document.getElementById("item-row-template");
const anexoInput = document.getElementById("anexo-input");
const anexosListEl = document.getElementById("anexos-list");

const configBtn = document.getElementById("config-btn");
const configDialog = document.getElementById("config-dialog");
const configForm = document.getElementById("config-form");
const cancelConfigBtn = document.getElementById("cancel-config-btn");
const closeConfigBtn = document.getElementById("close-config-btn");
const configError = document.getElementById("config-error");
const materiaisListEl = document.getElementById("materiais-list");
const materialForm = document.getElementById("material-form");
const maquinasListEl = document.getElementById("maquinas-list");
const maquinaForm = document.getElementById("maquina-form");
const contasFinanceirasListEl = document.getElementById("contas-financeiras-list");
const contaFinanceiraForm = document.getElementById("conta-financeira-form");
const categoriasFinanceirasListEl = document.getElementById("categorias-financeiras-list");
const categoriaFinanceiraForm = document.getElementById("categoria-financeira-form");
const despesasFixasListEl = document.getElementById("despesas-fixas-list");
const despesaFixaForm = document.getElementById("despesa-fixa-form");
const despesaFixaCategoriaSelect = document.getElementById("despesa-fixa-categoria-select");
const despesaFixaContaSelect = document.getElementById("despesa-fixa-conta-select");

const movimentoDialog = document.getElementById("movimento-dialog");
const movimentoForm = document.getElementById("movimento-form");
const movimentoDialogTitle = document.getElementById("movimento-dialog-title");
const movimentoError = document.getElementById("movimento-error");
const movimentoOrigemAviso = document.getElementById("movimento-origem-aviso");
const movimentoTipoSelect = document.getElementById("movimento-tipo-select");
const movimentoValorInput = document.getElementById("movimento-valor-input");
const movimentoCategoriaSelect = document.getElementById("movimento-categoria-select");
const movimentoContaSelect = document.getElementById("movimento-conta-select");
const deleteMovimentoBtn = document.getElementById("delete-movimento-btn");
const cancelMovimentoBtn = document.getElementById("cancel-movimento-btn");
const closeMovimentoBtn = document.getElementById("close-movimento-btn");

const transferenciaDialog = document.getElementById("transferencia-dialog");
const transferenciaForm = document.getElementById("transferencia-form");
const transferenciaError = document.getElementById("transferencia-error");
const transferenciaOrigemSelect = document.getElementById("transferencia-origem-select");
const transferenciaDestinoSelect = document.getElementById("transferencia-destino-select");
const cancelTransferenciaBtn = document.getElementById("cancel-transferencia-btn");
const closeTransferenciaBtn = document.getElementById("close-transferencia-btn");

const iaLancamentoBtn = document.getElementById("ia-lancamento-btn");
const iaLancamentoDialog = document.getElementById("ia-lancamento-dialog");
const closeIaLancamentoBtn = document.getElementById("close-ia-lancamento-btn");
const iaTextoInput = document.getElementById("ia-texto-input");
const iaTextoBtn = document.getElementById("ia-texto-btn");
const iaFotoBtn = document.getElementById("ia-foto-btn");
const iaFotoInput = document.getElementById("ia-foto-input");
const iaAudioBtn = document.getElementById("ia-audio-btn");
const iaStatus = document.getElementById("ia-status");
const iaError = document.getElementById("ia-error");
let iaGravador = null;
let iaAudioChunks = [];

const calcMaterial = document.getElementById("calc-material");
const calcPeso = document.getElementById("calc-peso");
const calcTempo = document.getElementById("calc-tempo");
const calcMaoObra = document.getElementById("calc-mao-obra");
const calcTerceiro = document.getElementById("calc-terceiro");
const calcCanal = document.getElementById("calc-canal");
const calcComissao = document.getElementById("calc-comissao");
const calcComissaoFixa = document.getElementById("calc-comissao-fixa");
const calcItemAdicional = document.getElementById("calc-item-adicional");
const calcResultado = document.getElementById("calc-resultado");
const calcLimparBtn = document.getElementById("calc-limpar-btn");
const calcSalvarBtn = document.getElementById("calc-salvar-btn");
const calcHistoricoEl = document.getElementById("calc-historico");

const canaisVendaListEl = document.getElementById("canais-venda-list");
const canalVendaForm = document.getElementById("canal-venda-form");

const logoUploadBtn = document.getElementById("logo-upload-btn");
const logoInput = document.getElementById("logo-input");
const avatarCropBox = document.getElementById("avatar-crop-box");
const avatarCropFrame = document.getElementById("avatar-crop-frame");
const avatarCropImg = document.getElementById("avatar-crop-img");
const avatarCropZoom = document.getElementById("avatar-crop-zoom");
const avatarCropCancelBtn = document.getElementById("avatar-crop-cancel-btn");
const avatarCropConfirmBtn = document.getElementById("avatar-crop-confirm-btn");
const LOGO_BUCKET = "loja3d-branding";
let arquivoLogoPendente = null;
// Estado do recorte: baseScale cobre o círculo no zoom mínimo; zoom (1-3) multiplica isso;
// offsetX/offsetY é a posição (em px renderizados) do canto superior-esquerdo da foto dentro
// da moldura — sempre mantido nos limites que garantem que a foto cobre o círculo inteiro.
let cropBaseScale = 1;
let cropZoom = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let cropDragging = false;
let cropDragStartX = 0;
let cropDragStartY = 0;
let cropDragOffsetX = 0;
let cropDragOffsetY = 0;

function atualizarTextoTema() {
  const claro = document.documentElement.dataset.theme === "light";
  themeToggleBtn.textContent = claro ? "☀️" : "🌙";
  loginThemeToggleBtn.textContent = claro ? "🌙 Modo escuro" : "☀️ Modo claro";
}

function alternarTema() {
  const novo = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = novo;
  localStorage.setItem("loja3d-theme", novo);
  atualizarTextoTema();
}

init();

async function init() {
  const emailLembrado = localStorage.getItem(EMAIL_LEMBRADO_KEY);
  if (emailLembrado) document.getElementById("login-email").value = emailLembrado;
  loginRememberCheckbox.checked = lembrarConectado;

  const { data } = await db.auth.getSession();
  if (data.session) {
    await onAuthed(data.session.user);
  } else {
    showLogin();
  }

  db.auth.onAuthStateChange((_event, session) => {
    if (session) {
      onAuthed(session.user);
    } else {
      currentUser = null;
      showLogin();
    }
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/loja3d/sw.js").catch(() => {});
  }

  atualizarTextoTema();
  themeToggleBtn.addEventListener("click", alternarTema);
  loginThemeToggleBtn.addEventListener("click", alternarTema);

  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", () => db.auth.signOut());
  searchInput.addEventListener("input", (e) => {
    filtroTexto = e.target.value.trim().toLowerCase();
    renderBoard();
  });
  filterAtrasadosBtn.addEventListener("click", () => {
    filtroAtrasados = !filtroAtrasados;
    filterAtrasadosBtn.classList.toggle("active", filtroAtrasados);
    renderBoard();
  });
  newOrderBtn.addEventListener("click", () => openOrderDialog(null));
  topbarNovoMovimentoBtn.addEventListener("click", () => openMovimentoDialog(null));
  cancelOrderBtn.addEventListener("click", () => orderDialog.close());
  closeOrderBtn.addEventListener("click", () => orderDialog.close());
  orderForm.addEventListener("submit", handleSaveOrder);
  deleteOrderBtn.addEventListener("click", handleDeleteOrder);
  pdfOrderBtn.addEventListener("click", gerarOrcamentoPdf);
  whatsappOrderBtn.addEventListener("click", enviarWhatsapp);
  trackingLinkBtn.addEventListener("click", copiarLinkAcompanhamento);
  pixOrderBtn.addEventListener("click", openPixDialog);
  closePixBtn.addEventListener("click", () => pixDialog.close());
  pixCopiarBtn.addEventListener("click", copiarPayloadPix);
  addItemBtn.addEventListener("click", () => addItemRow(null));
  anexoInput.addEventListener("change", handleAnexoSelected);
  exportCsvBtn.addEventListener("click", exportCsv);

  configBtn.addEventListener("click", openConfigDialog);
  cancelConfigBtn.addEventListener("click", () => configDialog.close());
  closeConfigBtn.addEventListener("click", () => configDialog.close());
  configForm.addEventListener("submit", handleSaveConfig);
  materialForm.addEventListener("submit", handleAddMaterial);
  maquinaForm.addEventListener("submit", handleAddMaquina);

  [calcMaterial, calcPeso, calcTempo, calcMaoObra, calcTerceiro, calcComissao, calcComissaoFixa, calcItemAdicional].forEach(
    (el) => el.addEventListener("input", renderCalculadoraLivre)
  );
  calcCanal.addEventListener("change", () => {
    const canal = canaisVenda.find((c) => c.id === calcCanal.value);
    calcComissao.value = canal ? canal.comissao_percentual : "";
    calcComissaoFixa.value = canal ? canal.taxa_fixa : "";
    renderCalculadoraLivre();
  });
  calcLimparBtn.addEventListener("click", () => {
    [calcPeso, calcTempo, calcMaoObra, calcTerceiro, calcComissao, calcComissaoFixa, calcItemAdicional].forEach(
      (el) => (el.value = "")
    );
    calcMaterial.value = "";
    calcCanal.value = "";
    renderCalculadoraLivre();
  });
  calcSalvarBtn.addEventListener("click", salvarConsulta);
  canalVendaForm.addEventListener("submit", handleAddCanalVenda);
  logoUploadBtn.addEventListener("click", () => logoInput.click());
  logoInput.addEventListener("change", handleLogoSelecionado);
  avatarCropCancelBtn.addEventListener("click", cancelarSelecaoLogo);
  avatarCropConfirmBtn.addEventListener("click", confirmarUploadLogo);

  contaFinanceiraForm.addEventListener("submit", handleAddContaFinanceira);
  categoriaFinanceiraForm.addEventListener("submit", handleAddCategoriaFinanceira);
  despesaFixaForm.addEventListener("submit", handleAddDespesaFixa);

  novoMovimentoBtn.addEventListener("click", () => openMovimentoDialog(null));
  cancelMovimentoBtn.addEventListener("click", () => movimentoDialog.close());
  closeMovimentoBtn.addEventListener("click", () => movimentoDialog.close());
  movimentoForm.addEventListener("submit", handleSaveMovimento);
  deleteMovimentoBtn.addEventListener("click", handleDeleteMovimento);

  transferenciaBtn.addEventListener("click", openTransferenciaDialog);
  cancelTransferenciaBtn.addEventListener("click", () => transferenciaDialog.close());
  closeTransferenciaBtn.addEventListener("click", () => transferenciaDialog.close());
  transferenciaForm.addEventListener("submit", handleSaveTransferencia);

  iaLancamentoBtn.addEventListener("click", openIaLancamentoDialog);
  closeIaLancamentoBtn.addEventListener("click", () => iaLancamentoDialog.close());
  iaTextoBtn.addEventListener("click", handleIaTexto);
  iaFotoBtn.addEventListener("click", () => iaFotoInput.click());
  iaFotoInput.addEventListener("change", handleIaFoto);
  iaAudioBtn.addEventListener("click", handleIaAudio);

  [movBuscaInput, movFiltroConta, movFiltroCategoria, movFiltroStatus, movFiltroResponsavel].forEach((el) =>
    el.addEventListener("input", renderMovimentosList)
  );

  subtabButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      subtabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".financeiro-subpanel").forEach((panel) => {
        panel.hidden = panel.id !== `subtab-${btn.dataset.subtab}`;
      });
      renderFinanceiroAtivo();
    })
  );

  tabButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== `tab-${btn.dataset.tab}`;
      });
      if (btn.dataset.tab === "painel") renderDashboard();
      if (btn.dataset.tab === "financeiro") renderFinanceiroAtivo();
      if (btn.dataset.tab === "calculadora") {
        populateMaterialSelect(calcMaterial);
        populateCanalSelect();
        renderCalculadoraLivre();
        renderHistoricoConsultas();
      }
    })
  );
}

// Redesenha o que estiver visível dentro da aba Financeiro no momento (visão geral, contas a
// receber ou lançamentos) — chamado tanto ao trocar de aba/sub-aba quanto depois de recarregar
// os dados (loadData), sem precisar saber de fora qual sub-aba está ativa.
function renderFinanceiroAtivo() {
  const subtabAtiva = document.querySelector(".subtab-btn.active")?.dataset.subtab || "visao-geral";
  if (subtabAtiva === "visao-geral") renderFinanceiroDashboard();
  if (subtabAtiva === "a-receber") renderContasAReceber();
  if (subtabAtiva === "lancamentos") {
    populateFiltroSelects();
    renderMovimentosList();
  }
  if (subtabAtiva === "indicadores") renderFinanceiroIndicadores();
}

async function handleLogin(e) {
  e.preventDefault();
  loginError.hidden = true;
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = "Não foi possível entrar. Confira e-mail e senha.";
    loginError.hidden = false;
    return;
  }

  if (loginRememberCheckbox.checked) {
    localStorage.setItem(EMAIL_LEMBRADO_KEY, email);
  } else {
    localStorage.removeItem(EMAIL_LEMBRADO_KEY);
  }
  // Só afeta o próximo login (o client atual já está com o storage decidido), mas já deixa a
  // preferência salva pra valer na próxima vez que a página carregar.
  localStorage.setItem(LEMBRAR_KEY, String(loginRememberCheckbox.checked));
}

function showLogin() {
  loginScreen.hidden = false;
  appScreen.hidden = true;
}

async function onAuthed(user) {
  currentUser = user;
  loginScreen.hidden = true;
  appScreen.hidden = false;
  await loadData();
  subscribeRealtime();
}

async function loadData() {
  const [
    { data: clientesData, error: eCli },
    { data: pedidosData, error: ePed },
    { data: materiaisData, error: eMat },
    { data: produtosData, error: eProd },
    { data: configData, error: eCfg },
    { data: maquinasData, error: eMaq },
    { data: falhasData, error: eFal },
    { data: canaisVendaData, error: eCanal },
    { data: consultasData, error: eCons },
    { data: contasFinanceirasData, error: eContas },
    { data: categoriasFinanceirasData, error: eCategorias },
    { data: movimentosData, error: eMov },
    { data: despesasFixasData, error: eDespesas },
  ] = await Promise.all([
    db.from("clientes").select("*").order("nome"),
    db
      .from("pedidos")
      .select("*, cliente:clientes(*), itens:itens_pedido(*), anexos(*)")
      .order("created_at", { ascending: true }),
    db.from("materiais").select("*").order("nome"),
    db.from("produtos").select("*").order("nome"),
    db.from("configuracoes").select("*").eq("id", 1).single(),
    db.from("maquinas").select("*").order("nome"),
    db.from("falhas").select("*").order("created_at", { ascending: false }),
    db.from("canais_venda").select("*").order("nome"),
    db.from("consultas_calculadora").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("contas_financeiras").select("*").order("nome"),
    db.from("categorias_financeiras").select("*").order("ordem"),
    db.from("movimentos").select("*").order("data_movimento", { ascending: false }),
    db.from("despesas_fixas").select("*").order("nome"),
  ]);

  for (const e of [eCli, ePed, eMat, eProd, eCfg, eMaq, eFal, eCanal, eCons, eContas, eCategorias, eMov, eDespesas])
    if (e) console.error(e);

  clientes = clientesData || [];
  pedidos = pedidosData || [];
  materiais = materiaisData || [];
  produtos = produtosData || [];
  configuracoes = configData || null;
  maquinas = maquinasData || [];
  falhas = falhasData || [];
  canaisVenda = canaisVendaData || [];
  consultasCalculadora = consultasData || [];
  contasFinanceiras = contasFinanceirasData || [];
  categoriasFinanceiras = categoriasFinanceirasData || [];
  movimentos = movimentosData || [];
  despesasFixas = despesasFixasData || [];

  clientesOptions.innerHTML = clientes.map((c) => `<option value="${escapeHtml(c.nome)}"></option>`).join("");
  atualizarBrandMarks();

  renderBoard();
  if (!document.getElementById("tab-painel").hidden) renderDashboard();
  if (!document.getElementById("tab-financeiro").hidden) renderFinanceiroAtivo();
  if (!document.getElementById("tab-calculadora").hidden) {
    const materialSelecionado = calcMaterial.value;
    populateMaterialSelect(calcMaterial, materialSelecionado);
    populateCanalSelect();
    renderCalculadoraLivre();
    renderHistoricoConsultas();
  }
}

function populateCanalSelect() {
  const selecionado = calcCanal.value;
  calcCanal.innerHTML =
    '<option value="">Personalizado</option>' +
    canaisVenda.map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join("");
  if (selecionado) calcCanal.value = selecionado;
}

let realtimeChannel = null;
let refetchTimer = null;
function scheduleRefetch() {
  clearTimeout(refetchTimer);
  refetchTimer = setTimeout(loadData, 300);
}

function subscribeRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = db
    .channel("loja3d-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "itens_pedido" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "anexos" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "materiais" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "configuracoes" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "maquinas" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "falhas" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "canais_venda" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "consultas_calculadora" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "contas_financeiras" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "categorias_financeiras" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "movimentos" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "despesas_fixas" }, scheduleRefetch)
    .subscribe();
}

function isAtrasado(item, pedido) {
  if (!pedido.prazo_entrega) return false;
  if (item.status === "pronto" || item.status === "entregue") return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return pedido.prazo_entrega < hoje;
}

function formatDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatMoney(v) {
  if (v === null || v === undefined) return "R$ 0,00";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/* ---------- Quadro (Kanban) ---------- */

function allCards() {
  const cards = [];
  for (const pedido of pedidos) {
    for (const item of pedido.itens || []) {
      if (item.falhou) continue; // itens marcados como falha saem do quadro; a reimpressão vira um item novo
      cards.push({ item, pedido });
    }
  }
  return cards;
}

function renderBoard() {
  board.innerHTML = "";

  let cards = allCards();

  if (filtroTexto) {
    cards = cards.filter(
      (c) =>
        (c.pedido.cliente?.nome || "").toLowerCase().includes(filtroTexto) ||
        c.item.descricao.toLowerCase().includes(filtroTexto)
    );
  }

  const totalAtrasados = allCards().filter((c) => isAtrasado(c.item, c.pedido)).length;
  filterAtrasadosBtn.textContent = `⏰ Atrasados: ${totalAtrasados}`;
  if (filtroAtrasados) {
    cards = cards.filter((c) => isAtrasado(c.item, c.pedido));
  }

  for (const def of STATUS_DEFS) {
    const items = cards
      .filter((c) => c.item.status === def.key)
      .sort((a, b) => {
        const prioA = a.pedido.prioridade === "urgente" ? 0 : 1;
        const prioB = b.pedido.prioridade === "urgente" ? 0 : 1;
        if (prioA !== prioB) return prioA - prioB;
        return (a.pedido.prazo_entrega || "9999") < (b.pedido.prazo_entrega || "9999") ? -1 : 1;
      });

    const column = document.createElement("div");
    column.className = "column";
    column.dataset.status = def.key;

    const header = document.createElement("div");
    header.className = "column-header";
    header.innerHTML = `<span>${def.label}</span><span class="column-count">${items.length}</span>`;
    column.appendChild(header);

    const body = document.createElement("div");
    body.className = "column-body";

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "column-empty";
      empty.textContent = "Nenhum pedido aqui.";
      body.appendChild(empty);
    } else {
      for (const card of items) {
        body.appendChild(renderCard(card.item, card.pedido, def.key));
      }
    }

    column.appendChild(body);
    board.appendChild(column);
  }
}

function renderCard(item, pedido, statusKey) {
  const card = document.createElement("div");
  card.className = "card" + (isAtrasado(item, pedido) ? " late" : "");
  if (pedido.prioridade === "urgente") card.classList.add("urgente");
  card.addEventListener("click", () => openOrderDialog(pedido));

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = item.descricao;
  card.appendChild(title);

  const client = document.createElement("div");
  client.className = "card-client";
  client.textContent = pedido.cliente?.nome || "(sem cliente)";
  card.appendChild(client);

  const meta = document.createElement("div");
  meta.className = "card-meta";
  if (pedido.prioridade === "urgente") meta.appendChild(badge("🔥 Urgente", "late"));
  meta.appendChild(badge(`Qtd: ${item.quantidade}`));
  if (item.material || item.cor) {
    meta.appendChild(badge([item.material, item.cor].filter(Boolean).join(" · ")));
  }
  if (pedido.prazo_entrega) {
    meta.appendChild(badge(`Prazo: ${formatDate(pedido.prazo_entrega)}`, isAtrasado(item, pedido) ? "late" : ""));
  }
  if (item.valor !== null && item.valor !== undefined) {
    meta.appendChild(badge(formatMoney(item.valor)));
  }
  meta.appendChild(
    badge(pedido.pagamento, pedido.pagamento === "pago" ? "pago" : pedido.pagamento === "parcial" ? "parcial" : "")
  );
  if (pedido.anexos && pedido.anexos.length > 0) {
    meta.appendChild(badge(`📎 ${pedido.anexos.length}`));
  }
  card.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const idx = STATUS_KEYS.indexOf(statusKey);
  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.textContent = "◀";
  prevBtn.disabled = idx === 0;
  prevBtn.title = "Mover para etapa anterior";
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moveStatus(item, STATUS_KEYS[idx - 1]);
  });

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.textContent = "▶";
  nextBtn.disabled = idx === STATUS_KEYS.length - 1;
  nextBtn.title = "Mover para próxima etapa";
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moveStatus(item, STATUS_KEYS[idx + 1]);
  });

  actions.appendChild(prevBtn);
  actions.appendChild(nextBtn);
  card.appendChild(actions);

  return card;
}

function badge(text, extraClass = "") {
  const el = document.createElement("span");
  el.className = "badge" + (extraClass ? ` ${extraClass}` : "");
  el.textContent = text;
  return el;
}

async function moveStatus(item, novoStatus) {
  const { error } = await db.from("itens_pedido").update({ status: novoStatus }).eq("id", item.id);
  if (error) {
    console.error(error);
    return;
  }
  await baixarEstoqueSeNecessario({
    itemId: item.id,
    statusAnterior: item.status,
    statusNovo: novoStatus,
    materialId: item.material_id,
    pesoGramas: item.peso_gramas,
    quantidade: item.quantidade,
    jaBaixado: item.estoque_baixado,
  });
}

// Desconta do saldo do material assim que o item cruza, pela primeira vez, a fronteira de
// "já foi impresso" — funciona tanto vindo dos botões ◀▶ quanto do formulário de edição.
async function baixarEstoqueSeNecessario({ itemId, statusAnterior, statusNovo, materialId, pesoGramas, quantidade, jaBaixado }) {
  if (jaBaixado) return;
  if (!STATUS_PRE_IMPRESSAO.includes(statusAnterior) || STATUS_PRE_IMPRESSAO.includes(statusNovo)) return;
  if (!materialId || !pesoGramas) return;

  const material = materiais.find((m) => m.id === materialId);
  if (!material) return;

  const consumoGramas = Number(pesoGramas) * (Number(quantidade) || 1);
  await db
    .from("materiais")
    .update({ saldo_gramas: (Number(material.saldo_gramas) || 0) - consumoGramas })
    .eq("id", materialId);
  await db.from("itens_pedido").update({ estoque_baixado: true }).eq("id", itemId);
}

/* ---------- Painel (Dashboard) ---------- */

function renderDashboard() {
  const cards = allCards();
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const pedidosAbertos = pedidos.filter((p) => (p.itens || []).some((i) => i.status !== "entregue")).length;
  const itensAtrasados = cards.filter((c) => isAtrasado(c.item, c.pedido)).length;

  const entreguesNoMes = cards.filter((c) => {
    if (c.item.status !== "entregue" || !c.item.updated_at) return false;
    const d = new Date(c.item.updated_at);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  const faturamentoMes = entreguesNoMes.reduce((sum, c) => sum + (Number(c.item.valor) || 0), 0);
  const lucroMes = entreguesNoMes
    .filter((c) => c.item.custo_calculado !== null && c.item.custo_calculado !== undefined)
    .reduce((sum, c) => sum + ((Number(c.item.valor) || 0) - Number(c.item.custo_calculado)), 0);

  const horasFila = cards
    .filter((c) => c.item.status !== "entregue")
    .reduce((sum, c) => sum + (Number(c.item.tempo_estimado_horas) || 0), 0);

  const clientesAtivos = new Set(
    pedidos.filter((p) => (p.itens || []).some((i) => i.status !== "entregue")).map((p) => p.cliente_id)
  ).size;

  const falhasMes = falhas.filter((f) => {
    const d = new Date(f.created_at);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });
  const custoFalhasMes = falhasMes.reduce((sum, f) => sum + (Number(f.custo_perdido) || 0), 0);

  const stats = [
    { label: "Pedidos abertos", value: pedidosAbertos },
    { label: "Itens atrasados", value: itensAtrasados },
    { label: "Faturamento do mês", value: formatMoney(faturamentoMes) },
    { label: "Lucro do mês (itens com custo calculado)", value: formatMoney(lucroMes) },
    { label: "Horas na fila", value: `${horasFila}h` },
    { label: "Clientes ativos", value: clientesAtivos },
    { label: "Falhas do mês", value: falhasMes.length },
    { label: "Custo perdido em falhas (mês)", value: formatMoney(custoFalhasMes) },
  ];

  const materiaisBaixos = materiais.filter((m) => Number(m.saldo_gramas) <= Number(m.estoque_minimo_gramas));

  let html = stats
    .map((s) => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`)
    .join("");

  if (materiaisBaixos.length > 0) {
    html += `<div class="estoque-alerta">
      <h3>⚠️ Estoque baixo</h3>
      <ul>${materiaisBaixos.map((m) => `<li>${escapeHtml(m.nome)} — restam ${m.saldo_gramas}g</li>`).join("")}</ul>
    </div>`;
  }

  dashboard.innerHTML = html;
}

/* ---------- Financeiro: ledger central (movimentos), contas e categorias ---------- */
// Arquitetura: uma tabela só (movimentos) pra tudo — lançamento manual, transferência entre
// contas e o que o pedido gera automaticamente (sinal/saldo). O pedido continua sendo a única
// tela onde a venda é digitada; sincronizarMovimentosDoPedido() espelha isso no ledger sempre
// que um pedido é salvo, sem exigir lançar a mesma coisa duas vezes.

// "Atrasado" nunca é gravado — é sempre calculado (previsto + data no passado), assim não
// depende de nenhum job rodando pra manter o status em dia.
function isMovimentoAtrasado(m) {
  return m.status === "previsto" && m.data_movimento && m.data_movimento < new Date().toISOString().slice(0, 10);
}

function calcularSaldosContas() {
  const saldos = {};
  for (const conta of contasFinanceiras) saldos[conta.id] = Number(conta.saldo_inicial) || 0;
  for (const m of movimentos) {
    if (m.status !== "realizado" || !m.conta_id || !(m.conta_id in saldos)) continue;
    saldos[m.conta_id] += m.tipo === "entrada" ? Number(m.valor) : -Number(m.valor);
  }
  return saldos;
}

// Saldo dia a dia dos próximos 30 dias, aplicando cada lançamento previsto na ordem em que
// vence — pra achar não só "quanto sobra no fim" mas a primeira data em que o saldo passaria
// pro negativo, se nada mudar até lá.
function calcularProjecao30Dias() {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const limite = new Date();
  limite.setDate(limite.getDate() + 30);
  const limiteStr = limite.toISOString().slice(0, 10);

  const saldos = calcularSaldosContas();
  let saldoCorrente = Object.values(saldos).reduce((s, v) => s + v, 0);

  const eventosFuturos = movimentos
    .filter((m) => m.status === "previsto" && m.data_movimento >= hojeStr && m.data_movimento <= limiteStr)
    .sort((a, b) => (a.data_movimento < b.data_movimento ? -1 : 1));

  let dataRuptura = null;
  for (const m of eventosFuturos) {
    saldoCorrente += m.tipo === "entrada" ? Number(m.valor) : -Number(m.valor);
    if (saldoCorrente < 0 && !dataRuptura) dataRuptura = m.data_movimento;
  }

  return { saldoProjetado30Dias: saldoCorrente, dataRuptura };
}

function renderFinanceiroDashboard() {
  const saldos = calcularSaldosContas();
  const saldoHoje = Object.values(saldos).reduce((s, v) => s + v, 0);

  const previstos = movimentos.filter((m) => m.status === "previsto");
  const aReceber = previstos.filter((m) => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor), 0);
  const aPagar = previstos.filter((m) => m.tipo === "saida").reduce((s, m) => s + Number(m.valor), 0);
  const atrasados = movimentos.filter(isMovimentoAtrasado).length;

  const mesAtual = new Date().toISOString().slice(0, 7);
  const noMes = (m) => (m.data_movimento || "").startsWith(mesAtual);
  const aReceberMes = previstos.filter((m) => m.tipo === "entrada" && noMes(m)).reduce((s, m) => s + Number(m.valor), 0);
  const aPagarMes = previstos.filter((m) => m.tipo === "saida" && noMes(m)).reduce((s, m) => s + Number(m.valor), 0);
  const saldoProjetadoMes = saldoHoje + aReceberMes - aPagarMes;
  const { saldoProjetado30Dias, dataRuptura } = calcularProjecao30Dias();

  const stats = [
    { label: "Saldo hoje", value: formatMoney(saldoHoje) },
    { label: `A receber${atrasados > 0 ? ` (${atrasados} atrasado${atrasados > 1 ? "s" : ""})` : ""}`, value: formatMoney(aReceber) },
    { label: "A pagar", value: formatMoney(aPagar) },
    { label: "Saldo projetado do mês", value: formatMoney(saldoProjetadoMes) },
    { label: "Saldo projetado (30 dias)", value: formatMoney(saldoProjetado30Dias) },
  ];

  let html = stats
    .map((s) => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`)
    .join("");

  if (dataRuptura) {
    html += `<div class="saldo-alerta">
      <h3>⚠️ Saldo pode ficar negativo</h3>
      <p>Pelos lançamentos previstos, o saldo deve ficar negativo a partir de <strong>${formatDate(dataRuptura)}</strong> se nada mudar até lá.</p>
    </div>`;
  }

  const contasAtivas = contasFinanceiras.filter((c) => c.ativa);
  if (contasAtivas.length > 0) {
    html += `<div class="stat-card contas-saldo-card">
      <div class="stat-label">Saldo por conta</div>
      ${contasAtivas.map((c) => `<div class="conta-saldo-linha"><span>${escapeHtml(c.nome)}</span><span>${formatMoney(saldos[c.id] || 0)}</span></div>`).join("")}
    </div>`;
  }

  // Gasto por pessoa: só conta o que já saiu de fato (realizado), não o que ainda está previsto.
  const RESPONSAVEIS = ["Tamires", "Gustavo"];
  const gastoPorPessoa = RESPONSAVEIS.map((nome) => ({
    nome,
    total: movimentos
      .filter((m) => m.tipo === "saida" && m.status === "realizado" && m.responsavel === nome)
      .reduce((s, m) => s + Number(m.valor), 0),
  }));
  html += `<div class="stat-card contas-saldo-card">
    <div class="stat-label">Gasto por pessoa</div>
    ${gastoPorPessoa.map((g) => `<div class="conta-saldo-linha"><span>${escapeHtml(g.nome)}</span><span>${formatMoney(g.total)}</span></div>`).join("")}
  </div>`;

  html += renderMeiHtml();

  financeiroDashboardEl.innerHTML = html;
}

// Receita bruta anual pra comparar com o teto do MEI: só entradas já realizadas, e nunca conta
// transferência entre contas próprias como se fosse faturamento.
function calcularReceitaAnualMei() {
  const anoAtual = new Date().toISOString().slice(0, 4);
  const mesAtual = new Date().toISOString().slice(0, 7);
  const ehReceita = (m) => m.tipo === "entrada" && m.status === "realizado" && m.origem !== "transferencia";

  const receitaAno = movimentos
    .filter((m) => ehReceita(m) && (m.data_movimento || "").startsWith(anoAtual))
    .reduce((s, m) => s + Number(m.valor), 0);
  const receitaMes = movimentos
    .filter((m) => ehReceita(m) && (m.data_movimento || "").startsWith(mesAtual))
    .reduce((s, m) => s + Number(m.valor), 0);

  return { receitaAno, receitaMes };
}

function renderMeiHtml() {
  const teto = Number(configuracoes?.teto_mei_anual) || 81000;
  const percentualProvisao = Number(configuracoes?.percentual_provisao_fiscal) || 0;
  const { receitaAno, receitaMes } = calcularReceitaAnualMei();
  const percentualTeto = teto > 0 ? (receitaAno / teto) * 100 : 0;

  let html = `<div class="stat-card">
    <div class="stat-value">${percentualTeto.toFixed(1)}%</div>
    <div class="stat-label">Do teto MEI no ano (${formatMoney(receitaAno)} de ${formatMoney(teto)})</div>
  </div>`;

  if (percentualProvisao > 0) {
    html += `<div class="stat-card">
      <div class="stat-value">${formatMoney((receitaMes * percentualProvisao) / 100)}</div>
      <div class="stat-label">Provisão fiscal sugerida do mês (${percentualProvisao}% da receita)</div>
    </div>`;
  }

  if (percentualTeto >= 100) {
    html += `<div class="saldo-alerta">
      <h3>🚨 Teto do MEI ultrapassado</h3>
      <p>A receita realizada em ${new Date().getFullYear()} já passou de ${formatMoney(teto)}. Vale conversar com um contador sobre desenquadramento do MEI.</p>
    </div>`;
  } else if (percentualTeto >= 80) {
    html += `<div class="estoque-alerta">
      <h3>⚠️ Perto do teto do MEI</h3>
      <p>Já foi faturado ${percentualTeto.toFixed(1)}% do limite anual de ${formatMoney(teto)}. Fique de olho pro resto do ano.</p>
    </div>`;
  }

  return html;
}

function renderContasAReceber() {
  const linhas = movimentos
    .filter((m) => m.origem === "pedido_saldo" && m.status === "previsto")
    .map((m) => ({ movimento: m, pedido: pedidos.find((p) => p.id === m.pedido_id) }))
    .filter((l) => l.pedido)
    .sort((a, b) => (a.movimento.data_movimento || "9999") < (b.movimento.data_movimento || "9999") ? -1 : 1);

  const totalGeral = linhas.reduce((sum, l) => sum + Number(l.movimento.valor), 0);

  let html = `<div class="stat-card financeiro-total"><div class="stat-value">${formatMoney(totalGeral)}</div><div class="stat-label">Total a receber</div></div>`;

  if (linhas.length === 0) {
    html += `<p class="column-empty">Nenhuma conta em aberto. 🎉</p>`;
  } else {
    html += `<div class="table-wrap"><table class="financeiro-table"><thead><tr>
      <th>Cliente</th><th>Saldo</th><th>Vencimento</th><th>Status</th>
    </tr></thead><tbody>`;
    for (const l of linhas) {
      const atrasado = isMovimentoAtrasado(l.movimento);
      html += `<tr class="${atrasado ? "late-row" : ""}" data-mov-id="${l.movimento.id}">
        <td>${escapeHtml(l.pedido.cliente?.nome || "")}</td>
        <td>${formatMoney(l.movimento.valor)}</td>
        <td>${l.movimento.data_movimento ? formatDate(l.movimento.data_movimento) : "—"}</td>
        <td><span class="status-badge ${atrasado ? "atrasado" : "previsto"}">${atrasado ? "Atrasado" : "Previsto"}</span></td>
      </tr>`;
    }
    html += `</tbody></table></div>`;
  }

  financeiroEl.innerHTML = html;
  financeiroEl.querySelectorAll("tr[data-mov-id]").forEach((tr) =>
    tr.addEventListener("click", () => {
      const movimento = movimentos.find((m) => m.id === tr.dataset.movId);
      if (movimento) openMovimentoDialog(movimento);
    })
  );
}

/* ---------- Indicadores: custeio, margem, receita/hora-máquina, ponto de equilíbrio ---------- */
// Tudo calculado em cima de dados que já existem (itens_pedido.valor/custo_calculado/
// tempo_estimado_horas, despesas_fixas, maquinas) — sem tabela nova.

function calcularIndicadores() {
  const todosItens = pedidos.flatMap((p) => (p.itens || []).map((i) => ({ ...i, pedido: p })));
  const itensComCusto = todosItens.filter((i) => i.valor !== null && i.valor !== undefined && i.custo_calculado !== null && i.custo_calculado !== undefined);

  const somaValor = itensComCusto.reduce((s, i) => s + Number(i.valor), 0);
  const somaCusto = itensComCusto.reduce((s, i) => s + Number(i.custo_calculado), 0);
  const margemPercentual = somaValor > 0 ? (somaValor - somaCusto) / somaValor : 0;

  const itensComTempo = itensComCusto.filter((i) => Number(i.tempo_estimado_horas) > 0);
  const somaTempo = itensComTempo.reduce((s, i) => s + Number(i.tempo_estimado_horas), 0);
  const somaValorComTempo = itensComTempo.reduce((s, i) => s + Number(i.valor), 0);
  const somaMargemComTempo = itensComTempo.reduce((s, i) => s + (Number(i.valor) - Number(i.custo_calculado)), 0);
  const receitaPorHora = somaTempo > 0 ? somaValorComTempo / somaTempo : 0;
  const lucroPorHora = somaTempo > 0 ? somaMargemComTempo / somaTempo : 0;

  const custosFixosMensais = despesasFixas.reduce((s, d) => s + Number(d.valor), 0);
  const pontoEquilibrioReais = margemPercentual > 0 ? custosFixosMensais / margemPercentual : null;
  const pontoEquilibrioHoras = pontoEquilibrioReais !== null && receitaPorHora > 0 ? pontoEquilibrioReais / receitaPorHora : null;

  // Ocupação da frota no mês atual: horas de itens criados no mês (com máquina disponível pra
  // rodar 24h/dia, já que impressão não precisa de operador acompanhando) ÷ capacidade teórica.
  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0, 7);
  const horasUsadasMes = todosItens
    .filter((i) => (i.created_at || "").startsWith(mesAtual))
    .reduce((s, i) => s + (Number(i.tempo_estimado_horas) || 0), 0);
  const maquinasAtivas = maquinas.filter((m) => m.status === "ativa").length;
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const horasDisponiveisMes = maquinasAtivas * diasNoMes * 24;
  const ocupacaoFrota = horasDisponiveisMes > 0 ? horasUsadasMes / horasDisponiveisMes : null;

  function agrupar(itens, chaveFn) {
    const grupos = {};
    for (const i of itens) {
      const chave = chaveFn(i);
      if (!grupos[chave]) grupos[chave] = { chave, valor: 0, custo: 0, qtd: 0 };
      grupos[chave].valor += Number(i.valor);
      grupos[chave].custo += Number(i.custo_calculado);
      grupos[chave].qtd += 1;
    }
    return Object.values(grupos)
      .map((g) => ({ ...g, margem: g.valor - g.custo, margemPercentual: g.valor > 0 ? (g.valor - g.custo) / g.valor : 0 }))
      .sort((a, b) => b.margem - a.margem);
  }

  const porPedido = agrupar(itensComCusto, (i) => i.pedido.id).map((g) => {
    const pedido = pedidos.find((p) => p.id === g.chave);
    return { ...g, rotulo: pedido?.cliente?.nome ? `${pedido.cliente.nome} (${formatDate(pedido.created_at?.slice(0, 10))})` : g.chave };
  });
  const porProduto = agrupar(itensComCusto, (i) => i.descricao || "(sem descrição)").map((g) => ({ ...g, rotulo: g.chave }));
  const porCliente = agrupar(itensComCusto, (i) => i.pedido.cliente?.nome || "(sem cliente)").map((g) => ({ ...g, rotulo: g.chave }));

  return {
    margemPercentual, custosFixosMensais, pontoEquilibrioReais, pontoEquilibrioHoras,
    receitaPorHora, lucroPorHora, ocupacaoFrota, maquinasAtivas,
    porPedido, porProduto, porCliente,
  };
}

function renderTabelaIndicador(titulo, linhas) {
  if (linhas.length === 0) {
    return `<div class="table-wrap"><h3 class="indicador-titulo">${titulo}</h3><p class="column-empty">Sem itens com custo calculado ainda.</p></div>`;
  }
  const linhasHtml = linhas
    .slice(0, 20)
    .map(
      (l) => `<tr>
        <td class="indicador-rotulo-cell">${escapeHtml(l.rotulo)}</td>
        <td>${formatMoney(l.valor)}</td>
        <td class="indicador-custo-col">${formatMoney(l.custo)}</td>
        <td class="${l.margem >= 0 ? "mov-tipo-entrada" : "mov-tipo-saida"}">${formatMoney(l.margem)}</td>
        <td>${(l.margemPercentual * 100).toFixed(0)}%</td>
      </tr>`
    )
    .join("");
  return `<div class="table-wrap">
    <h3 class="indicador-titulo">${titulo}${linhas.length > 20 ? ` (top 20 de ${linhas.length})` : ""}</h3>
    <table class="financeiro-table"><thead><tr>
      <th></th><th>Receita</th><th class="indicador-custo-col">Custo</th><th>Margem</th><th>%</th>
    </tr></thead><tbody>${linhasHtml}</tbody></table>
  </div>`;
}

function renderFinanceiroIndicadores() {
  const ind = calcularIndicadores();

  const stats = [
    { label: "Margem de contribuição média", value: `${(ind.margemPercentual * 100).toFixed(0)}%` },
    { label: "Receita por hora de impressão", value: formatMoney(ind.receitaPorHora) },
    { label: "Lucro por hora de impressão", value: formatMoney(ind.lucroPorHora) },
    { label: "Ponto de equilíbrio (mês)", value: ind.pontoEquilibrioReais !== null ? formatMoney(ind.pontoEquilibrioReais) : "—" },
    { label: "Ponto de equilíbrio (horas de impressão)", value: ind.pontoEquilibrioHoras !== null ? `${ind.pontoEquilibrioHoras.toFixed(1)}h` : "—" },
    {
      label: `Ocupação da frota (mês, ${ind.maquinasAtivas} máquina${ind.maquinasAtivas === 1 ? "" : "s"} ativa${ind.maquinasAtivas === 1 ? "" : "s"})`,
      value: ind.ocupacaoFrota !== null ? `${(ind.ocupacaoFrota * 100).toFixed(1)}%` : "—",
    },
  ];

  indicadoresDashboardEl.innerHTML = stats
    .map((s) => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`)
    .join("");

  indicadoresTabelasEl.innerHTML =
    renderTabelaIndicador("Margem por pedido", ind.porPedido) +
    renderTabelaIndicador("Margem por produto", ind.porProduto) +
    renderTabelaIndicador("Margem por cliente", ind.porCliente);
}

function populateFiltroSelects() {
  const contaAtual = movFiltroConta.value;
  movFiltroConta.innerHTML =
    '<option value="">Todas as contas</option>' +
    contasFinanceiras.map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join("");
  movFiltroConta.value = contaAtual;

  const categoriaAtual = movFiltroCategoria.value;
  movFiltroCategoria.innerHTML =
    '<option value="">Todas as categorias</option>' +
    categoriasFinanceiras.map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join("");
  movFiltroCategoria.value = categoriaAtual;
}

function renderMovimentosList() {
  const busca = movBuscaInput.value.trim().toLowerCase();
  const filtroConta = movFiltroConta.value;
  const filtroCategoria = movFiltroCategoria.value;
  const filtroStatus = movFiltroStatus.value;
  const filtroResponsavel = movFiltroResponsavel.value;

  let lista = movimentos;
  if (filtroConta) lista = lista.filter((m) => m.conta_id === filtroConta);
  if (filtroCategoria) lista = lista.filter((m) => m.categoria_id === filtroCategoria);
  if (filtroStatus === "atrasado") lista = lista.filter(isMovimentoAtrasado);
  else if (filtroStatus) lista = lista.filter((m) => m.status === filtroStatus);
  if (filtroResponsavel) lista = lista.filter((m) => m.responsavel === filtroResponsavel);
  if (busca) lista = lista.filter((m) => (m.descricao || "").toLowerCase().includes(busca));

  lista = [...lista].sort((a, b) => (a.data_movimento < b.data_movimento ? 1 : -1));

  if (lista.length === 0) {
    movimentosListEl.innerHTML = `<p class="column-empty">Nenhum lançamento encontrado.</p>`;
    return;
  }

  const statusLabel = { previsto: "Previsto", realizado: "Realizado", cancelado: "Cancelado" };
  let html = `<div class="table-wrap"><table class="financeiro-table"><thead><tr>
    <th>Data</th><th>Descrição</th><th>Categoria</th><th>Conta</th><th>Responsável</th><th>Valor</th><th>Status</th>
  </tr></thead><tbody>`;
  for (const m of lista) {
    const categoria = categoriasFinanceiras.find((c) => c.id === m.categoria_id);
    const conta = contasFinanceiras.find((c) => c.id === m.conta_id);
    const atrasado = isMovimentoAtrasado(m);
    html += `<tr data-id="${m.id}" class="${atrasado ? "late-row" : ""}">
      <td>${formatDate(m.data_movimento)}</td>
      <td class="mov-descricao-cell">${escapeHtml(m.descricao || "")}${m.pedido_id ? ' <span class="mov-tag-pedido">🔗 pedido</span>' : ""}</td>
      <td>${escapeHtml(categoria?.nome || "—")}</td>
      <td>${escapeHtml(conta?.nome || "—")}</td>
      <td>${escapeHtml(m.responsavel || "—")}</td>
      <td class="mov-tipo-${m.tipo}">${m.tipo === "saida" ? "− " : "+ "}${formatMoney(m.valor)}</td>
      <td><span class="status-badge ${atrasado ? "atrasado" : m.status}">${atrasado ? "Atrasado" : statusLabel[m.status]}</span></td>
    </tr>`;
  }
  html += `</tbody></table></div>`;
  movimentosListEl.innerHTML = html;

  movimentosListEl.querySelectorAll("tr[data-id]").forEach((tr) =>
    tr.addEventListener("click", () => {
      const m = movimentos.find((mv) => mv.id === tr.dataset.id);
      if (m) openMovimentoDialog(m);
    })
  );
}

function populateContaSelect(selectEl, selecionado) {
  const atual = selecionado !== undefined ? selecionado : selectEl.value;
  selectEl.innerHTML =
    '<option value="">— A definir —</option>' +
    contasFinanceiras.filter((c) => c.ativa).map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join("");
  selectEl.value = atual || "";
}

function populateCategoriaSelect(selectEl, selecionado) {
  const atual = selecionado !== undefined ? selecionado : selectEl.value;
  selectEl.innerHTML = categoriasFinanceiras
    .filter((c) => c.ativa)
    .map((c) => `<option value="${c.id}">${c.tipo === "entrada" ? "↓" : "↑"} ${escapeHtml(c.nome)}</option>`)
    .join("");
  if (atual) selectEl.value = atual;
}

function openMovimentoDialog(movimento) {
  movimentoForm.reset();
  movimentoError.hidden = true;
  movimentoForm.dataset.id = movimento ? movimento.id : "";
  delete movimentoForm.dataset.origemIa;
  movimentoDialogTitle.textContent = movimento ? "Editar lançamento" : "Novo lançamento";

  const isPedido = !!movimento?.pedido_id;
  movimentoOrigemAviso.hidden = !isPedido;
  movimentoValorInput.readOnly = isPedido;
  movimentoTipoSelect.disabled = isPedido;
  deleteMovimentoBtn.hidden = !movimento || isPedido;

  populateContaSelect(movimentoContaSelect, movimento?.conta_id || "");
  populateCategoriaSelect(movimentoCategoriaSelect, movimento?.categoria_id || "");

  if (movimento) {
    movimentoForm.elements.namedItem("tipo").value = movimento.tipo;
    movimentoForm.elements.namedItem("valor").value = movimento.valor;
    movimentoForm.elements.namedItem("data_movimento").value = movimento.data_movimento;
    movimentoForm.elements.namedItem("status").value = movimento.status;
    movimentoForm.elements.namedItem("responsavel").value = movimento.responsavel || "";
    movimentoForm.elements.namedItem("descricao").value = movimento.descricao || "";
  } else {
    movimentoForm.elements.namedItem("data_movimento").value = new Date().toISOString().slice(0, 10);
    movimentoForm.elements.namedItem("status").value = "realizado";
  }

  movimentoDialog.showModal();
}

async function handleSaveMovimento(e) {
  e.preventDefault();
  movimentoError.hidden = true;

  const id = movimentoForm.dataset.id;
  const existente = id ? movimentos.find((m) => m.id === id) : null;
  const fd = new FormData(movimentoForm);
  const valor = Number(fd.get("valor"));

  if (!valor || valor <= 0) {
    movimentoError.textContent = "Informe um valor maior que zero.";
    movimentoError.hidden = false;
    return;
  }

  const payload = {
    tipo: fd.get("tipo"),
    valor,
    data_movimento: fd.get("data_movimento"),
    status: fd.get("status"),
    categoria_id: fd.get("categoria_id") || null,
    conta_id: fd.get("conta_id") || null,
    responsavel: fd.get("responsavel") || null,
    descricao: fd.get("descricao").trim() || null,
  };

  let error;
  if (id) {
    ({ error } = await db.from("movimentos").update(payload).eq("id", id));
  } else {
    const origem = movimentoForm.dataset.origemIa || "manual";
    ({ error } = await db.from("movimentos").insert({ ...payload, origem }));
  }
  if (error) {
    movimentoError.textContent = "Erro ao salvar: " + error.message;
    movimentoError.hidden = false;
    return;
  }

  // Baixa manual: marcar a ÚLTIMA parcela de saldo pendente como realizada também quita o
  // pedido — assim dá pra dar baixa direto pela régua financeira. Com parcelamento, só marca
  // como pago quando TODAS as parcelas já estiverem realizadas, não a cada uma isoladamente.
  if (existente?.pedido_id && existente.origem === "pedido_saldo" && payload.status === "realizado") {
    const { data: parcelas } = await db
      .from("movimentos")
      .select("status")
      .eq("pedido_id", existente.pedido_id)
      .eq("origem", "pedido_saldo");
    const todasQuitadas = (parcelas || []).every((m) => m.status === "realizado");
    if (todasQuitadas) {
      await db.from("pedidos").update({ pagamento: "pago" }).eq("id", existente.pedido_id);
    }
  }

  movimentoDialog.close();
  await loadData();
}

async function handleDeleteMovimento() {
  const id = movimentoForm.dataset.id;
  if (!id) return;
  if (!confirm("Excluir este lançamento?")) return;
  const { error } = await db.from("movimentos").delete().eq("id", id);
  if (error) {
    alert("Erro ao excluir: " + error.message);
    return;
  }
  movimentoDialog.close();
  await loadData();
}

function openTransferenciaDialog() {
  transferenciaForm.reset();
  transferenciaError.hidden = true;
  populateContaSelect(transferenciaOrigemSelect, "");
  populateContaSelect(transferenciaDestinoSelect, "");
  transferenciaForm.elements.namedItem("data_movimento").value = new Date().toISOString().slice(0, 10);
  transferenciaDialog.showModal();
}

async function handleSaveTransferencia(e) {
  e.preventDefault();
  transferenciaError.hidden = true;

  const fd = new FormData(transferenciaForm);
  const origemId = fd.get("conta_origem_id");
  const destinoId = fd.get("conta_destino_id");
  const valor = Number(fd.get("valor"));
  const dataMovimento = fd.get("data_movimento");
  const descricao = fd.get("descricao").trim() || null;

  if (!origemId || !destinoId || origemId === destinoId) {
    transferenciaError.textContent = "Escolha duas contas diferentes.";
    transferenciaError.hidden = false;
    return;
  }
  if (!valor || valor <= 0) {
    transferenciaError.textContent = "Informe um valor maior que zero.";
    transferenciaError.hidden = false;
    return;
  }

  const contaOrigem = contasFinanceiras.find((c) => c.id === origemId);
  const contaDestino = contasFinanceiras.find((c) => c.id === destinoId);

  const { data: saida, error: e1 } = await db
    .from("movimentos")
    .insert({
      conta_id: origemId,
      tipo: "saida",
      valor,
      data_movimento: dataMovimento,
      status: "realizado",
      origem: "transferencia",
      descricao: descricao || `Transferência para ${contaDestino?.nome || ""}`,
    })
    .select()
    .single();
  if (e1) {
    transferenciaError.textContent = "Erro: " + e1.message;
    transferenciaError.hidden = false;
    return;
  }

  const { data: entrada, error: e2 } = await db
    .from("movimentos")
    .insert({
      conta_id: destinoId,
      tipo: "entrada",
      valor,
      data_movimento: dataMovimento,
      status: "realizado",
      origem: "transferencia",
      descricao: descricao || `Transferência de ${contaOrigem?.nome || ""}`,
      transferencia_par_id: saida.id,
    })
    .select()
    .single();
  if (e2) {
    transferenciaError.textContent = "Erro: " + e2.message;
    transferenciaError.hidden = false;
    return;
  }

  await db.from("movimentos").update({ transferencia_par_id: entrada.id }).eq("id", saida.id);

  transferenciaDialog.close();
  await loadData();
}

/* ---------- Entrada rápida por IA (texto/foto/áudio) ---------- */
// Nunca salva nada sozinha: só pré-preenche o dialog de lançamento manual, que o operador
// confere e confirma (ou edita/cancela) antes de qualquer gravação no banco.

function openIaLancamentoDialog() {
  iaTextoInput.value = "";
  iaStatus.hidden = true;
  iaError.hidden = true;
  iaAudioBtn.textContent = "🎤 Gravar áudio";
  iaLancamentoDialog.showModal();
}

async function chamarIA(endpoint, body) {
  const {
    data: { session },
  } = await db.auth.getSession();
  const resp = await fetch(`/loja3d/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || "Erro ao interpretar com IA.");
  return json;
}

function aplicarResultadoIA(resultado, origem) {
  iaLancamentoDialog.close();
  openMovimentoDialog(null);
  movimentoForm.dataset.origemIa = origem;
  movimentoForm.elements.namedItem("tipo").value = resultado.tipo === "saida" ? "saida" : "entrada";
  movimentoForm.elements.namedItem("valor").value = resultado.valor;
  movimentoForm.elements.namedItem("descricao").value = resultado.descricao || "";

  if (resultado.categoria_sugerida) {
    const sugerida = resultado.categoria_sugerida.trim().toLowerCase();
    const categoria = categoriasFinanceiras.find((c) => c.nome.trim().toLowerCase() === sugerida);
    if (categoria) movimentoCategoriaSelect.value = categoria.id;
  }
}

async function handleIaTexto() {
  const texto = iaTextoInput.value.trim();
  if (!texto) return;
  iaError.hidden = true;
  iaStatus.hidden = false;
  iaStatus.textContent = "Pensando...";
  try {
    const resultado = await chamarIA("interpretar-texto", { texto });
    aplicarResultadoIA(resultado, "ia_texto");
  } catch (err) {
    iaError.textContent = err.message;
    iaError.hidden = false;
  } finally {
    iaStatus.hidden = true;
  }
}

function arquivoParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result.split(",")[1]);
    leitor.onerror = reject;
    leitor.readAsDataURL(blob);
  });
}

// Fotos de celular direto da câmera costumam vir enormes (vários MB) — redimensiona antes de
// mandar pra IA, tanto pra não estourar limite de payload quanto pra deixar mais rápido. 1280px
// no maior lado já é mais que suficiente pra ler texto de recibo/nota.
function redimensionarImagem(file, maxDimensao = 1280, qualidade = 0.75) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxDimensao / Math.max(img.naturalWidth, img.naturalHeight));
        const largura = Math.round(img.naturalWidth * escala);
        const altura = Math.round(img.naturalHeight * escala);
        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        canvas.getContext("2d").drawImage(img, 0, 0, largura, altura);
        const dataUrl = canvas.toDataURL("image/jpeg", qualidade);
        resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.onerror = () => reject(new Error("Não foi possível ler essa foto."));
      img.src = leitor.result;
    };
    leitor.onerror = () => reject(new Error("Não foi possível ler essa foto."));
    leitor.readAsDataURL(file);
  });
}

async function handleIaFoto(e) {
  const file = e.target.files[0];
  iaFotoInput.value = "";
  if (!file) return;

  iaError.hidden = true;
  iaStatus.hidden = false;
  iaStatus.textContent = "Analisando a foto...";
  try {
    const { base64, mimeType } = await redimensionarImagem(file);
    const resultado = await chamarIA("interpretar-foto", { imagemBase64: base64, mimeType });
    aplicarResultadoIA(resultado, "ia_foto");
  } catch (err) {
    iaError.textContent = err.message;
    iaError.hidden = false;
  } finally {
    iaStatus.hidden = true;
  }
}

async function handleIaAudio() {
  if (iaGravador && iaGravador.state === "recording") {
    iaGravador.stop();
    return;
  }

  iaError.hidden = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    iaAudioChunks = [];
    iaGravador = new MediaRecorder(stream);
    iaGravador.addEventListener("dataavailable", (e) => iaAudioChunks.push(e.data));
    iaGravador.addEventListener("stop", async () => {
      stream.getTracks().forEach((track) => track.stop());
      iaAudioBtn.textContent = "🎤 Gravar áudio";
      const blob = new Blob(iaAudioChunks, { type: iaGravador.mimeType });

      iaStatus.hidden = false;
      iaStatus.textContent = "Transcrevendo e analisando o áudio...";
      try {
        const audioBase64 = await arquivoParaBase64(blob);
        const resultado = await chamarIA("interpretar-audio", { audioBase64, mimeType: blob.type });
        aplicarResultadoIA(resultado, "ia_audio");
      } catch (err) {
        iaError.textContent = err.message;
        iaError.hidden = false;
      } finally {
        iaStatus.hidden = true;
      }
    });

    iaGravador.start();
    iaAudioBtn.textContent = "⏹ Parar gravação";
  } catch {
    iaError.textContent = "Não foi possível acessar o microfone. Confira a permissão do navegador.";
    iaError.hidden = false;
  }
}

/* ---------- Pedido → financeiro: sinal e saldo viram lançamentos automaticamente ---------- */

// Cria/atualiza (ou remove, se não fizer mais sentido) os lançamentos vinculados a um pedido —
// sinal (sempre 1 lançamento) e saldo (1 ou várias parcelas, conforme numero_parcelas). Chamado
// toda vez que o pedido é salvo — nunca duplica graças ao índice único (pedido_id, origem,
// parcela) e nunca rebaixa um lançamento já marcado como realizado manualmente.
async function sincronizarMovimentosDoPedido({ pedidoId, clienteNome, total, sinal, pagamento, prazoEntrega, numeroParcelas }) {
  const categoriaVendaId = categoriasFinanceiras.find((c) => c.slug === "venda_pedidos")?.id || null;
  const hoje = new Date().toISOString().slice(0, 10);
  const saldo = total - sinal;

  await upsertOuRemoverMovimentoPedido(pedidoId, "pedido_sinal", sinal > 0 ? {
    categoria_id: categoriaVendaId,
    tipo: "entrada",
    valor: sinal,
    descricao: `Sinal — ${clienteNome}`,
    data_movimento: hoje,
    status: "realizado",
  } : null);

  await sincronizarSaldoParcelado(pedidoId, {
    clienteNome,
    categoriaVendaId,
    saldo,
    numeroParcelas: numeroParcelas || 1,
    prazoEntrega,
    pagamento,
  });
}

// Divide o saldo em N parcelas mensais (a 1ª na data de entrega, ou hoje se não tiver prazo).
// Parcelas já realizadas nunca são tocadas — nem status, nem valor (já é dinheiro que entrou de
// verdade, não faz sentido reescrever o valor histórico se o número de parcelas mudar depois).
// O saldo que falta é redistribuído só entre as parcelas ainda pendentes, com a última
// absorvendo o arredondamento.
async function sincronizarSaldoParcelado(pedidoId, { clienteNome, categoriaVendaId, saldo, numeroParcelas, prazoEntrega, pagamento }) {
  const hoje = new Date();
  const baseData = prazoEntrega ? new Date(prazoEntrega + "T00:00:00") : hoje;

  const { data: existentes } = await db
    .from("movimentos")
    .select("id, parcela_numero, status, valor")
    .eq("pedido_id", pedidoId)
    .eq("origem", "pedido_saldo");

  if (saldo <= 0) {
    const idsRemover = (existentes || []).filter((m) => m.status !== "realizado").map((m) => m.id);
    if (idsRemover.length > 0) await db.from("movimentos").delete().in("id", idsRemover);
    return;
  }

  const jaRealizadas = (existentes || []).filter((m) => m.status === "realizado" && (m.parcela_numero || 1) <= numeroParcelas);
  const valorJaRealizado = jaRealizadas.reduce((s, m) => s + Number(m.valor), 0);
  const numerosRealizados = new Set(jaRealizadas.map((m) => m.parcela_numero || 1));

  const numerosPendentes = [];
  for (let n = 1; n <= numeroParcelas; n++) if (!numerosRealizados.has(n)) numerosPendentes.push(n);

  const saldoRestante = Math.max(0, saldo - valorJaRealizado);
  const valorParcelaBase = numerosPendentes.length > 0 ? Math.round((saldoRestante / numerosPendentes.length) * 100) / 100 : 0;

  for (let idx = 0; idx < numerosPendentes.length; idx++) {
    const parcelaNumero = numerosPendentes[idx];
    const ehUltima = idx === numerosPendentes.length - 1;
    const valor = ehUltima
      ? Math.round((saldoRestante - valorParcelaBase * (numerosPendentes.length - 1)) * 100) / 100
      : valorParcelaBase;

    const dataParcela = new Date(baseData);
    dataParcela.setMonth(dataParcela.getMonth() + (parcelaNumero - 1));

    const existente = (existentes || []).find((m) => (m.parcela_numero || 1) === parcelaNumero);
    const payload = {
      categoria_id: categoriaVendaId,
      tipo: "entrada",
      valor,
      descricao: numeroParcelas > 1 ? `Saldo (${parcelaNumero}/${numeroParcelas}) — ${clienteNome}` : `Saldo — ${clienteNome}`,
      data_movimento: dataParcela.toISOString().slice(0, 10),
      parcela_numero: parcelaNumero,
      parcela_total: numeroParcelas,
      status: pagamento === "pago" ? "realizado" : "previsto",
    };

    if (existente) {
      await db.from("movimentos").update(payload).eq("id", existente.id);
    } else {
      await db.from("movimentos").insert({ ...payload, pedido_id: pedidoId, origem: "pedido_saldo" });
    }
  }

  // Parcelas que não fazem mais parte do plano atual (número diminuiu) e ainda não foram pagas.
  const idsRemover = (existentes || [])
    .filter((m) => m.status !== "realizado" && (m.parcela_numero || 1) > numeroParcelas)
    .map((m) => m.id);
  if (idsRemover.length > 0) await db.from("movimentos").delete().in("id", idsRemover);
}

async function upsertOuRemoverMovimentoPedido(pedidoId, origem, payload) {
  const { data: existente } = await db
    .from("movimentos")
    .select("id, status")
    .eq("pedido_id", pedidoId)
    .eq("origem", origem)
    .maybeSingle();

  if (!payload) {
    if (existente) await db.from("movimentos").delete().eq("id", existente.id);
    return;
  }

  if (existente) {
    // Nunca rebaixa um lançamento já dado como realizado (ex: baixa manual feita antes de uma
    // edição sem relação, tipo corrigir uma observação) — só promove pra realizado, não volta.
    const statusFinal = payload.status === "realizado" ? "realizado" : existente.status;
    await db.from("movimentos").update({ ...payload, status: statusFinal }).eq("id", existente.id);
  } else {
    await db.from("movimentos").insert({ ...payload, pedido_id: pedidoId, origem });
  }
}

/* ---------- Contas e categorias financeiras (cadastro em Configurações) ---------- */

function renderContasFinanceirasList() {
  if (contasFinanceiras.length === 0) {
    contasFinanceirasListEl.innerHTML = `<li class="column-empty">Nenhuma conta cadastrada ainda.</li>`;
    return;
  }
  const tipoLabel = { banco: "Banco", dinheiro: "Dinheiro", maquininha: "Maquininha", pix: "Pix", outro: "Outro" };
  contasFinanceirasListEl.innerHTML = contasFinanceiras
    .map(
      (c) => `<li class="${c.ativa ? "" : "cadastro-inativo"}">
        <span>${escapeHtml(c.nome)} · ${tipoLabel[c.tipo] || c.tipo} — saldo inicial ${formatMoney(c.saldo_inicial)}${c.ativa ? "" : " (inativa)"}</span>
        <button type="button" data-id="${c.id}" class="toggle-conta-financeira-btn ghost">${c.ativa ? "Desativar" : "Reativar"}</button>
      </li>`
    )
    .join("");

  contasFinanceirasListEl.querySelectorAll(".toggle-conta-financeira-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const conta = contasFinanceiras.find((c) => c.id === btn.dataset.id);
      if (!conta) return;
      await db.from("contas_financeiras").update({ ativa: !conta.ativa }).eq("id", conta.id);
      await loadData();
      renderContasFinanceirasList();
    })
  );
}

async function handleAddContaFinanceira(e) {
  e.preventDefault();
  const fd = new FormData(contaFinanceiraForm);
  const payload = {
    nome: fd.get("nome").trim(),
    tipo: fd.get("tipo"),
    saldo_inicial: Number(fd.get("saldo_inicial")) || 0,
  };
  const { error } = await db.from("contas_financeiras").insert(payload);
  if (error) {
    alert("Erro ao adicionar conta: " + error.message);
    return;
  }
  contaFinanceiraForm.reset();
  await loadData();
  renderContasFinanceirasList();
}

function renderCategoriasFinanceirasList() {
  if (categoriasFinanceiras.length === 0) {
    categoriasFinanceirasListEl.innerHTML = `<li class="column-empty">Nenhuma categoria cadastrada ainda.</li>`;
    return;
  }
  categoriasFinanceirasListEl.innerHTML = categoriasFinanceiras
    .map(
      (c) => `<li class="${c.ativa ? "" : "cadastro-inativo"}">
        <span>${c.tipo === "entrada" ? "↓" : "↑"} ${escapeHtml(c.nome)}${c.protegida ? " 🔒" : ""}${c.ativa ? "" : " (inativa)"}</span>
        <button type="button" data-id="${c.id}" class="toggle-categoria-financeira-btn ghost">${c.ativa ? "Desativar" : "Reativar"}</button>
      </li>`
    )
    .join("");

  categoriasFinanceirasListEl.querySelectorAll(".toggle-categoria-financeira-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const categoria = categoriasFinanceiras.find((c) => c.id === btn.dataset.id);
      if (!categoria) return;
      await db.from("categorias_financeiras").update({ ativa: !categoria.ativa }).eq("id", categoria.id);
      await loadData();
      renderCategoriasFinanceirasList();
    })
  );
}

async function handleAddCategoriaFinanceira(e) {
  e.preventDefault();
  const fd = new FormData(categoriaFinanceiraForm);
  const payload = {
    nome: fd.get("nome").trim(),
    tipo: fd.get("tipo"),
    protegida: fd.get("protegida") === "on",
  };
  const { error } = await db.from("categorias_financeiras").insert(payload);
  if (error) {
    alert("Erro ao adicionar categoria: " + error.message);
    return;
  }
  categoriaFinanceiraForm.reset();
  await loadData();
  renderCategoriasFinanceirasList();
}

/* ---------- Despesas fixas recorrentes (projetadas 12 meses pra frente) ---------- */
// Cada despesa fixa é um "molde" (nome/valor/categoria/conta/dia de vencimento). Salvar (ou
// editar) gera/atualiza 12 lançamentos previstos, um por mês, marcados com despesa_fixa_id e
// parcela_numero — e nunca mexe num mês que já foi marcado como realizado.

function renderDespesasFixasList() {
  if (despesasFixas.length === 0) {
    despesasFixasListEl.innerHTML = `<li class="column-empty">Nenhuma despesa fixa cadastrada ainda.</li>`;
    return;
  }
  despesasFixasListEl.innerHTML = despesasFixas
    .map((d) => {
      const categoria = categoriasFinanceiras.find((c) => c.id === d.categoria_id);
      const conta = contasFinanceiras.find((c) => c.id === d.conta_id);
      return `<li>
        <span>${escapeHtml(d.nome)} — ${formatMoney(d.valor)}/mês · todo dia ${d.dia_vencimento}${categoria ? " · " + escapeHtml(categoria.nome) : ""}${conta ? " · " + escapeHtml(conta.nome) : ""}</span>
        <button type="button" data-id="${d.id}" class="remove-despesa-fixa-btn">×</button>
      </li>`;
    })
    .join("");

  despesasFixasListEl.querySelectorAll(".remove-despesa-fixa-btn").forEach((btn) =>
    btn.addEventListener("click", () => handleDeleteDespesaFixa(btn.dataset.id))
  );
}

async function handleAddDespesaFixa(e) {
  e.preventDefault();
  const fd = new FormData(despesaFixaForm);
  const payload = {
    nome: fd.get("nome").trim(),
    valor: Number(fd.get("valor")),
    categoria_id: fd.get("categoria_id") || null,
    conta_id: fd.get("conta_id") || null,
    dia_vencimento: Number(fd.get("dia_vencimento")) || 5,
  };
  const { data, error } = await db.from("despesas_fixas").insert(payload).select().single();
  if (error) {
    alert("Erro ao adicionar despesa fixa: " + error.message);
    return;
  }
  await sincronizarMovimentosDespesaFixa(data.id, payload);
  despesaFixaForm.reset();
  despesaFixaForm.elements.namedItem("dia_vencimento").value = "5";
  await loadData();
  renderDespesasFixasList();
}

async function handleDeleteDespesaFixa(id) {
  if (!confirm("Excluir essa despesa fixa? Os meses futuros ainda não pagos somem da previsão — os que já foram marcados como pagos continuam no histórico.")) return;
  await db.from("movimentos").delete().eq("despesa_fixa_id", id).eq("status", "previsto");
  const { error } = await db.from("despesas_fixas").delete().eq("id", id);
  if (error) {
    alert("Erro ao excluir: " + error.message);
    return;
  }
  await loadData();
  renderDespesasFixasList();
}

async function sincronizarMovimentosDespesaFixa(despesaFixaId, { nome, valor, categoria_id, conta_id, dia_vencimento }) {
  const hoje = new Date();
  for (let i = 0; i < 12; i++) {
    const anoMes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const ultimoDiaMes = new Date(anoMes.getFullYear(), anoMes.getMonth() + 1, 0).getDate();
    const dia = Math.min(dia_vencimento, ultimoDiaMes);
    const dataMovimento = new Date(anoMes.getFullYear(), anoMes.getMonth(), dia).toISOString().slice(0, 10);
    const parcelaNumero = i + 1;

    const { data: existente } = await db
      .from("movimentos")
      .select("id, status")
      .eq("despesa_fixa_id", despesaFixaId)
      .eq("parcela_numero", parcelaNumero)
      .maybeSingle();

    if (existente?.status === "realizado") continue; // não mexe no que já foi pago

    const payload = {
      categoria_id,
      conta_id,
      tipo: "saida",
      valor,
      descricao: nome,
      data_movimento: dataMovimento,
      parcela_numero: parcelaNumero,
      parcela_total: 12,
    };

    if (existente) {
      await db.from("movimentos").update(payload).eq("id", existente.id);
    } else {
      await db.from("movimentos").insert({ ...payload, despesa_fixa_id: despesaFixaId, origem: "despesa_fixa", status: "previsto" });
    }
  }
}

/* ---------- Exportar CSV ---------- */

function exportCsv() {
  const header = [
    "Cliente",
    "Contato",
    "Peça",
    "Cor",
    "Material",
    "Quantidade",
    "Valor",
    "Status",
    "Prazo",
    "Pagamento",
    "Prioridade",
    "Origem",
  ];
  const rows = allCards().map((c) => [
    c.pedido.cliente?.nome || "",
    c.pedido.cliente?.contato || "",
    c.item.descricao,
    c.item.cor || "",
    c.item.material || "",
    c.item.quantidade,
    c.item.valor ?? "",
    c.item.status,
    c.pedido.prazo_entrega || "",
    c.pedido.pagamento,
    c.pedido.prioridade,
    c.pedido.origem || "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pedidos-3d-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Configurações e materiais ---------- */

function openConfigDialog() {
  configError.hidden = true;
  if (configuracoes) {
    for (const [key, value] of Object.entries(configuracoes)) {
      const field = configForm.elements.namedItem(key);
      if (field && value !== null && value !== undefined) field.value = value;
    }
  }
  renderMateriaisList();
  renderMaquinasList();
  renderCanaisVendaList();
  renderContasFinanceirasList();
  renderCategoriasFinanceirasList();
  populateContaSelect(despesaFixaContaSelect, "");
  populateCategoriaSelect(despesaFixaCategoriaSelect, "");
  renderDespesasFixasList();
  configDialog.showModal();
}

async function handleSaveConfig(e) {
  e.preventDefault();
  const fd = new FormData(configForm);
  const payload = {
    nome_loja: fd.get("nome_loja").trim(),
    valor_kwh: Number(fd.get("valor_kwh")),
    potencia_media_watts: Number(fd.get("potencia_media_watts")),
    valor_maquina: Number(fd.get("valor_maquina")),
    vida_util_horas: Number(fd.get("vida_util_horas")),
    valor_hora_mao_obra: Number(fd.get("valor_hora_mao_obra")),
    taxa_risco_percentual: Number(fd.get("taxa_risco_percentual")),
    margem_padrao_percentual: Number(fd.get("margem_padrao_percentual")),
    chave_pix: fd.get("chave_pix").trim() || null,
    cidade: fd.get("cidade").trim() || null,
    teto_mei_anual: Number(fd.get("teto_mei_anual")) || 81000,
    percentual_provisao_fiscal: Number(fd.get("percentual_provisao_fiscal")) || 0,
  };
  const { error } = await db.from("configuracoes").update(payload).eq("id", 1);
  if (error) {
    configError.textContent = "Erro ao salvar: " + error.message;
    configError.hidden = false;
    return;
  }
  await loadData();
  configDialog.close();
}

/* ---------- Logo/avatar da loja ---------- */

function logoUrl(path) {
  return `${config.url}/storage/v1/object/public/${LOGO_BUCKET}/${path}`;
}

function atualizarBrandMarks() {
  const src = configuracoes?.logo_path ? logoUrl(configuracoes.logo_path) : "/loja3d/icon.svg";
  document.querySelectorAll(".brand-mark").forEach((img) => (img.src = src));
}

function handleLogoSelecionado(e) {
  const file = e.target.files[0];
  if (!file) return;
  arquivoLogoPendente = file;

  const leitor = new FileReader();
  leitor.onload = () => {
    avatarCropImg.src = leitor.result;
    avatarCropBox.hidden = false;
    avatarCropBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  leitor.readAsDataURL(file);
}

// Ao carregar a foto, calcula a escala mínima que cobre o círculo inteiro (igual ao
// object-fit:cover) e centraliza — a partir daí o usuário arrasta pra reposicionar e usa o
// controle de zoom pra aproximar, como em Instagram/TikTok.
avatarCropImg?.addEventListener("load", () => {
  const tamanho = avatarCropFrame.clientWidth; // moldura é quadrada (aspect-ratio 1/1)
  cropBaseScale = Math.max(tamanho / avatarCropImg.naturalWidth, tamanho / avatarCropImg.naturalHeight);
  cropZoom = 1;
  avatarCropZoom.value = "1";

  const escala = cropBaseScale * cropZoom;
  cropOffsetX = (tamanho - avatarCropImg.naturalWidth * escala) / 2;
  cropOffsetY = (tamanho - avatarCropImg.naturalHeight * escala) / 2;
  aplicarTransformCrop();
});

function aplicarTransformCrop() {
  const tamanho = avatarCropFrame.clientWidth;
  const escala = cropBaseScale * cropZoom;
  const larguraRenderizada = avatarCropImg.naturalWidth * escala;
  const alturaRenderizada = avatarCropImg.naturalHeight * escala;

  // A foto sempre tem que cobrir o círculo inteiro: o canto não pode "entrar" além de 0
  // nem deixar sobrar espaço em branco do outro lado.
  cropOffsetX = Math.min(0, Math.max(tamanho - larguraRenderizada, cropOffsetX));
  cropOffsetY = Math.min(0, Math.max(tamanho - alturaRenderizada, cropOffsetY));

  avatarCropImg.style.width = `${larguraRenderizada}px`;
  avatarCropImg.style.height = `${alturaRenderizada}px`;
  avatarCropImg.style.left = `${cropOffsetX}px`;
  avatarCropImg.style.top = `${cropOffsetY}px`;
}

function handleCropZoomChange() {
  const tamanho = avatarCropFrame.clientWidth;
  const escalaAntiga = cropBaseScale * cropZoom;
  // Mantém fixo, na tela, o ponto da foto que estava no centro do círculo.
  const centroNaturalX = (tamanho / 2 - cropOffsetX) / escalaAntiga;
  const centroNaturalY = (tamanho / 2 - cropOffsetY) / escalaAntiga;

  cropZoom = Number(avatarCropZoom.value);
  const escalaNova = cropBaseScale * cropZoom;
  cropOffsetX = tamanho / 2 - centroNaturalX * escalaNova;
  cropOffsetY = tamanho / 2 - centroNaturalY * escalaNova;
  aplicarTransformCrop();
}

function cropPointerPos(e) {
  return e.touches?.[0] ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
}

function handleCropDragStart(e) {
  cropDragging = true;
  avatarCropFrame.classList.add("dragging");
  const pos = cropPointerPos(e);
  cropDragStartX = pos.x;
  cropDragStartY = pos.y;
  cropDragOffsetX = cropOffsetX;
  cropDragOffsetY = cropOffsetY;
  e.preventDefault();
}

function handleCropDragMove(e) {
  if (!cropDragging) return;
  const pos = cropPointerPos(e);
  cropOffsetX = cropDragOffsetX + (pos.x - cropDragStartX);
  cropOffsetY = cropDragOffsetY + (pos.y - cropDragStartY);
  aplicarTransformCrop();
  e.preventDefault();
}

function handleCropDragEnd() {
  cropDragging = false;
  avatarCropFrame.classList.remove("dragging");
}

avatarCropZoom?.addEventListener("input", handleCropZoomChange);
avatarCropFrame?.addEventListener("pointerdown", handleCropDragStart);
avatarCropFrame?.addEventListener("pointermove", handleCropDragMove);
window.addEventListener("pointerup", handleCropDragEnd);
window.addEventListener("pointercancel", handleCropDragEnd);

function cancelarSelecaoLogo() {
  arquivoLogoPendente = null;
  avatarCropBox.hidden = true;
  avatarCropImg.src = "";
  logoInput.value = "";
}

// Recorta de verdade (canvas) o quadrado exibido dentro do círculo — o arquivo enviado já sai
// pronto, então favicon/ícone do PWA (que não respeitam o object-fit:cover do CSS) também
// mostram a foto certa, e não a imagem inteira sem recorte.
async function recortarLogoParaBlob() {
  const tamanho = avatarCropFrame.clientWidth;
  const escala = cropBaseScale * cropZoom;
  const TAMANHO_SAIDA = 512;

  const canvas = document.createElement("canvas");
  canvas.width = TAMANHO_SAIDA;
  canvas.height = TAMANHO_SAIDA;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    avatarCropImg,
    -cropOffsetX / escala,
    -cropOffsetY / escala,
    tamanho / escala,
    tamanho / escala,
    0,
    0,
    TAMANHO_SAIDA,
    TAMANHO_SAIDA
  );

  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
}

async function confirmarUploadLogo() {
  if (!arquivoLogoPendente) return;

  const blob = await recortarLogoParaBlob();
  if (!blob) {
    alert("Não foi possível recortar a foto. Tente novamente.");
    return;
  }
  const novoPath = `logo-${crypto.randomUUID()}.jpg`;
  const pathAntigo = configuracoes?.logo_path;

  const { error: uploadError } = await db.storage.from(LOGO_BUCKET).upload(novoPath, blob, { contentType: "image/jpeg" });
  if (uploadError) {
    alert("Erro ao enviar a foto: " + uploadError.message);
    return;
  }

  const { error } = await db.from("configuracoes").update({ logo_path: novoPath }).eq("id", 1);
  if (error) {
    alert("Erro ao salvar a foto: " + error.message);
    return;
  }

  if (pathAntigo) {
    await db.storage.from(LOGO_BUCKET).remove([pathAntigo]);
  }

  cancelarSelecaoLogo();
  await loadData();
}

function renderMateriaisList() {
  if (materiais.length === 0) {
    materiaisListEl.innerHTML = `<li class="column-empty">Nenhum material cadastrado ainda.</li>`;
    return;
  }
  materiaisListEl.innerHTML = materiais
    .map((m) => {
      const baixo = Number(m.saldo_gramas) <= Number(m.estoque_minimo_gramas);
      return `<li>
        <span>${escapeHtml(m.nome)}${m.tipo ? " · " + escapeHtml(m.tipo) : ""} — ${formatMoney(m.preco_rolo)} / ${m.peso_rolo_gramas}g
        · estoque: <strong class="${baixo ? "estoque-baixo" : ""}">${m.saldo_gramas}g</strong></span>
        <button type="button" data-id="${m.id}" class="add-rolo-btn" title="Registrar compra de 1 rolo novo">+ rolo</button>
        <button type="button" data-id="${m.id}" class="edit-estoque-btn" title="Corrigir estoque manualmente">✏️</button>
        <button type="button" data-id="${m.id}" class="remove-material-btn">×</button>
      </li>`;
    })
    .join("");

  materiaisListEl.querySelectorAll(".add-rolo-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const material = materiais.find((m) => m.id === btn.dataset.id);
      if (!material) return;
      await db
        .from("materiais")
        .update({ saldo_gramas: (Number(material.saldo_gramas) || 0) + Number(material.peso_rolo_gramas) })
        .eq("id", material.id);
      await loadData();
      renderMateriaisList();
    })
  );

  materiaisListEl.querySelectorAll(".edit-estoque-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const material = materiais.find((m) => m.id === btn.dataset.id);
      if (!material) return;
      const novoValor = prompt(`Estoque atual de "${material.nome}" (gramas):`, material.saldo_gramas);
      if (novoValor === null || novoValor.trim() === "") return;
      await db.from("materiais").update({ saldo_gramas: Number(novoValor) }).eq("id", material.id);
      await loadData();
      renderMateriaisList();
    })
  );

  materiaisListEl.querySelectorAll(".remove-material-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Remover este material?")) return;
      await db.from("materiais").delete().eq("id", btn.dataset.id);
      await loadData();
      renderMateriaisList();
    })
  );
}

async function handleAddMaterial(e) {
  e.preventDefault();
  const fd = new FormData(materialForm);
  const payload = {
    nome: fd.get("nome").trim(),
    tipo: fd.get("tipo").trim() || null,
    preco_rolo: Number(fd.get("preco_rolo")),
    peso_rolo_gramas: Number(fd.get("peso_rolo_gramas")),
    saldo_gramas: Number(fd.get("saldo_gramas")) || 0,
    estoque_minimo_gramas: Number(fd.get("estoque_minimo_gramas")) || 0,
  };
  const { error } = await db.from("materiais").insert(payload);
  if (error) {
    alert("Erro ao adicionar material: " + error.message);
    return;
  }
  materialForm.reset();
  materialForm.elements.namedItem("peso_rolo_gramas").value = 1000;
  materialForm.elements.namedItem("estoque_minimo_gramas").value = 200;
  await loadData();
  renderMateriaisList();
}

/* ---------- Máquinas ---------- */

function renderMaquinasList() {
  if (maquinas.length === 0) {
    maquinasListEl.innerHTML = `<li class="column-empty">Nenhuma máquina cadastrada ainda.</li>`;
    return;
  }
  const statusLabel = { ativa: "Ativa", manutencao: "Em manutenção", inativa: "Inativa" };
  maquinasListEl.innerHTML = maquinas
    .map(
      (m) => `<li>
        <span>${escapeHtml(m.nome)}${m.modelo ? " · " + escapeHtml(m.modelo) : ""} — ${statusLabel[m.status] || m.status}</span>
        <button type="button" data-id="${m.id}" class="remove-maquina-btn">×</button>
      </li>`
    )
    .join("");
  maquinasListEl.querySelectorAll(".remove-maquina-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Remover esta máquina?")) return;
      await db.from("maquinas").delete().eq("id", btn.dataset.id);
      await loadData();
      renderMaquinasList();
    })
  );
}

async function handleAddMaquina(e) {
  e.preventDefault();
  const fd = new FormData(maquinaForm);
  const payload = {
    nome: fd.get("nome").trim(),
    modelo: fd.get("modelo").trim() || null,
    valor: fd.get("valor") ? Number(fd.get("valor")) : null,
    status: fd.get("status"),
  };
  const { error } = await db.from("maquinas").insert(payload);
  if (error) {
    alert("Erro ao adicionar máquina: " + error.message);
    return;
  }
  maquinaForm.reset();
  await loadData();
  renderMaquinasList();
}

/* ---------- Canais de venda ---------- */

function renderCanaisVendaList() {
  if (canaisVenda.length === 0) {
    canaisVendaListEl.innerHTML = `<li class="column-empty">Nenhum canal cadastrado ainda.</li>`;
    return;
  }
  canaisVendaListEl.innerHTML = canaisVenda
    .map(
      (c) => `<li>
        <span>${escapeHtml(c.nome)} — ${c.comissao_percentual}% + ${formatMoney(c.taxa_fixa)}</span>
        <button type="button" data-id="${c.id}" class="remove-canal-btn">×</button>
      </li>`
    )
    .join("");
  canaisVendaListEl.querySelectorAll(".remove-canal-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Remover este canal de venda?")) return;
      await db.from("canais_venda").delete().eq("id", btn.dataset.id);
      await loadData();
      renderCanaisVendaList();
    })
  );
}

async function handleAddCanalVenda(e) {
  e.preventDefault();
  const fd = new FormData(canalVendaForm);
  const payload = {
    nome: fd.get("nome").trim(),
    comissao_percentual: Number(fd.get("comissao_percentual")),
    taxa_fixa: Number(fd.get("taxa_fixa")) || 0,
  };
  const { error } = await db.from("canais_venda").insert(payload);
  if (error) {
    alert("Erro ao adicionar canal: " + error.message);
    return;
  }
  canalVendaForm.reset();
  await loadData();
  renderCanaisVendaList();
}

/* ---------- Leitura automática de peso/tempo do arquivo fatiado (G-code) ---------- */
// .stl não tem essa informação (é só a geometria, antes de passar pela fatiadora) e .3mf
// exigiria descompactar um ZIP e ler XML específico de cada fatiadora — não deu pra validar
// isso com segurança sem arquivos reais de amostra, então por enquanto só G-code mesmo.
// Cobre os formatos de comentário do Cura, PrusaSlicer/SuperSlicer e Bambu Studio (que herda
// do PrusaSlicer). Sempre pré-preenche os campos existentes pra conferência — nunca salva
// sozinho.

const DENSIDADE_FILAMENTO_G_CM3 = { pla: 1.24, petg: 1.27, abs: 1.04, tpu: 1.21, asa: 1.05, nylon: 1.14, pa: 1.14 };

function parseGcodeMetadados(texto) {
  let tempoHoras = null;
  let pesoGramas = null;

  // PrusaSlicer / SuperSlicer / Bambu Studio (herda do Slic3r):
  // "; estimated printing time (normal mode) = 2h 15m 30s"
  let m = texto.match(/estimated printing time[^=\n]*=\s*((?:\d+d\s*)?(?:\d+h\s*)?(?:\d+m\s*)?(?:\d+s)?)/i);
  if (m && m[1].trim()) {
    const partes = m[1];
    const d = Number(partes.match(/(\d+)d/)?.[1] || 0);
    const h = Number(partes.match(/(\d+)h/)?.[1] || 0);
    const min = Number(partes.match(/(\d+)m(?!s)/)?.[1] || 0);
    const s = Number(partes.match(/(\d+)s/)?.[1] || 0);
    tempoHoras = d * 24 + h + min / 60 + s / 3600;
  }

  // Cura: ";TIME:12345" (segundos)
  if (tempoHoras === null) {
    m = texto.match(/;TIME:(\d+)/);
    if (m) tempoHoras = Number(m[1]) / 3600;
  }

  // PrusaSlicer/SuperSlicer/Bambu: "; filament used [g] = 45.32" (pode ter mais de um valor,
  // separado por vírgula, um por extrusor/cor — soma todos).
  const pesosDiretos = [...texto.matchAll(/filament used \[g\]\s*=\s*([\d.,\s]+)/gi)];
  if (pesosDiretos.length > 0) {
    const valores = pesosDiretos
      .flatMap((match) => match[1].split(","))
      .map((v) => parseFloat(v.trim()))
      .filter((v) => !isNaN(v));
    if (valores.length > 0) pesoGramas = valores.reduce((a, b) => a + b, 0);
  }

  // Cura (algumas versões): ";Filament weight = 45.00"
  if (pesoGramas === null) {
    m = texto.match(/;\s*Filament weight\s*=\s*([\d.]+)/i);
    if (m) pesoGramas = parseFloat(m[1]);
  }

  // Só tem o comprimento do filamento (Cura clássico: ";Filament used: 3.2m") — converte por
  // densidade, assumindo 1,75mm de diâmetro (padrão em impressoras FDM de mesa) e tentando
  // identificar o material no próprio arquivo pra escolher a densidade certa (senão usa PLA).
  if (pesoGramas === null) {
    m = texto.match(/;\s*Filament used:\s*([\d.]+)\s*m\b/i);
    if (m) {
      const metros = parseFloat(m[1]);
      const materialDetectado = texto.match(/;\s*(?:Filament type|filament_type)\s*[=:]\s*(\w+)/i)?.[1]?.toLowerCase();
      const densidade = DENSIDADE_FILAMENTO_G_CM3[materialDetectado] || DENSIDADE_FILAMENTO_G_CM3.pla;
      const raioCm = 0.175 / 2;
      const volumeCm3 = Math.PI * raioCm * raioCm * (metros * 100);
      pesoGramas = volumeCm3 * densidade;
    }
  }

  return { pesoGramas, tempoHoras };
}

async function handleGcodeCarregado(file, row) {
  const extensao = (file.name.split(".").pop() || "").toLowerCase();

  if (extensao === "stl") {
    alert(
      "Arquivo .stl não tem peso nem tempo de impressão — é só a geometria 3D, antes de passar pela fatiadora. " +
        "Fatia o modelo e carrega o G-code exportado aqui, ou preenche peso/tempo manualmente."
    );
    return;
  }
  if (extensao === "3mf") {
    alert(
      "Leitura automática de .3mf ainda não é suportada. Exporta o G-code da fatiadora e carrega ele aqui, " +
        "ou preenche peso/tempo manualmente."
    );
    return;
  }

  const texto = await file.text();
  const { pesoGramas, tempoHoras } = parseGcodeMetadados(texto);

  if (pesoGramas === null && tempoHoras === null) {
    alert(
      "Não consegui identificar peso nem tempo de impressão nesse arquivo. Confere se foi fatiado no Cura, " +
        "PrusaSlicer, SuperSlicer ou Bambu Studio — ou preenche manualmente."
    );
    return;
  }

  const partes = [];
  if (pesoGramas !== null) {
    const arredondado = Math.round(pesoGramas);
    setField(row, "peso_gramas", arredondado);
    partes.push(`${arredondado}g de filamento`);
  }
  if (tempoHoras !== null) {
    const arredondado = Math.round(tempoHoras * 10) / 10;
    setField(row, "tempo_estimado_horas", arredondado);
    partes.push(`${arredondado}h de impressão`);
  }
  alert(`Lido do arquivo: ${partes.join(" e ")}. Confere os campos antes de salvar.`);
}

/* ---------- Calculadora de custo ---------- */

function calcularCusto({ pesoGramas, tempoHoras, maoObraHoras, materialId }) {
  const cfg = configuracoes || {};
  const material = materiais.find((m) => m.id === materialId);
  const custoMaterial = material ? (material.preco_rolo / material.peso_rolo_gramas) * pesoGramas : 0;
  const custoEnergia = ((cfg.potencia_media_watts || 0) / 1000) * tempoHoras * (cfg.valor_kwh || 0);
  const custoMaquina = ((cfg.valor_maquina || 0) / (cfg.vida_util_horas || 1)) * tempoHoras;
  const custoMaoObra = (cfg.valor_hora_mao_obra || 0) * maoObraHoras;
  const custoBase = custoMaterial + custoEnergia + custoMaquina + custoMaoObra;
  const custoComRisco = custoBase * (1 + (cfg.taxa_risco_percentual || 0) / 100);
  const precoSugerido = custoComRisco * (1 + (cfg.margem_padrao_percentual || 0) / 100);
  return { custoMaterial, custoEnergia, custoMaquina, custoMaoObra, custoBase, custoComRisco, precoSugerido };
}

/* ---------- Calculadora livre (aba "Calculadora", não salva nada) ---------- */

function lerCalculadoraLivre() {
  return {
    materialId: calcMaterial.value || null,
    pesoGramas: Number(calcPeso.value) || 0,
    tempoHoras: Number(calcTempo.value) || 0,
    maoObraHoras: Number(calcMaoObra.value) || 0,
    maoObraTerceiro: Number(calcTerceiro.value) || 0,
    canalId: calcCanal.value || null,
    comissaoPercentual: Number(calcComissao.value) || 0,
    comissaoFixa: Number(calcComissaoFixa.value) || 0,
    itemAdicional: Number(calcItemAdicional.value) || 0,
  };
}

// Comissão pode ter percentual + taxa fixa por item (ex: Shopee "20% + R$4"). Pra manter a
// margem desejada mesmo com a comissão, o preço final é "engordado" o suficiente pra, depois de
// descontar os dois, ainda sobrar o preço-sem-comissão calculado (custo + risco + margem).
function calcularPrecificacaoLivre(entrada) {
  const { materialId, pesoGramas, tempoHoras, maoObraHoras, maoObraTerceiro, comissaoPercentual, comissaoFixa, itemAdicional } =
    entrada;
  const base = calcularCusto({ pesoGramas, tempoHoras, maoObraHoras, materialId });
  const custoTotal = base.custoBase + maoObraTerceiro + itemAdicional;
  const custoComRisco = custoTotal * (1 + (configuracoes?.taxa_risco_percentual || 0) / 100);
  const precoSemComissao = custoComRisco * (1 + (configuracoes?.margem_padrao_percentual || 0) / 100);
  const precoFinal =
    comissaoPercentual > 0 && comissaoPercentual < 100
      ? (precoSemComissao + comissaoFixa) / (1 - comissaoPercentual / 100)
      : precoSemComissao + comissaoFixa;
  const valorComissao = precoFinal - precoSemComissao;
  const lucroLiquido = precoFinal - valorComissao - custoTotal;

  return { ...base, custoTotal, custoComRisco, precoSemComissao, precoFinal, valorComissao, lucroLiquido };
}

function renderCalculadoraLivre() {
  const entrada = lerCalculadoraLivre();
  const r = calcularPrecificacaoLivre(entrada);

  const linhas = [
    ["Custo do material", r.custoMaterial],
    ["Custo de energia", r.custoEnergia],
    ["Depreciação da máquina", r.custoMaquina],
    ["Mão de obra própria", r.custoMaoObra],
  ];
  if (entrada.maoObraTerceiro > 0) linhas.push(["Mão de obra terceirizada", entrada.maoObraTerceiro]);
  if (entrada.itemAdicional > 0) linhas.push(["Item adicional", entrada.itemAdicional]);

  let html = linhas.map(([label, valor]) => `<div class="calc-linha"><span>${label}</span><span>${formatMoney(valor)}</span></div>`).join("");
  html += `<div class="calc-linha calc-subtotal"><span>Custo total</span><span>${formatMoney(r.custoTotal)}</span></div>`;
  html += `<div class="calc-linha"><span>Com risco de falha (${configuracoes?.taxa_risco_percentual ?? 0}%)</span><span>${formatMoney(r.custoComRisco)}</span></div>`;
  html += `<div class="calc-linha"><span>Preço sugerido (margem ${configuracoes?.margem_padrao_percentual ?? 0}%)</span><span>${formatMoney(r.precoSemComissao)}</span></div>`;
  if (entrada.comissaoPercentual > 0 || entrada.comissaoFixa > 0) {
    html += `<div class="calc-linha"><span>Comissão (${entrada.comissaoPercentual}% + ${formatMoney(entrada.comissaoFixa)})</span><span>${formatMoney(r.valorComissao)}</span></div>`;
  }
  html += `<div class="calc-linha calc-final"><span>Preço final de venda</span><span>${formatMoney(r.precoFinal)}</span></div>`;
  html += `<div class="calc-linha calc-lucro"><span>Lucro líquido estimado</span><span>${formatMoney(r.lucroLiquido)}</span></div>`;

  calcResultado.innerHTML = html;
}

async function salvarConsulta() {
  const entrada = lerCalculadoraLivre();
  const r = calcularPrecificacaoLivre(entrada);

  const descricao = prompt("Nome/descrição pra essa consulta (opcional):", "") || null;
  const material = materiais.find((m) => m.id === entrada.materialId);
  const canal = canaisVenda.find((c) => c.id === entrada.canalId);

  const payload = {
    descricao,
    material_id: entrada.materialId,
    material_nome: material ? material.nome : null,
    peso_gramas: entrada.pesoGramas || null,
    tempo_horas: entrada.tempoHoras || null,
    mao_obra_horas: entrada.maoObraHoras || null,
    mao_obra_terceiro: entrada.maoObraTerceiro || null,
    canal_venda_id: entrada.canalId,
    canal_venda_nome: canal ? canal.nome : null,
    comissao_percentual: entrada.comissaoPercentual || null,
    taxa_fixa_comissao: entrada.comissaoFixa || null,
    item_adicional: entrada.itemAdicional || null,
    custo_total: r.custoTotal,
    custo_com_risco: r.custoComRisco,
    preco_sem_comissao: r.precoSemComissao,
    preco_final: r.precoFinal,
    lucro_liquido: r.lucroLiquido,
    criado_por: currentUser.email,
  };

  const { error } = await db.from("consultas_calculadora").insert(payload);
  if (error) {
    alert("Erro ao salvar consulta: " + error.message);
    return;
  }
  await loadData();
}

function renderHistoricoConsultas() {
  if (consultasCalculadora.length === 0) {
    calcHistoricoEl.innerHTML = `<li class="column-empty">Nenhuma consulta salva ainda.</li>`;
    return;
  }
  calcHistoricoEl.innerHTML = consultasCalculadora
    .map(
      (c) => `<li data-id="${c.id}">
        <div class="calc-historico-info">
          <strong>${escapeHtml(c.descricao || c.material_nome || "Consulta")}</strong>
          <span>${formatDateTime(c.created_at)} · custo ${formatMoney(c.custo_total)} · preço final ${formatMoney(c.preco_final)} · lucro ${formatMoney(c.lucro_liquido)}</span>
        </div>
        <button type="button" class="carregar-consulta-btn ghost" title="Carregar de volta na calculadora">↩️</button>
        <button type="button" class="remover-consulta-btn" title="Excluir">×</button>
      </li>`
    )
    .join("");

  calcHistoricoEl.querySelectorAll(".carregar-consulta-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const consulta = consultasCalculadora.find((c) => c.id === btn.closest("li").dataset.id);
      if (consulta) carregarConsulta(consulta);
    })
  );
  calcHistoricoEl.querySelectorAll(".remover-consulta-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const id = btn.closest("li").dataset.id;
      await db.from("consultas_calculadora").delete().eq("id", id);
      await loadData();
    })
  );
}

function carregarConsulta(consulta) {
  calcMaterial.value = consulta.material_id || "";
  calcPeso.value = consulta.peso_gramas || "";
  calcTempo.value = consulta.tempo_horas || "";
  calcMaoObra.value = consulta.mao_obra_horas || "";
  calcTerceiro.value = consulta.mao_obra_terceiro || "";
  calcCanal.value = consulta.canal_venda_id || "";
  calcComissao.value = consulta.comissao_percentual || "";
  calcComissaoFixa.value = consulta.taxa_fixa_comissao || "";
  calcItemAdicional.value = consulta.item_adicional || "";
  renderCalculadoraLivre();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Formulário de pedido (criar/editar) ---------- */

function setField(row, field, value) {
  const el = row.querySelector(`[data-field="${field}"]`);
  if (el && value !== null && value !== undefined) el.value = value;
}

function populateMaterialSelect(select, selectedId) {
  select.innerHTML =
    '<option value="">— nenhum —</option>' +
    materiais.map((m) => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join("");
  if (selectedId) select.value = selectedId;
}

function populateProdutoSelect(select) {
  select.innerHTML =
    '<option value="">— selecionar —</option>' +
    produtos.map((p) => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join("");
}

function addItemRow(item) {
  const fragment = itemRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".item-row");
  row.dataset.id = item?.id || "";

  if (item) {
    for (const [key, value] of Object.entries(item)) {
      const field = row.querySelector(`[data-field="${key}"]`);
      if (field && value !== null && value !== undefined) field.value = value;
    }
  }

  const materialSelect = row.querySelector(".material-select");
  populateMaterialSelect(materialSelect, item?.material_id);
  materialSelect.addEventListener("change", () => {
    const mat = materiais.find((m) => m.id === materialSelect.value);
    if (mat) setField(row, "material", mat.nome);
  });

  const produtoSelect = row.querySelector(".produto-select");
  populateProdutoSelect(produtoSelect);
  produtoSelect.addEventListener("change", () => {
    const produto = produtos.find((p) => p.id === produtoSelect.value);
    produtoSelect.value = "";
    if (!produto) return;
    setField(row, "descricao", produto.descricao || produto.nome);
    setField(row, "cor", produto.cor);
    setField(row, "peso_gramas", produto.peso_gramas);
    setField(row, "tempo_estimado_horas", produto.tempo_estimado_horas);
    setField(row, "mao_obra_horas", produto.mao_obra_horas);
    setField(row, "valor", produto.preco_venda);
    const mat = materiais.find((m) => m.id === produto.material_id);
    setField(row, "material", mat ? mat.nome : "");
    materialSelect.value = produto.material_id || "";
  });

  const gcodeInput = row.querySelector(".gcode-input");
  row.querySelector(".gcode-btn").addEventListener("click", () => gcodeInput.click());
  gcodeInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    gcodeInput.value = "";
    if (file) await handleGcodeCarregado(file, row);
  });

  row.querySelector(".calc-btn").addEventListener("click", () => {
    const pesoGramas = Number(row.querySelector('[data-field="peso_gramas"]').value) || 0;
    const tempoHoras = Number(row.querySelector('[data-field="tempo_estimado_horas"]').value) || 0;
    const maoObraHoras = Number(row.querySelector('[data-field="mao_obra_horas"]').value) || 0;
    const materialId = materialSelect.value || null;

    if (!materialId) {
      alert("Selecione um material em \"Material p/ calcular custo\" antes de calcular.");
      return;
    }

    const r = calcularCusto({ pesoGramas, tempoHoras, maoObraHoras, materialId });
    setField(row, "valor", r.precoSugerido.toFixed(2));
    row.querySelector('[data-field="custo_calculado"]').value = r.custoComRisco.toFixed(2);
    const lucro = r.precoSugerido - r.custoComRisco;
    row.querySelector(".calc-breakdown").textContent =
      `Custo estimado: ${formatMoney(r.custoComRisco)} · Preço sugerido: ${formatMoney(r.precoSugerido)} · Lucro: ${formatMoney(lucro)}`;
  });

  row.querySelector(".save-produto-btn").addEventListener("click", async () => {
    const descricaoAtual = row.querySelector('[data-field="descricao"]').value.trim();
    const nome = prompt("Nome do produto para salvar no catálogo:", descricaoAtual);
    if (!nome) return;
    const payload = {
      nome,
      descricao: descricaoAtual || null,
      cor: row.querySelector('[data-field="cor"]').value.trim() || null,
      material_id: materialSelect.value || null,
      peso_gramas: row.querySelector('[data-field="peso_gramas"]').value
        ? Number(row.querySelector('[data-field="peso_gramas"]').value)
        : null,
      tempo_estimado_horas: row.querySelector('[data-field="tempo_estimado_horas"]').value
        ? Number(row.querySelector('[data-field="tempo_estimado_horas"]').value)
        : null,
      mao_obra_horas: row.querySelector('[data-field="mao_obra_horas"]').value
        ? Number(row.querySelector('[data-field="mao_obra_horas"]').value)
        : null,
      preco_venda: row.querySelector('[data-field="valor"]').value
        ? Number(row.querySelector('[data-field="valor"]').value)
        : null,
    };
    const { error } = await db.from("produtos").insert(payload);
    if (error) alert("Erro ao salvar produto: " + error.message);
    else await loadData();
  });

  const falhaBtn = row.querySelector(".falha-btn");
  if (item?.id) {
    falhaBtn.hidden = false;
    falhaBtn.addEventListener("click", () => registrarFalha(row, item));
  }

  row.querySelector(".remove-item-btn").addEventListener("click", () => row.remove());
  itensList.appendChild(row);
}

async function registrarFalha(row, item) {
  const motivo = prompt(
    "O que deu errado? (ex: entupimento, warping, deslocamento de camada)"
  );
  if (!motivo) return;
  if (!confirm("Isso marca este item como falha e cria uma nova ordem de reimpressão na fila. Confirma?")) return;

  const custoAtual = row.querySelector('[data-field="custo_calculado"]').value
    ? Number(row.querySelector('[data-field="custo_calculado"]').value)
    : item.custo_calculado || 0;

  const { error: e1 } = await db.from("falhas").insert({ item_id: item.id, motivo, custo_perdido: custoAtual });
  if (e1) {
    alert("Erro ao registrar falha: " + e1.message);
    return;
  }

  const { error: e2 } = await db.from("itens_pedido").update({ falhou: true }).eq("id", item.id);
  if (e2) {
    alert("Erro ao marcar item como falha: " + e2.message);
    return;
  }

  const reimpressao = {
    pedido_id: item.pedido_id,
    descricao: item.descricao,
    modelo_link: item.modelo_link,
    cor: item.cor,
    material: item.material,
    material_id: item.material_id,
    quantidade: item.quantidade,
    peso_gramas: item.peso_gramas,
    tempo_estimado_horas: item.tempo_estimado_horas,
    mao_obra_horas: item.mao_obra_horas,
    valor: item.valor,
    status: "fila",
    observacoes: "Reimpressão automática após falha: " + motivo,
  };
  const { error: e3 } = await db.from("itens_pedido").insert(reimpressao);
  if (e3) {
    alert("Erro ao criar a reimpressão: " + e3.message);
    return;
  }

  alert("Falha registrada e reimpressão adicionada à fila.");
  orderDialog.close();
  await loadData();
}

function openOrderDialog(pedido) {
  orderForm.reset();
  orderError.hidden = true;
  orderForm.dataset.id = pedido ? pedido.id : "";
  orderDialogTitle.textContent = pedido ? "Editar pedido" : "Novo pedido";
  deleteOrderBtn.hidden = !pedido;
  pdfOrderBtn.hidden = !pedido;
  whatsappOrderBtn.hidden = !pedido;
  trackingLinkBtn.hidden = !pedido;
  trackingLinkBtn.dataset.token = pedido?.token_publico || "";

  const totalPedido = (pedido?.itens || []).reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const saldoDevido = totalPedido - (Number(pedido?.valor_sinal) || 0);
  pixOrderBtn.hidden = !pedido || saldoDevido <= 0;
  pixOrderBtn.dataset.saldo = saldoDevido > 0 ? saldoDevido.toFixed(2) : "";
  pixOrderBtn.dataset.clienteNome = pedido?.cliente?.nome || "";
  itensList.innerHTML = "";
  anexosListEl.innerHTML = "";
  anexoInput.value = "";
  anexosPendentes = [];
  anexosParaExcluir = [];

  if (pedido) {
    orderForm.elements.namedItem("cliente_nome").value = pedido.cliente?.nome || "";
    orderForm.elements.namedItem("cliente_contato").value = pedido.cliente?.contato || "";
    for (const key of ["prioridade", "origem", "prazo_entrega", "pagamento", "valor_sinal", "numero_parcelas", "observacoes"]) {
      const field = orderForm.elements.namedItem(key);
      if (field && pedido[key] !== null && pedido[key] !== undefined) field.value = pedido[key];
    }
    for (const item of pedido.itens || []) addItemRow(item);
    for (const anexo of pedido.anexos || []) renderAnexoRow(anexo);
  } else {
    addItemRow(null);
  }

  orderDialog.showModal();
}

function renderAnexoRow(anexo) {
  const li = document.createElement("li");
  li.textContent = anexo.nome_arquivo + " ";
  const link = document.createElement("a");
  link.textContent = "abrir";
  link.target = "_blank";
  link.rel = "noopener";
  db.storage
    .from(ANEXOS_BUCKET)
    .createSignedUrl(anexo.storage_path, 3600)
    .then(({ data }) => {
      if (data) link.href = data.signedUrl;
    });
  li.appendChild(link);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "×";
  removeBtn.title = "Remover anexo";
  removeBtn.addEventListener("click", () => {
    anexosParaExcluir.push(anexo);
    li.remove();
  });
  li.appendChild(removeBtn);

  anexosListEl.appendChild(li);
}

function handleAnexoSelected(e) {
  for (const file of e.target.files) {
    anexosPendentes.push(file);
    const li = document.createElement("li");
    li.textContent = `${file.name} (a enviar) `;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.title = "Cancelar envio";
    removeBtn.addEventListener("click", () => {
      anexosPendentes = anexosPendentes.filter((f) => f !== file);
      li.remove();
    });
    li.appendChild(removeBtn);

    anexosListEl.appendChild(li);
  }
  anexoInput.value = "";
}

async function resolverCliente(nome, contato) {
  const existente = clientes.find((c) => c.nome.trim().toLowerCase() === nome.trim().toLowerCase());
  if (existente) {
    if (contato && contato !== existente.contato) {
      await db.from("clientes").update({ contato }).eq("id", existente.id);
    }
    return existente.id;
  }
  const { data, error } = await db.from("clientes").insert({ nome, contato: contato || null }).select().single();
  if (error) throw error;
  return data.id;
}

async function handleSaveOrder(e) {
  e.preventDefault();
  orderError.hidden = true;

  const itemRows = [...itensList.querySelectorAll(".item-row")];
  if (itemRows.length === 0) {
    orderError.textContent = "Adicione pelo menos um item ao pedido.";
    orderError.hidden = false;
    return;
  }

  try {
    const formData = new FormData(orderForm);
    const clienteNome = formData.get("cliente_nome").trim();
    const clienteContato = formData.get("cliente_contato").trim();
    if (!clienteNome) {
      orderError.textContent = "Informe o nome do cliente.";
      orderError.hidden = false;
      return;
    }
    const clienteId = await resolverCliente(clienteNome, clienteContato);

    const pedidoPayload = {
      cliente_id: clienteId,
      prioridade: formData.get("prioridade"),
      origem: formData.get("origem").trim() || null,
      prazo_entrega: formData.get("prazo_entrega") || null,
      pagamento: formData.get("pagamento"),
      valor_sinal: formData.get("valor_sinal") ? Number(formData.get("valor_sinal")) : null,
      numero_parcelas: Number(formData.get("numero_parcelas")) || 1,
      observacoes: formData.get("observacoes").trim() || null,
    };

    const pedidoId = orderForm.dataset.id;
    let novoPedidoId = pedidoId;

    if (pedidoId) {
      const { error } = await db.from("pedidos").update(pedidoPayload).eq("id", pedidoId);
      if (error) throw error;
    } else {
      pedidoPayload.criado_por = currentUser.email;
      const { data, error } = await db.from("pedidos").insert(pedidoPayload).select().single();
      if (error) throw error;
      novoPedidoId = data.id;
    }

    const idsAtuais = [];
    let totalPedido = 0;
    for (const row of itemRows) {
      const itemPayload = {
        pedido_id: novoPedidoId,
        descricao: row.querySelector('[data-field="descricao"]').value.trim(),
        modelo_link: row.querySelector('[data-field="modelo_link"]').value.trim() || null,
        cor: row.querySelector('[data-field="cor"]').value.trim() || null,
        material: row.querySelector('[data-field="material"]').value.trim() || null,
        material_id: row.querySelector('[data-field="material_id"]').value || null,
        quantidade: Number(row.querySelector('[data-field="quantidade"]').value) || 1,
        peso_gramas: row.querySelector('[data-field="peso_gramas"]').value
          ? Number(row.querySelector('[data-field="peso_gramas"]').value)
          : null,
        tempo_estimado_horas: row.querySelector('[data-field="tempo_estimado_horas"]').value
          ? Number(row.querySelector('[data-field="tempo_estimado_horas"]').value)
          : null,
        mao_obra_horas: row.querySelector('[data-field="mao_obra_horas"]').value
          ? Number(row.querySelector('[data-field="mao_obra_horas"]').value)
          : null,
        valor: row.querySelector('[data-field="valor"]').value
          ? Number(row.querySelector('[data-field="valor"]').value)
          : null,
        custo_calculado: row.querySelector('[data-field="custo_calculado"]').value
          ? Number(row.querySelector('[data-field="custo_calculado"]').value)
          : null,
        status: row.querySelector('[data-field="status"]').value,
        observacoes: row.querySelector('[data-field="observacoes"]').value.trim() || null,
      };
      totalPedido += Number(itemPayload.valor) || 0;

      if (row.dataset.id) {
        const { error } = await db.from("itens_pedido").update(itemPayload).eq("id", row.dataset.id);
        if (error) throw error;
        idsAtuais.push(row.dataset.id);

        const itemOriginal = pedidos.flatMap((p) => p.itens || []).find((i) => i.id === row.dataset.id);
        await baixarEstoqueSeNecessario({
          itemId: row.dataset.id,
          statusAnterior: itemOriginal?.status,
          statusNovo: itemPayload.status,
          materialId: itemPayload.material_id,
          pesoGramas: itemPayload.peso_gramas,
          quantidade: itemPayload.quantidade,
          jaBaixado: itemOriginal?.estoque_baixado,
        });
      } else {
        const { data, error } = await db.from("itens_pedido").insert(itemPayload).select().single();
        if (error) throw error;
        idsAtuais.push(data.id);

        await baixarEstoqueSeNecessario({
          itemId: data.id,
          statusAnterior: "recebido",
          statusNovo: itemPayload.status,
          materialId: itemPayload.material_id,
          pesoGramas: itemPayload.peso_gramas,
          quantidade: itemPayload.quantidade,
          jaBaixado: false,
        });
      }
    }

    if (pedidoId) {
      const pedidoOriginal = pedidos.find((p) => p.id === pedidoId);
      const idsRemovidos = (pedidoOriginal?.itens || [])
        .map((i) => i.id)
        .filter((id) => !idsAtuais.includes(id));
      if (idsRemovidos.length > 0) {
        await db.from("itens_pedido").delete().in("id", idsRemovidos);
      }
    }

    for (const anexo of anexosParaExcluir) {
      await db.storage.from(ANEXOS_BUCKET).remove([anexo.storage_path]);
      await db.from("anexos").delete().eq("id", anexo.id);
    }

    for (const file of anexosPendentes) {
      const nomeSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${novoPedidoId}/${crypto.randomUUID()}-${nomeSeguro}`;
      const { error: uploadError } = await db.storage.from(ANEXOS_BUCKET).upload(path, file);
      if (uploadError) throw uploadError;
      await db.from("anexos").insert({ pedido_id: novoPedidoId, nome_arquivo: file.name, storage_path: path });
    }

    try {
      await sincronizarMovimentosDoPedido({
        pedidoId: novoPedidoId,
        clienteNome,
        total: totalPedido,
        sinal: Number(pedidoPayload.valor_sinal) || 0,
        pagamento: pedidoPayload.pagamento,
        prazoEntrega: pedidoPayload.prazo_entrega,
        numeroParcelas: pedidoPayload.numero_parcelas,
      });
    } catch (errFin) {
      // O pedido já foi salvo — não bloqueia o fluxo principal por um problema no espelhamento
      // financeiro, só avisa (o operador pode conferir/corrigir na aba Financeiro depois).
      console.error("Falha ao sincronizar lançamentos financeiros do pedido:", errFin);
    }

    orderDialog.close();
    await loadData();
  } catch (err) {
    orderError.textContent = "Erro ao salvar: " + err.message;
    orderError.hidden = false;
  }
}

async function handleDeleteOrder() {
  const id = orderForm.dataset.id;
  if (!id) return;
  if (!confirm("Excluir este pedido e todos os seus itens? Essa ação não pode ser desfeita.")) return;

  const pedido = pedidos.find((p) => p.id === id);
  for (const anexo of pedido?.anexos || []) {
    await db.storage.from(ANEXOS_BUCKET).remove([anexo.storage_path]);
  }

  // O saldo ainda não recebido deixa de fazer sentido (não há mais pedido pra cobrar). O sinal
  // já recebido fica registrado — é dinheiro que já entrou de verdade — só perde o vínculo com
  // o pedido (pedido_id vira nulo automaticamente, por causa do ON DELETE SET NULL no banco).
  await db.from("movimentos").delete().eq("pedido_id", id).eq("origem", "pedido_saldo").eq("status", "previsto");

  const { error } = await db.from("pedidos").delete().eq("id", id);
  if (error) {
    orderError.textContent = "Erro ao excluir: " + error.message;
    orderError.hidden = false;
    return;
  }
  orderDialog.close();
  await loadData();
}

/* ---------- Orçamento em PDF e WhatsApp ---------- */

function gatherOrderSnapshot() {
  const formData = new FormData(orderForm);
  const itemRows = [...itensList.querySelectorAll(".item-row")];
  const itens = itemRows
    .map((row) => ({
      descricao: row.querySelector('[data-field="descricao"]').value.trim(),
      quantidade: Number(row.querySelector('[data-field="quantidade"]').value) || 1,
      valor: row.querySelector('[data-field="valor"]').value
        ? Number(row.querySelector('[data-field="valor"]').value)
        : 0,
    }))
    .filter((i) => i.descricao);

  return {
    clienteNome: formData.get("cliente_nome").trim(),
    clienteContato: formData.get("cliente_contato").trim(),
    prazoEntrega: formData.get("prazo_entrega"),
    valorSinal: formData.get("valor_sinal") ? Number(formData.get("valor_sinal")) : 0,
    itens,
  };
}

function gerarOrcamentoPdf() {
  const snap = gatherOrderSnapshot();
  if (snap.itens.length === 0) {
    alert("Adicione pelo menos um item antes de gerar o orçamento.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.text(configuracoes?.nome_loja || "IQUE 3D Studio", 14, y);
  y += 8;
  doc.setFontSize(11);
  doc.text("Orçamento", 14, y);
  y += 8;
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, y);
  y += 6;
  doc.text(`Cliente: ${snap.clienteNome}`, 14, y);
  y += 6;
  if (snap.clienteContato) {
    doc.text(`Contato: ${snap.clienteContato}`, 14, y);
    y += 6;
  }
  if (snap.prazoEntrega) {
    doc.text(`Prazo de entrega: ${formatDate(snap.prazoEntrega)}`, 14, y);
    y += 6;
  }

  y += 4;
  doc.setFontSize(11);
  doc.text("Item", 14, y);
  doc.text("Qtd", 130, y);
  doc.text("Valor", 160, y);
  y += 2;
  doc.line(14, y, 196, y);
  y += 6;

  let total = 0;
  for (const item of snap.itens) {
    doc.text(item.descricao.slice(0, 60), 14, y);
    doc.text(String(item.quantidade), 130, y);
    doc.text(formatMoney(item.valor || 0), 160, y);
    total += Number(item.valor) || 0;
    y += 7;
  }

  y += 2;
  doc.line(14, y, 196, y);
  y += 8;
  doc.setFontSize(12);
  doc.text(`Total: ${formatMoney(total)}`, 14, y);
  y += 7;

  if (snap.valorSinal) {
    doc.text(`Sinal: ${formatMoney(snap.valorSinal)}`, 14, y);
    y += 7;
    doc.text(`Saldo: ${formatMoney(total - snap.valorSinal)}`, 14, y);
    y += 7;
  }

  doc.save(`orcamento-${(snap.clienteNome || "pedido").replace(/\s+/g, "-")}.pdf`);
}

function enviarWhatsapp() {
  const snap = gatherOrderSnapshot();
  if (snap.itens.length === 0) {
    alert("Adicione pelo menos um item antes de enviar.");
    return;
  }

  const total = snap.itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  let msg = `Olá ${snap.clienteNome}! Segue o orçamento:\n\n`;
  for (const item of snap.itens) {
    msg += `• ${item.descricao} (x${item.quantidade}) — ${formatMoney(item.valor || 0)}\n`;
  }
  msg += `\nTotal: ${formatMoney(total)}`;
  if (snap.prazoEntrega) msg += `\nPrazo: ${formatDate(snap.prazoEntrega)}`;
  if (snap.valorSinal) {
    msg += `\nSinal: ${formatMoney(snap.valorSinal)}`;
    msg += `\nSaldo: ${formatMoney(total - snap.valorSinal)}`;
  }

  const numero = (snap.clienteContato || "").replace(/\D/g, "");
  const numeroCompleto = numero ? (numero.length <= 11 ? "55" + numero : numero) : "";
  const url = numeroCompleto
    ? `https://wa.me/${numeroCompleto}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

async function copiarLinkAcompanhamento() {
  const token = trackingLinkBtn.dataset.token;
  if (!token) return;
  const link = `${location.origin}/loja3d/acompanhar.html?t=${token}`;
  try {
    await navigator.clipboard.writeText(link);
    alert("Link copiado! É só colar na conversa com o cliente:\n\n" + link);
  } catch {
    prompt("Copie o link abaixo para mandar ao cliente:", link);
  }
}

/* ---------- Pix: QR Code estático "copia e cola" por pedido ---------- */
// Payload gerado 100% no navegador, seguindo o padrão BR Code do Banco Central (o mesmo
// formato que qualquer banco/carteira lê) — não chama nenhuma API externa nem depende de
// nenhum provedor de pagamento. É estático (valor fixo, sem confirmação automática): a baixa
// de quando o cliente paga continua manual, marcando o lançamento como realizado.

function sanitizarTextoPix(texto, maxLen) {
  const semAcento = (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const limpo = semAcento
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .toUpperCase();
  return (limpo.slice(0, maxLen) || "NA").trim() || "NA";
}

function campoPix(id, valor) {
  const tamanho = String(valor.length).padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

// CRC-16/CCITT-FALSE (poli 0x1021, início 0xFFFF) — o mesmo algoritmo exigido pelo padrão
// BR Code. Testado contra o vetor de verificação padrão da família CRC-16/CCITT-FALSE:
// crc16Pix("123456789") deve dar "29B1".
function crc16Pix(texto) {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function gerarPayloadPix({ chave, nomeLoja, cidade, valor, txid }) {
  const merchantAccountInfo = campoPix("00", "br.gov.bcb.pix") + campoPix("01", chave.trim());
  const nome = sanitizarTextoPix(nomeLoja, 25);
  const cidadeSanitizada = sanitizarTextoPix(cidade, 15);
  const txidSanitizado = sanitizarTextoPix(txid, 25).replace(/\s/g, "");

  let payload =
    campoPix("00", "01") +
    campoPix("01", "11") +
    campoPix("26", merchantAccountInfo) +
    campoPix("52", "0000") +
    campoPix("53", "986") +
    campoPix("54", Number(valor).toFixed(2)) +
    campoPix("58", "BR") +
    campoPix("59", nome) +
    campoPix("60", cidadeSanitizada) +
    campoPix("62", campoPix("05", txidSanitizado));

  payload += "6304";
  return payload + crc16Pix(payload);
}

async function openPixDialog() {
  pixError.hidden = true;
  pixPayloadText.value = "";
  const ctx = pixQrcodeCanvas.getContext("2d");
  ctx.clearRect(0, 0, pixQrcodeCanvas.width, pixQrcodeCanvas.height);

  if (!configuracoes?.chave_pix) {
    pixError.textContent = "Cadastre sua chave Pix em ⚙ Configurações antes de gerar a cobrança.";
    pixError.hidden = false;
    pixDialog.showModal();
    return;
  }

  const saldo = Number(pixOrderBtn.dataset.saldo) || 0;
  const clienteNome = pixOrderBtn.dataset.clienteNome || "";
  pixValorLabel.textContent = `${clienteNome} — ${formatMoney(saldo)}`;

  const payload = gerarPayloadPix({
    chave: configuracoes.chave_pix,
    nomeLoja: configuracoes.nome_loja || "IQUE 3D",
    cidade: configuracoes.cidade || "",
    valor: saldo,
    txid: orderForm.dataset.id || "PEDIDO",
  });
  pixPayloadText.value = payload;

  pixDialog.showModal();

  try {
    await QRCode.toCanvas(pixQrcodeCanvas, payload, { width: 240, margin: 1 });
  } catch (err) {
    pixError.textContent = "Não foi possível gerar o QR Code visual, mas o código abaixo funciona igual — copia e cola no app do seu cliente pedir pra ele colar. (" + err.message + ")";
    pixError.hidden = false;
  }
}

async function copiarPayloadPix() {
  if (!pixPayloadText.value) return;
  try {
    await navigator.clipboard.writeText(pixPayloadText.value);
    alert("Código Pix copiado! Cole na conversa com o cliente ou peça pra ele colar no \"Pix Copia e Cola\" do banco dele.");
  } catch {
    pixPayloadText.select();
  }
}
