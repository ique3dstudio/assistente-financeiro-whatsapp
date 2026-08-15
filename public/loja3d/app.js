const STATUS_DEFS = [
  { key: "recebido", label: "📥 Pedido recebido" },
  { key: "fila", label: "🗂️ Na fila de produção" },
  { key: "produzindo", label: "🖨️ Em produção" },
  { key: "pronto", label: "✅ Pronto" },
  { key: "entregue", label: "📦 Entregue" },
];
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
const searchInput = document.getElementById("search-input");
const filterAtrasadosBtn = document.getElementById("filter-atrasados");
const newOrderBtn = document.getElementById("new-order-btn");
const exportCsvBtn = document.getElementById("export-csv-btn");
const clientesOptions = document.getElementById("clientes-options");
const tabButtons = document.querySelectorAll(".tab-btn");

const orderDialog = document.getElementById("order-dialog");
const orderForm = document.getElementById("order-form");
const orderDialogTitle = document.getElementById("order-dialog-title");
const orderError = document.getElementById("order-error");
const deleteOrderBtn = document.getElementById("delete-order-btn");
const cancelOrderBtn = document.getElementById("cancel-order-btn");
const itensList = document.getElementById("itens-list");
const addItemBtn = document.getElementById("add-item-btn");
const itemRowTemplate = document.getElementById("item-row-template");
const anexoInput = document.getElementById("anexo-input");
const anexosListEl = document.getElementById("anexos-list");

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
  addItemBtn.addEventListener("click", () => addItemRow(null));
  anexoInput.addEventListener("change", handleAnexoSelected);
  exportCsvBtn.addEventListener("click", exportCsv);

  tabButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-quadro").hidden = btn.dataset.tab !== "quadro";
      document.getElementById("tab-painel").hidden = btn.dataset.tab !== "painel";
      if (btn.dataset.tab === "painel") renderDashboard();
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
  const [{ data: clientesData, error: eCli }, { data: pedidosData, error: ePed }] = await Promise.all([
    db.from("clientes").select("*").order("nome"),
    db
      .from("pedidos")
      .select("*, cliente:clientes(*), itens:itens_pedido(*), anexos(*)")
      .order("created_at", { ascending: true }),
  ]);

  if (eCli) console.error(eCli);
  if (ePed) console.error(ePed);

  clientes = clientesData || [];
  pedidos = pedidosData || [];

  clientesOptions.innerHTML = clientes.map((c) => `<option value="${escapeHtml(c.nome)}"></option>`).join("");

  renderBoard();
  if (!document.getElementById("tab-painel").hidden) renderDashboard();
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

function formatMoney(v) {
  if (v === null || v === undefined) return null;
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
  if (error) console.error(error);
}

/* ---------- Painel (Dashboard) ---------- */

function renderDashboard() {
  const cards = allCards();
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const pedidosAbertos = pedidos.filter((p) => (p.itens || []).some((i) => i.status !== "entregue")).length;
  const itensAtrasados = cards.filter((c) => isAtrasado(c.item, c.pedido)).length;

  const faturamentoMes = cards
    .filter((c) => {
      if (c.item.status !== "entregue" || !c.item.updated_at) return false;
      const d = new Date(c.item.updated_at);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    })
    .reduce((sum, c) => sum + (Number(c.item.valor) || 0), 0);

  const horasFila = cards
    .filter((c) => c.item.status !== "entregue")
    .reduce((sum, c) => sum + (Number(c.item.tempo_estimado_horas) || 0), 0);

  const clientesAtivos = new Set(
    pedidos.filter((p) => (p.itens || []).some((i) => i.status !== "entregue")).map((p) => p.cliente_id)
  ).size;

  const stats = [
    { label: "Pedidos abertos", value: pedidosAbertos },
    { label: "Itens atrasados", value: itensAtrasados },
    { label: "Faturamento do mês", value: formatMoney(faturamentoMes) },
    { label: "Horas na fila", value: `${horasFila}h` },
    { label: "Clientes ativos", value: clientesAtivos },
  ];

  dashboard.innerHTML = stats
    .map((s) => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`)
    .join("");
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

/* ---------- Formulário de pedido (criar/editar) ---------- */

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

  row.querySelector(".remove-item-btn").addEventListener("click", () => row.remove());
  itensList.appendChild(row);
}

function openOrderDialog(pedido) {
  orderForm.reset();
  orderError.hidden = true;
  orderForm.dataset.id = pedido ? pedido.id : "";
  orderDialogTitle.textContent = pedido ? "Editar pedido" : "Novo pedido";
  deleteOrderBtn.hidden = !pedido;
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
        quantidade: Number(row.querySelector('[data-field="quantidade"]').value) || 1,
        tempo_estimado_horas: row.querySelector('[data-field="tempo_estimado_horas"]').value
          ? Number(row.querySelector('[data-field="tempo_estimado_horas"]').value)
          : null,
        valor: row.querySelector('[data-field="valor"]').value
          ? Number(row.querySelector('[data-field="valor"]').value)
          : null,
        status: row.querySelector('[data-field="status"]').value,
        observacoes: row.querySelector('[data-field="observacoes"]').value.trim() || null,
      };

      if (row.dataset.id) {
        const { error } = await db.from("itens_pedido").update(itemPayload).eq("id", row.dataset.id);
        if (error) throw error;
        idsAtuais.push(row.dataset.id);
      } else {
        const { data, error } = await db.from("itens_pedido").insert(itemPayload).select().single();
        if (error) throw error;
        idsAtuais.push(data.id);
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
