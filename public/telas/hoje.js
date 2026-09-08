import { acaoApi, anel, api, avisar, corDoModulo, dataLonga, escapar, estado, navegar, vazio } from "../ui.js";
import { icone } from "../icones.js";

export const rota = /^\/hoje$/;
export const aba = "hoje";

export async function render() {
  const dados = await api("/hoje");
  estado.dados.hoje = dados;

  const aneis = dados.aneis
    .map((item) =>
      item.indisponivel
        ? anel(0, "var(--tinta-3)", "—", item.nome, `avisar:${escapar(item.erro)}`)
        : anel(item.progresso ?? 0, corDoModulo(item.id), item.principal ?? "—", item.nome, `abrir-modulo:${item.id}`)
    )
    .join("");

  const compromissos = dados.compromissos.length
    ? `<section class="secao"><h2>Agenda</h2>
        ${dados.compromissos
          .map(
            (evento) => `<button class="item" data-acao="ir:/agenda" style="--acento:var(--c-agenda)">
              <span class="caixa" style="border-color:color-mix(in oklab, var(--c-agenda) 55%, var(--borda));
                    color:var(--c-agenda)">${icone("calendario", 15)}</span>
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
    .map((periodo) => {
      const pendentes = periodo.itens.filter((i) => !i.concluido && i.tipo === "habito").length;
      return `<section class="periodo">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h2>${periodo.nome}</h2>
          ${
            pendentes > 1
              ? `<button class="link" data-acao="iniciar-ritual:${periodo.id}"
                   style="display:inline-flex;align-items:center;gap:5px">${icone("play", 14)} iniciar rotina</button>`
              : ""
          }
        </div>
        ${periodo.itens.map(item).join("")}</section>`;
    })
    .join("");

  const semNada = vazio(
    "Nada no plano de hoje ainda.<br />Comece com 3 hábitos que você <em>já</em> faz — sequência nasce do fácil.",
    "raio",
    { acao: "ir:/habitos/novo", rotulo: "Criar meu primeiro hábito" }
  );

  return `
    <header class="topo">
      <div>
        <h1>${escapar(dados.saudacao)}${dados.nome ? `, ${escapar(dados.nome.split(" ")[0])}` : ""}</h1>
        <p class="sub">${escapar(dataLonga(dados.data))}</p>
      </div>
      ${
        dados.sequencia_geral
          ? `<div class="selo-caixa" style="color:var(--c-metas)">${icone("chama", 15)}
               <span class="numero">${dados.sequencia_geral} dias</span></div>`
          : ""
      }
    </header>

    <div class="secao aneis">${aneis}</div>
    ${dados.total ? periodos : semNada}
    ${compromissos}
    ${focoAgora(dados)}
    ${dados.mostrar_fechamento ? await blocoFechamento() : ""}
    ${dados.erros.length ? `<p class="sub secao">⚠️ ${escapar(dados.erros[0])}</p>` : ""}
  `;
}

function item(item) {
  const info = [
    item.horario,
    item.frequencia_texto && item.frequencia_texto !== "todo dia" ? item.frequencia_texto : null,
    item.streak ? `${item.streak} seguidos` : null,
    item.meta_qtd ? `meta ${item.meta_qtd}${item.unidade ? ` ${item.unidade}` : ""}` : null,
    item.de_folga ? "🛌 folga" : null,
  ]
    .filter(Boolean)
    .map((texto) => `<span>${escapar(texto)}</span>`)
    .join("");

  const acoesPorTipo = {
    tarefa: [`tarefa-concluir:${item.id}`, `tarefa-opcoes:${item.id}`],
    treino: ["ir:/treino/exec", "ir:/corpo"],
    habito: [`habito-marcar:${item.id}`, `habito-opcoes:${item.id}`],
  };
  const [acao, opcoes] = acoesPorTipo[item.tipo] || acoesPorTipo.habito;

  return `<div class="item ${item.concluido ? "feito" : ""}" style="--acento:${escapar(item.cor || "var(--marca)")}">
    <button class="caixa" data-acao="${acao}" aria-label="marcar ${escapar(item.nome)}">
      ${item.concluido ? icone("check", 15) : ""}
    </button>
    <button class="item-corpo" data-acao="${acao}">
      <span class="item-nome">${escapar(item.emoji)} ${escapar(item.nome)}
        ${item.nao_negociavel ? '<span class="ancora">âncora</span>' : ""}</span>
      ${info ? `<span class="item-info">${info}</span>` : ""}
    </button>
    <button class="mais" data-acao="${opcoes}" aria-label="opções">···</button>
  </div>`;
}

// "Foco agora" (E1.10): o próximo item pendente e um bloco de Pomodoro.
function focoAgora(dados) {
  const proximo = dados.periodos.flatMap((p) => p.itens).find((i) => !i.concluido);
  if (!proximo) return "";

  return `<section class="secao"><h2>Foco agora</h2>
    <div class="cartao">
      <div class="item-nome">${escapar(proximo.emoji)} ${escapar(proximo.nome)}</div>
      <p class="sub">${escapar(proximo.horario ? `sugerido às ${proximo.horario}` : "o próximo da fila")}</p>
      <button class="botao secundario" data-acao="iniciar-pomodoro">${icone("relogio", 18)} Bloco de foco de 25 min</button>
    </div>
  </section>`;
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
    <div class="cartao cartao-destaque" style="--acento:var(--c-humor)">
      <p class="sub" style="margin:0 0 12px">Como foi hoje?</p>
      <div class="botoes" style="grid-template-columns:repeat(5,1fr)">
        ${humores
          .map(
            ([nota, emoji]) =>
              `<button class="copo" data-acao="humor:${nota}" style="--acento:var(--c-humor);font-size:24px;${
                humor?.nota === nota
                  ? "background:color-mix(in oklab, var(--c-humor) 20%, var(--superficie));border-color:var(--c-humor)"
                  : ""
              }">${emoji}</button>`
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
