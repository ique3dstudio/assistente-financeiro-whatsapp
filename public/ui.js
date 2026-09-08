// Peças compartilhadas por todas as telas: chamadas à API, avisos, formatação,
// o anel de progresso e o painel que sobe de baixo.

import { enfileirar, novoOrigemId, pendentes } from "./sync.js";
import { COR_MODULO, icone } from "./icones.js";

export const estado = { abas: [], modulos: [], dados: {}, rascunho: null, rota: "/hoje", offline: false, fila: 0 };

const MUTACOES = new Set(["POST", "PUT", "DELETE", "PATCH"]);

// Guarda a última resposta de cada tela, para o app abrir com dados mesmo sem
// rede. É conveniência por aparelho — o dado de verdade vive no Supabase.
function guardarCache(caminho, dados) {
  try {
    localStorage.setItem(`cache:${caminho}`, JSON.stringify(dados));
  } catch {
    // armazenamento cheio ou bloqueado: seguimos sem cache
  }
}

function lerCache(caminho) {
  try {
    const bruto = localStorage.getItem(`cache:${caminho}`);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export const $ = (seletor) => document.querySelector(seletor);
export const $$ = (seletor) => [...document.querySelectorAll(seletor)];

export async function api(caminho, opcoes = {}) {
  const metodo = (opcoes.method || "GET").toUpperCase();
  let corpo = opcoes.body;

  // Todo registro leva um id de origem: é o que permite reenviar a fila offline
  // sem duplicar nada no banco.
  if (MUTACOES.has(metodo)) {
    const dados = corpo ? JSON.parse(corpo) : {};
    if (!dados.origem_id) dados.origem_id = novoOrigemId();
    corpo = JSON.stringify(dados);
  }

  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, {
      ...opcoes,
      method: metodo,
      body: corpo,
      headers: { "Content-Type": "application/json", ...(opcoes.headers || {}) },
    });
  } catch {
    estado.offline = true;

    if (MUTACOES.has(metodo)) {
      await enfileirar(caminho, { method: metodo, body: corpo });
      estado.fila = await pendentes();
      const erro = new Error("Salvo no aparelho — sobe quando a rede voltar");
      erro.offline = true;
      throw erro;
    }

    const cache = lerCache(caminho);
    if (cache) return { ...cache, _cache: true };
    throw new Error("Sem conexão — e esta tela ainda não tem dados guardados.");
  }

  estado.offline = false;

  if (resposta.status === 401) {
    document.dispatchEvent(new CustomEvent("sessao-expirada"));
    throw new Error("sessao");
  }

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || "Algo deu errado");

  if (metodo === "GET") guardarCache(caminho, dados);
  return dados;
}

let avisoTimer;
export function avisar(texto) {
  const aviso = $("#aviso");
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => (aviso.hidden = true), 3000);
}

export const escapar = (texto) =>
  String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const litros = (ml) => `${(ml / 1000).toFixed(1).replace(".", ",")} L`;
export const reais = (valor) => `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
export const numero = (valor) => String(Number(valor || 0)).replace(".", ",");
// "1 exercício" / "2 exercícios" — detalhe pequeno que separa app de protótipo.
export function plural(quantidade, singular, plural) {
  return `${quantidade} ${Number(quantidade) === 1 ? singular : plural}`;
}

export const porcento = (fracao) => `${Math.round((fracao || 0) * 100)}%`;

export function dataLonga(dataISO) {
  return new Date(`${dataISO}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

export function dataCurta(dataISO) {
  return new Date(`${dataISO}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function hojeISO() {
  return estado.dados.hoje?.data || new Date().toISOString().slice(0, 10);
}

export function anel(progresso, cor, valor, nome, acao = "", iconeNome = null) {
  const raio = 26;
  const volta = 2 * Math.PI * raio;
  const fracao = Math.min(1, Math.max(0, progresso || 0));

  // O anel entra animando de zero: o traço começa vazio e o CSS faz a transição.
  return `<button class="anel-item" style="--acento:${cor}" ${acao ? `data-acao="${acao}"` : ""}>
    <svg viewBox="0 0 62 62" data-anel="${(volta * (1 - fracao)).toFixed(1)}">
      <circle class="anel-fundo" cx="31" cy="31" r="${raio}"></circle>
      <circle class="anel-frente" cx="31" cy="31" r="${raio}"
              stroke-dasharray="${volta.toFixed(1)}" stroke-dashoffset="${volta.toFixed(1)}"></circle>
    </svg>
    <span class="anel-valor">${escapar(valor)}</span>
    <span class="anel-nome">${escapar(nome)}</span>
  </button>`;
}

// Chamado depois de a tela entrar no DOM: dispara a animação dos anéis.
export function animarAneis() {
  requestAnimationFrame(() => {
    for (const svg of $$("[data-anel]")) {
      const traco = svg.querySelector(".anel-frente");
      if (traco) traco.style.strokeDashoffset = svg.dataset.anel;
    }
  });
}

export function corDoModulo(id) {
  return COR_MODULO[id] || "var(--marca)";
}

// Estado vazio com ilustração e uma única ação — nunca uma tela em branco.
export function vazio(texto, iconeNome = "vazio", acao = null) {
  return `<div class="vazio">${icone(iconeNome)}<div>${texto}</div></div>
    ${acao ? `<button class="botao" data-acao="${acao.acao}">${escapar(acao.rotulo)}</button>` : ""}`;
}

// Esqueleto de carregamento: o app nunca pisca em branco entre telas.
export function esqueleto() {
  return `<div style="padding-top:26px">
    <div class="esqueleto" style="height:34px;width:58%"></div>
    <div class="esqueleto" style="height:15px;width:38%;margin-top:10px"></div>
    <div style="display:flex;gap:8px;margin-top:26px">
      ${Array.from({ length: 4 }, () => '<div class="esqueleto" style="height:96px;flex:1"></div>').join("")}
    </div>
    ${Array.from({ length: 3 }, () => '<div class="esqueleto" style="height:64px;margin-top:10px"></div>').join("")}
  </div>`;
}

// Vibração curta ao registrar algo (Android responde; iPhone ignora em silêncio).
export function vibrar(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // sem vibração, sem problema
  }
}

// Barras de um período — usadas por água (azul) e treino (verde-água).
// Especificação de marca: topo arredondado, 2px de respiro entre barras,
// rótulo direto só no maior valor, e toque mostra o valor exato.
export function barras(pontos, { cor, formatar = (v) => String(v), acaoToque = null }) {
  if (pontos.length === 0) return "";

  const maior = Math.max(...pontos.map((p) => p.valor), 1);
  const indiceMaior = pontos.findIndex((p) => p.valor === maior);

  return `<div class="historico" style="--acento:${cor}">
    ${pontos
      .map((ponto, i) => {
        const altura = Math.max(3, Math.round((ponto.valor / maior) * 100));
        const acao = acaoToque ? `data-acao="${acaoToque}:${escapar(ponto.rotulo)}|${escapar(formatar(ponto.valor))}"` : "";
        return `<div class="dia" ${acao} title="${escapar(ponto.rotulo)}: ${escapar(formatar(ponto.valor))}">
          ${i === indiceMaior && ponto.valor > 0 ? `<span class="grafico-rotulo">${escapar(formatar(ponto.valor))}</span>` : ""}
          <div class="dia-barra ${ponto.destaque ? "bateu" : ""}" style="height:${altura}%"></div>
          <div class="dia-rotulo">${escapar(ponto.rotulo)}</div>
        </div>`;
      })
      .join("")}
  </div>`;
}

// Linha de evolução: traço de 2px, ponto final com anel da cor do fundo e
// rótulo direto no valor mais recente (nunca um número em cada ponto).
export function linha(pontos, { cor, formatar = (v) => String(v) }) {
  if (pontos.length < 2) return "";

  const largura = 300;
  const altura = 64;
  const valores = pontos.map((p) => p.valor);
  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  const faixa = Math.max(0.1, maior - menor);

  const coordenadas = pontos.map((ponto, i) => ({
    x: (i / (pontos.length - 1)) * largura,
    y: altura - ((ponto.valor - menor) / faixa) * altura,
  }));

  const fim = coordenadas[coordenadas.length - 1];

  return `<svg viewBox="0 -8 ${largura + 46} ${altura + 20}" style="width:100%;height:82px;overflow:visible">
    <polyline points="${coordenadas.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ")}"
              fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="${fim.x.toFixed(1)}" cy="${fim.y.toFixed(1)}" r="4.5" fill="${cor}"
            stroke="var(--superficie)" stroke-width="2" />
    <text x="${(fim.x + 10).toFixed(1)}" y="${(fim.y + 4).toFixed(1)}"
          fill="var(--tinta-2)" font-size="12" font-weight="600">${escapar(formatar(maior))}</text>
  </svg>`;
}

export function abrirPainel(html) {
  $("#painel").innerHTML = html;
  $("#painel").hidden = false;
  $("#sombra").hidden = false;
}

export function fecharPainel() {
  $("#painel").hidden = true;
  $("#sombra").hidden = true;
}

// Cada tela devolve HTML; quem redesenha é o app.js.
let redesenhar = async () => {};
export function definirRender(funcao) {
  redesenhar = funcao;
}
export function atualizar() {
  return redesenhar();
}

export function navegar(rota) {
  fecharPainel();
  if (location.hash === `#${rota}`) atualizar();
  else location.hash = rota;
}

// Chama a API e redesenha a tela, avisando em caso de erro. É o padrão de
// quase toda ação do app.
export async function acaoApi(caminho, opcoes, mensagem) {
  try {
    const resultado = await api(caminho, opcoes);
    if (mensagem) avisar(mensagem);
    await atualizar();
    return resultado;
  } catch (erro) {
    if (erro.offline) {
      avisar(erro.message);
      await atualizar().catch(() => {});
      return { offline: true };
    }
    if (erro.message !== "sessao") avisar(erro.message);
    throw erro;
  }
}

export function selecao(id, opcoes, valorAtual) {
  return `<select id="${id}">${opcoes
    .map((o) => `<option value="${escapar(o.id)}" ${String(o.id) === String(valorAtual) ? "selected" : ""}>${escapar(o.nome)}</option>`)
    .join("")}</select>`;
}

// Timers de tela (rotina guiada, Pomodoro): um só por vez, sempre limpo antes
// de desenhar outra tela — senão o cronômetro continua rodando escondido.
export function definirTimer(funcao, intervalo = 1000) {
  limparTimer();
  estado._timer = setInterval(funcao, intervalo);
}

export function limparTimer() {
  if (estado._timer) clearInterval(estado._timer);
  estado._timer = null;
}

// Bip curto de fim de tempo, sem arquivo de áudio.
export function bip(vezes = 2) {
  try {
    const contexto = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < vezes; i++) {
      const oscilador = contexto.createOscillator();
      const volume = contexto.createGain();
      oscilador.connect(volume);
      volume.connect(contexto.destination);
      oscilador.frequency.value = 880;
      volume.gain.value = 0.15;
      oscilador.start(contexto.currentTime + i * 0.35);
      oscilador.stop(contexto.currentTime + i * 0.35 + 0.18);
    }
  } catch {
    // navegador sem áudio liberado: silêncio mesmo
  }
}

// O descanso entre séries continua contando mesmo se você navegar para outra
// tela — por isso ele vive fora do #conteudo e tem intervalo próprio.
export function iniciarDescanso(segundos) {
  const botao = $("#descanso");
  let restante = Number(segundos) || 90;

  clearInterval(estado._descanso);
  botao.hidden = false;

  const desenhar = () => (botao.textContent = `⏱ descanso ${relogio(restante)} — toque para parar`);
  desenhar();

  estado._descanso = setInterval(() => {
    restante--;
    if (restante <= 0) {
      pararDescanso();
      bip(2);
      avisar("Descanso acabou");
      return;
    }
    desenhar();
  }, 1000);
}

export function pararDescanso() {
  clearInterval(estado._descanso);
  estado._descanso = null;
  $("#descanso").hidden = true;
}

export function relogio(segundos) {
  const minutos = Math.floor(Math.abs(segundos) / 60);
  const resto = Math.abs(segundos) % 60;
  return `${segundos < 0 ? "-" : ""}${minutos}:${String(resto).padStart(2, "0")}`;
}
