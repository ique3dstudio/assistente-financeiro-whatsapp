const STATUS_DEFS = [
  { key: "recebido", label: "📥 Pedido recebido" },
  { key: "fila", label: "🗂️ Na fila de produção" },
  { key: "produzindo", label: "🖨️ Em produção" },
  { key: "pronto", label: "✅ Pronto" },
  { key: "entregue", label: "📦 Entregue" },
];
const STATUS_KEYS = STATUS_DEFS.map((s) => s.key);

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
let pedidos = [];
let filtroAtrasados = false;
let filtroTexto = "";

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const board = document.getElementById("board");
const searchInput = document.getElementById("search-input");
const filterAtrasadosBtn = document.getElementById("filter-atrasados");
const newOrderBtn = document.getElementById("new-order-btn");

const orderDialog = document.getElementById("order-dialog");
const orderForm = document.getElementById("order-form");
const orderDialogTitle = document.getElementById("order-dialog-title");
const orderError = document.getElementById("order-error");
const deleteOrderBtn = document.getElementById("delete-order-btn");
const cancelOrderBtn = document.getElementById("cancel-order-btn");

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
  await loadPedidos();
  subscribeRealtime();
}

async function loadPedidos() {
  const { data, error } = await db
    .from("pedidos_3d")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error(error);
    return;
  }
  pedidos = data;
  renderBoard();
}

let realtimeChannel = null;
function subscribeRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = db
    .channel("pedidos_3d-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pedidos_3d" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          if (!pedidos.some((p) => p.id === payload.new.id)) pedidos.push(payload.new);
        } else if (payload.eventType === "UPDATE") {
          pedidos = pedidos.map((p) => (p.id === payload.new.id ? payload.new : p));
        } else if (payload.eventType === "DELETE") {
          pedidos = pedidos.filter((p) => p.id !== payload.old.id);
        }
        renderBoard();
      }
    )
    .subscribe();
}

function isAtrasado(pedido) {
  if (!pedido.prazo_entrega) return false;
  if (pedido.status === "pronto" || pedido.status === "entregue") return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return pedido.prazo_entrega < hoje;
}

function formatDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatMoney(v) {
  if (v === null || v === undefined) return null;
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function renderBoard() {
  board.innerHTML = "";

  let visiveis = pedidos;
  if (filtroTexto) {
    visiveis = visiveis.filter(
      (p) =>
        p.cliente_nome.toLowerCase().includes(filtroTexto) ||
        p.descricao.toLowerCase().includes(filtroTexto)
    );
  }

  const totalAtrasados = pedidos.filter(isAtrasado).length;
  filterAtrasadosBtn.textContent = `⏰ Atrasados: ${totalAtrasados}`;
  if (filtroAtrasados) {
    visiveis = visiveis.filter(isAtrasado);
  }

  for (const def of STATUS_DEFS) {
    const items = visiveis.filter((p) => p.status === def.key);

    const column = document.createElement("div");
    column.className = "column";

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
      for (const pedido of items) {
        body.appendChild(renderCard(pedido, def.key));
      }
    }

    column.appendChild(body);
    board.appendChild(column);
  }
}

function renderCard(pedido, statusKey) {
  const card = document.createElement("div");
  card.className = "card" + (isAtrasado(pedido) ? " late" : "");
  card.addEventListener("click", () => openOrderDialog(pedido));

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = pedido.descricao;
  card.appendChild(title);

  const client = document.createElement("div");
  client.className = "card-client";
  client.textContent = pedido.cliente_nome;
  card.appendChild(client);

  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.appendChild(badge(`Qtd: ${pedido.quantidade}`));
  if (pedido.material || pedido.cor) {
    meta.appendChild(badge([pedido.material, pedido.cor].filter(Boolean).join(" · ")));
  }
  if (pedido.prazo_entrega) {
    meta.appendChild(badge(`Prazo: ${formatDate(pedido.prazo_entrega)}`, isAtrasado(pedido) ? "late" : ""));
  }
  if (pedido.valor !== null && pedido.valor !== undefined) {
    meta.appendChild(badge(formatMoney(pedido.valor)));
  }
  meta.appendChild(badge(pedido.pagamento, pedido.pagamento === "pago" ? "pago" : pedido.pagamento === "parcial" ? "parcial" : ""));
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
    moveStatus(pedido, STATUS_KEYS[idx - 1]);
  });

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.textContent = "▶";
  nextBtn.disabled = idx === STATUS_KEYS.length - 1;
  nextBtn.title = "Mover para próxima etapa";
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moveStatus(pedido, STATUS_KEYS[idx + 1]);
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

async function moveStatus(pedido, novoStatus) {
  const { error } = await db.from("pedidos_3d").update({ status: novoStatus }).eq("id", pedido.id);
  if (error) console.error(error);
}

function openOrderDialog(pedido) {
  orderForm.reset();
  orderError.hidden = true;
  orderForm.dataset.id = pedido ? pedido.id : "";
  orderDialogTitle.textContent = pedido ? "Editar pedido" : "Novo pedido";
  deleteOrderBtn.hidden = !pedido;

  if (pedido) {
    for (const [key, value] of Object.entries(pedido)) {
      const field = orderForm.elements.namedItem(key);
      if (field && value !== null && value !== undefined) field.value = value;
    }
  }

  orderDialog.showModal();
}

async function handleSaveOrder(e) {
  e.preventDefault();
  orderError.hidden = true;

  const formData = new FormData(orderForm);
  const payload = {
    cliente_nome: formData.get("cliente_nome").trim(),
    cliente_contato: formData.get("cliente_contato").trim() || null,
    descricao: formData.get("descricao").trim(),
    modelo_link: formData.get("modelo_link").trim() || null,
    cor: formData.get("cor").trim() || null,
    material: formData.get("material").trim() || null,
    quantidade: Number(formData.get("quantidade")) || 1,
    tempo_estimado_horas: formData.get("tempo_estimado_horas") ? Number(formData.get("tempo_estimado_horas")) : null,
    prazo_entrega: formData.get("prazo_entrega") || null,
    valor: formData.get("valor") ? Number(formData.get("valor")) : null,
    pagamento: formData.get("pagamento"),
    status: formData.get("status"),
    observacoes: formData.get("observacoes").trim() || null,
  };

  const id = orderForm.dataset.id;
  let error;
  if (id) {
    ({ error } = await db.from("pedidos_3d").update(payload).eq("id", id));
  } else {
    payload.criado_por = currentUser.email;
    ({ error } = await db.from("pedidos_3d").insert(payload));
  }

  if (error) {
    orderError.textContent = "Erro ao salvar: " + error.message;
    orderError.hidden = false;
    return;
  }

  orderDialog.close();
}

async function handleDeleteOrder() {
  const id = orderForm.dataset.id;
  if (!id) return;
  if (!confirm("Excluir este pedido? Essa ação não pode ser desfeita.")) return;
  const { error } = await db.from("pedidos_3d").delete().eq("id", id);
  if (error) {
    orderError.textContent = "Erro ao excluir: " + error.message;
    orderError.hidden = false;
    return;
  }
  orderDialog.close();
}
