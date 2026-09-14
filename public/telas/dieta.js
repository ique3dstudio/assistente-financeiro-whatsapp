// Módulo Dieta: painel do dia, registro de refeição (alimento/texto/modelo),
// banco de alimentos com código de barras, alvos com ajuste adaptativo,
// planejador semanal, lista de compras e sensações pós-refeição.
import {
  $, abrirPainel, acaoApi, api, avisar, dataCurta, escapar, estado,
  fecharPainel, navegar, numero, plural, selecao, vazio,
} from "../ui.js";
import { icone } from "../icones.js";

export const rota = /^\/dieta$|^\/dieta\/(.+)$/;
export const aba = "corpo";

const COR = "var(--c-dieta)";
const REFEICOES = [
  { id: "cafe", nome: "Café da manhã" },
  { id: "almoco", nome: "Almoço" },
  { id: "lanche", nome: "Lanche" },
  { id: "jantar", nome: "Jantar" },
  { id: "ceia", nome: "Ceia" },
  { id: "outro", nome: "Outro" },
];

export async function render(parametro) {
  const dados = estado.dados.dieta || (await carregar());
  if (!parametro) return painel(dados);

  const [tela, argumento] = parametro.split("/");
  const telas = {
    registrar: () => registrar(dados),
    alimentos: () => alimentos(argumento),
    salvas: () => salvas(dados),
    plano: () => plano(),
    lista: () => lista(),
    ajuste: () => ajuste(dados),
    sensacoes: () => sensacoes(),
  };

  return (telas[tela] || (() => painel(dados)))();
}

async function carregar() {
  const dados = await api("/dieta");
  estado.dados.dieta = dados;
  return dados;
}

// ---------- painel ----------

function painel(dados) {
  const semAlvo = !dados.alvo;

  const anel = (chave, nome) => {
    if (!dados.progresso) return "";
    const p = dados.progresso[chave];
    const cor = p.proporcao > 1.05 ? "var(--atencao)" : COR;
    return `<div style="padding:9px 0">
      <div class="linha" style="padding:0;border:0"><span>${nome}</span>
        <strong class="numero">${numero(Math.round(p.consumido))}${chave !== "kcal" ? "g" : ""}
          <span class="sub"> de ${numero(Math.round(p.alvo))}${chave !== "kcal" ? "g" : ""}</span></strong></div>
      <div class="barra" style="margin-top:6px;height:4px"><span style="width:${Math.min(100, p.proporcao * 100)}%;background:${cor}"></span></div>
    </div>`;
  };

  const refeicoes = dados.refeicoes.length
    ? dados.refeicoes
        .map(
          (r) => `<button class="linha" style="width:100%;text-align:left" data-acao="refeicao-opcoes:${r.id}">
            <span>${escapar(REFEICOES.find((f) => f.id === r.refeicao)?.nome || r.refeicao)}
              <br /><small class="sub">${String(r.hora).slice(0, 5)} · ${escapar(r.descricao || "sem descrição")}</small></span>
            <strong class="numero">${numero(Math.round(r.kcal))} kcal</strong>
          </button>`
        )
        .join("")
    : `<p class="sub">Nada registrado ainda hoje.</p>`;

  const checkin = `<div class="botoes" style="--acento:${COR}">
    ${dados.checkins
      .map(
        (c) => `<button class="copo ${dados.checkin_hoje?.avaliacao === c.id ? "ativo" : ""}"
          style="${dados.checkin_hoje?.avaliacao === c.id ? `background:color-mix(in oklab, ${COR} 20%, var(--superficie));border-color:${COR}` : ""}"
          data-acao="checkin:${c.id}">${c.emoji}<small>${escapar(c.nome)}</small></button>`
      )
      .join("")}
  </div>`;

  const salvasRapidas = dados.salvas.length
    ? `<div class="secao"><h2>Registrar em 1 toque</h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${dados.salvas
            .slice(0, 6)
            .map((m) => `<button class="chip" style="--acento:${COR}" data-acao="registrar-salva:${m.id}">${escapar(m.nome)}</button>`)
            .join("")}
        </div></div>`
    : "";

  return `<header class="topo">
      <div><h1>Dieta</h1><p class="sub">${
        dados.jejum ? `jejum: ${formatarJejum(dados.jejum.minutos)}` : "primeira refeição do dia ainda não registrada"
      }</p></div>
    </header>

    ${
      semAlvo
        ? `<div class="cartao secao cartao-destaque" style="--acento:${COR}">
            <div class="item-nome">Defina um alvo de calorias</div>
            <p class="sub">Sem alvo, o app só soma o que você comeu — sem comparar com nada.</p>
            <button class="botao secundario" data-acao="alvo-definir" style="border-color:${COR}">Definir alvo manualmente</button>
          </div>`
        : `<div class="cartao secao cartao-destaque" style="--acento:${COR}">
            <div class="linha" style="border:0;padding-bottom:2px">
              <span class="item-nome">Hoje</span>
              ${dados.treinou_hoje ? `<span class="chip ativo" style="--acento:${COR}">dia de treino</span>` : ""}
            </div>
            ${anel("kcal", "Calorias")}${anel("proteina_g", "Proteína")}${anel("carbo_g", "Carboidrato")}${anel("gordura_g", "Gordura")}
          </div>`
    }

    <div class="secao"><h2>Como você comeu hoje</h2>${checkin}</div>

    ${salvasRapidas}

    <div class="secao"><h2>Refeições</h2><div class="cartao">${refeicoes}</div></div>

    <button class="botao" data-acao="ir:/dieta/registrar" style="background:${COR}">Registrar refeição</button>
    <button class="botao secundario" data-acao="ir:/dieta/plano">Planejador da semana</button>
    <button class="botao secundario" data-acao="ir:/dieta/lista">Lista de compras</button>
    <button class="botao secundario" data-acao="ir:/dieta/ajuste">Alvo e ajuste semanal</button>
    <button class="botao secundario" data-acao="ir:/dieta/sensacoes">Como as refeições te fazem sentir</button>
    <button class="botao secundario" data-acao="ir:/corpo">Voltar</button>`;
}

function formatarJejum(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

// ---------- registrar ----------

function registrar(dados) {
  return `<header class="topo"><div><h1>Registrar refeição</h1></div></header>

    <div class="secao"><h2>Do jeito rápido</h2>
      <button class="item" style="--acento:${COR}" data-acao="ir:/dieta/alimentos/escolher">
        <span class="caixa" style="border-color:color-mix(in oklab, ${COR} 55%, var(--borda))">${icone("prato", 15)}</span>
        <span class="item-corpo"><span class="item-nome">Buscar alimento</span>
          <span class="item-info"><span>banco de alimentos ou código de barras</span></span></span>
      </button>
      <button class="item" style="--acento:${COR}" data-acao="registrar-texto">
        <span class="caixa" style="border-color:color-mix(in oklab, ${COR} 55%, var(--borda))">${icone("livro", 15)}</span>
        <span class="item-corpo"><span class="item-nome">Descrever em texto</span>
          <span class="item-info"><span>"2 ovos e uma fatia de pão"</span></span></span>
      </button>
      <button class="item" style="--acento:${COR}" data-acao="registrar-foto">
        <span class="caixa" style="border-color:color-mix(in oklab, ${COR} 55%, var(--borda))">${icone("camera", 15)}</span>
        <span class="item-corpo"><span class="item-nome">Foto do prato</span>
          <span class="item-info"><span>diário visual, mesmo sem contar caloria</span></span></span>
      </button>
    </div>

    ${
      dados.salvas.length
        ? `<div class="secao"><h2>Refeições salvas</h2>
            ${dados.salvas
              .map(
                (m) => `<div class="item" style="--acento:${COR}">
                  <span class="caixa" style="border-color:color-mix(in oklab, ${COR} 55%, var(--borda))">${icone("prato", 15)}</span>
                  <button class="item-corpo" data-acao="registrar-salva:${m.id}">
                    <span class="item-nome">${escapar(m.nome)}</span>
                    <span class="item-info"><span>${numero(Math.round(m.kcal))} kcal</span></span>
                  </button>
                  <button class="mais" data-acao="salva-excluir:${m.id}">×</button>
                </div>`
              )
              .join("")}
          </div>`
        : ""
    }

    <button class="botao secundario" data-acao="ir:/dieta">Voltar</button>`;
}

async function registrarTextoLivre() {
  abrirPainel(`<div class="titulo">Descrever refeição</div>
    <div style="padding:0 14px 14px">
      <label class="campo"><span>O que você comeu</span>
        <textarea id="t-descricao" rows="2" placeholder="2 ovos mexidos, uma fatia de pão integral"></textarea></label>
      <label class="campo"><span>Refeição</span>
        ${selecao("t-refeicao", REFEICOES, "outro")}</label>
      <p class="sub" style="margin-top:12px">Se souber, informe os macros — senão deixe em branco (só vira anotação):</p>
      <div class="dois">
        <label class="campo"><span>Calorias</span><input id="t-kcal" type="number" placeholder="opcional" /></label>
        <label class="campo"><span>Proteína (g)</span><input id="t-prot" type="number" placeholder="opcional" /></label>
      </div>
      <div class="dois">
        <label class="campo"><span>Carboidrato (g)</span><input id="t-carbo" type="number" placeholder="opcional" /></label>
        <label class="campo"><span>Gordura (g)</span><input id="t-gord" type="number" placeholder="opcional" /></label>
      </div>
      <button class="botao" data-acao="salvar-texto" style="background:${COR}">Registrar</button>
    </div>
    <button data-acao="fechar-painel">Cancelar</button>`);
}

// ---------- alimentos (busca + código de barras) ----------

async function alimentos(modo) {
  const escolhendo = modo === "escolher";
  const filtro = estado.filtroAlimentos || {};
  const { alimentos: lista } = await api(`/dieta/alimentos${filtro.busca ? `?busca=${encodeURIComponent(filtro.busca)}` : ""}`);

  const itens = lista.length
    ? lista
        .map(
          (a) => `<button class="item" style="--acento:${COR}" data-acao="alimento-escolher:${a.id}">
            <span class="caixa" style="border-color:color-mix(in oklab, ${COR} 55%, var(--borda))">${icone("prato", 15)}</span>
            <span class="item-corpo"><span class="item-nome">${escapar(a.nome)}</span>
              <span class="item-info"><span>${numero(a.kcal)} kcal/100g</span>
                <span>P ${numero(a.proteina_g)} · C ${numero(a.carbo_g)} · G ${numero(a.gordura_g)}</span></span></span>
          </button>`
        )
        .join("")
    : vazio("Nenhum alimento encontrado.", "prato");

  return `<header class="topo"><div><h1>${escolhendo ? "Escolher alimento" : "Alimentos"}</h1></div></header>

    <label class="campo"><span>Buscar</span>
      <input id="a-busca" value="${escapar(filtro.busca || "")}" placeholder="arroz, frango, whey..." /></label>
    <button class="botao secundario" data-acao="alimento-buscar">Buscar</button>
    <button class="botao secundario" data-acao="codigo-barras">Ler código de barras</button>

    <div class="secao">${itens}</div>
    <button class="botao secundario" data-acao="alimento-novo">Cadastrar um alimento meu</button>
    <button class="botao secundario" data-acao="ir:/dieta/registrar">Voltar</button>`;
}

function abrirQuantidade(alimento) {
  estado.rascunho = { alimentoId: alimento.id };

  abrirPainel(`<div class="titulo">${escapar(alimento.nome)}</div>
    <div style="padding:0 14px 14px">
      <p class="sub">${numero(alimento.kcal)} kcal · P ${numero(alimento.proteina_g)} · C ${numero(alimento.carbo_g)} · G ${numero(alimento.gordura_g)}
        <span class="sub"> (por 100 g)</span></p>
      <label class="campo"><span>Quantidade (g)</span>
        <input id="q-gramas" type="number" value="${alimento.porcao_padrao_g || 100}" /></label>
      <label class="campo"><span>Refeição</span>${selecao("q-refeicao", REFEICOES, "almoco")}</label>
      <button class="botao" data-acao="confirmar-quantidade" style="background:${COR}">Registrar</button>
    </div>
    <button data-acao="fechar-painel">Cancelar</button>`);
}

async function abrirCodigoBarras() {
  const suportado = "BarcodeDetector" in window;

  abrirPainel(`<div class="titulo">Código de barras</div>
    <div style="padding:0 14px 14px">
      ${
        suportado
          ? `<button class="botao secundario" data-acao="escanear-camera">Usar a câmera</button>
             <p class="sub" style="text-align:center;margin:10px 0">ou digite o número</p>`
          : `<p class="sub">Seu navegador não lê código de barras pela câmera (é o caso do Safari no iPhone) —
              digite o número que aparece embaixo do código.</p>`
      }
      <label class="campo"><span>Número do código</span>
        <input id="cb-numero" inputmode="numeric" placeholder="ex: 7891000100103" /></label>
      <button class="botao" data-acao="buscar-codigo" style="background:${COR}">Buscar</button>
    </div>
    <button data-acao="fechar-painel">Cancelar</button>`);
}

// ---------- refeições salvas ----------

function salvas(dados) {
  return `<header class="topo"><div><h1>Refeições salvas</h1></div></header>
    <div class="secao">${
      dados.salvas.length
        ? dados.salvas.map((m) => `<div class="linha"><span>${escapar(m.nome)}</span><strong>${numero(Math.round(m.kcal))} kcal</strong></div>`).join("")
        : vazio("Nenhuma refeição salva ainda.", "prato")
    }</div>
    <button class="botao secundario" data-acao="ir:/dieta">Voltar</button>`;
}

// ---------- planejador semanal ----------

async function plano() {
  const { dias, itens } = await api("/dieta/plano");

  const blocos = dias
    .map((data) => {
      const doDia = itens.filter((i) => i.data === data);
      return `<div class="secao"><h2>${escapar(dataCurta(data))}</h2>
        <div class="cartao">
          ${
            doDia.length
              ? doDia
                  .map(
                    (item) => `<div class="linha"><span>${escapar(REFEICOES.find((r) => r.id === item.refeicao)?.nome)}: ${escapar(item.descricao || item.alimento?.nome || "")}
                      ${item.quantidade_g ? ` (${numero(item.quantidade_g)}g)` : ""}</span>
                      <button class="link" data-acao="plano-remover:${item.id}">remover</button></div>`
                  )
                  .join("")
              : `<p class="sub">Nada planejado.</p>`
          }
          <button class="link centro" data-acao="plano-adicionar:${data}">+ adicionar</button>
        </div></div>`;
    })
    .join("");

  return `<header class="topo"><div><h1>Planejador</h1><p class="sub">os próximos 7 dias</p></div></header>
    ${blocos}
    <button class="botao" data-acao="gerar-lista" style="background:${COR}">Gerar lista de compras</button>
    <button class="botao secundario" data-acao="ir:/dieta">Voltar</button>`;
}

// ---------- lista de compras ----------

async function lista() {
  const { lista: itens } = await api("/dieta/lista");
  const porSecao = {};
  for (const item of itens) (porSecao[item.secao] ||= []).push(item);

  const blocos = Object.entries(porSecao)
    .map(
      ([secao, lista]) => `<div class="secao"><h2>${escapar(secao)}</h2><div class="cartao">
        ${lista
          .map(
            (item) => `<div class="item ${item.comprado ? "feito" : ""}" style="--acento:${COR};margin-bottom:0;border-radius:0;border-left:0;border-right:0;box-shadow:none">
              <button class="caixa" data-acao="lista-marcar:${item.id}|${item.comprado ? 0 : 1}">${item.comprado ? icone("check", 15) : ""}</button>
              <span class="item-corpo"><span class="item-nome">${escapar(item.item)}</span>
                ${item.quantidade ? `<span class="item-info"><span>${escapar(item.quantidade)}</span></span>` : ""}</span>
            </div>`
          )
          .join("")}
      </div></div>`
    )
    .join("");

  return `<header class="topo"><div><h1>Lista de compras</h1></div></header>
    ${itens.length ? blocos : vazio("Lista vazia.<br />Gere a partir do planejador ou adicione um item.", "lista")}
    <button class="botao" data-acao="lista-adicionar" style="background:${COR}">Adicionar item</button>
    <button class="botao secundario" data-acao="lista-limpar">Limpar comprados</button>
    <button class="botao secundario" data-acao="ir:/dieta">Voltar</button>`;
}

// ---------- alvo e ajuste ----------

async function ajuste(dados) {
  const sugestao = await api("/dieta/ajuste").catch(() => null);

  return `<header class="topo"><div><h1>Alvo e ajuste</h1></div></header>

    ${
      dados.alvo
        ? `<div class="cartao secao" style="--acento:${COR}">
            <div class="linha" style="border:0"><span>Alvo atual (descanso)</span><strong>${numero(dados.alvo.kcal)} kcal</strong></div>
            <div class="item-info"><span>P ${numero(dados.alvo.proteina_g)}g</span><span>C ${numero(dados.alvo.carbo_g)}g</span><span>G ${numero(dados.alvo.gordura_g)}g</span></div>
          </div>`
        : `<p class="sub">Nenhum alvo definido ainda.</p>`
    }
    <button class="botao secundario" data-acao="alvo-definir">Definir alvo manualmente</button>

    <div class="secao"><h2>Ajuste adaptativo</h2>
      <div class="cartao">
        ${
          !sugestao || !sugestao.suficiente
            ? `<p class="sub">${sugestao?.motivo || "Registre comida e peso por mais tempo para o app propor um ajuste."}</p>
               <p class="sub">Dias com refeição registrada: ${sugestao?.dias_consumo ?? 0} · pesagens: ${sugestao?.pesagens ?? 0}</p>`
            : `<p>${escapar(sugestao.justificativa)}</p>
               ${
                 sugestao.mudar
                   ? `<button class="botao" data-acao="ajuste-aplicar" style="background:${COR}">Aplicar: ${numero(sugestao.kcal_sugerido)} kcal</button>`
                   : `<p class="sub">Sem necessidade de mudar por enquanto — está no caminho certo.</p>`
               }`
        }
      </div>
      <p class="sub">Calculado a partir do peso registrado no módulo Corpo e das refeições dos últimos 21 dias — não é uma
        fórmula fixa, é o que o seu corpo respondeu de verdade.</p>
    </div>

    <button class="botao secundario" data-acao="ir:/dieta">Voltar</button>`;
}

// ---------- sensações (E5.6) ----------

async function sensacoes() {
  const { sensacoes: lista } = { sensacoes: await api("/dieta/sensacoes") };

  const linhas = lista.length
    ? lista
        .map(
          (s) => `<div class="linha"><span>${escapar(s.descricao || s.refeicao)}
            <br /><small class="sub">${escapar(dataCurta(s.data))}</small></span>
            <span class="item-info" style="margin:0">
              ${s.energia ? `<span>energia ${s.energia}/5</span>` : ""}
              ${s.inchaco ? `<span>inchaço ${s.inchaco}/5</span>` : ""}
              ${s.humor_do_dia ? `<span>humor do dia ${s.humor_do_dia}/5</span>` : ""}
            </span></div>`
        )
        .join("")
    : "";

  return `<header class="topo"><div><h1>Como você se sente</h1>
      <p class="sub">energia, inchaço e sono depois de comer</p></div></header>
    <div class="cartao secao">${linhas || vazio("Nenhuma sensação registrada ainda.<br />Ao ver uma refeição de hoje, toque em '···' → 'Como me senti'.", "coracao")}</div>
    <button class="botao secundario" data-acao="ir:/dieta">Voltar</button>`;
}

// ---------- ações ----------

export const acoes = {
  async checkin(avaliacao) {
    estado.dados.dieta = null;
    await acaoApi("/dieta/checkin", { method: "POST", body: JSON.stringify({ avaliacao }) }, "Registrado");
  },

  "registrar-texto": registrarTextoLivre,

  async "registrar-foto"() {
    const url = prompt("Cole o link da foto (upload de arquivo chega com o Storage):");
    if (!url) return;
    const descricao = prompt("Uma palavra sobre o prato (opcional):", "") || null;

    estado.dados.dieta = null;
    await acaoApi(
      "/dieta/refeicoes/texto",
      { method: "POST", body: JSON.stringify({ descricao, foto_url: url, refeicao: "outro" }) },
      "Foto registrada"
    );
    navegar("/dieta");
  },

  async "salvar-texto"() {
    const descricao = $("#t-descricao").value.trim();
    if (!descricao) return avisar("Descreva o que você comeu");

    const corpo = {
      descricao,
      refeicao: $("#t-refeicao").value,
      macros: {
        kcal: Number($("#t-kcal").value) || 0,
        proteina_g: Number($("#t-prot").value) || 0,
        carbo_g: Number($("#t-carbo").value) || 0,
        gordura_g: Number($("#t-gord").value) || 0,
      },
    };

    fecharPainel();
    estado.dados.dieta = null;
    await acaoApi("/dieta/refeicoes/texto", { method: "POST", body: JSON.stringify(corpo) }, "Registrado");
    navegar("/dieta");
  },

  async "registrar-salva"(id) {
    estado.dados.dieta = null;
    await acaoApi(`/dieta/salvas/${id}/registrar`, { method: "POST", body: "{}" }, "Registrado");
    navegar("/dieta");
  },

  async "salva-excluir"(id) {
    if (!confirm("Excluir esta refeição salva?")) return;
    estado.dados.dieta = null;
    await acaoApi(`/dieta/salvas/${id}`, { method: "DELETE" }, "Excluída");
  },

  "alimento-buscar"() {
    estado.filtroAlimentos = { busca: $("#a-busca").value.trim() };
    navegar(location.hash.replace(/^#/, "") || "/dieta/alimentos");
  },

  "codigo-barras": abrirCodigoBarras,

  async "escanear-camera"() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.style.cssText = "width:100%;border-radius:12px;margin-top:10px";
      $("#cb-numero").insertAdjacentElement("afterend", video);
      await video.play();

      // eslint-disable-next-line no-undef
      const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      const parar = () => stream.getTracks().forEach((t) => t.stop());

      const olhar = async () => {
        if (!document.body.contains(video)) return parar();
        try {
          const codigos = await detector.detect(video);
          if (codigos.length) {
            $("#cb-numero").value = codigos[0].rawValue;
            parar();
            video.remove();
            return avisar("Código lido — toque em Buscar");
          }
        } catch {
          // segue tentando
        }
        requestAnimationFrame(olhar);
      };
      olhar();
    } catch {
      avisar("Não consegui acessar a câmera — digite o número.");
    }
  },

  async "buscar-codigo"() {
    const codigo = $("#cb-numero").value.trim();
    if (!codigo) return avisar("Digite o código");

    const resultado = await api(`/dieta/alimentos/codigo/${encodeURIComponent(codigo)}`);
    fecharPainel();

    if (!resultado.alimento) {
      return avisar(resultado.origem === "sem_rede" ? "Sem conexão para buscar — cadastre manualmente" : "Não encontrado — cadastre manualmente");
    }

    if (resultado.origem === "open_food_facts") {
      const { alimento } = await api("/dieta/alimentos", { method: "POST", body: JSON.stringify(resultado.alimento) });
      return abrirQuantidade(alimento || resultado.alimento);
    }

    abrirQuantidade(resultado.alimento);
  },

  async "alimento-novo"() {
    abrirPainel(`<div class="titulo">Cadastrar alimento</div>
      <div style="padding:0 14px 14px">
        <label class="campo"><span>Nome</span><input id="n-nome" placeholder="ex: Vitamina caseira" /></label>
        <p class="sub" style="margin-top:10px">Valores por 100 g (ou 100 ml):</p>
        <div class="dois">
          <label class="campo"><span>Calorias</span><input id="n-kcal" type="number" /></label>
          <label class="campo"><span>Proteína (g)</span><input id="n-prot" type="number" /></label>
        </div>
        <div class="dois">
          <label class="campo"><span>Carboidrato (g)</span><input id="n-carbo" type="number" /></label>
          <label class="campo"><span>Gordura (g)</span><input id="n-gord" type="number" /></label>
        </div>
        <button class="botao" data-acao="salvar-alimento-novo" style="background:${COR}">Salvar</button>
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "salvar-alimento-novo"() {
    const nome = $("#n-nome").value.trim();
    if (!nome) return avisar("Dê um nome ao alimento");

    const alimento = await api("/dieta/alimentos", {
      method: "POST",
      body: JSON.stringify({
        nome,
        kcal: Number($("#n-kcal").value) || 0,
        proteina_g: Number($("#n-prot").value) || 0,
        carbo_g: Number($("#n-carbo").value) || 0,
        gordura_g: Number($("#n-gord").value) || 0,
      }),
    });

    fecharPainel();
    abrirQuantidade(alimento);
  },

  async "alimento-escolher"(id) {
    const filtro = estado.filtroAlimentos || {};
    const { alimentos: lista } = await api(`/dieta/alimentos${filtro.busca ? `?busca=${encodeURIComponent(filtro.busca)}` : ""}`);
    const alimento = lista.find((a) => a.id === id);
    if (alimento) abrirQuantidade(alimento);
  },

  async "confirmar-quantidade"() {
    const gramas = Number($("#q-gramas").value);
    if (!gramas) return avisar("Informe a quantidade");

    fecharPainel();
    estado.dados.dieta = null;
    await acaoApi(
      "/dieta/refeicoes/alimento",
      { method: "POST", body: JSON.stringify({ alimento_id: estado.rascunho.alimentoId, quantidade_g: gramas, refeicao: $("#q-refeicao")?.value || "almoco" }) },
      "Registrado"
    );
    navegar("/dieta");
  },

  "refeicao-opcoes"(id) {
    abrirPainel(`<div class="titulo">Refeição</div>
      <button data-acao="refeicao-sensacoes:${id}">Como me senti depois</button>
      <button data-acao="refeicao-salvar-modelo:${id}">Salvar como modelo</button>
      <button data-acao="refeicao-excluir:${id}">Excluir</button>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  "refeicao-sensacoes"(id) {
    abrirPainel(`<div class="titulo">Como você se sentiu?</div>
      <div style="padding:0 14px 14px">
        <label class="campo"><span>Energia (1 baixa – 5 alta)</span><input id="s-energia" type="number" min="1" max="5" /></label>
        <label class="campo"><span>Inchaço (1 nada – 5 muito)</span><input id="s-inchaco" type="number" min="1" max="5" /></label>
        <label class="campo"><span>Sono/moleza (1 nada – 5 muito)</span><input id="s-sono" type="number" min="1" max="5" /></label>
        <button class="botao" data-acao="salvar-sensacoes:${id}" style="background:${COR}">Salvar</button>
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "salvar-sensacoes"(id) {
    const corpo = {
      energia: Number($("#s-energia").value) || null,
      inchaco: Number($("#s-inchaco").value) || null,
      sono: Number($("#s-sono").value) || null,
    };
    fecharPainel();
    await acaoApi(`/dieta/refeicoes/${id}/sensacoes`, { method: "PUT", body: JSON.stringify(corpo) }, "Guardado");
  },

  async "refeicao-salvar-modelo"(id) {
    const dados = estado.dados.dieta;
    const refeicao = dados.refeicoes.find((r) => r.id === id);
    const nome = prompt("Nome para salvar (ex: Café padrão):", refeicao?.descricao || "");
    if (!nome) return;

    fecharPainel();
    await acaoApi(
      "/dieta/salvas",
      {
        method: "POST",
        body: JSON.stringify({
          nome,
          refeicao: refeicao.refeicao,
          itens: [],
          macros: { kcal: refeicao.kcal, proteina_g: refeicao.proteina_g, carbo_g: refeicao.carbo_g, gordura_g: refeicao.gordura_g },
        }),
      },
      "Salvo — vai aparecer no registro rápido"
    );
  },

  async "refeicao-excluir"(id) {
    fecharPainel();
    estado.dados.dieta = null;
    await acaoApi(`/dieta/refeicoes/${id}`, { method: "DELETE" }, "Excluída");
  },

  async "plano-adicionar"(data) {
    const descricao = prompt("O que você planeja comer?");
    if (!descricao) return;
    const refeicao = prompt("Qual refeição? (cafe, almoco, lanche, jantar, ceia, outro)", "almoco") || "almoco";
    const quantidade = prompt("Quantidade em gramas (opcional):", "");

    await acaoApi(
      "/dieta/plano",
      { method: "POST", body: JSON.stringify({ data, descricao, refeicao, quantidade_g: quantidade || null }) },
      "Adicionado ao plano"
    );
  },

  async "plano-remover"(id) {
    await acaoApi(`/dieta/plano/${id}`, { method: "DELETE" }, "Removido");
  },

  async "gerar-lista"() {
    await api("/dieta/plano/gerar-lista", { method: "POST", body: "{}" });
    avisar("Lista gerada");
    navegar("/dieta/lista");
  },

  async "lista-marcar"(argumento) {
    const [id, marcar] = argumento.split("|");
    await acaoApi(`/dieta/lista/${id}`, { method: "PUT", body: JSON.stringify({ comprado: marcar === "1" }) });
  },

  async "lista-adicionar"() {
    const item = prompt("O que precisa comprar?");
    if (!item) return;
    await acaoApi("/dieta/lista", { method: "POST", body: JSON.stringify({ item }) }, "Adicionado");
  },

  async "lista-limpar"() {
    await acaoApi("/dieta/lista/limpar", { method: "POST", body: "{}" }, "Lista limpa");
  },

  async "alvo-definir"() {
    abrirPainel(`<div class="titulo">Definir alvo</div>
      <div style="padding:0 14px 14px">
        <div class="dois">
          <label class="campo"><span>Kcal em dia de treino</span><input id="v-kcal-treino" type="number" placeholder="2600" /></label>
          <label class="campo"><span>Kcal em dia de descanso</span><input id="v-kcal-descanso" type="number" placeholder="2200" /></label>
        </div>
        <div class="dois">
          <label class="campo"><span>Proteína (g)</span><input id="v-prot" type="number" placeholder="160" /></label>
          <label class="campo"><span>Carboidrato (g)</span><input id="v-carbo" type="number" placeholder="250" /></label>
        </div>
        <label class="campo"><span>Gordura (g)</span><input id="v-gord" type="number" placeholder="70" /></label>
        <button class="botao" data-acao="salvar-alvo" style="background:${COR}">Salvar alvo</button>
      </div>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "salvar-alvo"() {
    const corpo = {
      kcal_treino: Number($("#v-kcal-treino").value),
      kcal_descanso: Number($("#v-kcal-descanso").value),
      proteina_g: Number($("#v-prot").value),
      carbo_g: Number($("#v-carbo").value),
      gordura_g: Number($("#v-gord").value),
    };
    if (!corpo.kcal_descanso) return avisar("Informe ao menos o kcal de descanso");

    fecharPainel();
    estado.dados.dieta = null;
    await acaoApi("/dieta/alvo", { method: "POST", body: JSON.stringify(corpo) }, "Alvo definido");
    navegar("/dieta");
  },

  async "ajuste-aplicar"() {
    const sugestao = await api("/dieta/ajuste");
    estado.dados.dieta = null;
    await acaoApi("/dieta/ajuste/aplicar", { method: "POST", body: JSON.stringify(sugestao) }, "Alvo atualizado");
    navegar("/dieta");
  },
};
