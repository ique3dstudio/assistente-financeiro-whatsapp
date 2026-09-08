// Life OS — casca do app: 5 abas, roteamento por hash e as telas.
// Cada tela é uma função que devolve HTML; os cliques são tratados por delegação,
// olhando o atributo data-acao. Sem framework, para o app abrir instantâneo.

const $ = (s) => document.querySelector(s);
const conteudo = $("#conteudo");

const estado = { abas: [], modulos: [], rota: "/hoje", dados: {}, rascunho: null };

// ---------- utilidades ----------

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: { "Content-Type": "application/json", ...(opcoes.headers || {}) },
  });

  if (resposta.status === 401) {
    mostrarLogin();
    throw new Error("sessao");
  }

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || "Algo deu errado");
  return dados;
}

let avisoTimer;
function avisar(texto) {
  const aviso = $("#aviso");
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => (aviso.hidden = true), 3000);
}

const escapar = (texto) =>
  String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const litros = (ml) => `${(ml / 1000).toFixed(1).replace(".", ",")} L`;
const reais = (valor) => `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
const porcento = (fracao) => `${Math.round((fracao || 0) * 100)}%`;

function dataLonga(dataISO) {
  return new Date(`${dataISO}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function anel(progresso, cor, valor, nome, acao = "") {
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

// ---------- telas ----------

async function telaHoje() {
  const dados = await api("/hoje");
  estado.dados.hoje = dados;

  const aneis = dados.aneis
    .map((item) =>
      item.indisponivel
        ? anel(0, "var(--erro)", "!", item.nome, `erro:${escapar(item.erro)}`)
        : anel(item.progresso ?? 0, "var(--marca)", item.principal ?? "—", item.nome, `abrir:${item.id}`)
    )
    .join("");

  const periodos = dados.periodos
    .map(
      (periodo) => `<section class="periodo">
        <h2>${periodo.nome}</h2>
        ${periodo.itens.map(itemChecklist).join("")}
      </section>`
    )
    .join("");

  const semNada = `<div class="vazio">
      Nenhum hábito para hoje ainda.<br />Comece cadastrando 3 que você já faz — sequência nasce do fácil.
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

    ${dados.total ? periodos : semNada}

    ${
      dados.total
        ? `<button class="botao secundario" data-acao="ir:/habitos">Gerenciar hábitos</button>`
        : ""
    }
    ${
      dados.mostrar_fechamento
        ? `<div class="cartao secao"><h3>Fechamento do dia</h3>
             <p class="sub">Humor, nota e revisão chegam na etapa E1.9.</p></div>`
        : ""
    }
    ${dados.erros.length ? `<p class="sub secao">⚠️ ${escapar(dados.erros[0])}</p>` : ""}
  `;
}

function itemChecklist(item) {
  const info = [
    item.horario,
    item.frequencia_texto !== "todo dia" ? item.frequencia_texto : null,
    item.streak ? `🔥 ${item.streak}` : null,
    item.meta_qtd ? `meta ${item.meta_qtd}${item.unidade ? ` ${item.unidade}` : ""}` : null,
    item.de_folga ? "🛌 folga" : null,
  ]
    .filter(Boolean)
    .map((texto) => `<span>${escapar(texto)}</span>`)
    .join("");

  return `<div class="item ${item.concluido ? "feito" : ""}">
    <button class="caixa" data-acao="marcar:${item.id}" style="${item.concluido ? `background:${escapar(item.cor)};` : ""}">
      ${item.concluido ? "✓" : ""}
    </button>
    <button class="item-corpo" data-acao="marcar:${item.id}" style="background:none;border:0;padding:0;text-align:left">
      <span class="item-nome">${escapar(item.emoji)} ${escapar(item.nome)}
        ${item.nao_negociavel ? '<span class="ancora">âncora</span>' : ""}</span>
      ${info ? `<span class="item-info">${info}</span>` : ""}
    </button>
    <button class="mais" data-acao="opcoes:${item.id}">···</button>
  </div>`;
}

async function telaHabitos() {
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
                <span>${escapar({ manha: "manhã", tarde: "tarde", noite: "noite", qualquer: "quando der" }[h.periodo])}</span>
                ${h.streak ? `<span>🔥 ${h.streak}</span>` : ""}
                ${h.nao_negociavel ? "<span>âncora</span>" : ""}</span>
            </span>
          </button>`
        )
        .join("")
    : `<div class="vazio">Nenhum hábito ainda.</div>`;

  return `<header class="topo"><h1>Hábitos</h1></header>
    <div class="secao">${lista}</div>
    <button class="botao" data-acao="ir:/habitos/novo">Novo hábito</button>
    <button class="botao secundario" data-acao="ir:/hoje">Voltar para Hoje</button>`;
}

const EMOJIS = ["✅", "💧", "🏋️", "🥗", "📖", "🧘", "🏃", "💊", "🦷", "☀️", "🌙", "🧹", "💻", "🎸", "🙏"];
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

async function telaHabitoForm(id) {
  const novo = !id || id === "novo";
  let habito = { nome: "", emoji: "✅", cor: "#3ba9f4", periodo: "manha", horario: "", duracao_min: "", frequencia: { tipo: "diaria" }, meta_qtd: "", unidade: "", nao_negociavel: false };

  if (!novo) {
    const { habitos } = estado.dados.habitos ? { habitos: estado.dados.habitos } : await api("/habitos");
    const achado = habitos.find((h) => h.id === id);
    if (!achado) throw new Error("Hábito não encontrado");
    habito = { ...habito, ...achado };
  }

  estado.rascunho = { ...habito, id: novo ? null : id, frequencia: { ...habito.frequencia } };
  const f = estado.rascunho.frequencia;

  return `<header class="topo"><h1>${novo ? "Novo hábito" : "Editar hábito"}</h1></header>

    <label class="campo"><span>Nome</span>
      <input id="f-nome" value="${escapar(habito.nome)}" placeholder="Ex: Beber água ao acordar" /></label>

    <div class="dois">
      <label class="campo"><span>Ícone</span>
        <select id="f-emoji">${EMOJIS.map((e) => `<option ${e === habito.emoji ? "selected" : ""}>${e}</option>`).join("")}</select></label>
      <label class="campo"><span>Cor</span>
        <input id="f-cor" type="color" value="${escapar(habito.cor)}" /></label>
    </div>

    <div class="dois">
      <label class="campo"><span>Período</span>
        <select id="f-periodo">
          ${["manha:Manhã", "tarde:Tarde", "noite:Noite", "qualquer:Quando der"]
            .map((par) => {
              const [valor, rotulo] = par.split(":");
              return `<option value="${valor}" ${habito.periodo === valor ? "selected" : ""}>${rotulo}</option>`;
            })
            .join("")}
        </select></label>
      <label class="campo"><span>Horário (opcional)</span>
        <input id="f-horario" type="time" value="${escapar(habito.horario || "")}" /></label>
    </div>

    <label class="campo"><span>Frequência</span>
      <select id="f-freq-tipo" data-acao="mudar-frequencia">
        ${["diaria:Todo dia", "dias_semana:Dias da semana", "vezes_semana:X vezes por semana", "cada_n_dias:A cada N dias"]
          .map((par) => {
            const [valor, rotulo] = par.split(":");
            return `<option value="${valor}" ${f.tipo === valor ? "selected" : ""}>${rotulo}</option>`;
          })
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

async function telaAgua() {
  const dados = await api("/agua");
  const volta = 2 * Math.PI * 86;

  const maior = Math.max(dados.meta, ...dados.historico.map((d) => d.total)) || 1;
  const barras = dados.historico
    .map(
      ({ data, total, bateu }) => `<div class="dia" title="${data}: ${litros(total)}">
        <div class="dia-barra ${bateu ? "bateu" : ""}" style="height:${Math.round((total / maior) * 100)}%"></div>
        <div class="dia-rotulo">${data.slice(8, 10)}</div>
      </div>`
    )
    .join("");

  return `<header class="topo">
      <h1>💧 Água</h1>
      <button class="link" data-acao="meta-agua">meta</button>
    </header>

    <div class="anel-area">
      <svg class="anel-grande" viewBox="0 0 200 200">
        <circle class="anel-fundo" cx="100" cy="100" r="86"></circle>
        <circle class="anel-frente" cx="100" cy="100" r="86"
                stroke-dasharray="${volta.toFixed(1)}" stroke-dashoffset="${(volta * (1 - dados.progresso)).toFixed(1)}"></circle>
      </svg>
      <div class="anel-texto">
        <strong>${litros(dados.total)}</strong>
        <span class="sub">de ${litros(dados.meta)}</span>
        ${dados.sequencia ? `<span class="selo">🔥 ${dados.sequencia} dias seguidos</span>` : ""}
      </div>
    </div>

    <div class="botoes">
      ${[200, 300, 500, 750].map((ml) => `<button class="copo" data-acao="agua:${ml}">+${ml}<small>ml</small></button>`).join("")}
    </div>
    <button class="link centro" data-acao="agua-desfazer">desfazer último</button>

    <div class="secao"><h2>Últimos 14 dias</h2><div class="historico">${barras}</div></div>
    <button class="botao secundario" data-acao="ir:/hoje">Voltar para Hoje</button>`;
}

async function telaDinheiro() {
  const dados = await api("/financas");
  const sobra = dados.receitas - dados.despesas;

  const lancamentos = dados.lancamentos.length
    ? dados.lancamentos
        .map(
          (l) => `<div class="linha">
            <span>${escapar(l.descricao || l.categoria)}<br /><small class="sub">${escapar(l.data)} · ${escapar(l.categoria)}</small></span>
            <strong style="color:${l.tipo === "receita" ? "var(--ok)" : "var(--texto)"}">${l.tipo === "receita" ? "+" : "−"} ${reais(l.valor)}</strong>
          </div>`
        )
        .join("")
    : `<div class="vazio">Nenhum lançamento este mês.</div>`;

  const categorias = dados.por_categoria.length
    ? dados.por_categoria.map((c) => `<div class="linha"><span>${escapar(c.categoria)}</span><strong>${reais(c.total)}</strong></div>`).join("")
    : "";

  return `<header class="topo"><h1>💰 Dinheiro</h1></header>

    <div class="cartao secao tres">
      <div><small>entra</small><span style="color:var(--ok)">${reais(dados.receitas)}</span></div>
      <div><small>sai</small><span>${reais(dados.despesas)}</span></div>
      <div><small>sobra</small><span style="color:${sobra >= 0 ? "var(--ok)" : "var(--erro)"}">${reais(sobra)}</span></div>
    </div>

    ${categorias ? `<div class="secao"><h2>Por categoria</h2><div class="cartao">${categorias}</div></div>` : ""}
    <div class="secao"><h2>Últimos lançamentos</h2><div class="cartao">${lancamentos}</div></div>
    <p class="sub secao">Contas, cartões, orçamento e relatórios chegam na Fase 3 do roadmap.</p>`;
}

async function telaEu() {
  const perfil = await api("/perfil");
  estado.dados.perfil = perfil;

  return `<header class="topo"><h1>🧠 Eu</h1></header>

    <div class="secao"><h2>Perfil</h2>
      <label class="campo"><span>Nome</span><input id="p-nome" value="${escapar(perfil.nome || "")}" /></label>
      <div class="dois">
        <label class="campo"><span>Peso (kg)</span><input id="p-peso" type="number" inputmode="decimal" value="${escapar(perfil.peso_kg ?? "")}" /></label>
        <label class="campo"><span>Altura (cm)</span><input id="p-altura" type="number" inputmode="numeric" value="${escapar(perfil.altura_cm ?? "")}" /></label>
      </div>
      <label class="campo"><span>Nascimento</span><input id="p-nascimento" type="date" value="${escapar(perfil.nascimento || "")}" /></label>
      <button class="botao" data-acao="salvar-perfil">Salvar perfil</button>
    </div>

    <div class="secao"><h2>Módulos ativos</h2>
      <div class="cartao">
        ${estado.modulos
          .map(
            (m) => `<label class="linha"><span>${escapar(m.emoji)} ${escapar(m.nome)}</span>
              <input type="checkbox" data-modulo="${m.id}" ${(perfil.modulos_ativos || []).includes(m.id) ? "checked" : ""} /></label>`
          )
          .join("")}
      </div>
      <button class="botao secundario" data-acao="salvar-modulos">Salvar módulos</button>
    </div>

    <div class="secao"><h2>Diário, humor, vícios e conquistas</h2>
      <p class="sub">Chegam nas fases 4 e 5 do roadmap.</p></div>

    <button class="botao secundario" data-acao="diagnostico">Ver diagnóstico do banco</button>
    <button class="botao perigo" data-acao="sair">Sair do app</button>`;
}

function telaEmBreve(titulo, texto) {
  return async () => `<header class="topo"><h1>${titulo}</h1></header>
    <div class="vazio">${texto}</div>`;
}

// ---------- roteamento ----------

const ROTAS = [
  [/^\/hoje$/, telaHoje, "hoje"],
  [/^\/agua$/, telaAgua, "hoje"],
  [/^\/habitos$/, telaHabitos, "hoje"],
  [/^\/habitos\/(.+)$/, telaHabitoForm, "hoje"],
  [/^\/metas$/, telaEmBreve("🎯 Metas", "Metas de curto, médio e longo prazo chegam na etapa E1.6."), "metas"],
  [/^\/corpo$/, telaEmBreve("💪 Corpo", "Treino, dieta e saúde chegam nas fases 2, 4 e 5."), "corpo"],
  [/^\/dinheiro$/, telaDinheiro, "dinheiro"],
  [/^\/eu$/, telaEu, "eu"],
];

async function render() {
  const rota = location.hash.replace(/^#/, "") || "/hoje";
  estado.rota = rota;

  const achado = ROTAS.find(([padrao]) => padrao.test(rota));
  if (!achado) return navegar("/hoje");

  const [padrao, tela, aba] = achado;
  const parametro = rota.match(padrao)[1];

  try {
    conteudo.innerHTML = await tela(parametro);
  } catch (erro) {
    if (erro.message === "sessao") return;
    conteudo.innerHTML = `<div class="vazio">Não consegui carregar esta tela.<br /><br />${escapar(erro.message)}</div>
      <button class="botao secundario" data-acao="recarregar">Tentar de novo</button>`;
  }

  desenharAbas(aba);
  window.scrollTo(0, 0);
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

function navegar(rota) {
  if (location.hash === `#${rota}`) render();
  else location.hash = rota;
}

// ---------- ações ----------

function fecharPainel() {
  $("#painel").hidden = true;
  $("#sombra").hidden = true;
}

function abrirOpcoes(id) {
  const item = (estado.dados.hoje?.periodos || []).flatMap((p) => p.itens).find((i) => i.id === id);
  if (!item) return;

  $("#painel").innerHTML = `<div class="titulo">${escapar(item.emoji)} ${escapar(item.nome)}</div>
    <button data-acao="historico:${id}">Ver histórico</button>
    ${item.de_folga ? "" : `<button data-acao="folga:${id}">🛌 Marcar dia de folga</button>`}
    <button data-acao="ir:/habitos/${id}">Editar hábito</button>
    <button data-acao="fechar-painel">Cancelar</button>`;
  $("#painel").hidden = false;
  $("#sombra").hidden = false;
}

async function verHistorico(id) {
  const dados = await api(`/habitos/${id}/historico?dias=182`);
  const celulas = dados.dias
    .map((d) => {
      const classe = !d.devido ? "fora" : d.concluido ? "feito" : d.folga ? "folga" : "falhou";
      return `<i class="${classe}" title="${d.data}"></i>`;
    })
    .join("");

  $("#painel").innerHTML = `<div class="titulo">${escapar(dados.habito.emoji)} ${escapar(dados.habito.nome)} · 🔥 ${dados.streak} dias</div>
    <div style="padding:10px 14px"><div class="heat">${celulas}</div>
      <p class="sub">verde = feito · amarelo = folga · vermelho = falhou · últimos 6 meses</p></div>
    <button data-acao="fechar-painel">Fechar</button>`;
}

const ACOES = {
  async ir(rota) {
    fecharPainel();
    navegar(rota);
  },

  async recarregar() {
    render();
  },

  async erro(mensagem) {
    avisar(mensagem);
  },

  async abrir(moduloId) {
    navegar(moduloId === "habitos" ? "/habitos" : `/${moduloId}`);
  },

  async marcar(id) {
    const item = (estado.dados.hoje?.periodos || []).flatMap((p) => p.itens).find((i) => i.id === id);
    let quantidade = null;

    if (item?.meta_qtd && !item.concluido) {
      const resposta = prompt(`Quanto? (meta: ${item.meta_qtd}${item.unidade ? ` ${item.unidade}` : ""})`, item.meta_qtd);
      if (resposta === null) return;
      quantidade = Number(resposta.replace(",", ".")) || null;
    }

    await api(`/habitos/${id}/marcar`, { method: "POST", body: JSON.stringify({ concluido: !item?.concluido, quantidade }) });
    render();
  },

  opcoes(id) {
    abrirOpcoes(id);
  },

  historico(id) {
    verHistorico(id);
  },

  async folga(id) {
    try {
      await api(`/habitos/${id}/folga`, { method: "POST", body: JSON.stringify({}) });
      avisar("Dia de folga registrado — sua sequência continua");
    } catch (erro) {
      if (erro.message !== "sessao") avisar(erro.message);
    }
    fecharPainel();
    render();
  },

  "fechar-painel": fecharPainel,

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

    try {
      const id = estado.rascunho.id;
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

  async agua(ml) {
    try {
      await api("/agua", { method: "POST", body: JSON.stringify({ quantidade_ml: Number(ml) }) });
      avisar(`+${ml} ml`);
      render();
    } catch (erro) {
      if (erro.message !== "sessao") avisar(erro.message);
    }
  },

  async "agua-desfazer"() {
    await api("/agua/desfazer", { method: "POST" });
    avisar("Último registro removido");
    render();
  },

  async "meta-agua"() {
    const resposta = prompt("Meta diária em ml (ex: 2500):");
    if (!resposta) return;
    try {
      await api("/agua/meta", { method: "PUT", body: JSON.stringify({ meta_ml: Number(resposta) }) });
      render();
    } catch (erro) {
      if (erro.message !== "sessao") avisar(erro.message);
    }
  },

  async "salvar-perfil"() {
    try {
      await api("/perfil", {
        method: "PUT",
        body: JSON.stringify({
          nome: $("#p-nome").value.trim() || null,
          peso_kg: $("#p-peso").value ? Number($("#p-peso").value) : null,
          altura_cm: $("#p-altura").value ? Number($("#p-altura").value) : null,
          nascimento: $("#p-nascimento").value || null,
        }),
      });
      avisar("Perfil salvo");
    } catch (erro) {
      if (erro.message !== "sessao") avisar(erro.message);
    }
  },

  async "salvar-modulos"() {
    const ativos = [...document.querySelectorAll("[data-modulo]")].filter((c) => c.checked).map((c) => c.dataset.modulo);
    await api("/perfil", { method: "PUT", body: JSON.stringify({ modulos_ativos: ativos }) });
    avisar("Módulos atualizados");
  },

  async diagnostico() {
    const dados = await api("/diagnostico");
    const linhas = Object.entries(dados.tabelas).map(([tabela, estado]) => `${tabela}: ${estado}`);
    $("#painel").innerHTML = `<div class="titulo">Conexão com o banco</div>
      <div style="padding:0 14px 10px;font-size:14px;line-height:1.7">
        ${escapar(dados.configurado.url_usada || "")}<br />${linhas.map(escapar).join("<br />")}
      </div>
      <button data-acao="fechar-painel">Fechar</button>`;
    $("#painel").hidden = false;
    $("#sombra").hidden = false;
  },

  async sair() {
    await api("/sair", { method: "POST" });
    mostrarLogin();
  },
};

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
  const alvo = evento.target.closest("[data-acao]");
  if (alvo && alvo.tagName === "SELECT") ACOES[alvo.dataset.acao.split(":")[0]]?.();
});

$("#sombra").addEventListener("click", fecharPainel);
window.addEventListener("hashchange", render);

// ---------- entrada ----------

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
  render();
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
  const { autenticado } = await api("/sessao");
  if (autenticado) await abrirApp();
  else mostrarLogin();
})();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
