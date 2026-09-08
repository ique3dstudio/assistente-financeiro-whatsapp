// Módulo Treino: painel (aba Corpo), execução do treino, rotinas, biblioteca
// de exercícios com mapa corporal, gráficos e medidas corporais.
import {
  $, abrirPainel, acaoApi, api, avisar, barras, dataCurta, escapar, estado,
  fecharPainel, iniciarDescanso, linha, navegar, numero, pararDescanso, plural, selecao, vazio,
} from "../ui.js";
import { icone } from "../icones.js";

export const rota = /^\/corpo$|^\/treino\/(.+)$/;
export const aba = "corpo";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export async function render(parametro) {
  if (!parametro) return painel();

  const [tela, argumento] = parametro.split("/");
  if (tela === "exec") return execucao();
  if (tela === "rotinas") return rotinas();
  if (tela === "rotina") return editarRotina(argumento);
  if (tela === "biblioteca") return biblioteca(argumento);
  if (tela === "stats") return estatisticas();
  if (tela === "medidas") return medidas();
  return painel();
}

async function carregar() {
  const dados = await api("/treino");
  estado.dados.treino = dados;
  return dados;
}

// ---------- painel (aba Corpo) ----------

async function painel() {
  const dados = await carregar();
  const { sessao_hoje: sessao, rotina_prevista: prevista, estatisticas: stats } = dados;

  const cartaoHoje = sessao?.concluida_em
    ? `<div class="cartao cartao-destaque" style="--acento:var(--c-treino)">
        <div class="item-nome" style="color:var(--c-treino)">${icone("check", 18)} Treino de hoje concluído</div>
        <p class="sub">${stats.series_totais ? `${stats.series_totais} séries nos últimos ${stats.dias} dias` : ""}</p>
        <button class="botao secundario" data-acao="ir:/treino/exec">Ver o que foi feito</button>
      </div>`
    : sessao
      ? `<div class="cartao cartao-destaque" style="--acento:var(--c-treino)">
          <div class="item-nome">${icone("play", 16)} Treino em andamento</div>
          <button class="botao" data-acao="ir:/treino/exec">Continuar treino</button>
        </div>`
      : `<div class="cartao cartao-destaque" style="--acento:var(--c-treino)">
          <div class="item-nome"><h3>${prevista ? escapar(prevista.nome) : "Hoje é descanso"}</h3></div>
          <p class="sub">${
            prevista
              ? `${plural(prevista.itens.length, "exercício", "exercícios")} · ${(prevista.dias_semana || []).map((d) => DIAS[d]).join(", ")}`
              : "nenhuma rotina marcada para hoje"
          }</p>
          <button class="botao" data-acao="treino-iniciar">${prevista ? "Iniciar treino" : "Treinar de qualquer forma"}</button>
        </div>`;

  const semana = stats.mapa_muscular.filter((m) => m.series > 0);
  const deficit = stats.mapa_muscular.filter((m) => m.series < m.alvo * 0.5).slice(0, 4);

  return `<header class="topo">
      <div><h1>Corpo</h1><p class="sub">treino, progressão e medidas</p></div>
    </header>

    <div class="secao">${cartaoHoje}</div>

    <div class="cartao secao tres">
      <div><small>treinos (90d)</small><span>${stats.sessoes}</span></div>
      <div><small>séries</small><span>${stats.series_totais}</span></div>
      <div><small>volume</small><span>${Math.round(stats.volume_total / 1000)}t</span></div>
    </div>

    ${
      semana.length
        ? `<div class="secao"><h2>Esta semana, por músculo</h2>
            <div class="mapa">${semana
              .sort((a, b) => b.proporcao - a.proporcao)
              .map((m) => {
                // Cor de status nunca vem sozinha: o número de séries e o alvo
                // ficam sempre escritos ao lado.
                const situacao =
                  m.proporcao >= 0.8
                    ? { cor: "var(--ok)", rotulo: "no alvo" }
                    : m.proporcao >= 0.5
                      ? { cor: "var(--atencao)", rotulo: "abaixo" }
                      : { cor: "var(--serio)", rotulo: "déficit" };

                return `<div class="mapa-item">${escapar(m.nome)}
                  <div class="mapa-valor">${numero(m.series)}/${m.alvo} séries · ${situacao.rotulo}</div>
                  <div class="mapa-barra"><span style="width:${Math.min(100, m.proporcao * 100)}%;
                    background:${situacao.cor}"></span></div>
                </div>`;
              })
              .join("")}</div>
            ${deficit.length ? `<p class="sub">Em déficit: ${deficit.map((m) => escapar(m.nome)).join(", ")}.</p>` : ""}
          </div>`
        : ""
    }

    ${
      stats.prs.length
        ? `<div class="secao"><h2>Últimos recordes</h2><div class="cartao">
            ${stats.prs
              .slice(0, 5)
              .map(
                (pr) => `<div class="linha"><span>${escapar(pr.exercicio)}<br />
                  <small class="sub">${escapar(dataCurta(pr.data))}</small></span>
                  <strong class="pr">${numero(pr.peso)} kg × ${pr.reps}</strong></div>`
              )
              .join("")}</div></div>`
        : ""
    }

    <button class="botao secundario" data-acao="ir:/treino/rotinas">Minhas rotinas (${dados.rotinas.length})</button>
    <button class="botao secundario" data-acao="ir:/treino/biblioteca">Biblioteca de exercícios</button>
    <button class="botao secundario" data-acao="ir:/treino/stats">Gráficos e progressão</button>
    <button class="botao secundario" data-acao="ir:/treino/medidas">Medidas do corpo</button>`;
}

// ---------- execução do treino ----------

async function execucao() {
  const dados = await api("/treino/sessoes", { method: "POST", body: JSON.stringify({}) });
  estado.dados.sessao = dados;

  if (dados.plano.length === 0) {
    return `<header class="topo"><h1>Treino</h1></header>
      <div class="vazio">Esta sessão não tem exercícios.<br />Monte uma rotina primeiro.</div>
      <button class="botao" data-acao="ir:/treino/rotinas">Ir para as rotinas</button>`;
  }

  return `<header class="topo">
      <div><h1>${escapar(dados.rotina?.nome || "Treino livre")}</h1>
        <p class="sub">${plural(dados.total_series, "série", "séries")} · ${Math.round(dados.volume)} kg de volume</p></div>
      <button class="link" data-acao="ir:/corpo">sair</button>
    </header>

    ${dados.plano.map(cartaoExercicio).join("")}

    <button class="botao" data-acao="treino-concluir">Concluir treino</button>
    <button class="botao secundario" data-acao="treino-add-exercicio">+ Adicionar exercício avulso</button>`;
}

function cartaoExercicio(item) {
  const s = item.sugestao;
  const ultima = item.ultima_vez;

  const feitas = item.series.length
    ? `<div style="margin-top:10px">${item.series
        .map(
          (serie) => `<div class="serie-feita">
            <span>${serie.serie}ª · ${numero(serie.peso)} kg × ${serie.reps}${serie.rir !== null ? ` · RIR ${numero(serie.rir)}` : ""}
              ${serie.is_pr ? '<span class="pr">PR 🏆</span>' : ""}</span>
            <button class="link" data-acao="serie-apagar:${serie.id}">apagar</button>
          </div>`
        )
        .join("")}</div>`
    : "";

  const proxima = item.series.length + 1;
  const alvo = item.config?.series_alvo || 3;

  return `<section class="cartao secao">
    <div class="item-nome"><h3>${escapar(item.nome)}</h3>
      <span class="sub"> ${item.series.length}/${alvo} séries</span></div>

    ${
      ultima
        ? `<p class="sub">última vez (${escapar(dataCurta(ultima.data))}): ${ultima.series
            .map((x) => `${numero(x.peso)}×${x.reps}`)
            .join("  ")}</p>`
        : `<p class="sub">primeira vez com este exercício</p>`
    }

    <div class="sugestao">
      <strong>hoje: ${s.peso === null ? "escolha o peso" : `${numero(s.peso)} kg × ${s.reps}`}</strong>
      <br /><span class="sub">${escapar(s.motivo)}</span>
    </div>

    ${feitas}

    <div class="serie-linha">
      <span class="serie-num">${proxima}ª</span>
      <input id="p-${item.exercicio_id}" type="number" inputmode="decimal" step="0.5"
             placeholder="kg" value="${s.peso === null ? "" : s.peso}" />
      <input id="r-${item.exercicio_id}" type="number" inputmode="numeric"
             placeholder="reps" value="${s.reps || ""}" />
      <input id="i-${item.exercicio_id}" type="number" inputmode="numeric" step="1"
             placeholder="RIR" value="${item.config?.rir_alvo ?? ""}" />
      <button class="serie-ok" data-acao="serie-salvar:${item.exercicio_id}:${item.config?.descanso_seg || 90}"
              aria-label="registrar série">${icone("check", 18)}</button>
    </div>

    ${
      item.series.length
        ? `<button class="link" data-acao="serie-repetir:${item.exercicio_id}:${item.config?.descanso_seg || 90}">
            repetir última série</button>`
        : ""
    }

    ${
      item.estagnacao?.estagnado
        ? `<div class="aviso-estagnacao"><strong>3 sessões sem avanço aqui.</strong><br />${item.estagnacao.sugestoes
            .map(escapar)
            .join("<br />")}</div>`
        : ""
    }
  </section>`;
}

// ---------- rotinas ----------

async function rotinas() {
  const dados = estado.dados.treino || (await carregar());

  const lista = dados.rotinas.length
    ? dados.rotinas
        .map(
          (rotina) => `<button class="item" data-acao="ir:/treino/rotina/${rotina.id}" style="--acento:var(--c-treino)">
            <span class="caixa" style="border-color:color-mix(in oklab, var(--c-treino) 55%, var(--borda));
                  color:var(--c-treino)">${icone("corpo", 15)}</span>
            <span class="item-corpo">
              <span class="item-nome">${escapar(rotina.nome)}</span>
              <span class="item-info"><span>${plural(rotina.itens.length, "exercício", "exercícios")}</span>
                <span>${(rotina.dias_semana || []).map((d) => DIAS[d]).join(", ") || "sem dia fixo"}</span></span>
            </span>
          </button>`
        )
        .join("")
    : vazio('Nenhuma rotina ainda.<br />Crie "Treino A", "Push", "Full body" — como você chama de verdade.', "corpo");

  return `<header class="topo"><h1>Rotinas</h1></header>
    <div class="secao">${lista}</div>
    <button class="botao" data-acao="rotina-nova">Nova rotina</button>
    <button class="botao secundario" data-acao="ir:/corpo">Voltar</button>`;
}

async function editarRotina(id) {
  const dados = estado.dados.treino || (await carregar());
  const rotina = dados.rotinas.find((r) => r.id === id);
  if (!rotina) throw new Error("Rotina não encontrada");

  estado.rascunho = { rotinaId: id, dias: [...(rotina.dias_semana || [])] };

  const itens = rotina.itens.length
    ? rotina.itens
        .map(
          (item) => `<div class="item">
            <span class="caixa" style="border-color:var(--borda)">${item.ordem}</span>
            <button class="item-corpo" data-acao="item-config:${item.id}"
                    style="background:none;border:0;padding:0;text-align:left">
              <span class="item-nome">${escapar(item.exercicio?.nome || "Exercício")}</span>
              <span class="item-info">
                <span>${item.series_alvo}×${item.reps_min}-${item.reps_max}</span>
                <span>RIR ${numero(item.rir_alvo)}</span>
                <span>${escapar(item.regra_progressao)}</span>
                <span>${item.descanso_seg}s</span>
              </span>
            </button>
            <button class="mais" data-acao="item-remover:${item.id}">×</button>
          </div>`
        )
        .join("")
    : vazio("Nenhum exercício nesta rotina.", "lista");

  return `<header class="topo"><h1>${escapar(rotina.nome)}</h1></header>

    <div class="secao"><h2>Dias da semana</h2>
      <div class="dias">${DIAS.map(
        (dia, i) => `<button class="dia-botao ${(rotina.dias_semana || []).includes(i) ? "ativo" : ""}"
          data-acao="rotina-dia:${i}">${dia}</button>`
      ).join("")}</div>
    </div>

    <div class="secao"><h2>Exercícios</h2>${itens}</div>

    <button class="botao" data-acao="ir:/treino/biblioteca/escolher">+ Adicionar exercício</button>
    <button class="botao secundario" data-acao="ir:/treino/rotinas">Voltar</button>
    <button class="botao perigo" data-acao="rotina-excluir:${id}">Excluir rotina</button>`;
}

// ---------- biblioteca e mapa corporal ----------

async function biblioteca(modo) {
  const escolhendo = modo === "escolher";
  const filtro = estado.filtroBiblioteca || {};
  const busca = new URLSearchParams(Object.entries(filtro).filter(([, v]) => v)).toString();

  const [{ exercicios }, { mapa }] = await Promise.all([
    api(`/treino/exercicios${busca ? `?${busca}` : ""}`),
    api("/treino/mapa"),
  ]);

  const porRegiao = (regiao) =>
    mapa
      .filter((m) => m.regiao === regiao && m.exercicios > 0)
      .map(
        (m) => `<button class="dia-botao ${filtro.musculo === m.id ? "ativo" : ""}"
          data-acao="filtro-musculo:${m.id}" style="padding:9px 8px">
          ${escapar(m.nome)} <span class="sub">${m.exercicios}</span></button>`
      )
      .join("");

  const lista = exercicios.length
    ? exercicios
        .map(
          (exercicio) => `<button class="item" data-acao="${
            escolhendo ? `exercicio-escolher:${exercicio.id}` : `exercicio-ver:${exercicio.id}`
          }" style="--acento:var(--c-treino)">
            <span class="caixa" style="color:var(--tinta-3)">${icone(exercicio.tipo === "composto" ? "corpo" : "metas", 15)}</span>
            <span class="item-corpo">
              <span class="item-nome">${escapar(exercicio.nome)}</span>
              <span class="item-info"><span>${escapar(exercicio.musculo_primario)}</span>
                <span>${escapar(exercicio.equipamento)}</span><span>${escapar(exercicio.nivel)}</span></span>
            </span>
          </button>`
        )
        .join("")
    : vazio("Nenhum exercício com esses filtros.", "lista");

  return `<header class="topo">
      <div><h1>${escolhendo ? "Escolher exercício" : "Exercícios"}</h1>
        <p class="sub">${exercicios.length} disponíveis</p></div>
      ${filtro.musculo || filtro.equipamento ? `<button class="link" data-acao="filtro-limpar">limpar</button>` : ""}
    </header>

    <label class="campo"><span>Buscar</span>
      <input id="b-busca" value="${escapar(filtro.busca || "")}" placeholder="supino, remada, agachamento..." /></label>
    <button class="botao secundario" data-acao="filtro-buscar">Buscar</button>

    <div class="secao"><h2>Frente do corpo</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${porRegiao("frente")}</div></div>
    <div class="secao"><h2>Costas do corpo</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${porRegiao("costas")}</div></div>

    <div class="secao"><h2>Equipamento</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${(estado.dados.treino?.equipamentos || [])
          .map(
            (e) => `<button class="dia-botao ${filtro.equipamento === e.id ? "ativo" : ""}"
              data-acao="filtro-equipamento:${e.id}" style="padding:9px 8px">${escapar(e.nome)}</button>`
          )
          .join("")}
      </div></div>

    <div class="secao">${lista}</div>
    <button class="botao secundario" data-acao="ir:/corpo">Voltar</button>`;
}

// ---------- gráficos ----------

async function estatisticas() {
  const stats = await api("/treino/estatisticas?dias=180");

  const grafico = barras(
    stats.volume_por_semana.slice(-16).map((semana) => ({
      rotulo: `${semana.semana.slice(8, 10)}/${semana.semana.slice(5, 7)}`,
      valor: Math.round(semana.total),
      destaque: true,
    })),
    { cor: "var(--c-treino)", formatar: (v) => `${(v / 1000).toFixed(1).replace(".", ",")} t`, acaoToque: "ver-ponto" }
  );

  const curvas = stats.mais_treinados
    .filter((exercicio) => exercicio.curva.length > 1)
    .map((exercicio) => {
      const valores = exercicio.curva.map((p) => p.um_rm);
      return `<div class="cartao">
        <div class="item-nome"><h3>${escapar(exercicio.nome)}</h3></div>
        <p class="sub">1RM estimado: ${numero(Math.min(...valores))} → ${numero(Math.max(...valores))} kg ·
          ${exercicio.series} séries</p>
        ${linha(
          exercicio.curva.map((ponto) => ({ rotulo: ponto.data, valor: ponto.um_rm })),
          { cor: "var(--c-treino)", formatar: (v) => `${numero(v)} kg` }
        )}
      </div>`;
    })
    .join("");

  const frequencia = stats.frequencia
    .map((dia) => `<i class="${dia.treinou ? "feito" : ""}" title="${dia.data}"></i>`)
    .join("");

  return `<header class="topo"><h1>Progressão</h1></header>

    <div class="secao"><h2>Volume por semana (kg)</h2>
      ${stats.volume_por_semana.length ? `${grafico}<p class="sub">Toque numa barra para ver a semana.</p>` : vazio("Sem treinos registrados ainda.", "grafico")}
    </div>

    <div class="secao"><h2>Frequência (28 dias)</h2>
      <div class="heat" style="--acento:var(--c-treino)">${frequencia}</div></div>

    ${curvas ? `<div class="secao"><h2>1RM estimado</h2>${curvas}</div>` : ""}

    <button class="botao secundario" data-acao="ir:/corpo">Voltar</button>`;
}

// ---------- medidas ----------

async function medidas() {
  const { medidas: lista } = await api("/treino/medidas");
  const ultima = lista[0] || {};

  const campos = [
    ["peso_kg", "Peso (kg)"],
    ["gordura_pct", "Gordura (%)"],
    ["braco_cm", "Braço (cm)"],
    ["peito_cm", "Peito (cm)"],
    ["cintura_cm", "Cintura (cm)"],
    ["quadril_cm", "Quadril (cm)"],
    ["coxa_cm", "Coxa (cm)"],
    ["panturrilha_cm", "Panturrilha (cm)"],
  ];

  const historico = lista.length
    ? lista
        .map(
          (medida) => `<div class="linha">
            <span>${escapar(dataCurta(medida.data))}</span>
            <span class="sub">${campos
              .filter(([campo]) => medida[campo] !== null)
              .map(([campo, rotulo]) => `${rotulo.split(" ")[0]} ${numero(medida[campo])}`)
              .join(" · ")}</span>
          </div>`
        )
        .join("")
    : vazio("Nenhuma medida registrada.", "balanca");

  return `<header class="topo"><h1>Medidas</h1></header>

    <div class="secao"><h2>Registrar hoje</h2>
      <div class="dois">
        ${campos
          .map(
            ([campo, rotulo]) => `<label class="campo"><span>${rotulo}</span>
              <input id="md-${campo}" type="number" inputmode="decimal" step="0.1"
                     value="" placeholder="${ultima[campo] !== null && ultima[campo] !== undefined ? numero(ultima[campo]) : ""}" /></label>`
          )
          .join("")}
      </div>
      <p class="sub">O cinza mostra sua última medida. Preencha só o que mediu hoje.</p>
      <button class="botao" data-acao="medida-salvar">Salvar medidas</button>
    </div>

    <div class="secao"><h2>Histórico</h2><div class="cartao">${historico}</div></div>
    <p class="sub">Fotos de progresso entram quando o bucket do Supabase Storage estiver criado (está na sua lista).</p>
    <button class="botao secundario" data-acao="ir:/corpo">Voltar</button>`;
}

// ---------- ações ----------

function itemDaSessao(exercicioId) {
  return (estado.dados.sessao?.plano || []).find((p) => p.exercicio_id === exercicioId);
}

export const acoes = {
  async "treino-iniciar"() {
    navegar("/treino/exec");
  },

  async "serie-salvar"(argumento) {
    const [exercicioId, descanso] = argumento.split(":");
    const peso = $(`#p-${exercicioId}`)?.value;
    const reps = $(`#r-${exercicioId}`)?.value;
    const rir = $(`#i-${exercicioId}`)?.value;

    if (!reps) return avisar("Informe as repetições");

    const sessaoId = estado.dados.sessao?.sessao?.id;
    const resposta = await acaoApi(
      `/treino/sessoes/${sessaoId}/series`,
      {
        method: "POST",
        body: JSON.stringify({
          exercicio_id: exercicioId,
          peso: Number(String(peso).replace(",", ".")) || 0,
          reps: Number(reps),
          rir: rir === "" ? null : Number(rir),
        }),
      },
      null
    );

    if (resposta?.ultima_serie?.is_pr) avisar("🏆 Recorde novo nesse exercício!");
    iniciarDescanso(Number(descanso) || 90);
  },

  async "serie-repetir"(argumento) {
    const [exercicioId, descanso] = argumento.split(":");
    const item = itemDaSessao(exercicioId);
    const ultima = item?.series[item.series.length - 1];
    if (!ultima) return;

    const sessaoId = estado.dados.sessao?.sessao?.id;
    await acaoApi(
      `/treino/sessoes/${sessaoId}/series`,
      {
        method: "POST",
        body: JSON.stringify({ exercicio_id: exercicioId, peso: ultima.peso, reps: ultima.reps, rir: ultima.rir }),
      },
      `${numero(ultima.peso)} kg × ${ultima.reps}`
    );
    iniciarDescanso(Number(descanso) || 90);
  },

  async "serie-apagar"(serieId) {
    await acaoApi(`/treino/series/${serieId}`, { method: "DELETE" }, "Série apagada");
  },

  async "treino-concluir"() {
    const sessaoId = estado.dados.sessao?.sessao?.id;
    const sensacao = prompt("Como foi o treino? 1 = péssimo, 5 = ótimo", "4");
    if (sensacao === null) return;

    pararDescanso();
    await api(`/treino/sessoes/${sessaoId}/concluir`, {
      method: "POST",
      body: JSON.stringify({ sensacao: Number(sensacao) || null }),
    });
    avisar("Treino concluído 💪");
    navegar("/corpo");
  },

  "treino-add-exercicio"() {
    estado.filtroBiblioteca = {};
    navegar("/treino/biblioteca/escolher");
  },

  async "rotina-nova"() {
    const nome = prompt("Nome da rotina (ex: Treino A — Peito e tríceps):");
    if (!nome) return;
    const rotina = await api("/treino/rotinas", { method: "POST", body: JSON.stringify({ nome }) });
    await carregar();
    navegar(`/treino/rotina/${rotina.id}`);
  },

  async "rotina-dia"(indice) {
    const dias = estado.rascunho.dias || [];
    const numeroDia = Number(indice);
    estado.rascunho.dias = dias.includes(numeroDia) ? dias.filter((d) => d !== numeroDia) : [...dias, numeroDia].sort();

    await api(`/treino/rotinas/${estado.rascunho.rotinaId}`, {
      method: "PUT",
      body: JSON.stringify({ dias_semana: estado.rascunho.dias }),
    });
    await carregar();
    navegar(`/treino/rotina/${estado.rascunho.rotinaId}`);
  },

  async "rotina-excluir"(id) {
    if (!confirm("Excluir esta rotina? O histórico de treinos é preservado.")) return;
    await api(`/treino/rotinas/${id}`, { method: "DELETE" });
    await carregar();
    navegar("/treino/rotinas");
  },

  async "item-remover"(itemId) {
    await api(`/treino/itens/${itemId}`, { method: "DELETE" });
    await carregar();
    avisar("Exercício removido da rotina");
    navegar(`/treino/rotina/${estado.rascunho.rotinaId}`);
  },

  "item-config"(itemId) {
    const rotina = (estado.dados.treino?.rotinas || []).find((r) => r.id === estado.rascunho?.rotinaId);
    const item = rotina?.itens.find((i) => i.id === itemId);
    if (!item) return;

    abrirPainel(`<div class="titulo">${escapar(item.exercicio?.nome || "Exercício")}</div>
      <div style="padding:0 14px 14px">
        <div class="dois">
          <label class="campo"><span>Séries</span><input id="c-series" type="number" value="${item.series_alvo}" /></label>
          <label class="campo"><span>Descanso (s)</span><input id="c-descanso" type="number" value="${item.descanso_seg}" /></label>
        </div>
        <div class="dois">
          <label class="campo"><span>Reps mín.</span><input id="c-min" type="number" value="${item.reps_min}" /></label>
          <label class="campo"><span>Reps máx.</span><input id="c-max" type="number" value="${item.reps_max}" /></label>
        </div>
        <div class="dois">
          <label class="campo"><span>RIR alvo</span><input id="c-rir" type="number" step="0.5" value="${numero(item.rir_alvo)}" /></label>
          <label class="campo"><span>Incremento (kg)</span><input id="c-inc" type="number" step="0.5" value="${numero(item.incremento_kg)}" /></label>
        </div>
        <label class="campo"><span>Regra de progressão</span>
          ${selecao("c-regra", (estado.dados.treino?.regras || []).map((r) => ({ id: r.id, nome: `${r.nome} — ${r.detalhe}` })), item.regra_progressao)}</label>
        <button class="botao" data-acao="item-salvar:${itemId}">Salvar</button>
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "item-salvar"(itemId) {
    const corpo = {
      series_alvo: Number($("#c-series").value) || 3,
      descanso_seg: Number($("#c-descanso").value) || 90,
      reps_min: Number($("#c-min").value) || 8,
      reps_max: Number($("#c-max").value) || 12,
      rir_alvo: Number($("#c-rir").value) || 0,
      incremento_kg: Number($("#c-inc").value) || 2.5,
      regra_progressao: $("#c-regra").value,
    };

    await api(`/treino/itens/${itemId}`, { method: "PUT", body: JSON.stringify(corpo) });
    fecharPainel();
    await carregar();
    avisar("Exercício ajustado");
    navegar(`/treino/rotina/${estado.rascunho.rotinaId}`);
  },

  "filtro-musculo"(musculo) {
    estado.filtroBiblioteca = { ...estado.filtroBiblioteca, musculo };
    navegar(location.hash.replace(/^#/, "") || "/treino/biblioteca");
  },

  "filtro-equipamento"(equipamento) {
    estado.filtroBiblioteca = { ...estado.filtroBiblioteca, equipamento };
    navegar(location.hash.replace(/^#/, "") || "/treino/biblioteca");
  },

  "filtro-buscar"() {
    estado.filtroBiblioteca = { ...estado.filtroBiblioteca, busca: $("#b-busca").value.trim() };
    navegar(location.hash.replace(/^#/, "") || "/treino/biblioteca");
  },

  "filtro-limpar"() {
    estado.filtroBiblioteca = {};
    navegar(location.hash.replace(/^#/, "") || "/treino/biblioteca");
  },

  async "exercicio-escolher"(exercicioId) {
    const rotinaId = estado.rascunho?.rotinaId;

    if (!rotinaId) {
      // Escolhido durante o treino: registra como exercício avulso da sessão.
      const sessaoId = estado.dados.sessao?.sessao?.id;
      if (!sessaoId) return avisar("Abra um treino primeiro");
      await api(`/treino/sessoes/${sessaoId}/series`, {
        method: "POST",
        body: JSON.stringify({ exercicio_id: exercicioId, peso: 0, reps: 0, tipo: "aquecimento" }),
      });
      return navegar("/treino/exec");
    }

    await api(`/treino/rotinas/${rotinaId}/exercicios`, {
      method: "POST",
      body: JSON.stringify({ exercicio_id: exercicioId }),
    });
    await carregar();
    avisar("Exercício adicionado");
    navegar(`/treino/rotina/${rotinaId}`);
  },

  async "exercicio-ver"(exercicioId) {
    const { exercicios } = await api("/treino/exercicios");
    const exercicio = exercicios.find((e) => e.id === exercicioId);
    if (!exercicio) return;

    abrirPainel(`<div class="titulo">${escapar(exercicio.nome)}</div>
      <div style="padding:0 14px 14px;font-size:15px;line-height:1.6">
        <p class="sub">${escapar(exercicio.musculo_primario)}${
          (exercicio.musculos_secundarios || []).length ? ` + ${exercicio.musculos_secundarios.map(escapar).join(", ")}` : ""
        } · ${escapar(exercicio.equipamento)} · ${escapar(exercicio.nivel)}</p>
        ${exercicio.instrucoes ? `<p><strong>Como fazer:</strong> ${escapar(exercicio.instrucoes)}</p>` : ""}
        ${exercicio.erros_comuns ? `<p><strong>Erro comum:</strong> ${escapar(exercicio.erros_comuns)}</p>` : ""}
      </div>
      <button data-acao="fechar-painel">Fechar</button>`);
  },

  async "medida-salvar"() {
    const corpo = { data: estado.dados.treino?.data };
    for (const campo of ["peso_kg", "gordura_pct", "braco_cm", "peito_cm", "cintura_cm", "quadril_cm", "coxa_cm", "panturrilha_cm"]) {
      const valor = $(`#md-${campo}`)?.value;
      if (valor) corpo[campo] = Number(String(valor).replace(",", "."));
    }

    await acaoApi("/treino/medidas", { method: "POST", body: JSON.stringify(corpo) }, "Medidas salvas");
  },

  "descanso-parar": pararDescanso,
};
