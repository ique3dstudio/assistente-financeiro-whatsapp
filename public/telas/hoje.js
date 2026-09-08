import { acaoApi, anel, api, avisar, dataLonga, escapar, estado, navegar } from "../ui.js";

export const rota = /^\/hoje$/;
export const aba = "hoje";

export async function render() {
  const dados = await api("/hoje");
  estado.dados.hoje = dados;

  const aneis = dados.aneis
    .map((item) =>
      item.indisponivel
        ? anel(0, "var(--erro)", "!", item.nome, `avisar:${escapar(item.erro)}`)
        : anel(item.progresso ?? 0, "var(--marca)", item.principal ?? "—", item.nome, `abrir-modulo:${item.id}`)
    )
    .join("");

  const compromissos = dados.compromissos.length
    ? `<section class="secao"><h2>Agenda</h2>
        ${dados.compromissos
          .map(
            (evento) => `<button class="item" data-acao="ir:/agenda">
              <span class="caixa" style="border-color:${escapar(evento.cor)}">${escapar(evento.emoji)}</span>
              <span class="item-corpo">
                <span class="item-nome">${escapar(evento.titulo)}</span>
                <span class="item-info">
                  <span>${escapar(evento.hora ? `${evento.hora}${evento.hora_fim ? `–${evento.hora_fim}` : ""}` : "dia inteiro")}</span>
                  ${evento.local ? `<span>${escapar(evento.local)}</span>` : ""}
                </span>
              </span>
              <span class="selo-caixa">${escapar(evento.falta)}</span>
            </button>`
          )
          .join("")}</section>`
    : "";

  const periodos = dados.periodos
    .map(
      (periodo) => `<section class="periodo"><h2>${periodo.nome}</h2>
        ${periodo.itens.map(item).join("")}</section>`
    )
    .join("");

  const vazio = `<div class="vazio">
      Nada no plano de hoje ainda.<br />Comece com 3 hábitos que você <em>já</em> faz — sequência nasce do fácil.
    </div>
    <button class="botao" data-acao="ir:/habitos/novo">Criar meu primeiro hábito</button>`;

  return `
    <header class="topo">
      <div>
        <h1>${escapar(dados.saudacao)}${dados.nome ? `, ${escapar(dados.nome.split(" ")[0])}` : ""}</h1>
        <p class="sub">${escapar(dataLonga(dados.data))}</p>
      </div>
      ${dados.sequencia_geral ? `<div class="selo-caixa">🔥 ${dados.sequencia_geral} dias</div>` : ""}
    </header>

    <div class="secao aneis">${aneis}</div>
    ${dados.total ? periodos : vazio}
    ${compromissos}
    ${dados.mostrar_fechamento ? await blocoFechamento() : ""}
    ${dados.erros.length ? `<p class="sub secao">⚠️ ${escapar(dados.erros[0])}</p>` : ""}
  `;
}

function item(item) {
  const info = [
    item.horario,
    item.frequencia_texto && item.frequencia_texto !== "todo dia" ? item.frequencia_texto : null,
    item.streak ? `🔥 ${item.streak}` : null,
    item.meta_qtd ? `meta ${item.meta_qtd}${item.unidade ? ` ${item.unidade}` : ""}` : null,
    item.de_folga ? "🛌 folga" : null,
  ]
    .filter(Boolean)
    .map((texto) => `<span>${escapar(texto)}</span>`)
    .join("");

  const acao = item.tipo === "tarefa" ? `tarefa-concluir:${item.id}` : `habito-marcar:${item.id}`;
  const opcoes = item.tipo === "tarefa" ? `tarefa-opcoes:${item.id}` : `habito-opcoes:${item.id}`;

  return `<div class="item ${item.concluido ? "feito" : ""}">
    <button class="caixa" data-acao="${acao}" style="${item.concluido ? `background:${escapar(item.cor)};` : ""}">
      ${item.concluido ? "✓" : ""}
    </button>
    <button class="item-corpo" data-acao="${acao}" style="background:none;border:0;padding:0;text-align:left">
      <span class="item-nome">${escapar(item.emoji)} ${escapar(item.nome)}
        ${item.nao_negociavel ? '<span class="ancora">âncora</span>' : ""}</span>
      ${info ? `<span class="item-info">${info}</span>` : ""}
    </button>
    <button class="mais" data-acao="${opcoes}">···</button>
  </div>`;
}

// Fechamento do dia (E1.9): aparece depois das 20h.
async function blocoFechamento() {
  const { humor, anotacoes } = await api("/diario/hoje").catch(() => ({ humor: null, anotacoes: [] }));
  const humores = [
    [1, "😞"],
    [2, "🙁"],
    [3, "😐"],
    [4, "🙂"],
    [5, "😄"],
  ];

  return `<section class="secao"><h2>Fechamento do dia</h2>
    <div class="cartao">
      <p class="sub" style="margin-bottom:10px">Como foi hoje?</p>
      <div class="botoes">
        ${humores
          .map(
            ([nota, emoji]) =>
              `<button class="copo ${humor?.nota === nota ? "ativo" : ""}" data-acao="humor:${nota}"
                 style="${humor?.nota === nota ? "background:var(--marca);color:#06121c" : ""};font-size:22px">${emoji}</button>`
          )
          .join("")}
      </div>
      <button class="botao secundario" data-acao="fechamento">
        ${humor ? "Detalhar o dia" : "Registrar humor, gratidão e o que travou"}
      </button>
      ${anotacoes.length ? `<p class="sub">${anotacoes.length} anotação(ões) hoje</p>` : ""}
    </div>
  </section>`;
}

export const acoes = {
  async "abrir-modulo"(id) {
    const destinos = { habitos: "/habitos", agua: "/agua", agenda: "/agenda", metas: "/metas", financas: "/dinheiro", diario: "/eu" };
    navegar(destinos[id] || "/hoje");
  },

  avisar(mensagem) {
    avisar(mensagem);
  },

  async humor(nota) {
    await acaoApi("/diario/humor", { method: "POST", body: JSON.stringify({ nota: Number(nota) }) }, "Humor registrado");
  },
};
