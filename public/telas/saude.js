// Módulo Saúde: medicamentos, consultas, exames com evolução por marcador,
// sinais, sono e sintomas.
import {
  $, abrirPainel, acaoApi, api, avisar, barras, dataCurta, escapar, estado,
  fecharPainel, linha, navegar, numero, plural, selecao, vazio,
} from "../ui.js";
import { icone } from "../icones.js";

export const rota = /^\/saude$|^\/saude\/(.+)$/;
export const aba = "corpo";

const COR = "var(--c-saude)";

export async function render(parametro) {
  const dados = estado.dados.saude || (await carregar());
  if (!parametro) return painel(dados);

  const [tela, argumento] = parametro.split("/");
  const telas = {
    medicamentos: () => telaMedicamentos(dados),
    consultas: () => telaConsultas(dados),
    consulta: () => telaConsulta(dados, argumento),
    exames: () => telaExames(dados),
    marcador: () => telaMarcador(dados, decodeURIComponent(argumento || "")),
    sinais: () => telaSinais(dados),
    sono: () => telaSono(dados),
    resumo: () => telaResumoConsulta(),
  };

  return (telas[tela] || (() => painel(dados)))();
}

async function carregar() {
  const dados = await api("/saude");
  estado.dados.saude = dados;
  return dados;
}

// ---------- painel ----------

function painel(dados) {
  const doses = dados.doses.length
    ? dados.doses
        .map(
          (dose) => `<div class="item ${dose.tomado ? "feito" : ""}" style="--acento:${COR}">
            <button class="caixa" data-acao="dose:${dose.medicamento_id}|${dose.horario}|${dose.tomado ? 0 : 1}"
                    aria-label="marcar dose">${dose.tomado ? icone("check", 15) : ""}</button>
            <button class="item-corpo" data-acao="dose:${dose.medicamento_id}|${dose.horario}|${dose.tomado ? 0 : 1}">
              <span class="item-nome">💊 ${escapar(dose.nome)}${dose.dose ? ` · ${escapar(dose.dose)}` : ""}</span>
              <span class="item-info"><span>${escapar(dose.horario)}</span>
                ${dose.recomprar ? `<span style="color:var(--atencao)">estoque para ${dose.dias} dias</span>` : ""}</span>
            </button>
          </div>`
        )
        .join("")
    : `<p class="sub">Nenhuma dose para hoje.</p>`;

  const vencidas = dados.recorrencias.filter((r) => r.vencida);
  const proximas = dados.proximas_consultas.slice(0, 3);

  const marcadores = dados.marcadores.length
    ? dados.marcadores
        .slice(0, 6)
        .map((serie) => {
          const cor =
            serie.ultimo.situacao === "normal" ? "var(--ok)" : serie.ultimo.situacao === "abaixo" ? "var(--atencao)" : "var(--serio)";
          return `<button class="linha" style="width:100%;text-align:left" data-acao="ir:/saude/marcador/${encodeURIComponent(serie.marcador)}">
            <span>${escapar(serie.marcador)}
              <br /><small class="sub">${escapar(dataCurta(serie.ultimo.data))}${
                serie.ref_min !== null ? ` · referência ${numero(serie.ref_min)}–${numero(serie.ref_max)}` : ""
              }</small></span>
            <strong class="numero" style="color:${cor}">${numero(serie.ultimo.valor)} ${escapar(serie.unidade || "")}</strong>
          </button>`;
        })
        .join("")
    : "";

  const sono = dados.media_sono_7d
    ? `<div class="secao"><h2>Sono</h2>
        <div class="cartao cartao-destaque" style="--acento:${COR}">
          <div class="item-nome" style="font-size:24px;font-weight:680">${Math.floor(dados.media_sono_7d / 60)}h${String(
            dados.media_sono_7d % 60
          ).padStart(2, "0")}</div>
          <p class="sub">média das últimas 7 noites</p>
          ${barras(
            dados.linha_sono.map((noite) => ({
              rotulo: noite.data.slice(8, 10),
              valor: noite.minutos,
              destaque: noite.minutos >= 420,
            })),
            { cor: COR, formatar: (v) => `${Math.floor(v / 60)}h${String(v % 60).padStart(2, "0")}`, acaoToque: "ver-ponto" }
          )}
          <button class="botao secundario" data-acao="registrar-sono">Registrar a noite passada</button>
        </div></div>`
    : `<div class="secao"><h2>Sono</h2><div class="cartao">
        <p class="sub">Nenhuma noite registrada ainda.</p>
        <button class="botao secundario" data-acao="registrar-sono">Registrar a noite passada</button></div></div>`;

  return `<header class="topo">
      <div><h1>Saúde</h1><p class="sub">medicamentos, exames e sinais</p></div>
    </header>

    ${
      vencidas.length
        ? `<div class="cartao secao" style="--acento:var(--atencao);border-color:color-mix(in oklab, var(--atencao) 35%, var(--borda))">
            <div class="item-nome" style="color:var(--atencao)">${icone("relogio", 16)} Rotina vencida</div>
            <p class="sub">${vencidas.map((r) => escapar(r.nome)).join(" · ")}</p>
            <button class="botao secundario" data-acao="rotina-feita:${vencidas[0].id}">Marcar "${escapar(vencidas[0].nome)}" como feita hoje</button>
          </div>`
        : ""
    }

    <div class="secao"><h2>Doses de hoje</h2>${doses}
      <button class="botao secundario" data-acao="ir:/saude/medicamentos">Meus medicamentos (${dados.medicamentos.length})</button>
    </div>

    ${
      proximas.length
        ? `<div class="secao"><h2>Próximas consultas</h2>
            ${proximas
              .map(
                (consulta) => `<button class="item" data-acao="ir:/saude/consulta/${consulta.id}" style="--acento:${COR}">
                  <span class="caixa" style="border-color:color-mix(in oklab, ${COR} 55%, var(--borda))">🩺</span>
                  <span class="item-corpo"><span class="item-nome">${escapar(consulta.especialidade)}</span>
                    <span class="item-info"><span>${escapar(dataCurta(consulta.data))}${consulta.hora ? ` · ${String(consulta.hora).slice(0, 5)}` : ""}</span>
                      ${consulta.profissional ? `<span>${escapar(consulta.profissional)}</span>` : ""}</span></span>
                </button>`
              )
              .join("")}</div>`
        : ""
    }

    ${marcadores ? `<div class="secao"><h2>Últimos exames</h2><div class="cartao">${marcadores}</div></div>` : ""}
    ${sono}

    <div class="secao"><h2>Registrar</h2>
      <div class="botoes" style="--acento:${COR}">
        <button class="copo" data-acao="registrar-sinal:peso">⚖️<small>Peso</small></button>
        <button class="copo" data-acao="registrar-sinal:pressao">🩸<small>Pressão</small></button>
        <button class="copo" data-acao="registrar-sinal:glicemia">🩹<small>Glicemia</small></button>
        <button class="copo" data-acao="registrar-sintoma">🤒<small>Sintoma</small></button>
      </div>
    </div>

    <button class="botao" data-acao="ir:/saude/consultas">Consultas e rotinas</button>
    <button class="botao secundario" data-acao="ir:/saude/exames">Exames e marcadores</button>
    <button class="botao secundario" data-acao="ir:/saude/sinais">Histórico de medições</button>
    <button class="botao secundario" data-acao="ir:/saude/resumo">Modo consulta (levar ao médico)</button>
    <button class="botao secundario" data-acao="ir:/corpo">Voltar para Corpo</button>`;
}

// ---------- medicamentos ----------

function telaMedicamentos(dados) {
  const lista = dados.medicamentos.length
    ? dados.medicamentos
        .map(
          (medicamento) => `<div class="cartao" style="--acento:${COR};margin-bottom:10px">
            <div class="linha" style="border:0;padding-bottom:4px">
              <span class="item-nome">💊 ${escapar(medicamento.nome)}</span>
              ${medicamento.dias !== null ? `<span class="sub">${plural(medicamento.dias, "dia", "dias")} de estoque</span>` : ""}
            </div>
            <div class="mapa-valor">${escapar(medicamento.dose || "sem dose anotada")} ·
              ${(medicamento.horarios || []).map((h) => String(h).slice(0, 5)).join(", ") || "sem horário"}</div>
            ${
              medicamento.recomprar
                ? `<p class="sub" style="color:var(--atencao);margin-top:8px">Hora de recomprar.</p>`
                : ""
            }
            <button class="botao secundario" data-acao="medicamento-estoque:${medicamento.id}">Atualizar estoque</button>
          </div>`
        )
        .join("")
    : vazio("Nenhum medicamento cadastrado.", "coracao");

  return `<header class="topo"><div><h1>Medicamentos</h1><p class="sub">e suplementos</p></div></header>
    <div class="secao">${lista}</div>
    <button class="botao" data-acao="medicamento-novo">Novo medicamento</button>
    <button class="botao secundario" data-acao="ir:/saude">Voltar</button>`;
}

// ---------- consultas ----------

function telaConsultas(dados) {
  const lista = dados.consultas.length
    ? dados.consultas
        .map(
          (consulta) => `<button class="item" data-acao="ir:/saude/consulta/${consulta.id}" style="--acento:${COR}">
            <span class="caixa" style="border-color:color-mix(in oklab, ${COR} 55%, var(--borda))">🩺</span>
            <span class="item-corpo"><span class="item-nome">${escapar(consulta.especialidade)}</span>
              <span class="item-info"><span>${escapar(dataCurta(consulta.data))}</span>
                ${consulta.profissional ? `<span>${escapar(consulta.profissional)}</span>` : ""}
                ${consulta.resumo ? "<span>com resumo</span>" : "<span>sem resumo</span>"}</span></span>
          </button>`
        )
        .join("")
    : vazio("Nenhuma consulta registrada.", "coracao");

  const rotinas = dados.recorrencias.length
    ? dados.recorrencias
        .map(
          (rotina) => `<div class="linha">
            <span>${escapar(rotina.nome)}
              <br /><small class="sub">a cada ${rotina.cada_meses} meses · próxima ${escapar(dataCurta(rotina.proxima))}</small></span>
            <span class="sub" style="color:${rotina.vencida ? "var(--atencao)" : "var(--ok)"}">
              ${rotina.vencida ? "vencida" : `em ${rotina.dias} dias`}</span>
          </div>`
        )
        .join("")
    : `<p class="sub">Nenhuma rotina cadastrada (dentista a cada 6 meses, check-up anual...).</p>`;

  return `<header class="topo"><div><h1>Consultas</h1></div></header>
    <div class="secao">${lista}</div>
    <button class="botao" data-acao="consulta-nova">Nova consulta</button>

    <div class="secao"><h2>Rotinas de saúde</h2><div class="cartao">${rotinas}</div>
      <button class="botao secundario" data-acao="rotina-nova">Nova rotina</button></div>

    <button class="botao secundario" data-acao="ir:/saude">Voltar</button>`;
}

function telaConsulta(dados, id) {
  const consulta = dados.consultas.find((c) => c.id === id);
  if (!consulta) throw new Error("Consulta não encontrada");
  estado.rascunho = { consultaId: id };

  const bloco = (titulo, texto, acao) => `<div class="secao"><h2>${titulo}</h2>
    <div class="cartao">${texto ? `<p style="white-space:pre-wrap;margin:0">${escapar(texto)}</p>` : `<p class="sub">Vazio.</p>`}
      <button class="botao secundario" data-acao="${acao}">${texto ? "Editar" : "Escrever"}</button></div></div>`;

  return `<header class="topo">
      <div><h1>${escapar(consulta.especialidade)}</h1>
        <p class="sub">${escapar(dataCurta(consulta.data))}${consulta.hora ? ` · ${String(consulta.hora).slice(0, 5)}` : ""}
          ${consulta.profissional ? ` · ${escapar(consulta.profissional)}` : ""}</p></div>
    </header>

    ${consulta.local ? `<div class="cartao secao"><div class="item-info" style="margin:0"><span>📍 ${escapar(consulta.local)}</span></div></div>` : ""}
    ${bloco("Perguntas que quero fazer", consulta.perguntas, "consulta-campo:perguntas")}
    ${bloco("O que foi dito", consulta.resumo, "consulta-campo:resumo")}
    ${bloco("Prescrição", consulta.prescricao, "consulta-campo:prescricao")}

    ${
      consulta.retorno_em
        ? `<div class="cartao secao" style="--acento:${COR}"><div class="linha" style="border:0">
            <span>Retorno sugerido</span><strong>${escapar(dataCurta(consulta.retorno_em))}</strong></div></div>`
        : `<button class="botao secundario" data-acao="consulta-retorno">Marcar retorno</button>`
    }

    <button class="botao secundario" data-acao="ir:/saude/consultas">Voltar</button>
    <button class="botao perigo" data-acao="consulta-excluir:${id}">Excluir consulta</button>`;
}

// ---------- exames ----------

function telaExames(dados) {
  const series = dados.marcadores.length
    ? dados.marcadores
        .map((serie) => {
          const cor =
            serie.ultimo.situacao === "normal" ? "var(--ok)" : serie.ultimo.situacao === "abaixo" ? "var(--atencao)" : "var(--serio)";
          return `<button class="cartao" style="margin-bottom:10px;--acento:${COR}"
                    data-acao="ir:/saude/marcador/${encodeURIComponent(serie.marcador)}">
            <div class="linha" style="border:0;padding-bottom:2px">
              <span class="item-nome">${escapar(serie.marcador)}</span>
              <strong class="numero" style="color:${cor}">${numero(serie.ultimo.valor)} ${escapar(serie.unidade || "")}</strong>
            </div>
            <div class="mapa-valor">${plural(serie.pontos.length, "medição", "medições")} ·
              ${serie.variacao !== null ? `variação ${serie.variacao > 0 ? "+" : ""}${numero(serie.variacao)}` : "primeira"}
              ${serie.ref_min !== null ? ` · referência ${numero(serie.ref_min)}–${numero(serie.ref_max)}` : ""}</div>
          </button>`;
        })
        .join("")
    : vazio("Nenhum marcador registrado.<br />Cadastre um exame com os valores do laudo.", "grafico");

  const exames = dados.exames.length
    ? `<div class="secao"><h2>Exames</h2><div class="cartao">
        ${dados.exames
          .map(
            (exame) => `<div class="linha"><span>${escapar(exame.tipo)}
              <br /><small class="sub">${escapar(dataCurta(exame.data))}${exame.laboratorio ? ` · ${escapar(exame.laboratorio)}` : ""}</small></span>
              ${exame.arquivo_url ? `<a class="link" href="${escapar(exame.arquivo_url)}" target="_blank" rel="noopener">abrir</a>` : ""}
            </div>`
          )
          .join("")}</div></div>`
    : "";

  return `<header class="topo"><div><h1>Exames</h1><p class="sub">evolução por marcador</p></div></header>
    <div class="secao">${series}</div>
    ${exames}
    <button class="botao" data-acao="exame-novo">Registrar exame</button>
    <p class="sub">O PDF do laudo pode ser guardado quando o bucket do Supabase Storage estiver criado
      (está na sua lista de pendências). Os valores já podem ser digitados agora.</p>
    <button class="botao secundario" data-acao="ir:/saude">Voltar</button>`;
}

function telaMarcador(dados, marcador) {
  const serie = dados.marcadores.find((s) => s.marcador === marcador);
  if (!serie) throw new Error("Marcador não encontrado");

  const historico = serie.pontos
    .slice()
    .reverse()
    .map(
      (ponto) => `<div class="linha"><span>${escapar(dataCurta(ponto.data))}</span>
        <strong class="numero" style="color:${
          ponto.situacao === "normal" ? "var(--ok)" : ponto.situacao === "abaixo" ? "var(--atencao)" : "var(--serio)"
        }">${numero(ponto.valor)} ${escapar(serie.unidade || "")}</strong></div>`
    )
    .join("");

  return `<header class="topo">
      <div><h1>${escapar(serie.marcador)}</h1>
        <p class="sub">${serie.ref_min !== null ? `referência ${numero(serie.ref_min)}–${numero(serie.ref_max)} ${escapar(serie.unidade || "")}` : "sem faixa de referência"}</p></div>
    </header>

    <div class="cartao secao">
      ${linha(serie.pontos.map((p) => ({ rotulo: p.data, valor: p.valor })), {
        cor: COR,
        formatar: (v) => `${numero(v)} ${serie.unidade || ""}`,
      })}
      <p class="sub">Referência é do laboratório; o app só mostra se o valor está dentro ou fora dela — não é diagnóstico.</p>
    </div>

    <div class="secao"><h2>Histórico</h2><div class="cartao">${historico}</div></div>
    <button class="botao secundario" data-acao="ir:/saude/exames">Voltar</button>`;
}

// ---------- sinais e sono ----------

function telaSinais(dados) {
  const porTipo = dados.tipos_sinal
    .map((tipo) => {
      const registros = dados.sinais.filter((s) => s.tipo === tipo.id).slice(0, 8);
      if (registros.length === 0) return "";

      return `<div class="secao"><h2>${escapar(tipo.nome)}</h2><div class="cartao">
        ${registros
          .map(
            (registro) => `<div class="linha"><span>${escapar(dataCurta(registro.data))}</span>
              <strong class="numero">${numero(registro.valor)}${registro.valor2 ? `/${numero(registro.valor2)}` : ""}
                <span class="sub">${escapar(tipo.unidade)}</span></strong></div>`
          )
          .join("")}</div></div>`;
    })
    .join("");

  return `<header class="topo"><div><h1>Medições</h1></div></header>
    ${
      dados.pressao_classificada
        ? `<div class="cartao secao" style="--acento:${COR}"><div class="linha" style="border:0">
            <span>Última pressão</span><strong>${escapar(dados.pressao_classificada.nome)}</strong></div>
            <p class="sub">Faixa de referência publicada — não substitui avaliação médica.</p></div>`
        : ""
    }
    ${porTipo || vazio("Nenhuma medição registrada.", "balanca")}
    <div class="botoes secao" style="--acento:${COR}">
      ${dados.tipos_sinal
        .slice(0, 4)
        .map((tipo) => `<button class="copo" data-acao="registrar-sinal:${tipo.id}">${escapar(tipo.nome.split(" ")[0])}</button>`)
        .join("")}
    </div>
    <button class="botao secundario" data-acao="ir:/saude">Voltar</button>`;
}

function telaSono(dados) {
  const noites = dados.sono
    .map(
      (noite) => `<div class="linha"><span>${escapar(dataCurta(noite.data))}
        <br /><small class="sub">${noite.dormiu_em ? `${String(noite.dormiu_em).slice(0, 5)} → ${String(noite.acordou_em).slice(0, 5)}` : ""}</small></span>
        <strong class="numero">${noite.duracao_min ? `${Math.floor(noite.duracao_min / 60)}h${String(noite.duracao_min % 60).padStart(2, "0")}` : "—"}
          ${noite.qualidade ? `<span class="sub">${noite.qualidade}/5</span>` : ""}</strong></div>`
    )
    .join("");

  return `<header class="topo"><div><h1>Sono</h1></div></header>
    <div class="cartao secao">${noites || `<p class="sub">Nenhuma noite registrada.</p>`}</div>
    <button class="botao" data-acao="registrar-sono">Registrar noite</button>
    <button class="botao secundario" data-acao="ir:/saude">Voltar</button>`;
}

// ---------- modo consulta ----------

async function telaResumoConsulta() {
  const resumo = await api("/saude/consulta-resumo");

  const secao = (titulo, linhas) =>
    linhas.length ? `<div class="secao"><h2>${titulo}</h2><div class="cartao">${linhas.join("")}</div></div>` : "";

  return `<header class="topo">
      <div><h1>Modo consulta</h1><p class="sub">para mostrar na tela ou salvar em PDF</p></div>
    </header>

    <div id="para-imprimir">
      ${secao(
        "Medicamentos em uso",
        resumo.medicamentos.map(
          (m) => `<div class="linha"><span>${escapar(m.nome)}</span>
            <span class="sub">${escapar(m.dose || "")} ${(m.horarios || []).map((h) => String(h).slice(0, 5)).join(", ")}</span></div>`
        )
      )}
      ${secao(
        "Últimos exames",
        resumo.ultimos_exames.map(
          (e) => `<div class="linha"><span>${escapar(e.marcador)}</span>
            <span class="numero">${numero(e.valor)} ${escapar(e.unidade || "")}
              <span class="sub">${escapar(dataCurta(e.data))} · ${escapar(e.situacao)}</span></span></div>`
        )
      )}
      ${secao(
        "Medições",
        resumo.sinais.map(
          (s) => `<div class="linha"><span>${escapar(s.nome)}</span>
            <span class="numero">${numero(s.valor)}${s.valor2 ? `/${numero(s.valor2)}` : ""} ${escapar(s.unidade || "")}</span></div>`
        )
      )}
      ${secao(
        "Sintomas recentes",
        resumo.sintomas_recentes.map(
          (s) => `<div class="linha"><span>${escapar(s.nome)}</span>
            <span class="sub">${escapar(dataCurta(s.data))} · intensidade ${s.intensidade}/10</span></div>`
        )
      )}
      ${secao(
        "Consultas recentes",
        resumo.consultas_recentes.map(
          (c) => `<div class="linha"><span>${escapar(c.especialidade)}
            <br /><small class="sub">${escapar(c.resumo || "sem resumo")}</small></span>
            <span class="sub">${escapar(dataCurta(c.data))}</span></div>`
        )
      )}
      ${
        resumo.media_sono_7d
          ? `<div class="cartao secao"><div class="linha" style="border:0"><span>Sono médio (7 dias)</span>
              <strong>${Math.floor(resumo.media_sono_7d / 60)}h${String(resumo.media_sono_7d % 60).padStart(2, "0")}</strong></div></div>`
          : ""
      }
    </div>

    <button class="botao" data-acao="imprimir-resumo">Salvar em PDF / imprimir</button>
    <p class="sub">No iPhone: toque em Salvar em PDF, escolha "Compartilhar" e salve nos Arquivos.</p>
    <button class="botao secundario" data-acao="ir:/saude">Voltar</button>`;
}

// ---------- ações ----------

export const acoes = {
  async dose(argumento) {
    const [medicamentoId, horario, marcar] = argumento.split("|");
    estado.dados.saude = null;
    await acaoApi(
      `/saude/medicamentos/${medicamentoId}/dose`,
      { method: "POST", body: JSON.stringify({ horario, tomado: marcar === "1" }) },
      marcar === "1" ? "Dose registrada" : "Dose desmarcada"
    );
  },

  async "medicamento-novo"() {
    const nome = prompt("Nome do medicamento ou suplemento:");
    if (!nome) return;
    const dose = prompt("Dose (ex: 1 comprimido, 2000 UI):", "");
    const horarios = prompt("Horários separados por vírgula (ex: 08:00,20:00):", "08:00");
    if (!horarios) return;
    const estoqueAtual = prompt("Quantas unidades você tem em casa? (vazio = não controlar)", "");

    estado.dados.saude = null;
    await acaoApi(
      "/saude/medicamentos",
      {
        method: "POST",
        body: JSON.stringify({
          nome,
          dose: dose || null,
          horarios: horarios.split(",").map((h) => h.trim()).filter(Boolean),
          estoque_atual: estoqueAtual ? Number(estoqueAtual) : null,
        }),
      },
      "Medicamento cadastrado"
    );
  },

  async "medicamento-estoque"(id) {
    const valor = prompt("Quantas unidades você tem agora?");
    if (valor === null) return;
    estado.dados.saude = null;
    await acaoApi(`/saude/medicamentos/${id}`, { method: "PUT", body: JSON.stringify({ estoque_atual: Number(valor) }) }, "Estoque atualizado");
  },

  async "consulta-nova"() {
    const especialidade = prompt("Especialidade (ex: Dentista, Cardiologista):");
    if (!especialidade) return;
    const data = prompt("Data (AAAA-MM-DD):", estado.dados.saude?.data);
    if (!data) return;
    const profissional = prompt("Profissional (opcional):", "");
    const local = prompt("Local (opcional):", "");

    estado.dados.saude = null;
    await acaoApi(
      "/saude/consultas",
      { method: "POST", body: JSON.stringify({ especialidade, data, profissional: profissional || null, local: local || null }) },
      "Consulta registrada"
    );
  },

  async "consulta-campo"(campo) {
    const dados = estado.dados.saude;
    const consulta = dados.consultas.find((c) => c.id === estado.rascunho.consultaId);
    const rotulos = { perguntas: "Perguntas que quero fazer", resumo: "O que foi dito na consulta", prescricao: "Prescrição" };

    const texto = prompt(rotulos[campo], consulta[campo] || "");
    if (texto === null) return;

    estado.dados.saude = null;
    await acaoApi(`/saude/consultas/${consulta.id}`, { method: "PUT", body: JSON.stringify({ [campo]: texto }) }, "Salvo");
  },

  async "consulta-retorno"() {
    const data = prompt("Retorno em (AAAA-MM-DD):");
    if (!data) return;
    estado.dados.saude = null;
    await acaoApi(`/saude/consultas/${estado.rascunho.consultaId}`, { method: "PUT", body: JSON.stringify({ retorno_em: data }) }, "Retorno marcado");
  },

  async "consulta-excluir"(id) {
    if (!confirm("Excluir esta consulta e as anotações dela?")) return;
    await api(`/saude/consultas/${id}`, { method: "DELETE" });
    estado.dados.saude = null;
    navegar("/saude/consultas");
  },

  async "rotina-nova"() {
    const nome = prompt("Rotina (ex: Dentista, Check-up):");
    if (!nome) return;
    const meses = prompt("A cada quantos meses?", "6");
    if (!meses) return;
    const ultima = prompt("Quando foi a última vez? (AAAA-MM-DD, vazio = nunca)", "");

    estado.dados.saude = null;
    await acaoApi(
      "/saude/recorrencias",
      { method: "POST", body: JSON.stringify({ nome, cada_meses: Number(meses), ultima_em: ultima || null }) },
      "Rotina cadastrada"
    );
  },

  async "rotina-feita"(id) {
    estado.dados.saude = null;
    await acaoApi(
      `/saude/recorrencias/${id}`,
      { method: "PUT", body: JSON.stringify({ ultima_em: estado.dados.saude?.data || new Date().toISOString().slice(0, 10) }) },
      "Rotina atualizada"
    );
  },

  // Exame com marcadores: o formulário abre com os marcadores mais comuns já
  // listados, com a faixa de referência preenchida — você só digita o valor.
  async "exame-novo"() {
    const dados = estado.dados.saude || (await carregar());
    estado.rascunho = { marcadores: {} };

    abrirPainel(`<div class="titulo">Registrar exame</div>
      <div style="padding:0 14px 14px">
        <div class="dois">
          <label class="campo"><span>Tipo</span><input id="e-tipo" value="Sangue" /></label>
          <label class="campo"><span>Data</span><input id="e-data" type="date" value="${dados.data}" /></label>
        </div>
        <label class="campo"><span>Laboratório</span><input id="e-lab" placeholder="opcional" /></label>
        <p class="sub" style="margin-top:14px">Digite só os valores que aparecem no seu laudo:</p>
        ${dados.marcadores_conhecidos
          .map(
            (m) => `<label class="campo" style="margin-top:10px"><span>${escapar(m.nome)}
              <span class="sub">(${numero(m.ref_min)}–${numero(m.ref_max)} ${escapar(m.unidade)})</span></span>
              <input id="m-${m.id}" type="number" step="0.001" inputmode="decimal" placeholder="—" /></label>`
          )
          .join("")}
        <button class="botao" data-acao="exame-salvar">Salvar exame</button>
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "exame-salvar"() {
    const dados = estado.dados.saude;
    const marcadores = dados.marcadores_conhecidos
      .map((m) => ({ ...m, valor: $(`#m-${m.id}`)?.value }))
      .filter((m) => m.valor !== "" && m.valor !== undefined)
      .map((m) => ({ marcador: m.nome, valor: Number(m.valor), unidade: m.unidade, ref_min: m.ref_min, ref_max: m.ref_max }));

    if (marcadores.length === 0) return avisar("Digite pelo menos um valor");

    const corpo = {
      tipo: $("#e-tipo").value.trim() || "Exame",
      data: $("#e-data").value,
      laboratorio: $("#e-lab").value.trim() || null,
      marcadores,
    };

    fecharPainel();
    estado.dados.saude = null;
    await acaoApi("/saude/exames", { method: "POST", body: JSON.stringify(corpo) }, `${plural(marcadores.length, "valor", "valores")} salvos`);
  },

  async "registrar-sinal"(tipo) {
    const dados = estado.dados.saude || (await carregar());
    const info = dados.tipos_sinal.find((t) => t.id === tipo);

    const valor = prompt(`${info.nome} (${info.unidade})${info.dois_valores ? " — sistólica" : ""}:`);
    if (!valor) return;
    const valor2 = info.dois_valores ? prompt("Diastólica:") : null;

    estado.dados.saude = null;
    await acaoApi(
      "/saude/sinais",
      {
        method: "POST",
        body: JSON.stringify({
          tipo,
          data: dados.data,
          valor: Number(String(valor).replace(",", ".")),
          valor2: valor2 ? Number(String(valor2).replace(",", ".")) : null,
        }),
      },
      "Medição registrada"
    );
  },

  async "registrar-sintoma"() {
    const nome = prompt("Sintoma (ex: dor de cabeça):");
    if (!nome) return;
    const intensidade = prompt("Intensidade de 1 a 10:", "5");

    estado.dados.saude = null;
    await acaoApi(
      "/saude/sintomas",
      { method: "POST", body: JSON.stringify({ nome, intensidade: Number(intensidade) || 5 }) },
      "Sintoma registrado"
    );
  },

  async "registrar-sono"() {
    const dormiu = prompt("Que hora você dormiu? (HH:MM)", "23:00");
    if (!dormiu) return;
    const acordou = prompt("Que hora acordou? (HH:MM)", "07:00");
    if (!acordou) return;
    const qualidade = prompt("Qualidade de 1 a 5:", "4");

    estado.dados.saude = null;
    await acaoApi(
      "/saude/sono",
      { method: "POST", body: JSON.stringify({ dormiu_em: dormiu, acordou_em: acordou, qualidade: Number(qualidade) || null }) },
      "Noite registrada"
    );
  },

  "imprimir-resumo"() {
    window.print();
  },
};
