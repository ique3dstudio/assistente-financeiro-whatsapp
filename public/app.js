const $ = (seletor) => document.querySelector(seletor);
const CIRCUNFERENCIA = 2 * Math.PI * 86;

const telas = {
  login: $("#tela-login"),
  inicio: $("#tela-inicio"),
  agua: $("#tela-agua"),
};

function mostrarTela(nome) {
  for (const [id, elemento] of Object.entries(telas)) elemento.hidden = id !== nome;
}

let avisoTimer;
function avisar(texto) {
  const aviso = $("#aviso");
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => (aviso.hidden = true), 2600);
}

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: { "Content-Type": "application/json", ...(opcoes.headers || {}) },
  });

  if (resposta.status === 401) {
    mostrarTela("login");
    throw new Error("sessao");
  }

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || "Algo deu errado");
  return dados;
}

const litros = (ml) => `${(ml / 1000).toFixed(1).replace(".", ",")} L`;

// --- Login ---
$("#form-login").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const erro = $("#erro-login");
  erro.hidden = true;

  try {
    await api("/login", { method: "POST", body: JSON.stringify({ senha: $("#campo-senha").value }) });
    $("#campo-senha").value = "";
    await abrirInicio();
  } catch (e) {
    erro.textContent = e.message === "sessao" ? "Senha incorreta" : e.message;
    erro.hidden = false;
  }
});

$("#btn-sair").addEventListener("click", async () => {
  await api("/sair", { method: "POST" });
  mostrarTela("login");
});

// --- Dashboard ---
async function abrirInicio() {
  const { data, cards } = await api("/dashboard");

  $("#data-hoje").textContent = new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  $("#cards").innerHTML = "";
  for (const card of cards) $("#cards").append(montarCard(card));

  mostrarTela("inicio");
}

function montarCard(card) {
  const elemento = document.createElement("button");
  elemento.className = "card";
  elemento.dataset.modulo = card.id;

  const corpo = card.indisponivel
    ? `<div class="card-erro">tabela ainda não criada no Supabase</div>`
    : `<div class="card-valor">${card.principal ?? "—"}</div>
       <div class="card-apoio">${card.apoio ?? ""}</div>
       ${card.sequencia ? `<div class="selo">🔥 ${card.sequencia} dias</div>` : ""}
       ${
         card.progresso === undefined
           ? ""
           : `<div class="barra"><span style="width:${Math.round(card.progresso * 100)}%"></span></div>`
       }`;

  elemento.innerHTML = `<div class="card-topo">${card.emoji} ${card.nome}</div>${corpo}`;
  elemento.addEventListener("click", () => abrirModulo(card.id));
  return elemento;
}

function abrirModulo(id) {
  if (id === "agua") return abrirAgua();
  avisar("Esse módulo ainda não tem tela — em breve.");
}

// --- Módulo Água ---
async function abrirAgua() {
  desenharAgua(await api("/agua"));
  mostrarTela("agua");
}

function desenharAgua(dados) {
  $("#agua-total").textContent = litros(dados.total);
  $("#agua-meta").textContent = `de ${litros(dados.meta)}`;
  $("#anel-progresso").style.strokeDashoffset = CIRCUNFERENCIA * (1 - dados.progresso);

  const selo = $("#agua-sequencia");
  selo.hidden = !dados.sequencia;
  selo.textContent = `🔥 ${dados.sequencia} dias seguidos`;

  const maior = Math.max(dados.meta, ...dados.historico.map((d) => d.total)) || 1;
  $("#agua-historico").innerHTML = dados.historico
    .map(({ data, total, bateu }) => {
      const altura = Math.round((total / maior) * 100);
      const dia = data.slice(8, 10);
      return `<div class="dia" title="${data}: ${litros(total)}">
                <div class="dia-barra ${bateu ? "bateu" : ""}" style="height:${altura}%"></div>
                <div class="dia-rotulo">${dia}</div>
              </div>`;
    })
    .join("");
}

for (const botao of document.querySelectorAll(".copo")) {
  botao.addEventListener("click", async () => {
    try {
      desenharAgua(await api("/agua", { method: "POST", body: JSON.stringify({ quantidade_ml: Number(botao.dataset.ml) }) }));
      avisar(`+${botao.dataset.ml} ml registrados`);
    } catch (e) {
      if (e.message !== "sessao") avisar(e.message);
    }
  });
}

$("#btn-desfazer").addEventListener("click", async () => {
  try {
    desenharAgua(await api("/agua/desfazer", { method: "POST" }));
    avisar("Último registro removido");
  } catch (e) {
    if (e.message !== "sessao") avisar(e.message);
  }
});

$("#btn-meta").addEventListener("click", async () => {
  const resposta = prompt("Meta diária em ml (ex: 2500):");
  if (!resposta) return;

  try {
    desenharAgua(await api("/agua/meta", { method: "PUT", body: JSON.stringify({ meta_ml: Number(resposta) }) }));
    avisar("Meta atualizada");
  } catch (e) {
    if (e.message !== "sessao") avisar(e.message);
  }
});

for (const botao of document.querySelectorAll("[data-voltar]")) {
  botao.addEventListener("click", abrirInicio);
}

// --- Início ---
(async () => {
  const { autenticado } = await api("/sessao");
  if (autenticado) await abrirInicio();
  else mostrarTela("login");
})();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
