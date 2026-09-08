// Módulo Dinheiro: painel do mês, lançamento, extrato, contas, cartões com
// fatura, orçamento por envelope, relatórios, metas e dívidas.
import {
  $, abrirPainel, acaoApi, api, avisar, barras, dataCurta, escapar, estado,
  fecharPainel, navegar, numero, plural, porcento, reais, reaisCurto, selecao, vazio,
} from "../ui.js";
import { icone } from "../icones.js";

export const rota = /^\/dinheiro$|^\/dinheiro\/(.+)$/;
export const aba = "dinheiro";

export async function render(parametro) {
  if (!parametro) return painel();

  const [tela, argumento] = parametro.split("/");
  const telas = {
    lancar: lancar,
    extrato: extrato,
    contas: telaContas,
    cartoes: telaCartoes,
    fatura: () => telaFatura(argumento),
    orcamento: telaOrcamento,
    relatorios: telaRelatorios,
    metas: telaMetas,
    dividas: telaDividas,
  };

  return (telas[tela] || painel)();
}

async function carregar(mes = null) {
  const dados = await api(`/financas${mes ? `?mes=${mes}` : ""}`);
  estado.dados.financas = dados;
  return dados;
}

// ---------- painel do mês ----------

async function painel() {
  const dados = await carregar(estado.mesFinancas);
  const { projecao } = dados;

  const alertas = dados.alertas.length
    ? `<div class="secao"><h2>Vale olhar</h2>
        ${dados.alertas
          .map(
            (alerta) => `<div class="cartao" style="--acento:var(--atencao);border-color:color-mix(in oklab, var(--atencao) 35%, var(--borda))">
              <div class="item-info" style="margin:0"><span style="color:var(--atencao)">${icone("raio", 14)}</span>
                <span style="color:var(--tinta)">${escapar(alerta.texto)}</span></div></div>`
          )
          .join("")}</div>`
    : "";

  const envelopes = dados.orcamentos.length
    ? `<div class="secao"><h2>Orçamento do mês</h2>
        ${dados.orcamentos
          .slice(0, 6)
          .map((envelope) => {
            const cor =
              envelope.situacao === "estourou" ? "var(--critico)" : envelope.situacao === "atencao" ? "var(--atencao)" : "var(--ok)";
            const rotulo = envelope.situacao === "estourou" ? "estourou" : envelope.situacao === "atencao" ? "atenção" : "no limite";

            return `<div class="cartao" style="--acento:${cor};margin-bottom:8px">
              <div class="linha" style="padding:0 0 6px;border:0">
                <span>${escapar(envelope.categoria.icone)} ${escapar(envelope.categoria.nome)}</span>
                <strong class="numero">${reais(envelope.gasto)} <span class="sub">de ${reais(envelope.planejado)}</span></strong>
              </div>
              <div class="mapa-valor">${porcento(envelope.proporcao)} · ${rotulo}${
                envelope.resta >= 0 ? ` · resta ${reais(envelope.resta)}` : ` · passou ${reais(-envelope.resta)}`
              }</div>
              <div class="barra"><span style="width:${Math.min(100, envelope.proporcao * 100)}%;background:${cor}"></span></div>
            </div>`;
          })
          .join("")}</div>`
    : "";

  const cartoes = dados.cartoes.length
    ? `<div class="secao"><h2>Cartões</h2>
        ${dados.cartoes
          .map(
            (cartao) => `<button class="item" data-acao="ir:/dinheiro/fatura/${cartao.id}" style="--acento:${escapar(cartao.cor)}">
              <span class="caixa" style="border-color:color-mix(in oklab, ${escapar(cartao.cor)} 55%, var(--borda))">${escapar(cartao.icone)}</span>
              <span class="item-corpo">
                <span class="item-nome">${escapar(cartao.nome)}</span>
                <span class="item-info"><span>vence ${escapar(dataCurta(cartao.fatura_atual.vencimento))}</span>
                  ${cartao.limite ? `<span>${porcento(cartao.limite_usado)} do limite</span>` : ""}
                  ${cartao.comprometido_futuro > 0 ? `<span>${reais(cartao.comprometido_futuro)} nas próximas</span>` : ""}</span>
              </span>
              <strong class="numero">${reais(cartao.fatura_atual.total - cartao.fatura_atual.pago)}</strong>
            </button>`
          )
          .join("")}</div>`
    : "";

  const categorias = dados.por_categoria.length
    ? `<div class="secao"><h2>Onde foi o dinheiro</h2><div class="cartao">
        ${dados.por_categoria
          .slice(0, 8)
          .map((categoria) => {
            const maior = dados.por_categoria[0].total || 1;
            return `<div style="padding:9px 0">
              <div class="linha" style="padding:0;border:0">
                <span>${escapar(categoria.icone)} ${escapar(categoria.nome)}</span>
                <strong class="numero">${reais(categoria.total)}</strong>
              </div>
              <div class="barra" style="margin-top:6px;height:4px">
                <span style="width:${Math.round((categoria.total / maior) * 100)}%;background:${escapar(categoria.cor)}"></span></div>
            </div>`;
          })
          .join("")}</div></div>`
    : "";

  const ultimos = dados.lancamentos.length
    ? `<div class="secao"><h2>Últimos lançamentos</h2><div class="cartao">
        ${dados.lancamentos.map(linhaLancamento).join("")}</div>
        <button class="botao secundario" data-acao="ir:/dinheiro/extrato">Ver extrato completo</button></div>`
    : vazio("Nenhum lançamento neste mês.<br />Use o botão + ou o botão abaixo.", "dinheiro", {
        acao: "ir:/dinheiro/lancar",
        rotulo: "Lançar o primeiro",
      });

  return `<header class="topo">
      <div><h1>Dinheiro</h1><p class="sub">${escapar(nomeDoMes(dados.mes))}</p></div>
      <button class="link" data-acao="mes-anterior">${icone("voltar", 16)}</button>
    </header>

    <div class="cartao secao tres cartao-destaque" style="--acento:var(--c-dinheiro)">
      <div><small>entra</small><span style="color:var(--ok)">${reaisCurto(dados.receitas)}</span></div>
      <div><small>sai</small><span>${reaisCurto(dados.despesas)}</span></div>
      <div><small>sobra</small>
        <span style="color:${dados.sobra >= 0 ? "var(--ok)" : "var(--critico)"}">${reaisCurto(dados.sobra)}</span></div>
    </div>

    <div class="cartao">
      <div class="linha"><span>Saldo somado das contas</span><strong class="numero">${reais(dados.saldo_total)}</strong></div>
      <div class="linha"><span>Previsto para o fim do mês</span>
        <strong class="numero" style="color:${projecao.saldo_previsto >= 0 ? "var(--ok)" : "var(--critico)"}">
          ${reais(projecao.saldo_previsto)}</strong></div>
      ${dados.previstas > 0 ? `<div class="linha"><span>Parcelas ainda por vir no mês</span><strong class="numero">${reais(dados.previstas)}</strong></div>` : ""}
      <p class="sub">Conta o que é fixo e o seu ritmo de gasto até aqui.</p>
    </div>

    ${alertas}
    ${cartoes}
    ${envelopes}
    ${categorias}
    ${ultimos}

    <div class="secao"><h2>Mais</h2>
      <button class="botao" data-acao="ir:/dinheiro/lancar">Novo lançamento</button>
      <button class="botao secundario" data-acao="ir:/dinheiro/orcamento">Orçamento por categoria</button>
      <button class="botao secundario" data-acao="ir:/dinheiro/relatorios">Relatórios</button>
      <button class="botao secundario" data-acao="ir:/dinheiro/contas">Contas (${dados.contas.length})</button>
      <button class="botao secundario" data-acao="ir:/dinheiro/cartoes">Cartões (${dados.cartoes.length})</button>
      <button class="botao secundario" data-acao="ir:/dinheiro/metas">Metas financeiras (${dados.metas.length})</button>
      <button class="botao secundario" data-acao="ir:/dinheiro/dividas">Dívidas (${dados.dividas.length})</button>
    </div>`;
}

function nomeDoMes(mes) {
  return new Date(`${mes}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function linhaLancamento(linha) {
  const categorias = estado.dados.financas?.categorias || [];
  const categoria = categorias.find((c) => c.id === linha.categoria_id);
  const parcela = linha.parcela_num ? ` ${linha.parcela_num}/${linha.parcela_total}` : "";

  return `<button class="linha" style="width:100%;text-align:left" data-acao="lancamento-opcoes:${linha.id}">
    <span>${escapar(categoria?.icone || "📦")} ${escapar(linha.descricao || categoria?.nome || linha.categoria || "Sem descrição")}${parcela}
      <br /><small class="sub">${escapar(dataCurta(linha.data))} · ${escapar(categoria?.nome || linha.categoria || "sem categoria")}</small></span>
    <strong class="numero" style="color:${linha.tipo === "receita" ? "var(--ok)" : "var(--tinta)"}">
      ${linha.tipo === "receita" ? "+" : "−"} ${reais(linha.valor)}</strong>
  </button>`;
}

// ---------- lançar ----------

async function lancar() {
  const dados = estado.dados.financas || (await carregar());
  estado.rascunho = { tipo: "despesa", forma: "dinheiro" };

  const despesas = dados.categorias.filter((c) => c.tipo === "despesa").map((c) => ({ id: c.id, nome: `${c.icone} ${c.nome}` }));
  const receitas = dados.categorias.filter((c) => c.tipo === "receita").map((c) => ({ id: c.id, nome: `${c.icone} ${c.nome}` }));

  return `<header class="topo"><div><h1>Novo lançamento</h1></div></header>

    <div class="dias" style="grid-template-columns:1fr 1fr;margin-top:16px">
      <button class="dia-botao ativo" id="t-despesa" data-acao="tipo-lancamento:despesa"
              style="--acento:var(--critico)">Gasto</button>
      <button class="dia-botao" id="t-receita" data-acao="tipo-lancamento:receita"
              style="--acento:var(--ok)">Entrada</button>
    </div>

    <label class="campo"><span>Valor (R$)</span>
      <input id="l-valor" type="number" inputmode="decimal" step="0.01" placeholder="45,90" /></label>

    <label class="campo"><span>Categoria</span>
      <select id="l-categoria">${(despesas.length ? despesas : receitas)
        .map((c) => `<option value="${c.id}">${escapar(c.nome)}</option>`)
        .join("")}</select></label>
    <div id="l-categorias-receita" hidden>${JSON.stringify(receitas)}</div>
    <div id="l-categorias-despesa" hidden>${JSON.stringify(despesas)}</div>

    <label class="campo"><span>Descrição</span>
      <input id="l-descricao" placeholder="almoço, mercado do mês..." /></label>

    <label class="campo"><span>Forma de pagamento</span>
      ${selecao("l-forma", dados.formas, "dinheiro")}</label>

    <label class="campo"><span>Conta</span>
      ${selecao("l-conta", [{ id: "", nome: "— nenhuma —" }, ...dados.contas.map((c) => ({ id: c.id, nome: `${c.icone} ${c.nome}` }))], dados.contas[0]?.id || "")}</label>

    <label class="campo"><span>Cartão (só no crédito)</span>
      ${selecao("l-cartao", [{ id: "", nome: "— nenhum —" }, ...dados.cartoes.map((c) => ({ id: c.id, nome: `${c.icone} ${c.nome}` }))], "")}</label>

    <div class="dois">
      <label class="campo"><span>Parcelas</span>
        <input id="l-parcelas" type="number" min="1" max="60" value="1" /></label>
      <label class="campo"><span>Data</span>
        <input id="l-data" type="date" value="${dados.data}" /></label>
    </div>

    <p class="sub">No crédito, o app calcula sozinho em qual fatura cada parcela cai — respeitando o
      fechamento do cartão.</p>

    <button class="botao" data-acao="salvar-lancamento">Salvar</button>
    <button class="botao secundario" data-acao="ir:/dinheiro">Cancelar</button>`;
}

// ---------- extrato ----------

async function extrato() {
  const dados = estado.dados.financas || (await carregar());
  const { lancamentos } = await api(`/financas/lancamentos?mes=${dados.mes}&limite=200&futuros=1`);

  const porDia = {};
  for (const linha of lancamentos) (porDia[linha.data] ||= []).push(linha);

  const lista = Object.entries(porDia)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(
      ([data, linhas]) => `<div class="secao"><h2>${escapar(dataCurta(data))}</h2>
        <div class="cartao">${linhas.map(linhaLancamento).join("")}</div></div>`
    )
    .join("");

  return `<header class="topo"><div><h1>Extrato</h1><p class="sub">${escapar(nomeDoMes(dados.mes))} · ${plural(lancamentos.length, "lançamento", "lançamentos")}</p></div></header>
    ${lista || vazio("Nenhum lançamento neste mês.", "lista")}
    <button class="botao secundario" data-acao="ir:/dinheiro">Voltar</button>`;
}

// ---------- contas, cartões e fatura ----------

async function telaContas() {
  const dados = estado.dados.financas || (await carregar());

  return `<header class="topo"><div><h1>Contas</h1>
      <p class="sub">saldo somado: ${reais(dados.saldo_total)}</p></div></header>

    <div class="secao">${
      dados.contas.length
        ? dados.contas
            .map(
              (conta) => `<div class="item" style="--acento:${escapar(conta.cor)}">
                <span class="caixa" style="border-color:color-mix(in oklab, ${escapar(conta.cor)} 55%, var(--borda))">${escapar(conta.icone)}</span>
                <span class="item-corpo"><span class="item-nome">${escapar(conta.nome)}</span>
                  <span class="item-info"><span>${escapar(conta.tipo)}</span></span></span>
                <strong class="numero" style="color:${conta.saldo >= 0 ? "var(--tinta)" : "var(--critico)"}">${reais(conta.saldo)}</strong>
              </div>`
            )
            .join("")
        : vazio("Nenhuma conta cadastrada.", "dinheiro")
    }</div>

    <button class="botao" data-acao="conta-nova">Nova conta</button>
    <button class="botao secundario" data-acao="ir:/dinheiro">Voltar</button>`;
}

async function telaCartoes() {
  const dados = estado.dados.financas || (await carregar());

  return `<header class="topo"><div><h1>Cartões</h1></div></header>

    <div class="secao">${
      dados.cartoes.length
        ? dados.cartoes
            .map(
              (cartao) => `<div class="cartao" style="--acento:${escapar(cartao.cor)};margin-bottom:10px">
                <div class="linha" style="border:0;padding-bottom:4px">
                  <span class="item-nome">${escapar(cartao.icone)} ${escapar(cartao.nome)}</span>
                  <strong class="numero">${reais(cartao.fatura_atual.total)}</strong>
                </div>
                <div class="mapa-valor">fecha dia ${cartao.fechamento} · vence dia ${cartao.vencimento}
                  ${cartao.limite ? ` · limite ${reais(cartao.limite)}` : ""}</div>
                ${
                  cartao.limite
                    ? `<div class="barra"><span style="width:${Math.min(100, cartao.limite_usado * 100)}%;
                        background:${cartao.limite_usado > 0.8 ? "var(--atencao)" : escapar(cartao.cor)}"></span></div>`
                    : ""
                }
                <div class="item-info" style="margin-top:10px">
                  <span>próxima fatura: ${reais(cartao.fatura_proxima.total)}</span>
                  ${cartao.comprometido_futuro > 0 ? `<span>${reais(cartao.comprometido_futuro)} comprometidos</span>` : ""}
                </div>
                <button class="botao secundario" data-acao="ir:/dinheiro/fatura/${cartao.id}">Ver fatura</button>
              </div>`
            )
            .join("")
        : vazio("Nenhum cartão cadastrado.", "dinheiro")
    }</div>

    <button class="botao" data-acao="cartao-novo">Novo cartão</button>
    <button class="botao secundario" data-acao="ir:/dinheiro">Voltar</button>`;
}

async function telaFatura(cartaoId) {
  const dados = estado.dados.financas || (await carregar());
  const cartao = dados.cartoes.find((c) => c.id === cartaoId);
  if (!cartao) throw new Error("Cartão não encontrado");

  const mes = estado.mesFatura || cartao.fatura_atual.mes;
  const fatura = await api(`/financas/cartoes/${cartaoId}/fatura?mes=${mes}`);
  estado.rascunho = { cartaoId, mes, total: fatura.total - fatura.pago };

  return `<header class="topo">
      <div><h1>${escapar(cartao.nome)}</h1>
        <p class="sub">fatura de ${escapar(nomeDoMes(mes))} · vence dia ${cartao.vencimento}</p></div>
    </header>

    <div class="cartao secao cartao-destaque" style="--acento:${escapar(cartao.cor)}">
      <div class="linha" style="border:0"><span>Total da fatura</span>
        <strong class="numero" style="font-size:22px">${reais(fatura.total)}</strong></div>
      ${fatura.pago > 0 ? `<div class="linha"><span>Já pago</span><strong class="numero" style="color:var(--ok)">${reais(fatura.pago)}</strong></div>` : ""}
      ${
        fatura.total - fatura.pago > 0
          ? `<button class="botao" data-acao="pagar-fatura">Registrar pagamento</button>`
          : `<p class="sub">Fatura quitada.</p>`
      }
    </div>

    <div class="secao"><h2>${plural(fatura.itens.length, "compra", "compras")}</h2>
      <div class="cartao">${fatura.itens.length ? fatura.itens.map(linhaLancamento).join("") : `<p class="sub">Nada nesta fatura.</p>`}</div>
    </div>

    <div class="dias" style="grid-template-columns:1fr 1fr">
      <button class="dia-botao" data-acao="fatura-mes:-1">${icone("voltar", 14)} anterior</button>
      <button class="dia-botao" data-acao="fatura-mes:1">próxima</button>
    </div>
    <button class="botao secundario" data-acao="ir:/dinheiro/cartoes">Voltar</button>`;
}

// ---------- orçamento ----------

async function telaOrcamento() {
  const dados = estado.dados.financas || (await carregar());
  const gastoPorId = Object.fromEntries(dados.por_categoria.map((c) => [c.id, c.total]));

  const linhas = dados.categorias
    .filter((c) => c.tipo === "despesa")
    .map((categoria) => {
      const envelope = dados.orcamentos.find((o) => o.categoria.id === categoria.id);
      const gasto = gastoPorId[categoria.id] || 0;

      return `<button class="linha" style="width:100%;text-align:left" data-acao="definir-teto:${categoria.id}">
        <span>${escapar(categoria.icone)} ${escapar(categoria.nome)}
          <br /><small class="sub">${envelope ? `teto ${reais(envelope.planejado)}` : "sem teto"} · gasto ${reais(gasto)}</small></span>
        ${
          envelope
            ? `<span class="numero" style="color:${
                envelope.situacao === "estourou" ? "var(--critico)" : envelope.situacao === "atencao" ? "var(--atencao)" : "var(--ok)"
              }">${porcento(envelope.proporcao)}</span>`
            : `<span class="sub">definir</span>`
        }
      </button>`;
    })
    .join("");

  const regra = dados.regra_502030
    .map(
      (faixa) => `<div style="padding:9px 0">
        <div class="linha" style="padding:0;border:0"><span>${escapar(faixa.nome)}</span>
          <strong class="numero">${reais(faixa.real)} <span class="sub">de ${reais(faixa.alvo)}</span></strong></div>
        <div class="barra" style="height:4px;margin-top:6px"><span style="width:${
          faixa.alvo > 0 ? Math.min(100, (faixa.real / faixa.alvo) * 100) : 0
        }%;background:${faixa.real > faixa.alvo ? "var(--atencao)" : "var(--ok)"}"></span></div>
      </div>`
    )
    .join("");

  return `<header class="topo"><div><h1>Orçamento</h1>
      <p class="sub">${escapar(nomeDoMes(dados.mes))} · toque numa categoria para definir o teto</p></div></header>

    <div class="secao"><h2>Regra 50/30/20</h2><div class="cartao">${regra}</div>
      <p class="sub">Metade para o que é essencial, 30% para estilo de vida, 20% para poupar.</p></div>

    <div class="secao"><h2>Envelopes</h2><div class="cartao">${linhas}</div></div>
    <button class="botao secundario" data-acao="ir:/dinheiro">Voltar</button>`;
}

// ---------- relatórios ----------

async function telaRelatorios() {
  const dados = await api("/financas/relatorios?meses=6");

  const mesAMes = barras(
    dados.por_mes.map((mes) => ({
      rotulo: mes.mes.slice(5),
      valor: mes.despesas,
      destaque: mes.sobra >= 0,
    })),
    { cor: "var(--c-dinheiro)", formatar: reais, acaoToque: "ver-ponto" }
  );

  const semana = barras(
    dados.por_dia_semana.map((dia) => ({ rotulo: dia.nome.slice(0, 3), valor: dia.total, destaque: true })),
    { cor: "var(--c-dinheiro)", formatar: reais, acaoToque: "ver-ponto" }
  );

  const lista = (titulo, itens, formatar = reais) =>
    itens.length
      ? `<div class="secao"><h2>${titulo}</h2><div class="cartao">
          ${itens
            .slice(0, 8)
            .map(
              (item) => `<div class="linha"><span>${escapar(item.nome || item.descricao)}</span>
                <strong class="numero">${formatar(item.total ?? item.valor)}</strong></div>`
            )
            .join("")}</div></div>`
      : "";

  return `<header class="topo"><div><h1>Relatórios</h1><p class="sub">últimos ${dados.meses} meses</p></div></header>

    <div class="secao"><h2>Gasto por mês</h2>${mesAMes}
      <div class="cartao" style="margin-top:12px">
        ${dados.por_mes
          .slice(-3)
          .reverse()
          .map(
            (mes) => `<div class="linha"><span>${escapar(mes.mes)}</span>
              <span class="numero"><span style="color:var(--ok)">${reais(mes.receitas)}</span> ·
              ${reais(mes.despesas)} ·
              <strong style="color:${mes.sobra >= 0 ? "var(--ok)" : "var(--critico)"}">${reais(mes.sobra)}</strong></span></div>`
          )
          .join("")}
      </div></div>

    ${lista("Por categoria", dados.por_categoria)}
    ${lista("Por forma de pagamento", dados.por_forma)}
    <div class="secao"><h2>Por dia da semana</h2>${semana}</div>
    ${lista("Maiores gastos", dados.maiores)}

    <button class="botao secundario" data-acao="ir:/dinheiro">Voltar</button>`;
}

// ---------- metas e dívidas ----------

async function telaMetas() {
  const dados = estado.dados.financas || (await carregar());

  const lista = dados.metas.length
    ? dados.metas
        .map(
          (meta) => `<div class="cartao" style="--acento:var(--c-dinheiro);margin-bottom:10px">
            <div class="linha" style="border:0;padding-bottom:4px">
              <span class="item-nome">${escapar(meta.titulo)}</span>
              <strong class="numero">${reais(meta.valor_atual)} <span class="sub">de ${reais(meta.valor_alvo)}</span></strong>
            </div>
            <div class="mapa-valor">${porcento(meta.progresso)}${meta.prazo ? ` · até ${escapar(dataCurta(meta.prazo))}` : ""}</div>
            <div class="barra"><span style="width:${Math.min(100, meta.progresso * 100)}%"></span></div>
            <button class="botao secundario" data-acao="meta-aportar:${meta.id}">Registrar aporte</button>
          </div>`
        )
        .join("")
    : vazio("Nenhuma meta financeira.<br />Reserva de emergência é um bom começo.", "metas");

  return `<header class="topo"><div><h1>Metas financeiras</h1></div></header>
    <div class="secao">${lista}</div>
    <button class="botao" data-acao="meta-financeira-nova">Nova meta</button>
    <button class="botao secundario" data-acao="ir:/dinheiro">Voltar</button>`;
}

async function telaDividas() {
  const dados = estado.dados.financas || (await carregar());
  const { avalanche, bola_de_neve: bola } = dados.plano_quitacao;

  const lista = dados.dividas.length
    ? dados.dividas
        .map(
          (divida) => `<div class="linha">
            <span>${escapar(divida.nome)}
              <br /><small class="sub">${numero(divida.juros_mes)}% ao mês · mínimo ${reais(divida.parcela_min)}</small></span>
            <strong class="numero">${reais(divida.saldo_atual)}</strong>
          </div>`
        )
        .join("")
    : "";

  const comparacao = dados.dividas.length
    ? `<div class="secao"><h2>Como atacar</h2>
        ${[
          ["Avalanche (maior juros primeiro)", avalanche, "paga menos juros no total"],
          ["Bola de neve (menor saldo primeiro)", bola, "quita a primeira mais rápido, dá motivação"],
        ]
          .map(
            ([nome, plano, motivo]) => `<div class="cartao" style="margin-bottom:10px;--acento:var(--c-dinheiro)">
              <div class="item-nome">${escapar(nome)}</div>
              <p class="sub">${escapar(motivo)}</p>
              ${
                plano.nunca_quita
                  ? `<p class="sub" style="color:var(--critico)">Com o pagamento atual essa dívida não fecha — os juros
                      crescem mais rápido que o pagamento.</p>`
                  : `<div class="item-info"><span>${plural(plano.meses, "mês", "meses")} até quitar</span>
                      <span>${reais(plano.total_juros)} de juros</span>
                      <span>${reais(plano.parcela_total)}/mês</span></div>
                     <div class="mapa-valor" style="margin-top:8px">ordem: ${plano.ordem.map(escapar).join(" → ")}</div>`
              }
            </div>`
          )
          .join("")}</div>`
    : "";

  return `<header class="topo"><div><h1>Dívidas</h1></div></header>
    ${lista ? `<div class="cartao secao">${lista}</div>` : vazio("Nenhuma dívida cadastrada. 🎉", "dinheiro")}
    ${comparacao}
    <button class="botao" data-acao="divida-nova">Cadastrar dívida</button>
    <button class="botao secundario" data-acao="ir:/dinheiro">Voltar</button>`;
}

// ---------- ações ----------

export const acoes = {
  "tipo-lancamento"(tipo) {
    estado.rascunho.tipo = tipo;
    $("#t-despesa").classList.toggle("ativo", tipo === "despesa");
    $("#t-receita").classList.toggle("ativo", tipo === "receita");

    const opcoes = JSON.parse($(`#l-categorias-${tipo === "despesa" ? "despesa" : "receita"}`).textContent);
    $("#l-categoria").innerHTML = opcoes.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");
  },

  async "salvar-lancamento"() {
    const valor = Number(String($("#l-valor").value).replace(",", "."));
    if (!valor) return avisar("Informe o valor");

    const corpo = {
      valor,
      tipo: estado.rascunho.tipo,
      categoria_id: $("#l-categoria").value || null,
      descricao: $("#l-descricao").value.trim() || null,
      forma_pagamento: $("#l-forma").value,
      conta_id: $("#l-conta").value || null,
      cartao_id: $("#l-cartao").value || null,
      parcelas: Number($("#l-parcelas").value) || 1,
      data: $("#l-data").value,
    };

    if (corpo.forma_pagamento === "credito" && !corpo.cartao_id) return avisar("Escolha o cartão");

    try {
      const resposta = await api("/financas", { method: "POST", body: JSON.stringify(corpo) });
      estado.dados.financas = null;
      avisar(resposta.parcelas > 1 ? `Lançado em ${resposta.parcelas} parcelas` : "Lançado");
      navegar("/dinheiro");
    } catch (erro) {
      if (erro.message !== "sessao") avisar(erro.message);
    }
  },

  "lancamento-opcoes"(id) {
    abrirPainel(`<div class="titulo">Lançamento</div>
      <button data-acao="lancamento-excluir:${id}">Excluir (a compra inteira, se for parcelada)</button>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "lancamento-excluir"(id) {
    fecharPainel();
    estado.dados.financas = null;
    await acaoApi(`/financas/lancamentos/${id}`, { method: "DELETE" }, "Excluído");
  },

  async "mes-anterior"() {
    const atual = estado.dados.financas?.mes || new Date().toISOString().slice(0, 7);
    const [ano, mes] = atual.split("-").map(Number);
    const total = ano * 12 + (mes - 1) - 1;
    estado.mesFinancas = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
    estado.dados.financas = null;
    navegar("/dinheiro");
  },

  async "fatura-mes"(passo) {
    const atual = estado.rascunho.mes;
    const [ano, mes] = atual.split("-").map(Number);
    const total = ano * 12 + (mes - 1) + Number(passo);
    estado.mesFatura = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
    navegar(`/dinheiro/fatura/${estado.rascunho.cartaoId}`);
  },

  async "pagar-fatura"() {
    const dados = estado.dados.financas;
    const { cartaoId, mes, total } = estado.rascunho;
    const conta = dados.contas[0];
    if (!conta) return avisar("Cadastre uma conta antes de pagar a fatura");

    const valor = prompt(`Valor pago (fatura: R$ ${total.toFixed(2)}):`, total.toFixed(2));
    if (!valor) return;

    estado.dados.financas = null;
    await acaoApi(
      `/financas/cartoes/${cartaoId}/pagar`,
      { method: "POST", body: JSON.stringify({ mes, conta_id: conta.id, valor: Number(String(valor).replace(",", ".")) }) },
      "Pagamento registrado"
    );
  },

  async "definir-teto"(categoriaId) {
    const dados = estado.dados.financas;
    const envelope = dados.orcamentos.find((o) => o.categoria.id === categoriaId);
    const valor = prompt("Teto mensal (R$), 0 para remover:", envelope ? envelope.planejado : "");
    if (valor === null) return;

    estado.dados.financas = null;
    await acaoApi(
      "/financas/orcamentos",
      { method: "POST", body: JSON.stringify({ mes: dados.mes, categoria_id: categoriaId, valor_planejado: Number(valor) || 0 }) },
      "Teto definido"
    );
  },

  async "conta-nova"() {
    const nome = prompt("Nome da conta (ex: Nubank):");
    if (!nome) return;
    const saldo = prompt("Saldo atual (R$):", "0");
    if (saldo === null) return;

    estado.dados.financas = null;
    await acaoApi(
      "/financas/contas",
      { method: "POST", body: JSON.stringify({ nome, saldo_inicial: Number(String(saldo).replace(",", ".")) || 0 }) },
      "Conta criada"
    );
  },

  async "cartao-novo"() {
    const nome = prompt("Nome do cartão:");
    if (!nome) return;
    const fechamento = prompt("Dia do FECHAMENTO da fatura (1 a 28):", "20");
    if (!fechamento) return;
    const vencimento = prompt("Dia do VENCIMENTO (1 a 28):", "1");
    if (!vencimento) return;
    const limite = prompt("Limite (R$), pode deixar vazio:", "");

    estado.dados.financas = null;
    await acaoApi(
      "/financas/cartoes",
      {
        method: "POST",
        body: JSON.stringify({
          nome,
          fechamento: Number(fechamento),
          vencimento: Number(vencimento),
          limite: limite ? Number(String(limite).replace(",", ".")) : null,
        }),
      },
      "Cartão criado"
    );
  },

  async "meta-financeira-nova"() {
    const titulo = prompt("Meta (ex: Reserva de emergência):");
    if (!titulo) return;
    const alvo = prompt("Quanto quer juntar (R$):");
    if (!alvo) return;

    estado.dados.financas = null;
    await acaoApi(
      "/financas/metas",
      { method: "POST", body: JSON.stringify({ titulo, valor_alvo: Number(String(alvo).replace(",", ".")) }) },
      "Meta criada"
    );
  },

  async "meta-aportar"(id) {
    const meta = estado.dados.financas.metas.find((m) => m.id === id);
    const valor = prompt("Quanto guardou agora (R$)?", "");
    if (!valor) return;

    estado.dados.financas = null;
    await acaoApi(
      `/financas/metas/${id}`,
      { method: "PUT", body: JSON.stringify({ valor_atual: Number(meta.valor_atual) + Number(String(valor).replace(",", ".")) }) },
      "Aporte registrado"
    );
  },

  async "divida-nova"() {
    const nome = prompt("Nome da dívida:");
    if (!nome) return;
    const saldo = prompt("Saldo devedor (R$):");
    if (!saldo) return;
    const juros = prompt("Juros ao mês (%), ex: 12:", "0");
    const minimo = prompt("Parcela mínima (R$):", "0");

    estado.dados.financas = null;
    await acaoApi(
      "/financas/dividas",
      {
        method: "POST",
        body: JSON.stringify({
          nome,
          saldo_atual: Number(String(saldo).replace(",", ".")),
          juros_mes: Number(String(juros || 0).replace(",", ".")),
          parcela_min: Number(String(minimo || 0).replace(",", ".")),
        }),
      },
      "Dívida cadastrada"
    );
  },
};
