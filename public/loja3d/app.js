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
let insumos = [];
let rolos = [];
let movimentosEstoque = [];
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
const inicioDashboardEl = document.getElementById("inicio-dashboard");
const chartFaturamentoCanvas = document.getElementById("chart-faturamento-mensal");
const chartDespesasCanvas = document.getElementById("chart-despesas-categoria");
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

const estoqueSubtabButtons = document.querySelectorAll(".estoque-subtab-btn");
const insumosListEl = document.getElementById("insumos-list");
const insumoBuscaInput = document.getElementById("insumo-busca");
const insumoFiltroCategoria = document.getElementById("insumo-filtro-categoria");
const novoInsumoBtn = document.getElementById("novo-insumo-btn");
const insumoDialog = document.getElementById("insumo-dialog");
const insumoForm = document.getElementById("insumo-form");
const insumoDialogTitle = document.getElementById("insumo-dialog-title");
const insumoError = document.getElementById("insumo-error");
const insumoCategoriaSelect = document.getElementById("insumo-categoria-select");
const insumoFilamentoFields = document.getElementById("insumo-filamento-fields");
const closeInsumoBtn = document.getElementById("close-insumo-btn");
const cancelInsumoBtn = document.getElementById("cancel-insumo-btn");
const deleteInsumoBtn = document.getElementById("delete-insumo-btn");

const rolosListEl = document.getElementById("rolos-list");
const roloBuscaInput = document.getElementById("rolo-busca");
const roloFiltroStatus = document.getElementById("rolo-filtro-status");
const novoRoloBtn = document.getElementById("novo-rolo-btn");
const roloDialog = document.getElementById("rolo-dialog");
const roloForm = document.getElementById("rolo-form");
const roloError = document.getElementById("rolo-error");
const roloInsumoSelect = document.getElementById("rolo-insumo-select");
const roloIdCurtoInput = document.getElementById("rolo-id-curto-input");
const closeRoloBtn = document.getElementById("close-rolo-btn");
const cancelRoloBtn = document.getElementById("cancel-rolo-btn");

const movimentosEstoqueListEl = document.getElementById("movimentos-estoque-list");
const movEstoqueFiltroInsumo = document.getElementById("mov-estoque-filtro-insumo");
const movEstoqueFiltroTipo = document.getElementById("mov-estoque-filtro-tipo");
const novoMovimentoEstoqueBtn = document.getElementById("novo-movimento-estoque-btn");
const movimentoEstoqueDialog = document.getElementById("movimento-estoque-dialog");
const movimentoEstoqueForm = document.getElementById("movimento-estoque-form");
const movimentoEstoqueError = document.getElementById("movimento-estoque-error");
const movimentoEstoqueTipoSelect = document.getElementById("movimento-estoque-tipo-select");
const movimentoEstoqueInsumoSelect = document.getElementById("movimento-estoque-insumo-select");
const movimentoEstoqueRoloSelect = document.getElementById("movimento-estoque-rolo-select");
const movimentoEstoqueRoloLabel = document.getElementById("movimento-estoque-rolo-label");
const movimentoEstoqueQuantidadeSimples = document.getElementById("movimento-estoque-quantidade-simples");
const movimentoEstoqueQuantidadeInput = document.getElementById("movimento-estoque-quantidade-input");
const movimentoEstoqueCustoLabel = document.getElementById("movimento-estoque-custo-label");
const movimentoEstoqueAjusteRolo = document.getElementById("movimento-estoque-ajuste-rolo");
const ajusteModoSelect = document.getElementById("ajuste-modo-select");
const ajusteValorInput = document.getElementById("ajuste-valor-input");
const ajusteValorLabel = document.getElementById("ajuste-valor-label");
const ajustePreview = document.getElementById("ajuste-preview");
const closeMovimentoEstoqueBtn = document.getElementById("close-movimento-estoque-btn");
const cancelMovimentoEstoqueBtn = document.getElementById("cancel-movimento-estoque-btn");

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
  if (!document.getElementById("tab-inicio").hidden) renderInicio();
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

  novoInsumoBtn.addEventListener("click", () => openInsumoDialog(null));
  cancelInsumoBtn.addEventListener("click", () => insumoDialog.close());
  closeInsumoBtn.addEventListener("click", () => insumoDialog.close());
  insumoForm.addEventListener("submit", handleSaveInsumo);
  deleteInsumoBtn.addEventListener("click", handleDeleteInsumo);
  insumoCategoriaSelect.addEventListener("change", atualizarCamposFilamentoInsumo);
  insumoBuscaInput.addEventListener("input", renderInsumosList);
  insumoFiltroCategoria.addEventListener("change", renderInsumosList);

  novoRoloBtn.addEventListener("click", openRoloDialog);
  cancelRoloBtn.addEventListener("click", () => roloDialog.close());
  closeRoloBtn.addEventListener("click", () => roloDialog.close());
  roloForm.addEventListener("submit", handleSaveRolo);
  roloBuscaInput.addEventListener("input", renderRolosList);
  roloFiltroStatus.addEventListener("change", renderRolosList);

  novoMovimentoEstoqueBtn.addEventListener("click", () => openMovimentoEstoqueDialog());
  cancelMovimentoEstoqueBtn.addEventListener("click", () => movimentoEstoqueDialog.close());
  closeMovimentoEstoqueBtn.addEventListener("click", () => movimentoEstoqueDialog.close());
  movimentoEstoqueForm.addEventListener("submit", handleSaveMovimentoEstoque);
  movimentoEstoqueTipoSelect.addEventListener("change", atualizarFormularioMovimentoEstoque);
  movimentoEstoqueInsumoSelect.addEventListener("change", atualizarFormularioMovimentoEstoque);
  movimentoEstoqueRoloSelect.addEventListener("change", atualizarFormularioMovimentoEstoque);
  ajusteModoSelect.addEventListener("change", atualizarPreviewAjuste);
  ajusteValorInput.addEventListener("input", atualizarPreviewAjuste);
  movEstoqueFiltroInsumo.addEventListener("change", renderMovimentosEstoqueList);
  movEstoqueFiltroTipo.addEventListener("change", renderMovimentosEstoqueList);
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
      if (btn.dataset.tab === "inicio") renderInicio();
      if (btn.dataset.tab === "painel") renderDashboard();
      if (btn.dataset.tab === "financeiro") renderFinanceiroAtivo();
      if (btn.dataset.tab === "estoque") renderEstoqueAtivo();
      if (btn.dataset.tab === "calculadora") {
        populateMaterialSelect(calcMaterial);
        populateCanalSelect();
        renderCalculadoraLivre();
        renderHistoricoConsultas();
      }
    })
  );

  estoqueSubtabButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      estoqueSubtabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".estoque-subpanel").forEach((panel) => {
        panel.hidden = panel.id !== `subtab-estoque-${btn.dataset.subtabEstoque}`;
      });
      renderEstoqueAtivo();
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
    { data: insumosData, error: eIns },
    { data: rolosData, error: eRolos },
    { data: movimentosEstoqueData, error: eMovEstoque },
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
    db.from("insumos").select("*").order("nome"),
    db.from("rolos").select("*").order("created_at", { ascending: false }),
    db.from("movimentos_estoque").select("*").order("data_movimento", { ascending: false }),
  ]);

  for (const e of [eCli, ePed, eMat, eProd, eCfg, eMaq, eFal, eCanal, eCons, eContas, eCategorias, eMov, eDespesas, eIns, eRolos, eMovEstoque])
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
  insumos = insumosData || [];
  rolos = rolosData || [];
  movimentosEstoque = movimentosEstoqueData || [];

  clientesOptions.innerHTML = clientes.map((c) => `<option value="${escapeHtml(c.nome)}"></option>`).join("");
  atualizarBrandMarks();

  renderBoard();
  if (!document.getElementById("tab-inicio").hidden) renderInicio();
  if (!document.getElementById("tab-painel").hidden) renderDashboard();
  if (!document.getElementById("tab-financeiro").hidden) renderFinanceiroAtivo();
  if (!document.getElementById("tab-estoque").hidden) renderEstoqueAtivo();
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
    .on("postgres_changes", { event: "*", schema: "public", table: "insumos" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "rolos" }, scheduleRefetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "movimentos_estoque" }, scheduleRefetch)
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
    pedidoId: item.pedido_id,
    statusAnterior: item.status,
    statusNovo: novoStatus,
    materialId: item.material_id,
    roloId: item.rolo_id,
    pesoGramas: item.peso_gramas,
    quantidade: item.quantidade,
    jaBaixado: item.estoque_baixado,
  });
}

// Desconta do estoque assim que o item cruza, pela primeira vez, a fronteira de "já foi
// impresso" — funciona tanto vindo dos botões ◀▶ quanto do formulário de edição. Dois sistemas
// convivem aqui: o "materiais" antigo (saldo agregado, por material_id) e o rolo individual novo
// (peso próprio, por rolo_id) — cada um só roda se o item tiver o respectivo campo preenchido,
// então um pedido sem rolo escolhido continua se comportando exatamente como antes.
async function baixarEstoqueSeNecessario({ itemId, pedidoId, statusAnterior, statusNovo, materialId, roloId, pesoGramas, quantidade, jaBaixado }) {
  if (jaBaixado) return;
  if (!STATUS_PRE_IMPRESSAO.includes(statusAnterior) || STATUS_PRE_IMPRESSAO.includes(statusNovo)) return;
  if (!pesoGramas || (!materialId && !roloId)) return;

  const consumoGramas = Number(pesoGramas) * (Number(quantidade) || 1);

  if (materialId) {
    const material = materiais.find((m) => m.id === materialId);
    if (material) {
      await db
        .from("materiais")
        .update({ saldo_gramas: (Number(material.saldo_gramas) || 0) - consumoGramas })
        .eq("id", materialId);
    }
  }

  if (roloId) {
    const rolo = rolos.find((r) => r.id === roloId);
    if (rolo) {
      const novoPeso = Number(rolo.peso_atual_g) - consumoGramas;
      await db
        .from("rolos")
        .update({ peso_atual_g: novoPeso, status: statusRoloPorPeso(novoPeso, rolo.peso_inicial_g, rolo.status) })
        .eq("id", rolo.id);
      await db.from("movimentos_estoque").insert({
        insumo_id: rolo.insumo_id,
        rolo_id: rolo.id,
        tipo: "saida_job",
        quantidade: -consumoGramas,
        pedido_id: pedidoId || null,
        data_movimento: new Date().toISOString().slice(0, 10),
      });
    }
  }

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

/* ---------- Início (home) ---------- */
// Painel de abertura do app: números que respondem "como estamos" numa olhada — caixa, venda do
// mês, a receber — mais dois gráficos (entra x sai) pra dar contexto histórico sem precisar
// entrar no Financeiro. Os dados vêm dos mesmos `movimentos`/`pedidos` já carregados por
// loadData(), sem nenhuma consulta extra.

let chartFaturamentoInstance = null;
let chartDespesasInstance = null;

function corTema(nomeVar) {
  return getComputedStyle(document.documentElement).getPropertyValue(nomeVar).trim();
}

function ultimosNMeses(n) {
  const meses = [];
  const hoje = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const rotulo = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    meses.push({ chave: d.toISOString().slice(0, 7), rotulo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1) });
  }
  return meses;
}

// "Receita de verdade": entrada já realizada, nunca conta transferência entre contas próprias
// como se fosse venda — mesma regra usada no cálculo do teto MEI.
function ehMovimentoDeReceita(m) {
  return m.tipo === "entrada" && m.status === "realizado" && m.origem !== "transferencia";
}
function ehMovimentoDeDespesa(m) {
  return m.tipo === "saida" && m.status === "realizado" && m.origem !== "transferencia";
}

function renderInicio() {
  const saldos = calcularSaldosContas();
  const caixaTotal = Object.values(saldos).reduce((s, v) => s + v, 0);

  const mesAtual = new Date().toISOString().slice(0, 7);
  const faturamentoMes = movimentos
    .filter((m) => ehMovimentoDeReceita(m) && (m.data_movimento || "").startsWith(mesAtual))
    .reduce((s, m) => s + Number(m.valor), 0);

  const vendasMes = pedidos.filter((p) => (p.created_at || "").startsWith(mesAtual)).length;
  const ticketMedio = vendasMes > 0 ? faturamentoMes / vendasMes : 0;

  const aReceber = movimentos
    .filter((m) => m.status === "previsto" && m.tipo === "entrada")
    .reduce((s, m) => s + Number(m.valor), 0);

  const stats = [
    { label: "Caixa total", value: formatMoney(caixaTotal) },
    { label: "Faturamento do mês", value: formatMoney(faturamentoMes) },
    { label: "Vendas do mês", value: vendasMes },
    { label: "Ticket médio do mês", value: formatMoney(ticketMedio) },
    { label: "A receber", value: formatMoney(aReceber) },
  ];

  inicioDashboardEl.innerHTML = stats
    .map((s) => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`)
    .join("");

  renderChartFaturamentoMensal();
  renderChartDespesasCategoria(mesAtual);
}

function renderChartFaturamentoMensal() {
  if (typeof Chart === "undefined" || !chartFaturamentoCanvas) return;

  const meses = ultimosNMeses(6);
  const valores = meses.map((m) =>
    movimentos
      .filter((mv) => ehMovimentoDeReceita(mv) && (mv.data_movimento || "").startsWith(m.chave))
      .reduce((s, mv) => s + Number(mv.valor), 0)
  );

  const corTexto = corTema("--muted");
  const corGrade = corTema("--border");

  chartFaturamentoInstance?.destroy();
  chartFaturamentoInstance = new Chart(chartFaturamentoCanvas, {
    type: "bar",
    data: {
      labels: meses.map((m) => m.rotulo),
      datasets: [{ label: "Faturamento", data: valores, backgroundColor: corTema("--chart-receita"), borderRadius: 4, maxBarThickness: 28 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => formatMoney(ctx.parsed.y) } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: corTexto } },
        y: { beginAtZero: true, grid: { color: corGrade }, ticks: { color: corTexto, callback: (v) => formatMoney(v) } },
      },
    },
  });
}

function renderChartDespesasCategoria(mesAtual) {
  if (typeof Chart === "undefined" || !chartDespesasCanvas) return;

  const porCategoria = new Map();
  for (const m of movimentos) {
    if (!ehMovimentoDeDespesa(m) || !(m.data_movimento || "").startsWith(mesAtual)) continue;
    const nome = categoriasFinanceiras.find((c) => c.id === m.categoria_id)?.nome || "Sem categoria";
    porCategoria.set(nome, (porCategoria.get(nome) || 0) + Number(m.valor));
  }

  const TOP = 5;
  const ranking = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);
  const principais = ranking.slice(0, TOP);
  const restante = ranking.slice(TOP).reduce((s, [, v]) => s + v, 0);
  if (restante > 0) principais.push(["Outras", restante]);

  chartDespesasInstance?.destroy();
  chartDespesasCanvas.parentElement.querySelector(".chart-empty")?.remove();

  if (principais.length === 0) {
    chartDespesasCanvas.style.display = "none";
    const vazio = document.createElement("p");
    vazio.className = "chart-empty";
    vazio.textContent = "Nenhuma despesa registrada este mês ainda.";
    chartDespesasCanvas.after(vazio);
    return;
  }
  chartDespesasCanvas.style.display = "";

  const corTexto = corTema("--muted");
  const corGrade = corTema("--border");

  chartDespesasInstance = new Chart(chartDespesasCanvas, {
    type: "bar",
    data: {
      labels: principais.map(([nome]) => nome),
      datasets: [{ label: "Despesas", data: principais.map(([, v]) => v), backgroundColor: corTema("--chart-despesa"), borderRadius: 4, maxBarThickness: 22 }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => formatMoney(ctx.parsed.x) } },
      },
      scales: {
        x: { beginAtZero: true, grid: { color: corGrade }, ticks: { color: corTexto, callback: (v) => formatMoney(v) } },
        y: { grid: { display: false }, ticks: { color: corTexto } },
      },
    },
  });
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

// Só rolos com peso útil (ativo/quase_vazio) aparecem — vazio/descartado não fazem sentido
// escolher pra um job novo.
function populateRoloSelectItem(select, selectedId) {
  const disponiveis = rolos.filter((r) => r.status === "ativo" || r.status === "quase_vazio");
  select.innerHTML =
    '<option value="">— Nenhum —</option>' +
    disponiveis
      .map((r) => {
        const insumo = insumos.find((i) => i.id === r.insumo_id);
        return `<option value="${r.id}">${escapeHtml(insumo?.nome || "insumo")} — ${escapeHtml(r.id_curto)} (${Number(r.peso_atual_g).toLocaleString("pt-BR")}g)</option>`;
      })
      .join("");
  if (selectedId) select.value = selectedId;
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

  const roloSelect = row.querySelector(".rolo-select");
  populateRoloSelectItem(roloSelect, item?.rolo_id);

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
        rolo_id: row.querySelector('[data-field="rolo_id"]').value || null,
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
          pedidoId: itemPayload.pedido_id,
          statusAnterior: itemOriginal?.status,
          statusNovo: itemPayload.status,
          materialId: itemPayload.material_id,
          roloId: itemPayload.rolo_id,
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
          pedidoId: itemPayload.pedido_id,
          statusAnterior: "recebido",
          statusNovo: itemPayload.status,
          materialId: itemPayload.material_id,
          roloId: itemPayload.rolo_id,
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

/* ---------- Estoque: insumos, rolos rastreáveis e ledger de movimentação ---------- */
// Arquitetura: "insumos" é o catálogo (o que é), "rolos" são as instâncias físicas rastreáveis
// de um insumo — hoje sobretudo filamento, cada rolo comprado vira uma linha com peso próprio —
// e "movimentos_estoque" é o ledger: todo entra/sai é uma linha nova, nunca um saldo sobrescrito.
// O saldo de um insumo nunca é um campo salvo — é sempre calculado na hora, somando os rolos
// (quando existem) ou o ledger direto (pra insumos sem rastreio por rolo, tipo resina/embalagem).

const CATEGORIA_INSUMO_LABEL = {
  filamento: "Filamento",
  resina: "Resina",
  consumivel_pos_processo: "Consumível de pós-processo",
  embalagem: "Embalagem",
  peca_reposicao: "Peça de reposição",
};

const STATUS_ROLO_LABEL = { ativo: "Ativo", quase_vazio: "Quase vazio", vazio: "Vazio", descartado: "Descartado" };

function renderEstoqueAtivo() {
  const subtabAtiva = document.querySelector(".estoque-subtab-btn.active")?.dataset.subtabEstoque || "insumos";
  if (subtabAtiva === "insumos") renderInsumosList();
  if (subtabAtiva === "rolos") renderRolosList();
  if (subtabAtiva === "movimentacoes") {
    populateMovEstoqueFiltroInsumo();
    renderMovimentosEstoqueList();
  }
}

// Custo por grama/ml costuma ficar bem abaixo de 1 centavo de diferença perceptível —
// formatMoney (2 casas) arredondaria demais aqui, então usa 4 casas pro custo unitário do insumo.
function formatMoneyPreciso(v) {
  if (v === null || v === undefined) return "R$ 0,0000";
  return "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatQuantidade(valor, unidade) {
  const numero = Number(valor) || 0;
  const rotulos = { g: "g", ml: "ml", l: "L", unidade: "un" };
  return `${numero.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${rotulos[unidade] || unidade}`;
}

// Converte comprimento restante de filamento (metros) em gramas, usando o diâmetro e a
// densidade do insumo — a mesma matemática do leitor de G-code (volume do cilindro × densidade).
function pesoFilamentoPorComprimento(metros, diametroMm, densidade) {
  const raioCm = diametroMm / 10 / 2;
  const volumeCm3 = Math.PI * raioCm * raioCm * (metros * 100);
  return volumeCm3 * densidade;
}

// Saldo nunca é um campo salvo: soma os rolos ativos/quase-vazios do insumo (quando ele tem
// rastreio por rolo) ou soma direto o ledger (insumos sem rolo, ex: resina, embalagem).
function calcularSaldoInsumo(insumoId) {
  const rolosDoInsumo = rolos.filter((r) => r.insumo_id === insumoId && r.status !== "descartado");
  if (rolosDoInsumo.length > 0) return rolosDoInsumo.reduce((s, r) => s + Number(r.peso_atual_g), 0);
  return movimentosEstoque
    .filter((m) => m.insumo_id === insumoId && !m.rolo_id)
    .reduce((s, m) => s + Number(m.quantidade), 0);
}

// Custo médio ponderado: recalculado a cada compra, entre o saldo (e custo médio) que já
// existia e a quantidade nova entrando a um custo unitário próprio.
async function recalcularCustoMedioPonderado(insumo, quantidadeNova, custoUnitarioNovo) {
  const saldoAtual = calcularSaldoInsumo(insumo.id);
  const custoMedioAtual = Number(insumo.custo_medio_ponderado) || 0;
  const novoSaldo = saldoAtual + quantidadeNova;
  const novoCustoMedio = novoSaldo > 0 ? (saldoAtual * custoMedioAtual + quantidadeNova * custoUnitarioNovo) / novoSaldo : custoUnitarioNovo;
  await db.from("insumos").update({ custo_medio_ponderado: novoCustoMedio }).eq("id", insumo.id);
}

// "Quase vazio" é sinalizado separado do estoque útil — abaixo de 10% do peso com que o rolo
// começou. "Descartado" nunca é sobrescrito automaticamente, só por ação manual do usuário.
function statusRoloPorPeso(pesoAtual, pesoInicial, statusAtual) {
  if (statusAtual === "descartado") return "descartado";
  if (pesoAtual <= 0.5) return "vazio";
  if (pesoAtual <= Number(pesoInicial) * 0.1) return "quase_vazio";
  return "ativo";
}

function gerarSkuInsumo(nome, categoria) {
  const prefixos = { filamento: "FIL", resina: "RES", consumivel_pos_processo: "CPP", embalagem: "EMB", peca_reposicao: "PEC" };
  const prefixo = prefixos[categoria] || "INS";
  const slug = (nome || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .split("-")
    .slice(0, 3)
    .join("-");
  const base = `${prefixo}-${slug || "ITEM"}`;
  let sku = base;
  let n = 1;
  while (insumos.some((i) => i.sku === sku)) {
    n++;
    sku = `${base}-${n}`;
  }
  return sku;
}

// 4 caracteres pra escrever no carretel com caneta — sem O/0/I/1 pra não confundir na hora de ler.
function gerarIdCurtoRolo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tentativa;
  do {
    tentativa = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rolos.some((r) => r.id_curto === tentativa));
  return tentativa;
}

function renderInsumosList() {
  const busca = insumoBuscaInput.value.trim().toLowerCase();
  const categoriaFiltro = insumoFiltroCategoria.value;

  const filtrados = insumos.filter((i) => {
    if (categoriaFiltro && i.categoria !== categoriaFiltro) return false;
    if (!busca) return true;
    return [i.nome, i.sku, i.marca, i.material, i.cor].filter(Boolean).some((v) => v.toLowerCase().includes(busca));
  });

  if (filtrados.length === 0) {
    insumosListEl.innerHTML = `<li class="column-empty">Nenhum insumo encontrado.</li>`;
    return;
  }

  insumosListEl.innerHTML = filtrados
    .map((i) => {
      const saldo = calcularSaldoInsumo(i.id);
      const abaixoDoMinimo = Number(i.estoque_minimo) > 0 && saldo <= Number(i.estoque_minimo);
      const numRolos = rolos.filter((r) => r.insumo_id === i.id && r.status !== "descartado").length;
      return `<li>
        <span>
          ${escapeHtml(i.nome)} · ${CATEGORIA_INSUMO_LABEL[i.categoria] || i.categoria}
          — saldo: <strong class="${abaixoDoMinimo ? "estoque-baixo" : ""}">${formatQuantidade(saldo, i.unidade_medida)}</strong>${numRolos > 0 ? ` (${numRolos} rolo${numRolos > 1 ? "s" : ""})` : ""}
          · custo médio: ${formatMoneyPreciso(i.custo_medio_ponderado)}/${i.unidade_medida}
        </span>
        <button type="button" data-id="${i.id}" class="edit-insumo-btn">✏️</button>
      </li>`;
    })
    .join("");

  insumosListEl.querySelectorAll(".edit-insumo-btn").forEach((btn) =>
    btn.addEventListener("click", () => openInsumoDialog(insumos.find((i) => i.id === btn.dataset.id)))
  );
}

function atualizarCamposFilamentoInsumo() {
  insumoFilamentoFields.hidden = insumoCategoriaSelect.value !== "filamento";
}

function openInsumoDialog(insumo) {
  insumoForm.reset();
  insumoError.hidden = true;
  insumoForm.dataset.id = insumo ? insumo.id : "";
  insumoDialogTitle.textContent = insumo ? "Editar insumo" : "Novo insumo";
  deleteInsumoBtn.hidden = !insumo;

  if (insumo) {
    for (const [key, value] of Object.entries(insumo)) {
      const field = insumoForm.elements.namedItem(key);
      if (field && value !== null && value !== undefined) field.value = value;
    }
  } else {
    insumoCategoriaSelect.value = "filamento";
  }
  atualizarCamposFilamentoInsumo();
  insumoDialog.showModal();
}

async function handleSaveInsumo(e) {
  e.preventDefault();
  insumoError.hidden = true;

  const id = insumoForm.dataset.id;
  const fd = new FormData(insumoForm);
  const categoria = fd.get("categoria");
  const nome = fd.get("nome").trim();
  if (!nome) {
    insumoError.textContent = "Informe o nome do insumo.";
    insumoError.hidden = false;
    return;
  }

  let sku = fd.get("sku").trim();
  if (!sku) sku = gerarSkuInsumo(nome, categoria);
  else if (insumos.some((i) => i.sku === sku && i.id !== id)) {
    insumoError.textContent = "Já existe um insumo com esse SKU.";
    insumoError.hidden = false;
    return;
  }

  const payload = {
    nome,
    categoria,
    unidade_medida: fd.get("unidade_medida"),
    sku,
    marca: fd.get("marca").trim() || null,
    linha: fd.get("linha").trim() || null,
    material: fd.get("material").trim() || null,
    cor: fd.get("cor").trim() || null,
    diametro_mm: fd.get("diametro_mm") ? Number(fd.get("diametro_mm")) : null,
    densidade: fd.get("densidade") ? Number(fd.get("densidade")) : null,
    peso_rolo_vazio_g: fd.get("peso_rolo_vazio_g") ? Number(fd.get("peso_rolo_vazio_g")) : null,
    estoque_minimo: Number(fd.get("estoque_minimo")) || 0,
  };

  let error;
  if (id) ({ error } = await db.from("insumos").update(payload).eq("id", id));
  else ({ error } = await db.from("insumos").insert(payload));
  if (error) {
    insumoError.textContent = "Erro ao salvar: " + error.message;
    insumoError.hidden = false;
    return;
  }

  insumoDialog.close();
  await loadData();
}

async function handleDeleteInsumo() {
  const id = insumoForm.dataset.id;
  if (!id) return;
  const temHistorico = rolos.some((r) => r.insumo_id === id) || movimentosEstoque.some((m) => m.insumo_id === id);
  if (temHistorico) {
    alert("Esse insumo já tem rolos ou movimentações registradas — não dá pra excluir.");
    return;
  }
  if (!confirm("Excluir este insumo?")) return;
  const { error } = await db.from("insumos").delete().eq("id", id);
  if (error) {
    alert("Erro ao excluir: " + error.message);
    return;
  }
  insumoDialog.close();
  await loadData();
}

function renderRolosList() {
  const busca = roloBuscaInput.value.trim().toLowerCase();
  const statusFiltro = roloFiltroStatus.value;

  const filtrados = rolos.filter((r) => {
    if (statusFiltro && r.status !== statusFiltro) return false;
    if (!busca) return true;
    const insumo = insumos.find((i) => i.id === r.insumo_id);
    return [r.id_curto, insumo?.marca, insumo?.material, insumo?.cor, insumo?.nome].filter(Boolean).some((v) => v.toLowerCase().includes(busca));
  });

  if (filtrados.length === 0) {
    rolosListEl.innerHTML = `<li class="column-empty">Nenhum rolo encontrado.</li>`;
    return;
  }

  rolosListEl.innerHTML = filtrados
    .map((r) => {
      const insumo = insumos.find((i) => i.id === r.insumo_id);
      return `<li>
        <span>
          <strong>${escapeHtml(r.id_curto)}</strong> — ${escapeHtml(insumo?.nome || "insumo removido")}
          · ${Number(r.peso_atual_g).toLocaleString("pt-BR")}g / ${Number(r.peso_inicial_g).toLocaleString("pt-BR")}g
          · <span class="status-badge ${r.status}">${STATUS_ROLO_LABEL[r.status] || r.status}</span>
          ${r.local_armazenagem ? ` · 📍 ${escapeHtml(r.local_armazenagem)}` : ""}
        </span>
      </li>`;
    })
    .join("");
}

// Popula o <select> de insumo do modal de rolo — só insumos de categoria filamento, já que é
// a única categoria com rastreio por rolo hoje.
function populateInsumoSelectFilamento(select, selecionado) {
  const filamentos = insumos.filter((i) => i.categoria === "filamento");
  select.innerHTML =
    '<option value="">Selecione…</option>' + filamentos.map((i) => `<option value="${i.id}">${escapeHtml(i.nome)}</option>`).join("");
  if (selecionado) select.value = selecionado;
}

function openRoloDialog() {
  roloForm.reset();
  roloError.hidden = true;
  populateInsumoSelectFilamento(roloInsumoSelect, "");
  roloIdCurtoInput.value = "";
  roloDialog.showModal();
}

async function handleSaveRolo(e) {
  e.preventDefault();
  roloError.hidden = true;

  const fd = new FormData(roloForm);
  const insumoId = fd.get("insumo_id");
  const pesoInicial = Number(fd.get("peso_inicial_g"));
  const custoTotal = Number(fd.get("custo_total"));
  const insumo = insumos.find((i) => i.id === insumoId);

  if (!insumo) {
    roloError.textContent = "Escolha um insumo.";
    roloError.hidden = false;
    return;
  }
  if (!pesoInicial || pesoInicial <= 0) {
    roloError.textContent = "Informe o peso comprado.";
    roloError.hidden = false;
    return;
  }

  let idCurto = (fd.get("id_curto") || "").trim().toUpperCase();
  if (!idCurto) idCurto = gerarIdCurtoRolo();
  else if (rolos.some((r) => r.id_curto === idCurto)) {
    roloError.textContent = "Já existe um rolo com esse ID curto.";
    roloError.hidden = false;
    return;
  }

  const custoUnitario = custoTotal / pesoInicial;
  await recalcularCustoMedioPonderado(insumo, pesoInicial, custoUnitario);

  const { data: novoRolo, error } = await db
    .from("rolos")
    .insert({
      insumo_id: insumoId,
      id_curto: idCurto,
      peso_inicial_g: pesoInicial,
      peso_atual_g: pesoInicial,
      custo_total: custoTotal,
      local_armazenagem: fd.get("local_armazenagem").trim() || null,
      status: "ativo",
    })
    .select()
    .single();
  if (error) {
    roloError.textContent = "Erro ao salvar: " + error.message;
    roloError.hidden = false;
    return;
  }

  await db.from("movimentos_estoque").insert({
    insumo_id: insumoId,
    rolo_id: novoRolo.id,
    tipo: "entrada_compra",
    quantidade: pesoInicial,
    custo_unitario: custoUnitario,
    data_movimento: new Date().toISOString().slice(0, 10),
  });

  roloDialog.close();
  await loadData();
}

function populateMovEstoqueFiltroInsumo() {
  const selecionado = movEstoqueFiltroInsumo.value;
  movEstoqueFiltroInsumo.innerHTML =
    '<option value="">Todos os insumos</option>' + insumos.map((i) => `<option value="${i.id}">${escapeHtml(i.nome)}</option>`).join("");
  movEstoqueFiltroInsumo.value = selecionado;
}

const TIPO_MOVIMENTO_ESTOQUE_LABEL = {
  entrada_compra: "Entrada (compra)",
  saida_job: "Saída (job)",
  saida_manual: "Saída manual",
  ajuste: "Ajuste",
};

function renderMovimentosEstoqueList() {
  const filtroInsumo = movEstoqueFiltroInsumo.value;
  const filtroTipo = movEstoqueFiltroTipo.value;

  let lista = movimentosEstoque;
  if (filtroInsumo) lista = lista.filter((m) => m.insumo_id === filtroInsumo);
  if (filtroTipo) lista = lista.filter((m) => m.tipo === filtroTipo);

  if (lista.length === 0) {
    movimentosEstoqueListEl.innerHTML = `<p class="column-empty">Nenhuma movimentação encontrada.</p>`;
    return;
  }

  let html = `<div class="table-wrap"><table class="financeiro-table"><thead><tr>
    <th>Data</th><th>Insumo</th><th>Rolo</th><th>Tipo</th><th>Quantidade</th><th>Motivo</th>
  </tr></thead><tbody>`;
  for (const m of lista) {
    const insumo = insumos.find((i) => i.id === m.insumo_id);
    const rolo = m.rolo_id ? rolos.find((r) => r.id === m.rolo_id) : null;
    const sinal = Number(m.quantidade) >= 0 ? "+ " : "− ";
    html += `<tr>
      <td>${formatDate(m.data_movimento)}</td>
      <td>${escapeHtml(insumo?.nome || "—")}</td>
      <td>${rolo ? escapeHtml(rolo.id_curto) : "—"}</td>
      <td>${TIPO_MOVIMENTO_ESTOQUE_LABEL[m.tipo] || m.tipo}</td>
      <td>${sinal}${formatQuantidade(Math.abs(Number(m.quantidade)), insumo?.unidade_medida)}</td>
      <td>${escapeHtml(m.motivo || "—")}</td>
    </tr>`;
  }
  html += `</tbody></table></div>`;
  movimentosEstoqueListEl.innerHTML = html;
}

function populateRoloSelectParaMovimento(insumoId, selecionado) {
  const rolosDoInsumo = rolos.filter((r) => r.insumo_id === insumoId && r.status !== "descartado");
  movimentoEstoqueRoloSelect.innerHTML =
    '<option value="">— Sem rolo específico —</option>' +
    rolosDoInsumo.map((r) => `<option value="${r.id}">${escapeHtml(r.id_curto)} (${Number(r.peso_atual_g).toLocaleString("pt-BR")}g)</option>`).join("");
  if (selecionado) movimentoEstoqueRoloSelect.value = selecionado;
  movimentoEstoqueRoloLabel.hidden = rolosDoInsumo.length === 0;
}

function openMovimentoEstoqueDialog(insumoIdPreSelecionado) {
  movimentoEstoqueForm.reset();
  movimentoEstoqueError.hidden = true;
  movimentoEstoqueInsumoSelect.innerHTML = insumos.map((i) => `<option value="${i.id}">${escapeHtml(i.nome)}</option>`).join("");
  if (insumoIdPreSelecionado) movimentoEstoqueInsumoSelect.value = insumoIdPreSelecionado;
  atualizarFormularioMovimentoEstoque();
  movimentoEstoqueDialog.showModal();
}

// Ajusta o formulário conforme tipo/insumo/rolo escolhidos: entrada de compra não vale pra
// filamento aqui (isso é "Novo rolo" — cada compra de filamento é um rolo próprio); ajuste com
// rolo selecionado troca pro bloco de "peso restante" com os 3 caminhos de medição; ajuste sem
// rolo mantém o campo de quantidade simples, mas como delta (pode ser negativo).
function atualizarFormularioMovimentoEstoque() {
  const tipo = movimentoEstoqueTipoSelect.value;
  const insumoId = movimentoEstoqueInsumoSelect.value;
  const insumo = insumos.find((i) => i.id === insumoId);

  populateRoloSelectParaMovimento(insumoId, movimentoEstoqueRoloSelect.value);
  const roloSelecionado = movimentoEstoqueRoloSelect.value
    ? rolos.find((r) => r.id === movimentoEstoqueRoloSelect.value)
    : null;

  const mostrarAjusteRolo = tipo === "ajuste" && !!roloSelecionado;
  movimentoEstoqueAjusteRolo.hidden = !mostrarAjusteRolo;
  movimentoEstoqueQuantidadeSimples.hidden = mostrarAjusteRolo;
  movimentoEstoqueQuantidadeInput.required = !mostrarAjusteRolo;
  movimentoEstoqueQuantidadeInput.placeholder = tipo === "ajuste" ? "Pode ser negativo (correção pra baixo)" : "";
  movimentoEstoqueCustoLabel.hidden = tipo !== "entrada_compra";
  ajustePreview.hidden = !mostrarAjusteRolo;

  if (mostrarAjusteRolo) atualizarPreviewAjuste();

  if (tipo === "entrada_compra" && insumo?.categoria === "filamento") {
    movimentoEstoqueError.textContent = 'Filamento entra como "Novo rolo" — cada compra é um rolo próprio, não um lançamento aqui.';
    movimentoEstoqueError.hidden = false;
  } else {
    movimentoEstoqueError.textContent = "";
    movimentoEstoqueError.hidden = true;
  }
}

function atualizarPreviewAjuste() {
  const roloSelecionado = movimentoEstoqueRoloSelect.value ? rolos.find((r) => r.id === movimentoEstoqueRoloSelect.value) : null;
  const insumo = roloSelecionado ? insumos.find((i) => i.id === roloSelecionado.insumo_id) : null;
  if (!roloSelecionado || !insumo) {
    ajustePreview.hidden = true;
    return;
  }
  const pesoNovo = calcularPesoNovoAjuste(roloSelecionado, insumo);
  if (pesoNovo === null) {
    ajustePreview.hidden = true;
    return;
  }
  const delta = pesoNovo - Number(roloSelecionado.peso_atual_g);
  ajustePreview.hidden = false;
  ajustePreview.textContent = `Peso restante calculado: ${pesoNovo.toFixed(1)}g (${delta >= 0 ? "+" : ""}${delta.toFixed(1)}g em relação ao atual)`;
}

// Aplica o modo de medição escolhido (gramas direto / peso bruto com tara / comprimento restante)
// e devolve o peso restante calculado, ou null se o valor ainda não foi preenchido.
function calcularPesoNovoAjuste(rolo, insumo) {
  const modo = ajusteModoSelect.value;
  const valor = Number(ajusteValorInput.value);
  if (!ajusteValorInput.value || isNaN(valor) || valor < 0) return null;

  if (modo === "gramas") return valor;
  if (modo === "peso_bruto") return Math.max(0, valor - (Number(insumo.peso_rolo_vazio_g) || 0));
  return Math.max(0, pesoFilamentoPorComprimento(valor, Number(insumo.diametro_mm) || 1.75, Number(insumo.densidade) || 1.24));
}

async function handleSaveMovimentoEstoque(e) {
  e.preventDefault();
  movimentoEstoqueError.hidden = true;

  const fd = new FormData(movimentoEstoqueForm);
  const tipo = fd.get("tipo");
  const insumoId = fd.get("insumo_id");
  const roloId = fd.get("rolo_id") || null;
  const motivo = fd.get("motivo").trim() || null;
  const insumo = insumos.find((i) => i.id === insumoId);
  const rolo = roloId ? rolos.find((r) => r.id === roloId) : null;

  if (!insumo) {
    movimentoEstoqueError.textContent = "Escolha um insumo.";
    movimentoEstoqueError.hidden = false;
    return;
  }
  if (tipo === "ajuste" && !motivo) {
    movimentoEstoqueError.textContent = "Informe o motivo do ajuste.";
    movimentoEstoqueError.hidden = false;
    return;
  }
  if (tipo === "entrada_compra" && insumo.categoria === "filamento") {
    movimentoEstoqueError.textContent = 'Filamento entra como "Novo rolo", não por aqui.';
    movimentoEstoqueError.hidden = false;
    return;
  }

  let quantidadeEfeito;
  let custoUnitario = null;
  let novoPesoRolo = null;

  if (tipo === "entrada_compra") {
    const qtd = Number(fd.get("quantidade"));
    if (!qtd || qtd <= 0) {
      movimentoEstoqueError.textContent = "Informe uma quantidade maior que zero.";
      movimentoEstoqueError.hidden = false;
      return;
    }
    custoUnitario = Number(fd.get("custo_unitario")) || 0;
    quantidadeEfeito = qtd;
    await recalcularCustoMedioPonderado(insumo, qtd, custoUnitario);
  } else if (tipo === "saida_manual") {
    const qtd = Number(fd.get("quantidade"));
    if (!qtd || qtd <= 0) {
      movimentoEstoqueError.textContent = "Informe uma quantidade maior que zero.";
      movimentoEstoqueError.hidden = false;
      return;
    }
    const saldoDisponivel = rolo ? Number(rolo.peso_atual_g) : calcularSaldoInsumo(insumoId);
    if (qtd > saldoDisponivel) {
      movimentoEstoqueError.textContent = `Saldo insuficiente — disponível: ${formatQuantidade(saldoDisponivel, insumo.unidade_medida)}.`;
      movimentoEstoqueError.hidden = false;
      return;
    }
    quantidadeEfeito = -qtd;
    if (rolo) novoPesoRolo = Number(rolo.peso_atual_g) - qtd;
  } else {
    // ajuste
    if (rolo) {
      const pesoNovo = calcularPesoNovoAjuste(rolo, insumo);
      if (pesoNovo === null) {
        movimentoEstoqueError.textContent = "Informe o peso restante.";
        movimentoEstoqueError.hidden = false;
        return;
      }
      quantidadeEfeito = pesoNovo - Number(rolo.peso_atual_g);
      novoPesoRolo = pesoNovo;
    } else {
      const delta = Number(fd.get("quantidade"));
      if (!delta) {
        movimentoEstoqueError.textContent = "Informe a quantidade do ajuste (pode ser negativa).";
        movimentoEstoqueError.hidden = false;
        return;
      }
      const saldoAtual = calcularSaldoInsumo(insumoId);
      if (saldoAtual + delta < 0) {
        movimentoEstoqueError.textContent = "Esse ajuste deixaria o saldo negativo.";
        movimentoEstoqueError.hidden = false;
        return;
      }
      quantidadeEfeito = delta;
    }
  }

  const { error } = await db.from("movimentos_estoque").insert({
    insumo_id: insumoId,
    rolo_id: roloId,
    tipo,
    quantidade: quantidadeEfeito,
    custo_unitario: custoUnitario,
    motivo,
    data_movimento: new Date().toISOString().slice(0, 10),
  });
  if (error) {
    movimentoEstoqueError.textContent = "Erro ao salvar: " + error.message;
    movimentoEstoqueError.hidden = false;
    return;
  }

  if (rolo && novoPesoRolo !== null) {
    const statusNovo = statusRoloPorPeso(novoPesoRolo, rolo.peso_inicial_g, rolo.status);
    await db.from("rolos").update({ peso_atual_g: novoPesoRolo, status: statusNovo }).eq("id", rolo.id);
  }

  movimentoEstoqueDialog.close();
  await loadData();
}
