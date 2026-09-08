// Rotina guiada (E1.10): o app conduz item por item, com cronômetro e
// passagem automática — o objetivo é você não precisar decidir nada.
import { $, api, atualizar, avisar, bip, definirTimer, escapar, estado, limparTimer, navegar, relogio } from "../ui.js";

export const rota = /^\/foco\/(.+)$/;
export const aba = "hoje";

const NOMES = { manha: "Manhã", tarde: "Tarde", noite: "Noite", qualquer: "Quando der" };

export async function render(parametro) {
  if (parametro === "pomodoro") return pomodoro();
  return ritual(parametro);
}

// ---------- rotina guiada de um período ----------

async function ritual(periodo) {
  const dados = await api(`/habitos/ritual/${periodo}`);
  const pendentes = dados.itens.filter((item) => !item.concluido);

  estado.foco = {
    tipo: "ritual",
    periodo,
    fila: pendentes,
    indice: 0,
    segundos: 0,
    feitos: 0,
    total: dados.total,
  };

  if (pendentes.length === 0) {
    return `<header class="topo"><h1>${escapar(NOMES[periodo] || periodo)}</h1></header>
      <div class="vazio">Tudo dessa rotina já está feito hoje. 🎉</div>
      <button class="botao secundario" data-acao="ir:/hoje">Voltar para Hoje</button>`;
  }

  // O cronômetro começa depois de o HTML entrar na tela; passamos a sessão
  // por parâmetro e conferimos que ela ainda é a atual, senão um timer antigo
  // continuaria rodando com o estado de outra tela.
  const sessao = estado.foco;
  setTimeout(() => iniciarCronometro(sessao), 0);
  return telaDoItem();
}

function telaDoItem() {
  const foco = estado.foco;
  const item = foco.fila[foco.indice];

  if (!item) {
    limparTimer();
    return `<header class="topo"><h1>Rotina concluída</h1></header>
      <div class="cartao secao" style="text-align:center">
        <div style="font-size:44px">🎉</div>
        <div class="valor-grande">${foco.feitos} de ${foco.total}</div>
        <p class="sub">${Math.round(foco.segundos / 60)} min de rotina</p>
      </div>
      <button class="botao" data-acao="ir:/hoje">Voltar para Hoje</button>`;
  }

  const alvo = item.duracao_min ? item.duracao_min * 60 : null;

  return `<header class="topo">
      <div><h1>${escapar(NOMES[foco.periodo] || foco.periodo)}</h1>
        <p class="sub">item ${foco.indice + 1} de ${foco.fila.length}</p></div>
      <button class="link" data-acao="ir:/hoje">sair</button>
    </header>

    <div class="cartao secao" style="text-align:center;padding:28px 16px">
      <div style="font-size:52px">${escapar(item.emoji)}</div>
      <h3 style="margin-top:10px">${escapar(item.nome)}</h3>
      ${item.meta_qtd ? `<p class="sub">meta: ${item.meta_qtd} ${escapar(item.unidade || "")}</p>` : ""}
      <div id="foco-relogio" class="valor-grande" style="font-size:44px;margin-top:14px">
        ${alvo ? relogio(alvo) : "0:00"}</div>
      ${alvo ? `<p class="sub">${item.duracao_min} min previstos</p>` : ""}
    </div>

    <button class="botao" data-acao="foco-feito">Feito ✓</button>
    <button class="botao secundario" data-acao="foco-pular">Pular este</button>`;
}

function iniciarCronometro(foco = estado.foco) {
  if (!foco || foco !== estado.foco || !foco.fila) return;

  foco.inicioItem = Date.now();
  definirTimer(() => {
    if (foco !== estado.foco) return limparTimer(); // trocou de tela
    const item = foco.fila[foco.indice];
    if (!item) return limparTimer();

    const passado = Math.round((Date.now() - foco.inicioItem) / 1000);
    foco.segundos = (foco.segundosAcumulados || 0) + passado;

    const elemento = $("#foco-relogio");
    if (!elemento) return limparTimer();

    if (item.duracao_min) {
      const faltam = item.duracao_min * 60 - passado;
      elemento.textContent = relogio(faltam);
      if (faltam === 0) {
        bip();
        avisar("Tempo!");
      }
    } else {
      elemento.textContent = relogio(passado);
    }
  });
}

async function avancar(marcar) {
  const foco = estado.foco;
  const item = foco.fila[foco.indice];

  foco.segundosAcumulados = foco.segundos;

  if (marcar && item) {
    try {
      await api(`/habitos/${item.id}/marcar`, {
        method: "POST",
        body: JSON.stringify({ concluido: true, quantidade: item.meta_qtd || null }),
      });
      foco.feitos++;
    } catch (erro) {
      if (erro.message !== "sessao") avisar(erro.message);
    }
  }

  foco.indice++;
  $("#conteudo").innerHTML = telaDoItem();

  if (foco.fila[foco.indice]) iniciarCronometro(foco);
  else {
    await api("/habitos/foco", {
      method: "POST",
      body: JSON.stringify({ tipo: "ritual", periodo: foco.periodo, minutos: foco.segundos / 60, concluido: true }),
    }).catch(() => {});
  }
}

// ---------- Pomodoro ----------

function pomodoro() {
  estado.foco = { tipo: "pomodoro", restante: 25 * 60, rodando: false };

  return `<header class="topo">
      <div><h1>Foco</h1><p class="sub">25 minutos, uma coisa só</p></div>
      <button class="link" data-acao="ir:/hoje">sair</button>
    </header>

    <div class="cartao secao" style="text-align:center;padding:34px 16px">
      <div id="foco-relogio" style="font-size:56px;font-weight:650">25:00</div>
      <p class="sub" id="foco-estado">pausado</p>
    </div>

    <button class="botao" data-acao="pomodoro-toggle">Começar</button>
    <div class="botoes secao">
      ${[15, 25, 45, 60].map((min) => `<button class="copo" data-acao="pomodoro-tempo:${min}">${min}<small>min</small></button>`).join("")}
    </div>`;
}

function desenharPomodoro() {
  const foco = estado.foco;
  $("#foco-relogio").textContent = relogio(foco.restante);
  $("#foco-estado").textContent = foco.rodando ? "rodando" : "pausado";
}

export const acoes = {
  "foco-feito": () => avancar(true),
  "foco-pular": () => avancar(false),

  "pomodoro-tempo"(minutos) {
    estado.foco.restante = Number(minutos) * 60;
    estado.foco.rodando = false;
    limparTimer();
    desenharPomodoro();
  },

  "pomodoro-toggle"() {
    const foco = estado.foco;
    foco.rodando = !foco.rodando;

    if (!foco.rodando) {
      limparTimer();
      return desenharPomodoro();
    }

    definirTimer(async () => {
      if (foco !== estado.foco || !$("#foco-relogio")) return limparTimer();

      foco.restante--;
      desenharPomodoro();

      if (foco.restante <= 0) {
        limparTimer();
        foco.rodando = false;
        bip(3);
        avisar("Bloco de foco concluído 🎉");
        await api("/habitos/foco", {
          method: "POST",
          body: JSON.stringify({ tipo: "pomodoro", minutos: 25, concluido: true }),
        }).catch(() => {});
      }
    });

    desenharPomodoro();
  },

  "iniciar-ritual"(periodo) {
    navegar(`/foco/${periodo}`);
  },

  "iniciar-pomodoro"() {
    navegar("/foco/pomodoro");
  },
};
