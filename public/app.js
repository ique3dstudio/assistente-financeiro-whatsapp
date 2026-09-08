// Life OS — montagem do app: abas, roteamento, botão + universal e boot.
import { $, abrirPainel, acaoApi, api, atualizar, avisar, definirRender, escapar, estado, fecharPainel, limparTimer, navegar, pararDescanso } from "./ui.js";

import * as hoje from "./telas/hoje.js";
import * as habitos from "./telas/habitos.js";
import * as agua from "./telas/agua.js";
import * as agenda from "./telas/agenda.js";
import * as metas from "./telas/metas.js";
import * as dinheiro from "./telas/dinheiro.js";
import * as eu from "./telas/eu.js";
import * as foco from "./telas/foco.js";
import * as treino from "./telas/treino.js";
import { pendentes, sincronizar } from "./sync.js";

const TELAS = [hoje, habitos, agua, agenda, treino, metas, dinheiro, eu, foco];

const TODAS = TELAS;



// ---------- ações comuns a todas as telas ----------

const ACOES = {
  ir: (rota) => navegar(rota),
  "fechar-painel": fecharPainel,
  recarregar: () => atualizar(),
  "em-breve": () => avisar("Esse módulo chega nas próximas fases do roadmap."),
  "rapido-treino": () => navegar("/treino/exec"),

  // Botão + universal (E1.4): os registros mais usados a um ou dois toques.
  mais() {
    abrirPainel(`<div class="titulo">Registrar agora</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px">
        <button class="copo" data-acao="rapido-agua">💧<small>Água 500 ml</small></button>
        <button class="copo" data-acao="rapido-gasto">💰<small>Gasto</small></button>
        <button class="copo" data-acao="nova-tarefa">✅<small>Tarefa</small></button>
        <button class="copo" data-acao="ir:/agenda/novo">📅<small>Compromisso</small></button>
        <button class="copo" data-acao="fechamento">🙂<small>Humor</small></button>
        <button class="copo" data-acao="rapido-nota">📝<small>Nota</small></button>
        <button class="copo" data-acao="ir:/habitos/novo">🔁<small>Hábito</small></button>
        <button class="copo" data-acao="rapido-treino">🏋️<small>Treino</small></button>
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "rapido-agua"() {
    fecharPainel();
    await acaoApi("/agua", { method: "POST", body: JSON.stringify({ quantidade_ml: 500, bebida: "agua" }) }, "+500 ml");
  },

  "rapido-gasto"() {
    const categorias = ["alimentacao", "mercado", "transporte", "moradia", "saude", "lazer", "compras", "servicos", "outros"];
    const ultima = localStorage.getItem("ultima-categoria") || "alimentacao";

    abrirPainel(`<div class="titulo">Novo gasto</div>
      <div style="padding:0 14px 14px">
        <label class="campo"><span>Valor (R$)</span>
          <input id="g-valor" type="number" inputmode="decimal" placeholder="45,00" autofocus /></label>
        <label class="campo"><span>Categoria</span>
          <select id="g-categoria">${categorias
            .map((c) => `<option value="${c}" ${c === ultima ? "selected" : ""}>${c}</option>`)
            .join("")}</select></label>
        <label class="campo"><span>Descrição (opcional)</span><input id="g-descricao" placeholder="almoço" /></label>
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
    await acaoApi(
      "/financas",
      {
        method: "POST",
        body: JSON.stringify({
          valor,
          tipo: $("#g-receita").checked ? "receita" : "despesa",
          categoria,
          descricao: $("#g-descricao").value.trim() || null,
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

  try {
    $("#conteudo").innerHTML = await tela.render(parametro);
  } catch (erro) {
    if (erro.message === "sessao") return;
    $("#conteudo").innerHTML = `<div class="vazio">Não consegui carregar esta tela.<br /><br />${escapar(erro.message)}</div>
      <button class="botao secundario" data-acao="recarregar">Tentar de novo</button>
      <button class="botao secundario" data-acao="diagnostico">Ver diagnóstico do banco</button>`;
  }

  desenharAbas(tela.aba);
  await desenharEstadoRede();
  window.scrollTo(0, 0);
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
      (aba) => `<button class="aba ${aba.id === ativa ? "ativa" : ""}" data-acao="ir:/${aba.id}">
        <span>${aba.emoji}</span>${aba.nome}
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
