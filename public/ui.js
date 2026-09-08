// Peças compartilhadas por todas as telas: chamadas à API, avisos, formatação,
// o anel de progresso e o painel que sobe de baixo.

export const estado = { abas: [], modulos: [], dados: {}, rascunho: null, rota: "/hoje" };

export const $ = (seletor) => document.querySelector(seletor);
export const $$ = (seletor) => [...document.querySelectorAll(seletor)];

export async function api(caminho, opcoes = {}) {
  const resposta = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: { "Content-Type": "application/json", ...(opcoes.headers || {}) },
  });

  if (resposta.status === 401) {
    document.dispatchEvent(new CustomEvent("sessao-expirada"));
    throw new Error("sessao");
  }

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || "Algo deu errado");
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
    if (erro.message !== "sessao") avisar(erro.message);
    throw erro;
  }
}

export function selecao(id, opcoes, valorAtual) {
  return `<select id="${id}">${opcoes
    .map((o) => `<option value="${escapar(o.id)}" ${String(o.id) === String(valorAtual) ? "selected" : ""}>${escapar(o.nome)}</option>`)
    .join("")}</select>`;
}
