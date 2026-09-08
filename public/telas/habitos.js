import { $, abrirPainel, acaoApi, api, avisar, escapar, estado, fecharPainel, navegar, vazio } from "../ui.js";
import { icone } from "../icones.js";

export const rota = /^\/habitos(?:\/(.+))?$/;
export const aba = "hoje";

const EMOJIS = ["✅", "💧", "🏋️", "🥗", "📖", "🧘", "🏃", "💊", "🦷", "☀️", "🌙", "🧹", "💻", "🎸", "🙏", "🚭"];
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const PERIODOS = { manha: "manhã", tarde: "tarde", noite: "noite", qualquer: "quando der" };

export async function render(parametro) {
  if (parametro) return formulario(parametro);

  const { habitos } = await api("/habitos");
  estado.dados.habitos = habitos;

  const lista = habitos.length
    ? habitos
        .map(
          (h) => `<button class="item" data-acao="ir:/habitos/${h.id}">
            <span class="caixa" style="border-color:${escapar(h.cor)}">${escapar(h.emoji)}</span>
            <span class="item-corpo">
              <span class="item-nome">${escapar(h.nome)}</span>
              <span class="item-info"><span>${escapar(h.frequencia_texto)}</span>
                <span>${escapar(PERIODOS[h.periodo])}</span>
                ${h.streak ? `<span style="color:var(--c-metas)">${icone("chama", 12)} ${h.streak}</span>` : ""}
                ${h.nao_negociavel ? "<span>âncora</span>" : ""}</span>
            </span>
          </button>`
        )
        .join("")
    : vazio("Nenhum hábito ainda.", "raio");

  return `<header class="topo"><h1>Hábitos</h1></header>
    <div class="secao">${lista}</div>
    <button class="botao" data-acao="ir:/habitos/novo">Novo hábito</button>
    <button class="botao secundario" data-acao="ir:/hoje">Voltar para Hoje</button>`;
}

async function formulario(id) {
  const novo = id === "novo";
  let habito = {
    nome: "", emoji: "✅", cor: "#3ba9f4", periodo: "manha", horario: "",
    frequencia: { tipo: "diaria" }, meta_qtd: "", unidade: "", nao_negociavel: false,
  };

  if (!novo) {
    const habitos = estado.dados.habitos || (await api("/habitos")).habitos;
    const achado = habitos.find((h) => h.id === id);
    if (!achado) throw new Error("Hábito não encontrado");
    habito = { ...habito, ...achado };
  }

  estado.rascunho = { id: novo ? null : id, frequencia: { ...habito.frequencia } };
  const f = estado.rascunho.frequencia;

  return `<header class="topo"><h1>${novo ? "Novo hábito" : "Editar hábito"}</h1></header>

    <label class="campo"><span>Nome</span>
      <input id="f-nome" value="${escapar(habito.nome)}" placeholder="Ex: Beber água ao acordar" /></label>

    <div class="dois">
      <label class="campo"><span>Ícone</span>
        <select id="f-emoji">${EMOJIS.map((e) => `<option ${e === habito.emoji ? "selected" : ""}>${e}</option>`).join("")}</select></label>
      <label class="campo"><span>Cor</span><input id="f-cor" type="color" value="${escapar(habito.cor)}" /></label>
    </div>

    <div class="dois">
      <label class="campo"><span>Período</span>
        <select id="f-periodo">${Object.entries(PERIODOS)
          .map(([valor, rotulo]) => `<option value="${valor}" ${habito.periodo === valor ? "selected" : ""}>${rotulo}</option>`)
          .join("")}</select></label>
      <label class="campo"><span>Horário (opcional)</span>
        <input id="f-horario" type="time" value="${escapar(habito.horario || "")}" /></label>
    </div>

    <label class="campo"><span>Frequência</span>
      <select id="f-freq-tipo" data-acao="mudar-frequencia">
        ${[
          ["diaria", "Todo dia"],
          ["dias_semana", "Dias da semana"],
          ["vezes_semana", "X vezes por semana"],
          ["cada_n_dias", "A cada N dias"],
        ]
          .map(([valor, rotulo]) => `<option value="${valor}" ${f.tipo === valor ? "selected" : ""}>${rotulo}</option>`)
          .join("")}
      </select></label>
    <div id="freq-detalhe">${detalheFrequencia(f)}</div>

    <div class="dois">
      <label class="campo"><span>Meta (opcional)</span>
        <input id="f-meta" type="number" inputmode="decimal" value="${escapar(habito.meta_qtd ?? "")}" placeholder="30" /></label>
      <label class="campo"><span>Unidade</span>
        <input id="f-unidade" value="${escapar(habito.unidade || "")}" placeholder="min, páginas..." /></label>
    </div>

    <label class="marca-linha">
      <input id="f-ancora" type="checkbox" ${habito.nao_negociavel ? "checked" : ""} />
      <span>Não-negociável — se eu fizer só os âncoras, o dia já conta como bom</span>
    </label>

    <button class="botao" data-acao="salvar-habito">Salvar</button>
    <button class="botao secundario" data-acao="ir:/habitos">Cancelar</button>
    ${novo ? "" : `<button class="botao perigo" data-acao="excluir-habito">Excluir hábito</button>`}`;
}

function detalheFrequencia(f) {
  if (f.tipo === "dias_semana") {
    return `<div class="dias">${DIAS.map(
      (dia, i) => `<button class="dia-botao ${(f.dias || []).includes(i) ? "ativo" : ""}" data-acao="dia:${i}">${dia}</button>`
    ).join("")}</div>`;
  }
  if (f.tipo === "vezes_semana") {
    return `<label class="campo"><span>Quantas vezes por semana</span>
      <input id="f-vezes" type="number" min="1" max="7" value="${f.vezes || 3}" /></label>`;
  }
  if (f.tipo === "cada_n_dias") {
    return `<label class="campo"><span>A cada quantos dias</span>
      <input id="f-n" type="number" min="1" max="90" value="${f.n || 2}" /></label>`;
  }
  return "";
}

function acharItem(id) {
  return (estado.dados.hoje?.periodos || []).flatMap((p) => p.itens).find((i) => i.id === id);
}

export const acoes = {
  async "habito-marcar"(id) {
    const item = acharItem(id);
    let quantidade = null;

    if (item?.meta_qtd && !item.concluido) {
      const resposta = prompt(`Quanto? (meta: ${item.meta_qtd}${item.unidade ? ` ${item.unidade}` : ""})`, item.meta_qtd);
      if (resposta === null) return;
      quantidade = Number(String(resposta).replace(",", ".")) || null;
    }

    await acaoApi(`/habitos/${id}/marcar`, {
      method: "POST",
      body: JSON.stringify({ concluido: !item?.concluido, quantidade }),
    });
  },

  "habito-opcoes"(id) {
    const item = acharItem(id);
    if (!item) return;

    abrirPainel(`<div class="titulo">${escapar(item.emoji)} ${escapar(item.nome)}</div>
      <button data-acao="habito-historico:${id}">Ver histórico</button>
      ${item.de_folga ? "" : `<button data-acao="habito-folga:${id}">🛌 Marcar dia de folga</button>`}
      <button data-acao="ir:/habitos/${id}">Editar hábito</button>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "habito-historico"(id) {
    const dados = await api(`/habitos/${id}/historico?dias=182`);
    const celulas = dados.dias
      .map((d) => {
        const classe = !d.devido ? "fora" : d.concluido ? "feito" : d.folga ? "folga" : "falhou";
        return `<i class="${classe}" title="${d.data}"></i>`;
      })
      .join("");

    abrirPainel(`<div class="titulo">${escapar(dados.habito.emoji)} ${escapar(dados.habito.nome)} · 🔥 ${dados.streak} dias</div>
      <div style="padding:10px 14px"><div class="heat" style="--acento:var(--c-rotina)">${celulas}</div>
        <p class="sub">verde = feito · amarelo = folga · vermelho = falhou · últimos 6 meses</p></div>
      <button data-acao="fechar-painel">Fechar</button>`);
  },

  async "habito-folga"(id) {
    fecharPainel();
    await acaoApi(`/habitos/${id}/folga`, { method: "POST", body: "{}" }, "Folga registrada — sua sequência continua");
  },

  "mudar-frequencia"() {
    estado.rascunho.frequencia = { tipo: $("#f-freq-tipo").value, dias: [], vezes: 3, n: 2 };
    $("#freq-detalhe").innerHTML = detalheFrequencia(estado.rascunho.frequencia);
  },

  dia(indice) {
    const dias = estado.rascunho.frequencia.dias || [];
    const numero = Number(indice);
    estado.rascunho.frequencia.dias = dias.includes(numero) ? dias.filter((d) => d !== numero) : [...dias, numero].sort();
    $("#freq-detalhe").innerHTML = detalheFrequencia(estado.rascunho.frequencia);
  },

  async "salvar-habito"() {
    const frequencia = { tipo: $("#f-freq-tipo").value };
    if (frequencia.tipo === "dias_semana") frequencia.dias = estado.rascunho.frequencia.dias || [];
    if (frequencia.tipo === "vezes_semana") frequencia.vezes = Number($("#f-vezes").value) || 3;
    if (frequencia.tipo === "cada_n_dias") frequencia.n = Number($("#f-n").value) || 2;

    const corpo = {
      nome: $("#f-nome").value.trim(),
      emoji: $("#f-emoji").value,
      cor: $("#f-cor").value,
      periodo: $("#f-periodo").value,
      horario: $("#f-horario").value || null,
      frequencia,
      meta_qtd: $("#f-meta").value ? Number($("#f-meta").value) : null,
      unidade: $("#f-unidade").value.trim() || null,
      nao_negociavel: $("#f-ancora").checked,
    };

    const id = estado.rascunho.id;
    try {
      await api(id ? `/habitos/${id}` : "/habitos", { method: id ? "PUT" : "POST", body: JSON.stringify(corpo) });
      estado.dados.habitos = null;
      avisar("Hábito salvo");
      navegar("/hoje");
    } catch (erro) {
      if (erro.message !== "sessao") avisar(erro.message);
    }
  },

  async "excluir-habito"() {
    if (!confirm("Excluir o hábito e todo o histórico dele?")) return;
    await api(`/habitos/${estado.rascunho.id}`, { method: "DELETE" });
    estado.dados.habitos = null;
    navegar("/habitos");
  },
};
