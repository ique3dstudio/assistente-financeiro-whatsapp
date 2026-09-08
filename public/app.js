// Life OS — montagem do app: abas, roteamento, botão + universal e boot.
import {
  $, abrirPainel, acaoApi, animarAneis, api, atualizar, avisar, definirRender, escapar, esqueleto,
  estado, fecharPainel, limparTimer, navegar, pararDescanso, vibrar,
} from "./ui.js";
import { COR_ABA, ICONE_ABA, icone } from "./icones.js";

import * as hoje from "./telas/hoje.js";
import * as habitos from "./telas/habitos.js";
import * as agua from "./telas/agua.js";
import * as agenda from "./telas/agenda.js";
import * as metas from "./telas/metas.js";
import * as dinheiro from "./telas/dinheiro.js";
import * as eu from "./telas/eu.js";
import * as foco from "./telas/foco.js";
import * as treino from "./telas/treino.js";
import * as saude from "./telas/saude.js";
import * as vicios from "./telas/vicios.js";
import { pendentes, sincronizar } from "./sync.js";

const TELAS = [hoje, habitos, agua, agenda, treino, saude, metas, dinheiro, eu, foco, vicios];

const TODAS = TELAS;



// ---------- ações comuns a todas as telas ----------

const ACOES = {
  ir: (rota) => navegar(rota),
  "fechar-painel": fecharPainel,
  recarregar: () => atualizar(),
  "em-breve": () => avisar("Esse módulo chega nas próximas fases do roadmap."),
  "rapido-treino": () => navegar("/treino/exec"),

  // Toque numa barra do gráfico: mostra o valor exato (o "hover" do celular).
  "ver-ponto"(argumento) {
    const [rotulo, valor] = argumento.split("|");
    avisar(`${rotulo}: ${valor}`);
  },

  // Botão + universal (E1.4): os registros mais usados a um ou dois toques.
  mais() {
    const atalhos = [
      ["rapido-agua", "gota", "Água 500 ml", "var(--c-agua)"],
      ["rapido-gasto", "dinheiro", "Gasto", "var(--c-dinheiro)"],
      ["nova-tarefa", "check", "Tarefa", "var(--c-rotina)"],
      ["ir:/agenda/novo", "calendario", "Compromisso", "var(--c-agenda)"],
      ["fechamento", "coracao", "Humor", "var(--c-humor)"],
      ["rapido-nota", "livro", "Nota", "var(--tinta-2)"],
      ["ir:/habitos/novo", "raio", "Hábito", "var(--c-rotina)"],
      ["rapido-treino", "corpo", "Treino", "var(--c-treino)"],
    ];

    abrirPainel(`<div class="titulo">Registrar agora</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:4px 8px 8px">
        ${atalhos
          .map(
            ([acao, nome, rotulo, cor]) => `<button class="copo" data-acao="${acao}" style="--acento:${cor}">
              <span style="color:${cor};display:grid;place-items:center">${icone(nome, 22)}</span>
              <small>${rotulo}</small></button>`
          )
          .join("")}
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "rapido-agua"() {
    fecharPainel();
    await acaoApi("/agua", { method: "POST", body: JSON.stringify({ quantidade_ml: 500, bebida: "agua" }) }, "+500 ml");
  },

  // Gasto rápido: usa as suas categorias de verdade e lembra a última usada.
  async "rapido-gasto"() {
    const { categorias } = await api("/financas/categorias?tipo=despesa");
    const { contas } = await api("/financas/contas");
    const ultima = localStorage.getItem("ultima-categoria");

    abrirPainel(`<div class="titulo">Novo gasto</div>
      <div style="padding:0 14px 14px">
        <label class="campo"><span>Valor (R$)</span>
          <input id="g-valor" type="number" inputmode="decimal" step="0.01" placeholder="45,90" autofocus /></label>
        <label class="campo"><span>Categoria</span>
          <select id="g-categoria">${categorias
            .map((c) => `<option value="${c.id}" ${c.id === ultima ? "selected" : ""}>${c.icone} ${escapar(c.nome)}</option>`)
            .join("")}</select></label>
        <label class="campo"><span>Descrição (opcional)</span><input id="g-descricao" placeholder="almoço" /></label>
        <label class="campo"><span>Conta</span>
          <select id="g-conta">${contas
            .map((c) => `<option value="${c.id}">${c.icone} ${escapar(c.nome)}</option>`)
            .join("")}</select></label>
        <label class="marca-linha"><input id="g-receita" type="checkbox" /><span>É uma entrada de dinheiro</span></label>
        <button class="botao" data-acao="salvar-gasto">Salvar</button>
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "salvar-gasto"() {
    const valor = Number(String($("#g-valor").value).replace(",", "."));
    if (!valor) return avisar("Informe o valor");

    const categoria = $("#g-categoria").value;
    localStorage.setItem("ultima-categoria", categoria);

    fecharPainel();
    estado.dados.financas = null;

    await acaoApi(
      "/financas",
      {
        method: "POST",
        body: JSON.stringify({
          valor,
          tipo: $("#g-receita").checked ? "receita" : "despesa",
          categoria_id: categoria,
          conta_id: $("#g-conta").value || null,
          descricao: $("#g-descricao").value.trim() || null,
          forma_pagamento: "pix",
        }),
      },
      "Lançamento salvo"
    );
  },

  async "rapido-nota"() {
    const conteudo = prompt("Anotar:");
    if (!conteudo) return;
    fecharPainel();
    await acaoApi("/diario/anotacao", { method: "POST", body: JSON.stringify({ tipo: "nota", conteudo }) }, "Anotado");
  },
};

for (const tela of TODAS) Object.assign(ACOES, tela.acoes || {});

// ---------- roteamento ----------

async function render() {
  limparTimer(); // cronômetro de outra tela não continua rodando escondido
  const rota = location.hash.replace(/^#/, "") || "/hoje";
  estado.rota = rota;

  const tela = TODAS.find((t) => t.rota.test(rota));
  if (!tela) return navegar("/hoje");

  const parametro = rota.match(tela.rota)[1];

  // Esqueleto enquanto a tela carrega: nunca uma tela em branco.
  const espera = setTimeout(() => ($("#conteudo").innerHTML = esqueleto()), 90);

  try {
    const html = await tela.render(parametro);
    clearTimeout(espera);
    $("#conteudo").innerHTML = html;
  } catch (erro) {
    clearTimeout(espera);
    if (erro.message === "sessao") return;
    $("#conteudo").innerHTML = `<div class="vazio">Não consegui carregar esta tela.<br /><br />${escapar(erro.message)}</div>
      <button class="botao secundario" data-acao="recarregar">Tentar de novo</button>
      <button class="botao secundario" data-acao="diagnostico">Ver diagnóstico do banco</button>`;
  }

  desenharAbas(tela.aba);
  // Cada aba tinge seus botões principais — o app inteiro fica coerente com a cor
  // do módulo em que você está.
  // Telas de foco (rotina guiada, Pomodoro, SOS) escondem o botão + : ali o app
  // tem uma função só, e qualquer outra coisa na tela é distração.
  const foco = /^\/(foco|vicios\/sos)/.test(rota);
  $("#mais").hidden = foco;

  const acento = foco ? "var(--c-vicios)" : COR_ABA[tela.aba] || "var(--marca)";
  $("#conteudo").style.setProperty("--acento-tela", acento);
  $("#mais").style.background = acento;
  $("#mais").style.boxShadow = `0 6px 22px color-mix(in oklab, ${acento} 45%, transparent), var(--sombra-2)`;
  await desenharEstadoRede();
  window.scrollTo(0, 0);
  animarAneis();
  prepararCabecalho();
}

// Título grande que vira barra compacta ao rolar (como nos apps da Apple).
function prepararCabecalho() {
  const titulo = $("#conteudo h1");
  const barra = $("#topo-fixo");
  if (!titulo || !barra) return;

  barra.querySelector("strong").textContent = titulo.textContent.trim();
  barra.classList.remove("visivel");

  if (estado._observador) estado._observador.disconnect();
  estado._observador = new IntersectionObserver(
    ([entrada]) => barra.classList.toggle("visivel", !entrada.isIntersecting),
    { rootMargin: "-52px 0px 0px 0px", threshold: 1 }
  );
  estado._observador.observe(titulo);
}

// Mostra, no alto da tela, quando o app está sem rede e quantos registros
// estão esperando para subir.
async function desenharEstadoRede() {
  estado.fila = await pendentes();
  const barra = $("#barra-offline");
  const semRede = estado.offline || !navigator.onLine;

  if (!semRede && estado.fila === 0) {
    barra.hidden = true;
    return;
  }

  barra.hidden = false;
  barra.textContent = estado.fila
    ? `${semRede ? "Sem conexão · " : ""}${estado.fila} registro(s) aguardando envio`
    : "Sem conexão — pode registrar, sobe depois";
}

// Rede voltou: sobe a fila e redesenha com os dados de verdade.
async function aoVoltarRede() {
  const { enviados } = await sincronizar();
  estado.offline = false;
  if (enviados) avisar(`${enviados} registro(s) enviados`);
  await render();
}

function desenharAbas(ativa) {
  $("#abas").innerHTML = estado.abas
    .map(
      (aba) => `<button class="aba ${aba.id === ativa ? "ativa" : ""}"
                  style="--acento:${COR_ABA[aba.id] || "var(--marca)"}" data-acao="ir:/${aba.id}">
        ${icone(ICONE_ABA[aba.id] || "vazio")}${aba.nome}
      </button>`
    )
    .join("");
}

definirRender(render);

// ---------- eventos ----------

document.addEventListener("click", (evento) => {
  const alvo = evento.target.closest("[data-acao]");
  if (!alvo) return;

  const [nome, ...resto] = alvo.dataset.acao.split(":");
  const acao = ACOES[nome];
  if (!acao) return;

  evento.preventDefault();
  if (/^(marcar|habito-marcar|tarefa-concluir|serie-salvar|serie-repetir|rapido-|agua-registrar|humor)/.test(nome)) vibrar();

  Promise.resolve(acao(resto.join(":"))).catch((erro) => {
    if (erro.message !== "sessao") avisar(erro.message);
  });
});

document.addEventListener("change", (evento) => {
  const alvo = evento.target.closest("select[data-acao]");
  if (alvo) ACOES[alvo.dataset.acao.split(":")[0]]?.();
});

$("#sombra").addEventListener("click", fecharPainel);
$("#descanso").addEventListener("click", pararDescanso);

// Botão + sai do caminho quando você está lendo (rolando para baixo) e volta
// assim que você sobe — o conteúdo nunca fica escondido atrás dele.
let ultimaRolagem = 0;
addEventListener(
  "scroll",
  () => {
    const y = window.scrollY;
    const descendo = y > ultimaRolagem + 6;
    const subindo = y < ultimaRolagem - 6;
    if (descendo || subindo) $("#mais").classList.toggle("escondido", descendo && y > 120);
    ultimaRolagem = y;
  },
  { passive: true }
);
window.addEventListener("hashchange", render);
window.addEventListener("online", aoVoltarRede);
window.addEventListener("offline", () => desenharEstadoRede());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && navigator.onLine) aoVoltarRede().catch(() => {});
});
document.addEventListener("sessao-expirada", mostrarLogin);

// ---------- boot ----------

function mostrarLogin() {
  $("#app").hidden = true;
  $("#tela-login").hidden = false;
  fecharPainel();
}

async function abrirApp() {
  const { abas, modulos } = await api("/abas");
  estado.abas = abas;
  estado.modulos = modulos;

  $("#tela-login").hidden = true;
  $("#app").hidden = false;

  // Abriu o app: se sobrou fila da última vez sem rede, sobe antes de desenhar.
  if ((await pendentes()) > 0 && navigator.onLine) await sincronizar().catch(() => {});
  await render();
}

$("#form-login").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const erro = $("#erro-login");
  erro.hidden = true;

  try {
    await api("/login", { method: "POST", body: JSON.stringify({ senha: $("#campo-senha").value }) });
    $("#campo-senha").value = "";
    await abrirApp();
  } catch (e) {
    erro.textContent = e.message === "sessao" ? "Senha incorreta" : e.message;
    erro.hidden = false;
  }
});

(async () => {
  try {
    const { autenticado } = await api("/sessao");
    if (autenticado) await abrirApp();
    else mostrarLogin();
  } catch {
    mostrarLogin();
  }
})();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
