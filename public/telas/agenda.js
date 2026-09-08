import { $, abrirPainel, acaoApi, api, avisar, dataCurta, escapar, estado, navegar, selecao } from "../ui.js";

export const rota = /^\/agenda(?:\/(.+))?$/;
export const aba = "hoje";

export async function render(parametro) {
  const dados = await api("/agenda");
  estado.dados.agenda = dados;

  if (parametro === "novo") return formularioEvento(dados);

  const porDia = {};
  for (const evento of dados.eventos) (porDia[evento.data] ||= []).push(evento);

  const agenda = Object.entries(porDia).length
    ? Object.entries(porDia)
        .map(
          ([data, eventos]) => `<section class="secao">
            <h2>${data === dados.data ? "Hoje" : escapar(dataCurta(data))}</h2>
            ${eventos.map(linhaEvento).join("")}
          </section>`
        )
        .join("")
    : `<div class="vazio">Nenhum compromisso nos próximos 30 dias.</div>`;

  const tarefas = dados.tarefas.length
    ? dados.tarefas.map(linhaTarefa).join("")
    : `<div class="vazio">Nenhuma tarefa aberta.</div>`;

  const conflitos = dados.conflitos_hoje.length
    ? `<div class="cartao secao" style="border-color:var(--alerta)">
        ⚠️ Conflito hoje: ${dados.conflitos_hoje.map(([a, b]) => `${escapar(a)} × ${escapar(b)}`).join(" · ")}
      </div>`
    : "";

  return `<header class="topo"><h1>📅 Agenda</h1></header>
    ${conflitos}
    ${agenda}
    <div class="secao"><h2>Tarefas abertas</h2>${tarefas}</div>
    <button class="botao" data-acao="ir:/agenda/novo">Novo compromisso</button>
    <button class="botao secundario" data-acao="nova-tarefa">Nova tarefa</button>`;
}

function linhaEvento(evento) {
  return `<div class="item">
    <span class="caixa" style="border-color:${escapar(evento.cor)}">${escapar(evento.emoji)}</span>
    <button class="item-corpo" data-acao="evento-opcoes:${evento.id}"
            style="background:none;border:0;padding:0;text-align:left">
      <span class="item-nome">${escapar(evento.titulo)}</span>
      <span class="item-info">
        <span>${escapar(evento.hora ? `${evento.hora}${evento.hora_fim ? `–${evento.hora_fim}` : ""}` : "dia inteiro")}</span>
        <span>${escapar(evento.tipo_nome)}</span>
        ${evento.local ? `<span>📍 ${escapar(evento.local)}</span>` : ""}
        ${evento.repetido ? "<span>🔁 repete</span>" : ""}
      </span>
    </button>
  </div>`;
}

function linhaTarefa(tarefa) {
  return `<div class="item ${tarefa.concluida_em ? "feito" : ""}">
    <button class="caixa" data-acao="tarefa-concluir:${tarefa.id}"></button>
    <button class="item-corpo" data-acao="tarefa-opcoes:${tarefa.id}"
            style="background:none;border:0;padding:0;text-align:left">
      <span class="item-nome">${escapar(tarefa.prioridade_info.emoji)} ${escapar(tarefa.titulo)}</span>
      <span class="item-info">
        ${tarefa.prazo ? `<span>${tarefa.atrasada ? "⚠️ atrasada: " : ""}${escapar(dataCurta(tarefa.prazo))}</span>` : "<span>sem prazo</span>"}
        <span>${escapar(tarefa.prioridade_info.nome)}</span>
      </span>
    </button>
  </div>`;
}

function formularioEvento(dados) {
  estado.rascunho = { recorrencia: { tipo: "nenhuma" } };

  return `<header class="topo"><h1>Novo compromisso</h1></header>

    <label class="campo"><span>O quê</span>
      <input id="e-titulo" placeholder="Ex: Consulta com o dentista" /></label>

    <label class="campo"><span>Tipo</span>
      ${selecao("e-tipo", dados.tipos.map((t) => ({ id: t.id, nome: `${t.emoji} ${t.nome}` })), "pessoal")}</label>

    <div class="dois">
      <label class="campo"><span>Data</span><input id="e-data" type="date" value="${dados.data}" /></label>
      <label class="campo"><span>Hora</span><input id="e-hora" type="time" /></label>
    </div>

    <div class="dois">
      <label class="campo"><span>Duração (min)</span><input id="e-duracao" type="number" value="60" /></label>
      <label class="campo"><span>Repetir</span>
        ${selecao(
          "e-repetir",
          [
            { id: "nenhuma", nome: "Não repete" },
            { id: "diaria", nome: "Todo dia" },
            { id: "semanal", nome: "Toda semana" },
            { id: "mensal", nome: "Todo mês" },
            { id: "cada_n_dias", nome: "A cada 15 dias" },
          ],
          "nenhuma"
        )}</label>
    </div>

    <label class="campo"><span>Onde</span><input id="e-local" placeholder="Endereço ou link" /></label>
    <label class="campo"><span>Pauta / motivo</span><textarea id="e-pauta" rows="3"></textarea></label>

    <button class="botao" data-acao="salvar-evento">Salvar</button>
    <button class="botao secundario" data-acao="ir:/agenda">Cancelar</button>`;
}

export const acoes = {
  async "salvar-evento"() {
    const repetir = $("#e-repetir").value;
    const recorrencia = repetir === "cada_n_dias" ? { tipo: "cada_n_dias", n: 15 } : { tipo: repetir };

    const corpo = {
      titulo: $("#e-titulo").value.trim(),
      tipo: $("#e-tipo").value,
      data: $("#e-data").value,
      hora: $("#e-hora").value || null,
      duracao_min: Number($("#e-duracao").value) || 60,
      dia_inteiro: !$("#e-hora").value,
      local: $("#e-local").value.trim() || null,
      pauta: $("#e-pauta").value.trim() || null,
      recorrencia,
    };

    try {
      await api("/agenda/eventos", { method: "POST", body: JSON.stringify(corpo) });
      avisar("Compromisso criado");
      navegar("/agenda");
    } catch (erro) {
      if (erro.message !== "sessao") avisar(erro.message);
    }
  },

  "evento-opcoes"(id) {
    const evento = (estado.dados.agenda?.eventos || []).find((e) => e.id === id);
    if (!evento) return;

    abrirPainel(`<div class="titulo">${escapar(evento.emoji)} ${escapar(evento.titulo)}</div>
      ${evento.pauta ? `<div style="padding:0 14px 8px" class="sub">${escapar(evento.pauta)}</div>` : ""}
      <button data-acao="evento-tarefa:${id}">Criar tarefa deste compromisso</button>
      <button data-acao="evento-excluir:${id}">Excluir compromisso</button>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "evento-excluir"(id) {
    if (!confirm("Excluir este compromisso (e as repetições dele)?")) return;
    await acaoApi(`/agenda/eventos/${id}`, { method: "DELETE" }, "Compromisso excluído");
  },

  async "evento-tarefa"(id) {
    const evento = (estado.dados.agenda?.eventos || []).find((e) => e.id === id);
    const titulo = prompt("Tarefa:", `Preparar: ${evento?.titulo || ""}`);
    if (!titulo) return;
    await acaoApi("/agenda/tarefas", { method: "POST", body: JSON.stringify({ titulo, evento_id: id, prazo: evento?.data }) }, "Tarefa criada");
  },

  async "nova-tarefa"() {
    const titulo = prompt("Tarefa:");
    if (!titulo) return;
    await acaoApi("/agenda/tarefas", { method: "POST", body: JSON.stringify({ titulo }) }, "Tarefa criada");
  },

  async "tarefa-concluir"(id) {
    const item =
      (estado.dados.hoje?.periodos || []).flatMap((p) => p.itens).find((i) => i.id === id) ||
      (estado.dados.agenda?.tarefas || []).find((t) => t.id === id);
    const jaFeita = Boolean(item?.concluido || item?.concluida_em);

    await acaoApi(`/agenda/tarefas/${id}/concluir`, { method: "POST", body: JSON.stringify({ concluida: !jaFeita }) });
  },

  "tarefa-opcoes"(id) {
    abrirPainel(`<div class="titulo">Tarefa</div>
      <button data-acao="tarefa-prazo:${id}">Definir prazo</button>
      <button data-acao="tarefa-prioridade:${id}">Definir prioridade</button>
      <button data-acao="tarefa-excluir:${id}">Excluir tarefa</button>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "tarefa-prazo"(id) {
    const prazo = prompt("Prazo (AAAA-MM-DD):", estado.dados.agenda?.data);
    if (!prazo) return;
    await acaoApi(`/agenda/tarefas/${id}`, { method: "PUT", body: JSON.stringify({ prazo }) }, "Prazo definido");
  },

  async "tarefa-prioridade"(id) {
    const resposta = prompt("Prioridade: 1 = alta, 2 = média, 3 = baixa", "2");
    if (!resposta) return;
    await acaoApi(`/agenda/tarefas/${id}`, { method: "PUT", body: JSON.stringify({ prioridade: Number(resposta) }) }, "Prioridade definida");
  },

  async "tarefa-excluir"(id) {
    await acaoApi(`/agenda/tarefas/${id}`, { method: "DELETE" }, "Tarefa excluída");
  },
};
