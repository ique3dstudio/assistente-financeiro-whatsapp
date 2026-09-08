// Módulo Vícios e Controle de Impulsos.
//
// Tom deste módulo: acompanhamento, não punição. A recaída não apaga o
// histórico, o aviso de que o app não é tratamento fica sempre visível, e a
// rede de apoio aparece antes de qualquer número.
import {
  $, abrirPainel, acaoApi, api, avisar, dataCurta, definirTimer, escapar, estado,
  fecharPainel, limparTimer, navegar, plural, reais, selecao, vazio,
} from "../ui.js";
import { icone } from "../icones.js";

export const rota = /^\/vicios$|^\/vicios\/(.+)$/;
export const aba = "eu";

const COR = "var(--c-vicios)";

export async function render(parametro) {
  const dados = estado.dados.vicios || (await carregar());

  if (!parametro) return painel(dados);
  if (parametro === "sos") return sos(dados);
  if (parametro === "apoio") return telaApoio(dados);

  return detalhe(dados, parametro);
}

async function carregar() {
  const dados = await api("/vicios");
  estado.dados.vicios = dados;
  return dados;
}

function tempoTexto(contador) {
  return `${contador.dias}d ${String(contador.horas).padStart(2, "0")}:${String(contador.minutos).padStart(2, "0")}:${String(
    contador.segundos
  ).padStart(2, "0")}`;
}

// Faz os contadores da tela andarem de segundo em segundo.
function ligarContadores(vicios) {
  const inicios = new Map(vicios.map((vicio) => [vicio.id, new Date(vicio.data_inicio).getTime()]));

  const desenhar = () => {
    let algum = false;
    for (const [id, inicio] of inicios) {
      const elemento = $(`#contador-${id}`);
      if (!elemento) continue;
      algum = true;

      const segundos = Math.max(0, Math.floor((Date.now() - inicio) / 1000));
      elemento.textContent = tempoTexto({
        dias: Math.floor(segundos / 86400),
        horas: Math.floor((segundos % 86400) / 3600),
        minutos: Math.floor((segundos % 3600) / 60),
        segundos: segundos % 60,
      });
    }
    if (!algum) limparTimer();
  };

  desenhar();
  definirTimer(desenhar, 1000);
}

// ---------- painel ----------

function painel(dados) {
  setTimeout(() => ligarContadores(dados.vicios), 0);

  const lista = dados.vicios.length
    ? dados.vicios
        .map(
          (vicio) => `<button class="cartao cartao-destaque" style="--acento:${COR};margin-bottom:10px"
                        data-acao="ir:/vicios/${vicio.id}">
            <div class="linha" style="border:0;padding-bottom:2px">
              <span class="item-nome">${escapar(vicio.tipo_info.emoji)} ${escapar(vicio.nome)}</span>
              ${vicio.pledge_hoje?.cumprido ? `<span class="selo">${icone("check", 14)}</span>` : ""}
            </div>
            <div id="contador-${vicio.id}" class="numero" style="font-size:26px;font-weight:680;letter-spacing:-.02em">
              ${tempoTexto(vicio.contador)}</div>
            <div class="item-info">
              ${vicio.proximo_marco ? `<span>faltam ${plural(vicio.proximo_marco.faltam, "dia", "dias")} para ${vicio.proximo_marco.dias}</span>` : "<span>todos os marcos</span>"}
              ${vicio.economia.dinheiro > 0 ? `<span>${reais(vicio.economia.dinheiro)} economizados</span>` : ""}
              ${vicio.recorde_dias > vicio.contador.dias ? `<span>recorde ${vicio.recorde_dias}d</span>` : ""}
            </div>
          </button>`
        )
        .join("")
    : vazio(
        "Nada em controle agora.<br />Se quiser acompanhar algo que você está deixando, comece por aqui.",
        "raio",
        { acao: "vicio-novo", rotulo: "Começar a contar" }
      );

  const apoio = dados.apoio.length
    ? dados.apoio
        .map(
          (contato) => `<a class="item" style="--acento:${COR};text-decoration:none;color:inherit"
                          href="tel:${escapar(contato.telefone || "")}">
            <span class="caixa" style="border-color:color-mix(in oklab, ${COR} 55%, var(--borda))">${icone("coracao", 15)}</span>
            <span class="item-corpo"><span class="item-nome">${escapar(contato.nome)}</span>
              <span class="item-info"><span>${escapar(contato.tipo)}</span>
                ${contato.telefone ? `<span>${escapar(contato.telefone)}</span>` : ""}</span></span>
          </a>`
        )
        .join("")
    : `<p class="sub">Você ainda não cadastrou ninguém. Uma pessoa só já faz diferença num dia ruim.</p>`;

  return `<header class="topo">
      <div><h1>Controle</h1><p class="sub">um dia de cada vez</p></div>
    </header>

    ${dados.vicios.length ? `<button class="botao" data-acao="ir:/vicios/sos" style="background:${COR}">
      ${icone("coracao", 18)} Estou com vontade agora</button>` : ""}

    <div class="secao">${lista}</div>

    <div class="secao"><h2>Rede de apoio</h2>${apoio}
      <button class="botao secundario" data-acao="ir:/vicios/apoio">Gerenciar rede de apoio</button></div>

    <div class="cartao secao" style="--acento:var(--tinta-3)">
      <p class="sub" style="margin:0">${escapar(dados.aviso)}</p>
    </div>

    ${dados.vicios.length ? `<button class="botao secundario" data-acao="vicio-novo">Acompanhar outro hábito</button>` : ""}
    <button class="botao secundario" data-acao="ir:/eu">Voltar</button>`;
}

// ---------- detalhe ----------

function detalhe(dados, id) {
  const vicio = dados.vicios.find((v) => v.id === id);
  if (!vicio) throw new Error("Não encontrado");

  estado.rascunho = { vicioId: id };
  setTimeout(() => ligarContadores([vicio]), 0);

  const marcos = dados.marcos
    .map((marco) => {
      const alcancado = vicio.contador.dias >= marco;
      return `<div class="chip ${alcancado ? "ativo" : ""}" style="--acento:${COR}">
        ${alcancado ? "✓ " : ""}${marco}d</div>`;
    })
    .join("");

  const linhaTempo = vicio.linha_recuperacao
    .map(
      (etapa) => `<div class="linha">
        <span style="opacity:${etapa.alcancado ? 1 : 0.55}">${etapa.alcancado ? "✓" : "○"} ${escapar(etapa.texto)}</span>
      </div>`
    )
    .join("");

  const mapa = vicio.mapa.total
    ? `<div class="secao"><h2>Onde a vontade te pega</h2>
        <div class="cartao">
          <div class="item-info" style="margin:0 0 10px">
            <span>${plural(vicio.mapa.total, "registro", "registros")}</span>
            <span>intensidade média ${vicio.mapa.intensidade_media}/10</span>
            <span>cedeu em ${Math.round(vicio.mapa.taxa_cedeu * 100)}%</span>
          </div>
          ${vicio.mapa.por_faixa
            .filter((faixa) => faixa.total > 0)
            .map(
              (faixa) => `<div class="linha"><span>${escapar(faixa.nome)}</span>
                <strong class="numero">${faixa.total}</strong></div>`
            )
            .join("")}
          ${
            vicio.mapa.por_gatilho.length
              ? `<div class="linha"><span>Gatilho mais comum</span>
                  <strong>${escapar(vicio.mapa.por_gatilho[0].nome)}</strong></div>`
              : ""
          }
          ${
            vicio.mapa.por_emocao.length
              ? `<div class="linha"><span>Emoção mais comum</span>
                  <strong>${escapar(vicio.mapa.por_emocao[0].nome)}</strong></div>`
              : ""
          }
        </div></div>`
    : "";

  const motivos = (vicio.motivos || []).length
    ? `<div class="secao"><h2>Meus porquês</h2><div class="cartao">
        ${vicio.motivos.map((motivo) => `<div class="linha"><span>${escapar(motivo.texto)}</span></div>`).join("")}</div>
        <button class="botao secundario" data-acao="motivo-novo">Acrescentar um porquê</button></div>`
    : `<div class="secao"><h2>Meus porquês</h2>
        <div class="cartao"><p class="sub">Escreva os motivos agora, com a cabeça fria. Eles vão aparecer na
          tela de urgência, quando é difícil lembrar deles.</p>
          <button class="botao secundario" data-acao="motivo-novo">Escrever o primeiro</button></div></div>`;

  const pledge = vicio.pledge_hoje?.cumprido
    ? `<div class="cartao" style="--acento:var(--ok)">
        <div class="item-nome" style="color:var(--ok)">${icone("check", 16)} Compromisso de hoje confirmado</div>
        ${vicio.sequencia_pledge ? `<p class="sub">${plural(vicio.sequencia_pledge, "dia", "dias")} seguidos confirmando</p>` : ""}
      </div>`
    : `<div class="cartao cartao-destaque" style="--acento:${COR}">
        <div class="item-nome">Compromisso de hoje</div>
        <p class="sub">"Hoje eu não vou ${escapar(vicio.nome.toLowerCase())}." Confirmar de manhã ajuda mais do que parece.</p>
        <button class="botao" data-acao="pledge-confirmar" style="background:${COR}">Eu me comprometo hoje</button>
      </div>`;

  return `<header class="topo">
      <div><h1>${escapar(vicio.tipo_info.emoji)} ${escapar(vicio.nome)}</h1>
        <p class="sub">${plural(vicio.tentativas, "tentativa", "tentativas")} · desde ${escapar(dataCurta(String(vicio.data_inicio).slice(0, 10)))}</p></div>
    </header>

    <div class="cartao secao cartao-destaque" style="--acento:${COR};text-align:center;padding:24px 16px">
      <div id="contador-${vicio.id}" class="numero" style="font-size:34px;font-weight:700;letter-spacing:-.03em">
        ${tempoTexto(vicio.contador)}</div>
      <p class="sub">${vicio.recorde_dias > vicio.contador.dias ? `seu recorde é ${plural(vicio.recorde_dias, "dia", "dias")} — ele não sumiu` : "este é o seu recorde"}</p>
      ${
        vicio.proximo_marco
          ? `<div class="barra"><span style="width:${Math.round((1 - vicio.proximo_marco.faltam / vicio.proximo_marco.dias) * 100)}%;background:${COR}"></span></div>
             <p class="sub">faltam ${plural(vicio.proximo_marco.faltam, "dia", "dias")} para o marco de ${vicio.proximo_marco.dias}</p>`
          : ""
      }
    </div>

    <button class="botao" data-acao="ir:/vicios/sos" style="background:${COR}">
      ${icone("coracao", 18)} Estou com vontade agora</button>

    <div class="secao">${pledge}</div>

    ${
      vicio.economia.dinheiro > 0 || vicio.economia.horas > 0
        ? `<div class="secao"><h2>O que você recuperou</h2>
            <div class="cartao">
              <div class="linha"><span>Dinheiro que não saiu</span><strong class="numero">${reais(vicio.economia.dinheiro)}</strong></div>
              <div class="linha"><span>Em 6 meses assim</span><strong class="numero">${reais(vicio.economia.dinheiro_6m)}</strong></div>
              <div class="linha"><span>Em 1 ano assim</span><strong class="numero">${reais(vicio.economia.dinheiro_12m)}</strong></div>
              ${vicio.economia.horas > 0 ? `<div class="linha"><span>Tempo de volta</span><strong class="numero">${vicio.economia.horas}h</strong></div>` : ""}
            </div>
            ${vicio.economia.dinheiro > 0 ? `<button class="botao secundario" data-acao="economia-para-meta">Transformar isso numa meta financeira</button>` : ""}
          </div>`
        : ""
    }

    <div class="secao"><h2>Marcos</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${marcos}</div></div>

    ${motivos}

    <div class="secao"><h2>Linha do tempo</h2><div class="cartao">${linhaTempo}
      <p class="sub">Informação geral de saúde, como encorajamento — não é promessa médica.</p></div></div>

    ${mapa}

    <div class="secao"><h2>Registrar</h2>
      <button class="botao secundario" data-acao="fissura-nova">Anotar uma fissura (mesmo sem ceder)</button>
      <button class="botao secundario" data-acao="recaida">Registrar uma recaída</button>
      <p class="sub">Registrar a recaída não apaga nada: o seu recorde continua guardado, e a anotação é o que
        ajuda a não repetir o mesmo caminho.</p>
    </div>

    <button class="botao secundario" data-acao="ir:/vicios">Voltar</button>`;
}

// ---------- SOS ----------

function sos(dados) {
  const vicio = dados.vicios[0];
  const motivos = dados.vicios.flatMap((v) => v.motivos || []);

  estado.sos = { passo: 1, segundos: 60 };
  setTimeout(iniciarRespiracao, 0);

  return `<header class="topo">
      <div><h1>Um minuto</h1><p class="sub">a vontade passa — ela sempre passa</p></div>
      <button class="link" data-acao="ir:/vicios">sair</button>
    </header>

    <div id="sos-passo1" class="cartao secao cartao-destaque" style="--acento:${COR};text-align:center;padding:28px 16px">
      <div id="sos-circulo" style="width:120px;height:120px;border-radius:50%;margin:0 auto;
           background:color-mix(in oklab, ${COR} 30%, transparent);
           border:3px solid ${COR};transition:transform 4s ease-in-out"></div>
      <div id="sos-instrucao" style="font-size:22px;font-weight:650;margin-top:18px">Inspire...</div>
      <div id="sos-contagem" class="sub numero">60s</div>
    </div>

    <div class="secao"><h2>Por que você começou isso</h2>
      <div class="cartao">
        ${
          motivos.length
            ? motivos.map((motivo) => `<div class="linha"><span>${escapar(motivo.texto)}</span></div>`).join("")
            : `<p class="sub">Você ainda não escreveu seus porquês. Depois que passar, vale escrever — é o que
                aparece aqui na próxima vez.</p>`
        }
      </div>
    </div>

    <div class="secao"><h2>Em vez disso, agora</h2>
      ${dados.acoes
        .map(
          (acao) => `<button class="item" style="--acento:${COR}" data-acao="sos-acao:${escapar(acao.texto)}">
            <span class="caixa" style="border-color:color-mix(in oklab, ${COR} 55%, var(--borda))">${icone("raio", 15)}</span>
            <span class="item-corpo"><span class="item-nome">${escapar(acao.texto)}</span></span>
          </button>`
        )
        .join("")}
    </div>

    ${
      dados.apoio.length
        ? `<div class="secao"><h2>Ligar para alguém</h2>
            ${dados.apoio
              .map(
                (contato) => `<a class="botao secundario" style="text-decoration:none"
                  href="tel:${escapar(contato.telefone || "")}">${icone("coracao", 16)} ${escapar(contato.nome)}</a>`
              )
              .join("")}</div>`
        : ""
    }

    <div class="cartao secao" style="--acento:var(--tinta-3)">
      <p class="sub" style="margin:0">${escapar(dados.aviso)}</p>
    </div>

    ${vicio ? `<button class="botao secundario" data-acao="fissura-rapida:${vicio.id}">Anotar essa vontade e seguir</button>` : ""}
    <button class="botao secundario" data-acao="ir:/vicios">Passou. Voltar</button>`;
}

// Respiração guiada: 4 segundos inspirando, 4 segurando, 6 soltando.
function iniciarRespiracao() {
  const FASES = [
    { texto: "Inspire...", segundos: 4, escala: 1.35 },
    { texto: "Segure...", segundos: 4, escala: 1.35 },
    { texto: "Solte devagar...", segundos: 6, escala: 0.85 },
  ];

  let restante = 60;
  let fase = 0;
  let naFase = 0;

  const circulo = $("#sos-circulo");
  const instrucao = $("#sos-instrucao");
  const contagem = $("#sos-contagem");
  if (!circulo) return;

  circulo.style.transform = `scale(${FASES[0].escala})`;
  instrucao.textContent = FASES[0].texto;

  definirTimer(() => {
    if (!$("#sos-circulo")) return limparTimer();

    restante--;
    naFase++;
    contagem.textContent = `${restante}s`;

    if (naFase >= FASES[fase].segundos) {
      fase = (fase + 1) % FASES.length;
      naFase = 0;
      instrucao.textContent = FASES[fase].texto;
      circulo.style.transitionDuration = `${FASES[fase].segundos}s`;
      circulo.style.transform = `scale(${FASES[fase].escala})`;
    }

    if (restante <= 0) {
      limparTimer();
      instrucao.textContent = "Você passou por isso.";
      contagem.textContent = "";
    }
  }, 1000);
}

// ---------- rede de apoio ----------

function telaApoio(dados) {
  const lista = dados.apoio.length
    ? dados.apoio
        .map(
          (contato) => `<div class="linha">
            <span>${escapar(contato.nome)}
              <br /><small class="sub">${escapar(contato.tipo)}${contato.telefone ? ` · ${escapar(contato.telefone)}` : ""}</small></span>
            <button class="link" data-acao="apoio-excluir:${contato.id}">remover</button>
          </div>`
        )
        .join("")
    : `<p class="sub">Nenhum contato ainda.</p>`;

  return `<header class="topo"><div><h1>Rede de apoio</h1>
      <p class="sub">quem você pode chamar num dia difícil</p></div></header>

    <div class="cartao secao">${lista}</div>
    <button class="botao" data-acao="apoio-novo" style="background:${COR}">Adicionar contato</button>

    <div class="secao"><h2>Ações alternativas</h2>
      <div class="cartao">${dados.acoes.map((acao) => `<div class="linha"><span>${escapar(acao.texto)}</span></div>`).join("")}</div>
      <button class="botao secundario" data-acao="acao-nova">Acrescentar uma ação</button>
      <p class="sub">São elas que aparecem na tela de urgência, na ordem em que você colocou.</p>
    </div>

    <div class="cartao secao" style="--acento:var(--tinta-3)">
      <p class="sub" style="margin:0">${escapar(dados.aviso)}</p></div>

    <button class="botao secundario" data-acao="ir:/vicios">Voltar</button>`;
}

// ---------- ações ----------

export const acoes = {
  async "vicio-novo"() {
    const dados = estado.dados.vicios || (await carregar());

    abrirPainel(`<div class="titulo">Acompanhar um hábito</div>
      <div style="padding:0 14px 14px">
        <label class="campo"><span>O que você está deixando</span>
          <input id="v-nome" placeholder="Cigarro, açúcar, apostas..." /></label>
        <label class="campo"><span>Tipo</span>
          ${selecao("v-tipo", dados.tipos.map((t) => ({ id: t.id, nome: `${t.emoji} ${t.nome}` })), "outro")}</label>
        <div class="dois">
          <label class="campo"><span>Gasto por dia (R$)</span>
            <input id="v-custo" type="number" inputmode="decimal" step="0.5" placeholder="0" /></label>
          <label class="campo"><span>Tempo por dia (min)</span>
            <input id="v-tempo" type="number" inputmode="numeric" placeholder="0" /></label>
        </div>
        <label class="campo"><span>Desde quando (deixe vazio para começar agora)</span>
          <input id="v-inicio" type="datetime-local" /></label>
        <button class="botao" data-acao="vicio-salvar" style="background:${COR}">Começar a contar</button>
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "vicio-salvar"() {
    const nome = $("#v-nome").value.trim();
    if (!nome) return avisar("Escreva o que você está deixando");

    const inicio = $("#v-inicio").value;
    fecharPainel();
    estado.dados.vicios = null;

    await acaoApi(
      "/vicios",
      {
        method: "POST",
        body: JSON.stringify({
          nome,
          tipo: $("#v-tipo").value,
          custo_diario: Number($("#v-custo").value) || 0,
          tempo_diario_min: Number($("#v-tempo").value) || 0,
          data_inicio: inicio ? new Date(inicio).toISOString() : new Date().toISOString(),
        }),
      },
      "Contando desde agora"
    );
  },

  async "pledge-confirmar"() {
    estado.dados.vicios = null;
    await acaoApi(
      `/vicios/${estado.rascunho.vicioId}/pledge`,
      { method: "POST", body: JSON.stringify({ cumprido: true }) },
      "Compromisso registrado"
    );
  },

  async "motivo-novo"() {
    const texto = prompt("Por que isso importa para você?");
    if (!texto) return;
    estado.dados.vicios = null;
    await acaoApi(`/vicios/${estado.rascunho.vicioId}/motivo`, { method: "POST", body: JSON.stringify({ texto }) }, "Guardado");
  },

  async "fissura-nova"() {
    const dados = estado.dados.vicios;
    const vicioId = estado.rascunho.vicioId;

    abrirPainel(`<div class="titulo">Anotar uma fissura</div>
      <div style="padding:0 14px 14px">
        <p class="sub">Registrar sem ter cedido também conta — esse é o dado que mostra onde a vontade nasce.</p>
        <label class="campo"><span>O que disparou</span>
          <input id="f-gatilho" placeholder="estresse, cerveja, tédio, briga..." /></label>
        <label class="campo"><span>Onde você estava</span><input id="f-local" placeholder="trabalho, casa, bar..." /></label>
        <label class="campo"><span>Como estava se sentindo</span>
          <input id="f-emocao" placeholder="ansioso, cansado, animado..." /></label>
        <label class="campo"><span>Intensidade (1 a 10)</span>
          <input id="f-intensidade" type="number" min="1" max="10" value="6" /></label>
        <label class="marca-linha"><input id="f-cedeu" type="checkbox" /><span>Eu cedi dessa vez</span></label>
        <button class="botao" data-acao="fissura-salvar:${vicioId}" style="background:${COR}">Salvar</button>
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "fissura-salvar"(vicioId) {
    const corpo = {
      vicio_id: vicioId,
      gatilho: $("#f-gatilho").value.trim() || null,
      local: $("#f-local").value.trim() || null,
      emocao: $("#f-emocao").value.trim() || null,
      intensidade: Number($("#f-intensidade").value) || 5,
      cedeu: $("#f-cedeu").checked,
    };

    fecharPainel();
    estado.dados.vicios = null;
    await acaoApi("/vicios/fissuras", { method: "POST", body: JSON.stringify(corpo) }, "Anotado");
  },

  async "fissura-rapida"(vicioId) {
    estado.dados.vicios = null;
    await acaoApi(
      "/vicios/fissuras",
      { method: "POST", body: JSON.stringify({ vicio_id: vicioId, intensidade: 7, cedeu: false }) },
      "Anotado — você segurou"
    );
    navegar("/vicios");
  },

  "sos-acao"(texto) {
    avisar(`Vai fazer: ${texto}`);
  },

  async recaida() {
    const dados = estado.dados.vicios;
    const vicio = dados.vicios.find((v) => v.id === estado.rascunho.vicioId);

    abrirPainel(`<div class="titulo">Registrar recaída</div>
      <div style="padding:0 14px 14px">
        <p class="sub">Você chegou a ${plural(vicio.contador.dias, "dia", "dias")}. Isso aconteceu e continua contando
          como recorde — o contador reinicia, o histórico não.</p>
        <label class="campo"><span>O que a gente aprende dessa vez?</span>
          <textarea id="r-aprendizado" rows="4" placeholder="O que veio antes? O que faria diferente?"></textarea></label>
        <button class="botao" data-acao="recaida-salvar">Registrar e recomeçar</button>
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "recaida-salvar"() {
    const aprendizado = $("#r-aprendizado").value.trim() || null;
    fecharPainel();
    estado.dados.vicios = null;

    const resultado = await acaoApi(
      `/vicios/${estado.rascunho.vicioId}/recaida`,
      { method: "POST", body: JSON.stringify({ aprendizado }) },
      null
    );

    avisar(`Recomeçando. Seu recorde de ${resultado?.recorde_preservado || 0} dias está guardado.`);
  },

  async "economia-para-meta"() {
    const dados = estado.dados.vicios;
    const vicio = dados.vicios.find((v) => v.id === estado.rascunho.vicioId);
    const titulo = prompt("Nome da meta (ex: viagem):", `Economia de ${vicio.nome}`);
    if (!titulo) return;

    await api("/financas/metas", {
      method: "POST",
      body: JSON.stringify({ titulo, valor_alvo: vicio.economia.dinheiro_12m, valor_atual: vicio.economia.dinheiro }),
    });

    avisar("Meta criada na aba Dinheiro");
  },

  async "apoio-novo"() {
    const nome = prompt("Nome do contato:");
    if (!nome) return;
    const telefone = prompt("Telefone (com DDD):", "");
    const tipo = prompt("É pessoa, profissional ou grupo?", "pessoa");

    estado.dados.vicios = null;
    await acaoApi(
      "/vicios/apoio",
      { method: "POST", body: JSON.stringify({ nome, telefone: telefone || null, tipo: ["pessoa", "profissional", "grupo"].includes(tipo) ? tipo : "pessoa" }) },
      "Contato salvo"
    );
  },

  async "apoio-excluir"(id) {
    estado.dados.vicios = null;
    await acaoApi(`/vicios/apoio/${id}`, { method: "DELETE" }, "Contato removido");
  },

  async "acao-nova"() {
    const texto = prompt("O que fazer em vez disso?");
    if (!texto) return;
    estado.dados.vicios = null;
    await acaoApi("/vicios/acoes", { method: "POST", body: JSON.stringify({ texto }) }, "Ação salva");
  },
};
