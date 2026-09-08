import { $, $$, abrirPainel, acaoApi, api, atualizar, avisar, dataCurta, escapar, estado, fecharPainel } from "../ui.js";

export const rota = /^\/eu$/;
export const aba = "eu";

export async function render() {
  const [perfil, diario] = await Promise.all([api("/perfil"), api("/diario?dias=30").catch(() => null)]);
  estado.dados.perfil = perfil;
  estado.dados.diario = diario;

  const desligados = perfil.modulos_inativos || [];
  const linha = diario?.linha || [];
  const grafico = linha.length
    ? `<div class="historico" style="height:70px">
        ${linha
          .map(
            (dia) => `<div class="dia" title="${dia.data}${dia.nota ? `: ${dia.nota}/5` : ""}">
              <div class="dia-barra ${dia.nota >= 4 ? "bateu" : ""}" style="height:${dia.nota ? dia.nota * 20 : 2}%"></div>
            </div>`
          )
          .join("")}
      </div>`
    : "";

  const anotacoes = (diario?.anotacoes || [])
    .slice(0, 8)
    .map(
      (a) => `<div class="linha"><span><small class="sub">${escapar(dataCurta(a.data))} · ${escapar(a.tipo)}</small><br />
        ${escapar(a.conteudo)}</span></div>`
    )
    .join("");

  return `<header class="topo"><h1>🧠 Eu</h1></header>

    <div class="secao"><h2>Humor dos últimos 30 dias</h2>
      <div class="cartao">
        ${
          diario
            ? `<div class="item-nome">${diario.media_humor ? `${diario.media_humor.toFixed(1).replace(".", ",")} / 5` : "sem registros"}</div>
               <p class="sub">${diario.dias_registrados} dias com check-in</p>${grafico}`
            : `<p class="sub">Rode o SQL do banco para ativar o diário.</p>`
        }
        <button class="botao secundario" data-acao="fechamento">Fazer o check-in de hoje</button>
      </div>
    </div>

    ${anotacoes ? `<div class="secao"><h2>Últimas anotações</h2><div class="cartao">${anotacoes}</div></div>` : ""}

    <div class="secao"><h2>Perfil</h2>
      <label class="campo"><span>Nome</span><input id="p-nome" value="${escapar(perfil.nome || "")}" /></label>
      <div class="dois">
        <label class="campo"><span>Peso (kg)</span>
          <input id="p-peso" type="number" inputmode="decimal" value="${escapar(perfil.peso_kg ?? "")}" /></label>
        <label class="campo"><span>Altura (cm)</span>
          <input id="p-altura" type="number" inputmode="numeric" value="${escapar(perfil.altura_cm ?? "")}" /></label>
      </div>
      <label class="campo"><span>Nascimento</span>
        <input id="p-nascimento" type="date" value="${escapar(perfil.nascimento || "")}" /></label>
      <p class="sub">O peso define sua meta de água (35 ml por quilo).</p>
      <button class="botao" data-acao="salvar-perfil">Salvar perfil</button>
    </div>

    <div class="secao"><h2>Módulos</h2>
      <div class="cartao">
        ${estado.modulos
          .map(
            (m) => `<label class="linha"><span>${escapar(m.emoji)} ${escapar(m.nome)}</span>
              <input type="checkbox" data-modulo="${m.id}" ${desligados.includes(m.id) ? "" : "checked"} /></label>`
          )
          .join("")}
      </div>
      <button class="botao secundario" data-acao="salvar-modulos">Salvar módulos</button>
    </div>

    <div class="secao"><h2>Ainda por vir</h2>
      <p class="sub">Vícios e controle de impulsos, treino, dieta, saúde, insights cruzados e assistente por
        WhatsApp — fases 2 a 6 do roadmap.</p></div>

    <button class="botao secundario" data-acao="diagnostico">Diagnóstico do banco</button>
    <button class="botao perigo" data-acao="sair">Sair do app</button>`;
}

export const acoes = {
  async "salvar-perfil"() {
    await acaoApi(
      "/perfil",
      {
        method: "PUT",
        body: JSON.stringify({
          nome: $("#p-nome").value.trim() || null,
          peso_kg: $("#p-peso").value ? Number($("#p-peso").value) : null,
          altura_cm: $("#p-altura").value ? Number($("#p-altura").value) : null,
          nascimento: $("#p-nascimento").value || null,
        }),
      },
      "Perfil salvo"
    );
  },

  async "salvar-modulos"() {
    const inativos = $$("[data-modulo]")
      .filter((caixa) => !caixa.checked)
      .map((caixa) => caixa.dataset.modulo);

    await acaoApi("/perfil", { method: "PUT", body: JSON.stringify({ modulos_inativos: inativos }) }, "Módulos atualizados");
  },

  // Fechamento do dia (E1.9), aberto tanto pela tela Hoje quanto pela aba Eu.
  async fechamento() {
    const [{ humor }, opcoes] = await Promise.all([
      api("/diario/hoje"),
      api("/diario?dias=1"),
    ]);

    const chips = (lista, selecionados, prefixo) =>
      lista
        .map(
          (item) => `<button class="dia-botao ${selecionados.includes(item) ? "ativo" : ""}"
            data-acao="chip:${prefixo}:${escapar(item)}" style="padding:8px 10px">${escapar(item)}</button>`
        )
        .join("");

    estado.rascunho = {
      nota: humor?.nota || 3,
      emocoes: humor?.emocoes || [],
      fatores: humor?.fatores || [],
    };

    abrirPainel(`<div class="titulo">Fechamento do dia</div>
      <div style="padding:0 14px 14px">
        <p class="sub">Como foi hoje?</p>
        <div class="botoes">
          ${[
            [1, "😞"],
            [2, "🙁"],
            [3, "😐"],
            [4, "🙂"],
            [5, "😄"],
          ]
            .map(
              ([nota, emoji]) => `<button class="copo" data-acao="chip:nota:${nota}"
                style="font-size:22px${estado.rascunho.nota === nota ? ";background:var(--marca);color:#06121c" : ""}"
                id="nota-${nota}">${emoji}</button>`
            )
            .join("")}
        </div>

        <p class="sub" style="margin-top:14px">Emoções</p>
        <div id="chips-emocoes" style="display:flex;flex-wrap:wrap;gap:6px">
          ${chips(opcoes.emocoes_opcoes, estado.rascunho.emocoes, "emocoes")}</div>

        <p class="sub" style="margin-top:14px">O que mais pesou</p>
        <div id="chips-fatores" style="display:flex;flex-wrap:wrap;gap:6px">
          ${chips(opcoes.fatores_opcoes, estado.rascunho.fatores, "fatores")}</div>

        <label class="campo"><span>Gratidão (3 linhas)</span>
          <textarea id="d-gratidao" rows="3" placeholder="Uma coisa boa de hoje..."></textarea></label>
        <label class="campo"><span>O que travou</span>
          <textarea id="d-travou" rows="2" placeholder="O que ficou no caminho"></textarea></label>

        <button class="botao" data-acao="salvar-fechamento">Salvar fechamento</button>
      </div>
      <button data-acao="fechar-painel">Fechar</button>`);
  },

  chip(argumento) {
    const [campo, valor] = argumento.split(":");

    if (campo === "nota") {
      estado.rascunho.nota = Number(valor);
      for (let n = 1; n <= 5; n++) {
        const botao = $(`#nota-${n}`);
        if (botao) botao.style.cssText = `font-size:22px${n === estado.rascunho.nota ? ";background:var(--marca);color:#06121c" : ""}`;
      }
      return;
    }

    const lista = estado.rascunho[campo] || [];
    estado.rascunho[campo] = lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];

    for (const botao of $$(`#chips-${campo} [data-acao^="chip:${campo}:"]`)) {
      const item = botao.dataset.acao.split(":")[2];
      botao.classList.toggle("ativo", estado.rascunho[campo].includes(item));
    }
  },

  async "salvar-fechamento"() {
    const gratidao = $("#d-gratidao").value.trim();
    const travou = $("#d-travou").value.trim();

    try {
      await api("/diario/humor", {
        method: "POST",
        body: JSON.stringify({
          nota: estado.rascunho.nota,
          emocoes: estado.rascunho.emocoes,
          fatores: estado.rascunho.fatores,
        }),
      });

      if (gratidao) await api("/diario/anotacao", { method: "POST", body: JSON.stringify({ tipo: "gratidao", conteudo: gratidao }) });
      if (travou) await api("/diario/anotacao", { method: "POST", body: JSON.stringify({ tipo: "travou", conteudo: travou }) });

      fecharPainel();
      avisar("Dia registrado 🌙");
      await atualizar();
    } catch (erro) {
      if (erro.message !== "sessao") avisar(erro.message);
    }
  },

  async diagnostico() {
    const dados = await api("/diagnostico");
    const linhas = Object.entries(dados.tabelas).map(([tabela, situacao]) => `${tabela}: ${situacao}`);

    abrirPainel(`<div class="titulo">Conexão com o banco</div>
      <div style="padding:0 14px 10px;font-size:14px;line-height:1.7">
        ${escapar(dados.configurado.url_usada || "")}<br />${linhas.map(escapar).join("<br />")}
      </div>
      <button data-acao="fechar-painel">Fechar</button>`);
  },

  async sair() {
    await api("/sair", { method: "POST" });
    document.dispatchEvent(new CustomEvent("sessao-expirada"));
  },
};
