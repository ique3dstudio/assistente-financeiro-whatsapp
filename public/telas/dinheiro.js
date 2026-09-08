import { api, escapar, reais, vazio } from "../ui.js";
import { icone } from "../icones.js";

export const rota = /^\/dinheiro$/;
export const aba = "dinheiro";

export async function render() {
  const dados = await api("/financas");
  const sobra = dados.receitas - dados.despesas;

  const lancamentos = dados.lancamentos.length
    ? dados.lancamentos
        .map(
          (l) => `<div class="linha">
            <span>${escapar(l.descricao || l.categoria)}<br />
              <small class="sub">${escapar(l.data)} · ${escapar(l.categoria)}</small></span>
            <strong style="color:${l.tipo === "receita" ? "var(--ok)" : "var(--texto)"}">
              ${l.tipo === "receita" ? "+" : "−"} ${reais(l.valor)}</strong>
          </div>`
        )
        .join("")
    : vazio("Nenhum lançamento este mês.<br />Use o botão + para registrar um gasto.", "dinheiro");

  const categorias = dados.por_categoria
    .map((c) => `<div class="linha"><span>${escapar(c.categoria)}</span><strong>${reais(c.total)}</strong></div>`)
    .join("");

  return `<header class="topo">
      <div><h1>Dinheiro</h1><p class="sub">mês de ${escapar(dados.mes)}</p></div>
    </header>

    <div class="cartao secao tres cartao-destaque" style="--acento:var(--c-dinheiro)">
      <div><small>entra</small><span style="color:var(--ok)">${reais(dados.receitas)}</span></div>
      <div><small>sai</small><span>${reais(dados.despesas)}</span></div>
      <div><small>sobra</small>
        <span style="color:${sobra >= 0 ? "var(--ok)" : "var(--critico)"}">${reais(sobra)}</span></div>
    </div>

    ${categorias ? `<div class="secao"><h2>Por categoria</h2><div class="cartao">${categorias}</div></div>` : ""}
    <div class="secao"><h2>Últimos lançamentos</h2><div class="cartao">${lancamentos}</div></div>
    <p class="sub secao">Contas, cartões com fatura, orçamento por envelope e relatórios: Fase 3 do roadmap.</p>`;
}

export const acoes = {};
