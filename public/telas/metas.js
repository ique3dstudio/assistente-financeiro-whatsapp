import { $, abrirPainel, acaoApi, api, avisar, escapar, estado, navegar, numero, porcento, selecao } from "../ui.js";

export const rota = /^\/metas(?:\/(.+))?$/;
export const aba = "metas";

export async function render(parametro) {
  const dados = await api("/metas");
  estado.dados.metas = dados;

  if (parametro) return formulario(parametro, dados);

  const secoes = dados.horizontes
    .map(
      (h) => `<section class="secao">
        <h2>${escapar(h.nome)} · ${escapar(h.detalhe)}</h2>
        ${h.metas.length ? h.metas.map(cartao).join("") : `<div class="vazio">Nada aqui ainda.</div>`}
      </section>`
    )
    .join("");

  return `<header class="topo">
      <div><h1>🎯 Metas</h1>
        <p class="sub">${dados.total} metas · ${dados.concluidas} concluídas${dados.orfas ? ` · ${dados.orfas} órfãs` : ""}</p></div>
    </header>
    ${secoes}
    <button class="botao" data-acao="ir:/metas/nova">Nova meta</button>`;
}

function cartao(meta) {
  const area = (estado.dados.metas?.areas || []).find((a) => a.id === meta.area);
  const barra =
    meta.progresso === null
      ? ""
      : `<div class="barra" style="margin-top:10px"><span style="width:${Math.round(meta.progresso * 100)}%"></span></div>`;

  const valores =
    meta.valor_alvo === null
      ? ""
      : `<span>${numero(meta.valor_atual)} / ${numero(meta.valor_alvo)}${meta.unidade ? ` ${escapar(meta.unidade)}` : ""}</span>`;

  const ritmo = meta.ritmo ? `<span>faltam ${numero(Math.ceil(meta.ritmo.por_dia * 100) / 100)}/dia</span>` : "";

  return `<button class="cartao" style="width:100%;text-align:left;display:block;margin-bottom:10px"
            data-acao="meta-opcoes:${meta.id}">
    <div class="item-nome">${escapar(area?.emoji || "🎯")} ${escapar(meta.titulo)}
      ${meta.concluida_em ? "<span class='selo'>✓</span>" : ""}</div>
    <div class="item-info">
      ${valores}
      ${meta.progresso === null ? "" : `<span>${porcento(meta.progresso)}</span>`}
      <span>${escapar(meta.situacao.texto)}</span>
      ${meta.automatica ? `<span>🔗 ${escapar(meta.metrica_nome)}</span>` : ""}
      ${ritmo}
      ${meta.marcos.length ? `<span>${meta.marcos.filter((m) => m.concluido_em).length}/${meta.marcos.length} marcos</span>` : ""}
    </div>
    ${barra}
    ${meta.orfa ? `<p class="sub" style="color:var(--alerta);margin-top:8px">⚠️ ${escapar(meta.situacao.texto)}</p>` : ""}
  </button>`;
}

function formulario(id, dados) {
  const nova = id === "nova";
  const todas = dados.horizontes.flatMap((h) => h.metas);
  let meta = {
    titulo: "", horizonte: "curto", area: "saude", metrica: "", unidade: "",
    valor_inicial: 0, valor_alvo: "", valor_atual: 0, metrica_id: "", prazo: "", motivo: "", parent_id: "",
  };

  if (!nova) {
    const achada = todas.find((m) => m.id === id);
    if (!achada) throw new Error("Meta não encontrada");
    meta = { ...meta, ...achada };
  }

  estado.rascunho = { id: nova ? null : id };

  const metricas = [{ id: "", nome: "— atualizo na mão —" }, ...dados.metricas.map((m) => ({ id: m.id, nome: `${m.nome} (agora: ${numero(m.valor)})` }))];
  const paisPossiveis = [{ id: "", nome: "— nenhuma —" }, ...todas.filter((m) => m.id !== id).map((m) => ({ id: m.id, nome: m.titulo }))];

  return `<header class="topo"><h1>${nova ? "Nova meta" : "Editar meta"}</h1></header>

    <label class="campo"><span>O que você quer</span>
      <input id="m-titulo" value="${escapar(meta.titulo)}" placeholder="Ex: Supino 80 kg x 5" /></label>

    <div class="dois">
      <label class="campo"><span>Horizonte</span>
        ${selecao("m-horizonte", dados.horizontes.map((h) => ({ id: h.id, nome: `${h.nome} (${h.detalhe})` })), meta.horizonte)}</label>
      <label class="campo"><span>Área da vida</span>
        ${selecao("m-area", dados.areas.map((a) => ({ id: a.id, nome: `${a.emoji} ${a.nome}` })), meta.area)}</label>
    </div>

    <label class="campo"><span>Como medir (opcional)</span>
      <input id="m-metrica" value="${escapar(meta.metrica || "")}" placeholder="kg, R$, páginas, dias" /></label>

    <div class="dois">
      <label class="campo"><span>Hoje estou em</span>
        <input id="m-inicial" type="number" inputmode="decimal" value="${escapar(meta.valor_inicial ?? 0)}" /></label>
      <label class="campo"><span>Quero chegar em</span>
        <input id="m-alvo" type="number" inputmode="decimal" value="${escapar(meta.valor_alvo ?? "")}" /></label>
    </div>

    <label class="campo"><span>Unidade</span>
      <input id="m-unidade" value="${escapar(meta.unidade || "")}" placeholder="kg, R$, min" /></label>

    <label class="campo"><span>Atualizar sozinha a partir de</span>
      ${selecao("m-metrica-id", metricas, meta.metrica_id || "")}</label>
    <p class="sub">Ligando a uma métrica, o valor atual vem do próprio app — você nunca digita duas vezes.</p>

    <label class="campo"><span>Prazo</span><input id="m-prazo" type="date" value="${escapar(meta.prazo || "")}" /></label>

    <label class="campo"><span>Dentro de qual meta maior</span>
      ${selecao("m-parent", paisPossiveis, meta.parent_id || "")}</label>

    <label class="campo"><span>Por que isso importa</span>
      <textarea id="m-motivo" rows="3" placeholder="O motivo é o que te segura no dia ruim">${escapar(meta.motivo || "")}</textarea></label>

    <button class="botao" data-acao="salvar-meta">Salvar</button>
    <button class="botao secundario" data-acao="ir:/metas">Cancelar</button>
    ${nova ? "" : `<button class="botao perigo" data-acao="excluir-meta">Excluir meta</button>`}`;
}

function acharMeta(id) {
  return (estado.dados.metas?.horizontes || []).flatMap((h) => h.metas).find((m) => m.id === id);
}

export const acoes = {
  "meta-opcoes"(id) {
    const meta = acharMeta(id);
    if (!meta) return;

    const marcos = meta.marcos
      .map(
        (marco) => `<button data-acao="marco-marcar:${marco.id}:${marco.concluido_em ? "0" : "1"}">
          ${marco.concluido_em ? "✅" : "⬜"} ${escapar(marco.titulo)}</button>`
      )
      .join("");

    abrirPainel(`<div class="titulo">${escapar(meta.titulo)}</div>
      ${marcos}
      <button data-acao="marco-novo:${id}">+ Novo marco</button>
      ${meta.automatica ? "" : `<button data-acao="meta-valor:${id}">Atualizar valor atual</button>`}
      <button data-acao="meta-concluir:${id}:${meta.concluida_em ? "0" : "1"}">
        ${meta.concluida_em ? "Reabrir meta" : "Marcar como concluída 🎉"}</button>
      <button data-acao="ir:/metas/${id}">Editar meta</button>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "meta-valor"(id) {
    const meta = acharMeta(id);
    const resposta = prompt(`Valor atual${meta.unidade ? ` (${meta.unidade})` : ""}:`, meta.valor_atual);
    if (resposta === null) return;
    await acaoApi(`/metas/${id}`, { method: "PUT", body: JSON.stringify({ valor_atual: Number(String(resposta).replace(",", ".")) }) }, "Meta atualizada");
  },

  async "meta-concluir"(argumento) {
    const [id, concluida] = argumento.split(":");
    await acaoApi(
      `/metas/${id}/concluir`,
      { method: "POST", body: JSON.stringify({ concluida: concluida === "1" }) },
      concluida === "1" ? "Meta concluída 🎉" : "Meta reaberta"
    );
  },

  async "marco-novo"(id) {
    const titulo = prompt("Marco (ex: 5 km em 8 semanas):");
    if (!titulo) return;
    await acaoApi(`/metas/${id}/marcos`, { method: "POST", body: JSON.stringify({ titulo }) }, "Marco criado");
  },

  async "marco-marcar"(argumento) {
    const [marcoId, concluido] = argumento.split(":");
    await acaoApi(`/metas/marcos/${marcoId}`, { method: "POST", body: JSON.stringify({ concluido: concluido === "1" }) });
  },

  async "salvar-meta"() {
    const corpo = {
      titulo: $("#m-titulo").value.trim(),
      horizonte: $("#m-horizonte").value,
      area: $("#m-area").value,
      metrica: $("#m-metrica").value.trim() || null,
      unidade: $("#m-unidade").value.trim() || null,
      valor_inicial: Number($("#m-inicial").value || 0),
      valor_alvo: $("#m-alvo").value === "" ? null : Number($("#m-alvo").value),
      metrica_id: $("#m-metrica-id").value || null,
      prazo: $("#m-prazo").value || null,
      parent_id: $("#m-parent").value || null,
      motivo: $("#m-motivo").value.trim() || null,
    };

    const id = estado.rascunho.id;
    try {
      await api(id ? `/metas/${id}` : "/metas", { method: id ? "PUT" : "POST", body: JSON.stringify(corpo) });
      avisar("Meta salva");
      navegar("/metas");
    } catch (erro) {
      if (erro.message !== "sessao") avisar(erro.message);
    }
  },

  async "excluir-meta"() {
    if (!confirm("Excluir esta meta e seus marcos?")) return;
    await api(`/metas/${estado.rascunho.id}`, { method: "DELETE" });
    navegar("/metas");
  },
};
