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

const db = window.supabase.createClient(config.url, config.anonKey);

let currentUser = null;
let clientes = [];
let pedidos = [];
let materiais = [];
let produtos = [];
let maquinas = [];
let falhas = [];
let canaisVenda = [];
let consultasCalculadora = [];
let configuracoes = null;
let filtroAtrasados = false;
let filtroTexto = "";
let anexosPendentes = []; // arquivos escolhidos no <input type=file> ainda não enviados
let anexosParaExcluir = []; // ids de anexos já salvos marcados para exclusão ao salvar

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const board = document.getElementById("board");
const dashboard = document.getElementById("dashboard");
const financeiroEl = document.getElementById("financeiro");
const searchInput = document.getElementById("search-input");
const filterAtrasadosBtn = document.getElementById("filter-atrasados");
const newOrderBtn = document.getElementById("new-order-btn");
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
const pdfOrderBtn = document.getElementById("pdf-order-btn");
const whatsappOrderBtn = document.getElementById("whatsapp-order-btn");
const trackingLinkBtn = document.getElementById("tracking-link-btn");
const itensList = document.getElementById("itens-list");
const addItemBtn = document.getElementById("add-item-btn");
const itemRowTemplate = document.getElementById("item-row-template");
const anexoInput = document.getElementById("anexo-input");
const anexosListEl = document.getElementById("anexos-list");

const configBtn = document.getElementById("config-btn");
const configDialog = document.getElementById("config-dialog");
const configForm = document.getElementById("config-form");
const cancelConfigBtn = document.getElementById("cancel-config-btn");
const configError = document.getElementById("config-error");
const materiaisListEl = document.getElementById("materiais-list");
const materialForm = document.getElementById("material-form");
const maquinasListEl = document.getElementById("maquinas-list");
const maquinaForm = document.getElementById("maquina-form");

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
const avatarCropImg = document.getElementById("avatar-crop-img");
const avatarCropCircle = document.getElementById("avatar-crop-circle");
const avatarCropCancelBtn = document.getElementById("avatar-crop-cancel-btn");
const avatarCropConfirmBtn = document.getElementById("avatar-crop-confirm-btn");
const LOGO_BUCKET = "loja3d-branding";
let arquivoLogoPendente = null;

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
  cancelOrderBtn.addEventListener("click", () => orderDialog.close());
  orderForm.addEventListener("submit", handleSaveOrder);
  deleteOrderBtn.addEventListener("click", handleDeleteOrder);
  pdfOrderBtn.addEventListener("click", gerarOrcamentoPdf);
  whatsappOrderBtn.addEventListener("click", enviarWhatsapp);
  trackingLinkBtn.addEventListener("click", copiarLinkAcompanhamento);
  addItemBtn.addEventListener("click", () => addItemRow(null));
  anexoInput.addEventListener("change", handleAnexoSelected);
  exportCsvBtn.addEventListener("click", exportCsv);

  configBtn.addEventListener("click", openConfigDialog);
  cancelConfigBtn.addEventListener("click", () => configDialog.close());
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

  tabButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== `tab-${btn.dataset.tab}`;
      });
      if (btn.dataset.tab === "painel") renderDashboard();
      if (btn.dataset.tab === "financeiro") renderFinanceiro();
      if (btn.dataset.tab === "calculadora") {
        populateMaterialSelect(calcMaterial);
        populateCanalSelect();
        renderCalculadoraLivre();
        renderHistoricoConsultas();
      }
    })
  );
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
  }
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
  ]);

  for (const e of [eCli, ePed, eMat, eProd, eCfg, eMaq, eFal, eCanal, eCons]) if (e) console.error(e);

  clientes = clientesData || [];
  pedidos = pedidosData || [];
  materiais = materiaisData || [];
  produtos = produtosData || [];
  configuracoes = configData || null;
  maquinas = maquinasData || [];
  falhas = falhasData || [];
  canaisVenda = canaisVendaData || [];
  consultasCalculadora = consultasData || [];

  clientesOptions.innerHTML = clientes.map((c) => `<option value="${escapeHtml(c.nome)}"></option>`).join("");
  atualizarBrandMarks();

  renderBoard();
  if (!document.getElementById("tab-painel").hidden) renderDashboard();
  if (!document.getElementById("tab-financeiro").hidden) renderFinanceiro();
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
    .subscribe();
}

function isAtrasado(item, pedido) {
  if (!pedido.prazo_entrega) return false;
  if (item.status === "pronto" || item.status === "entregue") return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return pedido.prazo_entrega < hoje;
}

function isAtrasadoPedido(pedido) {
  if (!pedido.prazo_entrega) return false;
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

/* ---------- Financeiro (contas a receber) ---------- */

function renderFinanceiro() {
  const linhas = pedidos
    .map((pedido) => {
      const total = (pedido.itens || []).reduce((sum, i) => sum + (Number(i.valor) || 0), 0);
      const sinal = Number(pedido.valor_sinal) || 0;
      return { pedido, total, sinal, saldo: total - sinal };
    })
    .filter((l) => l.pedido.pagamento !== "pago" && l.saldo > 0)
    .sort((a, b) => (a.pedido.prazo_entrega || "9999") < (b.pedido.prazo_entrega || "9999") ? -1 : 1);

  const totalGeral = linhas.reduce((sum, l) => sum + l.saldo, 0);

  let html = `<div class="stat-card financeiro-total"><div class="stat-value">${formatMoney(totalGeral)}</div><div class="stat-label">Total a receber</div></div>`;

  if (linhas.length === 0) {
    html += `<p class="column-empty">Nenhuma conta em aberto. 🎉</p>`;
  } else {
    html += `<div class="table-wrap"><table class="financeiro-table"><thead><tr>
      <th>Cliente</th><th>Total</th><th>Sinal</th><th>Saldo</th><th>Prazo</th><th>Status</th>
    </tr></thead><tbody>`;
    for (const l of linhas) {
      html += `<tr class="${isAtrasadoPedido(l.pedido) ? "late-row" : ""}" data-id="${l.pedido.id}">
        <td>${escapeHtml(l.pedido.cliente?.nome || "")}</td>
        <td>${formatMoney(l.total)}</td>
        <td>${formatMoney(l.sinal)}</td>
        <td>${formatMoney(l.saldo)}</td>
        <td>${l.pedido.prazo_entrega ? formatDate(l.pedido.prazo_entrega) : "—"}</td>
        <td>${l.pedido.pagamento}</td>
      </tr>`;
    }
    html += `</tbody></table></div>`;
  }

  financeiroEl.innerHTML = html;
  financeiroEl.querySelectorAll("tr[data-id]").forEach((tr) =>
    tr.addEventListener("click", () => {
      const pedido = pedidos.find((p) => p.id === tr.dataset.id);
      if (pedido) openOrderDialog(pedido);
    })
  );
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

// Mostra, sobre a foto inteira, o círculo exato que vira o avatar (mesmo recorte que o
// object-fit:cover vai aplicar de verdade) — assim dá pra ver o que vai ficar de fora antes de
// confirmar, sem precisar cortar a imagem antes.
avatarCropImg?.addEventListener("load", () => {
  const frame = avatarCropImg.parentElement;
  const tamanho = frame.clientWidth; // moldura é quadrada (aspect-ratio 1/1)
  const escala = Math.min(tamanho / avatarCropImg.naturalWidth, tamanho / avatarCropImg.naturalHeight);
  const larguraRenderizada = avatarCropImg.naturalWidth * escala;
  const alturaRenderizada = avatarCropImg.naturalHeight * escala;
  const diametro = Math.min(larguraRenderizada, alturaRenderizada);

  avatarCropCircle.style.width = `${diametro}px`;
  avatarCropCircle.style.height = `${diametro}px`;
  avatarCropCircle.style.left = `${(tamanho - diametro) / 2}px`;
  avatarCropCircle.style.top = `${(tamanho - diametro) / 2}px`;
});

function cancelarSelecaoLogo() {
  arquivoLogoPendente = null;
  avatarCropBox.hidden = true;
  avatarCropImg.src = "";
  logoInput.value = "";
}

async function confirmarUploadLogo() {
  const file = arquivoLogoPendente;
  if (!file) return;

  const extensao = (file.name.split(".").pop() || "png").toLowerCase();
  const novoPath = `logo-${crypto.randomUUID()}.${extensao}`;
  const pathAntigo = configuracoes?.logo_path;

  const { error: uploadError } = await db.storage.from(LOGO_BUCKET).upload(novoPath, file);
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
  itensList.innerHTML = "";
  anexosListEl.innerHTML = "";
  anexoInput.value = "";
  anexosPendentes = [];
  anexosParaExcluir = [];

  if (pedido) {
    orderForm.elements.namedItem("cliente_nome").value = pedido.cliente?.nome || "";
    orderForm.elements.namedItem("cliente_contato").value = pedido.cliente?.contato || "";
    for (const key of ["prioridade", "origem", "prazo_entrega", "pagamento", "valor_sinal", "observacoes"]) {
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
