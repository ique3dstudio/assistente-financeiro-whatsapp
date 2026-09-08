import { abrirPainel, acaoApi, api, barras, escapar, litros } from "../ui.js";
import { icone } from "../icones.js";

export const rota = /^\/agua$/;
export const aba = "hoje";

export async function render() {
  const dados = await api("/agua");
  const volta = 2 * Math.PI * 86;

  const grafico = barras(
    dados.historico.map((dia) => ({ rotulo: dia.data.slice(8, 10), valor: dia.total, destaque: dia.bateu })),
    { cor: "var(--c-agua)", formatar: litros, acaoToque: "ver-ponto" }
  );

  const recipientes = dados.recipientes
    .map(
      (r) => `<button class="copo" data-acao="agua-registrar:${r.volume_ml}:${r.bebida}"
                title="${escapar(r.nome)}" aria-label="${escapar(r.nome)} ${r.volume_ml} ml">
        ${escapar(r.emoji)}<small>${escapar(r.nome)}</small><small>${r.volume_ml} ml</small></button>`
    )
    .join("");

  return `<header class="topo">
      <div><h1>Água</h1>
        <p class="sub" ${dados.atraso > 0 ? 'style="color:var(--atencao)"' : ""}>
          ${dados.atraso > 0 ? `${dados.atraso} ml atrás do ritmo do dia` : "no ritmo do dia"}</p></div>
      <button class="link" data-acao="agua-opcoes">opções</button>
    </header>

    <div class="anel-area" style="--acento:var(--c-agua)">
      <svg class="anel-grande" viewBox="0 0 200 200">
        <circle class="anel-fundo" cx="100" cy="100" r="86"></circle>
        <circle class="anel-frente" cx="100" cy="100" r="86"
                stroke-dasharray="${volta.toFixed(1)}" stroke-dashoffset="${(volta * (1 - dados.progresso)).toFixed(1)}"></circle>
      </svg>
      <div class="anel-texto">
        <strong>${litros(dados.total)}</strong>
        <span class="sub">de ${litros(dados.meta)}</span>
        ${
          dados.sequencia
            ? `<span class="selo" style="display:inline-flex;align-items:center;gap:4px;color:var(--c-metas)">
                 ${icone("chama", 13)} ${dados.sequencia} dias seguidos</span>`
            : ""
        }
      </div>
    </div>

    <div class="botoes" style="--acento:var(--c-agua)">${recipientes}</div>
    <button class="link centro" data-acao="agua-desfazer">desfazer último</button>

    <div class="secao"><h2>Outras bebidas</h2>
      <div class="botoes" style="--acento:var(--c-agua)">
        ${["cha", "cafe", "suco", "alcool"]
          .map(
            (bebida) => `<button class="copo" data-acao="agua-registrar:200:${bebida}">
              ${escapar(dados.bebidas[bebida].emoji)}<small>${escapar(dados.bebidas[bebida].nome)}</small></button>`
          )
          .join("")}
      </div>
      <p class="sub">Café conta 60% e álcool desconta metade — a barra mostra hidratação real, não volume.</p>
    </div>

    <div class="secao"><h2>Últimos 14 dias</h2>${grafico}
      <p class="sub">Toque numa barra para ver o valor do dia.</p></div>
    <button class="botao secundario" data-acao="ir:/hoje">Voltar para Hoje</button>`;
}

export const acoes = {
  async "agua-registrar"(argumento) {
    const [ml, bebida] = argumento.split(":");
    await acaoApi("/agua", { method: "POST", body: JSON.stringify({ quantidade_ml: Number(ml), bebida }) }, `+${ml} ml`);
  },

  async "agua-desfazer"() {
    await acaoApi("/agua/desfazer", { method: "POST" }, "Último registro removido");
  },

  "agua-opcoes"() {
    abrirPainel(`<div class="titulo">Água</div>
      <button data-acao="agua-meta">Definir meta manualmente</button>
      <button data-acao="agua-meta-auto">Calcular pelo meu peso (35 ml/kg)</button>
      <button data-acao="agua-recipiente">Criar um recipiente meu</button>
      <button data-acao="fechar-painel">Cancelar</button>`);
  },

  async "agua-meta"() {
    const resposta = prompt("Meta diária em ml (ex: 2800):");
    if (!resposta) return;
    await acaoApi("/agua/meta", { method: "PUT", body: JSON.stringify({ meta_ml: Number(resposta) }) }, "Meta atualizada");
  },

  async "agua-meta-auto"() {
    await acaoApi("/agua/meta", { method: "PUT", body: JSON.stringify({ automatica: true }) }, "Meta calculada pelo seu peso");
  },

  async "agua-recipiente"() {
    const nome = prompt("Nome do recipiente (ex: Minha garrafa):");
    if (!nome) return;
    const volume = prompt("Volume em ml:");
    if (!volume) return;
    await acaoApi("/agua/recipientes", { method: "POST", body: JSON.stringify({ nome, volume_ml: Number(volume) }) }, "Recipiente criado");
  },
};
