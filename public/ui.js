// Peças compartilhadas por todas as telas: chamadas à API, avisos, formatação,
// o anel de progresso e o painel que sobe de baixo.

import { enfileirar, novoOrigemId, pendentes } from "./sync.js";

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

export function anel(progresso, cor, valor, nome, acao = "") {
  const raio = 26;
  const volta = 2 * Math.PI * raio;
  const falta = volta * (1 - Math.min(1, Math.max(0, progresso || 0)));

  return `<button class="anel-item" ${acao ? `data-acao="${acao}"` : ""}>
    <svg viewBox="0 0 62 62">
      <circle class="anel-fundo" cx="31" cy="31" r="${raio}"></circle>
      <circle class="anel-frente" cx="31" cy="31" r="${raio}" stroke="${cor}"
              stroke-dasharray="${volta.toFixed(1)}" stroke-dashoffset="${falta.toFixed(1)}"></circle>
    </svg>
    <span class="anel-valor">${escapar(valor)}</span>
    <span class="anel-nome">${escapar(nome)}</span>
  </button>`;
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

export function relogio(segundos) {
  const minutos = Math.floor(Math.abs(segundos) / 60);
  const resto = Math.abs(segundos) % 60;
  return `${segundos < 0 ? "-" : ""}${minutos}:${String(resto).padStart(2, "0")}`;
}
