import { $, $$, abrirPainel, acaoApi, api, atualizar, avisar, barras, dataCurta, escapar, estado, fecharPainel } from "../ui.js";
import { icone } from "../icones.js";

export const rota = /^\/eu$/;
export const aba = "eu";

export async function render() {
  const [perfil, diario, umAnoAtras, revisao] = await Promise.all([
    api("/perfil"),
    api("/diario?dias=30").catch(() => null),
    api("/diario/um-ano-atras").catch(() => ({ entradas: [] })),
    api("/diario/revisao").catch(() => null),
  ]);
  estado.dados.perfil = perfil;
  estado.dados.diario = diario;
  estado.dados.revisao = revisao;

  const desligados = perfil.modulos_inativos || [];
  const linha = diario?.linha || [];
  const grafico = linha.length
    ? barras(
        linha.map((dia) => ({ rotulo: dia.data.slice(8, 10), valor: dia.nota || 0, destaque: (dia.nota || 0) >= 4 })),
        { cor: "var(--c-humor)", formatar: (v) => (v ? `${v}/5` : "sem registro"), acaoToque: "ver-ponto" }
      )
    : "";

  const anotacoes = (diario?.anotacoes || [])
    .slice(0, 8)
    .map(
      (a) => `<div class="linha"><span><small class="sub">${escapar(dataCurta(a.data))} · ${escapar(a.tipo)}</small><br />
        ${escapar(a.conteudo)}</span></div>`
    )
    .join("");

  return `<header class="topo"><div><h1>Eu</h1><p class="sub">humor, perfil e ajustes</p></div></header>

    <div class="secao"><h2>Humor dos últimos 30 dias</h2>
      <div class="cartao cartao-destaque" style="--acento:var(--c-humor)">
        ${
          diario
            ? `<div class="item-nome" style="font-size:26px;font-weight:680;letter-spacing:-.02em">${
                diario.media_humor ? `${diario.media_humor.toFixed(1).replace(".", ",")} / 5` : "sem registros"
              }</div>
               <p class="sub">${diario.dias_registrados} dias com check-in</p>${grafico}`
            : `<p class="sub">Rode o SQL do banco para ativar o diário.</p>`
        }
        <button class="botao secundario" data-acao="fechamento">Fazer o check-in de hoje</button>
      </div>
    </div>

    ${anotacoes ? `<div class="secao"><h2>Últimas anotações</h2><div class="cartao">${anotacoes}</div></div>` : ""}

    ${
      umAnoAtras.entradas.length
        ? `<div class="secao"><h2>Um ano atrás</h2>
            ${umAnoAtras.entradas
              .map(
                (entrada) => `<div class="cartao" style="margin-bottom:8px">
                  <p class="sub" style="margin:0 0 6px">${entrada.anos_atras === 1 ? "1 ano atrás" : `${entrada.anos_atras} anos atrás`} você...</p>
                  ${entrada.humor ? `<p class="sub">humor: ${entrada.humor.nota}/5</p>` : ""}
                  ${entrada.anotacoes.map((a) => `<p style="margin:4px 0">${escapar(a.conteudo)}</p>`).join("")}
                </div>`
              )
              .join("")}
          </div>`
        : ""
    }

    <div class="secao"><h2>Revisão semanal</h2>
      <div class="cartao cartao-destaque" style="--acento:var(--c-humor)">
        ${
          revisao?.atual
            ? `<p class="sub" style="margin:0 0 8px">Você já fez a revisão desta semana.</p>
               <p style="margin:4px 0"><strong>Vitórias:</strong> ${escapar(revisao.atual.vitorias || "—")}</p>
               <p style="margin:4px 0"><strong>Travas:</strong> ${escapar(revisao.atual.travas || "—")}</p>
               <p style="margin:4px 0"><strong>Foco da semana:</strong> ${escapar(revisao.atual.foco_semana || "—")}</p>`
            : `<p class="sub" style="margin:0 0 10px">5 minutos, 4 perguntas. Se pular a semana, ela fica em branco — não vira pendência.</p>`
        }
        <button class="botao secundario" data-acao="revisao-abrir" style="border-color:var(--c-humor)">
          ${revisao?.atual ? "Editar revisão" : "Fazer a revisão desta semana"}</button>
        ${revisao?.recentes?.length ? `<button class="botao secundario" data-acao="revisao-historico">Ver revisões anteriores</button>` : ""}
      </div>
    </div>

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

    <div class="secao"><h2>Controle de impulsos</h2>
      <div class="cartao cartao-destaque" style="--acento:var(--c-vicios)">
        <p class="sub" style="margin:0 0 10px">Contador ao vivo, compromisso do dia, mapa de gatilhos e uma tela
          de urgência para quando a vontade aparecer.</p>
        <button class="botao secundario" data-acao="ir:/vicios">Abrir Controle</button>
      </div></div>

    <div class="secao"><h2>Ainda por vir</h2>
      <p class="sub">Insights cruzados e assistente por WhatsApp — fase 6 do roadmap.</p></div>

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

  "revisao-abrir"() {
    const atual = estado.dados.revisao?.atual;

    abrirPainel(`<div class="titulo">Revisão da semana</div>
      <div style="padding:0 14px 14px">
        <label class="campo"><span>O que deu certo essa semana?</span>
          <textarea id="r-vitorias" rows="2">${escapar(atual?.vitorias || "")}</textarea></label>
        <label class="campo"><span>O que travou ou ficou pelo caminho?</span>
          <textarea id="r-travas" rows="2">${escapar(atual?.travas || "")}</textarea></label>
        <label class="campo"><span>O que essa semana ensinou?</span>
          <textarea id="r-aprendizado" rows="2">${escapar(atual?.aprendizado || "")}</textarea></label>
        <label class="campo"><span>Qual é o foco da próxima semana?</span>
          <textarea id="r-foco" rows="2">${escapar(atual?.foco_semana || "")}</textarea></label>
        <button class="botao" data-acao="revisao-salvar" style="background:var(--c-humor)">Salvar revisão</button>
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "revisao-salvar"() {
    const corpo = {
      vitorias: $("#r-vitorias").value.trim() || null,
      travas: $("#r-travas").value.trim() || null,
      aprendizado: $("#r-aprendizado").value.trim() || null,
      foco_semana: $("#r-foco").value.trim() || null,
    };

    fecharPainel();
    await acaoApi("/diario/revisao", { method: "POST", body: JSON.stringify(corpo) }, "Revisão guardada");
  },

  "revisao-historico"() {
    const recentes = estado.dados.revisao?.recentes || [];

    abrirPainel(`<div class="titulo">Revisões anteriores</div>
      <div style="padding:0 14px 14px">
        ${recentes
          .map(
            (r) => `<div class="linha"><span><small class="sub">semana de ${escapar(dataCurta(r.semana_inicio))}</small><br />
              ${escapar(r.vitorias || "sem anotação")}</span></div>`
          )
          .join("")}
      </div>
      <button data-acao="fechar-painel">Fechar</button>`);
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
