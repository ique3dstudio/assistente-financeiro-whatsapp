// Ícones em SVG, traço de 1.7px, herdando a cor do texto.
// Emoji fica só para o que é escolha sua (ícone de hábito, humor); a navegação
// e os botões do app usam ícones desenhados — é o que separa app de site.

const D = {
  hoje: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M4.6 12H2.4M21.6 12h-2.2M6.4 6.4 4.9 4.9M19.1 19.1l-1.5-1.5M17.6 6.4l1.5-1.5M4.9 19.1l1.5-1.5"/>',
  metas: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/>',
  corpo: '<path d="M4 9v6M7 7.5v9M17 7.5v9M20 9v6M7 12h10"/>',
  dinheiro: '<rect x="2.6" y="6" width="18.8" height="13" rx="3"/><path d="M2.6 10.5h18.8M16.4 15h2.4"/>',
  eu: '<circle cx="12" cy="8.2" r="3.6"/><path d="M5.4 20c.7-3.6 3.4-5.6 6.6-5.6s5.9 2 6.6 5.6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M4.5 12.8l4.8 4.7L19.5 7"/>',
  gota: '<path d="M12 3.2s6 6.3 6 10.3a6 6 0 0 1-12 0c0-4 6-10.3 6-10.3z"/>',
  chama: '<path d="M12 2.8s4.6 4.2 4.6 8.4c0 2.6-2 4.6-4.6 4.6s-4.6-2-4.6-4.6C7.4 8.4 12 2.8 12 2.8z"/><path d="M9.6 18.2c.7 1.9 1.4 3 2.4 3s1.7-1.1 2.4-3"/>',
  calendario: '<rect x="3.4" y="5" width="17.2" height="15.6" rx="3"/><path d="M3.4 10h17.2M8.4 3.4v3.2M15.6 3.4v3.2"/>',
  grafico: '<path d="M4 19.4V11M9.4 19.4V5.6M14.8 19.4v-6M20.2 19.4V8.4"/>',
  relogio: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/>',
  play: '<path d="M8 5.4 18.4 12 8 18.6z"/>',
  voltar: '<path d="M14.6 5.4 8 12l6.6 6.6"/>',
  x: '<path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6"/>',
  lista: '<path d="M8.4 6.6h11.2M8.4 12h11.2M8.4 17.4h11.2M4.4 6.6h.01M4.4 12h.01M4.4 17.4h.01"/>',
  livro: '<path d="M4 5.2h6a3 3 0 0 1 3 3v11a2.4 2.4 0 0 0-2.4-2.4H4zM20 5.2h-6a3 3 0 0 0-3 3v11a2.4 2.4 0 0 1 2.4-2.4H20z"/>',
  coracao: '<path d="M12 20s-7.4-4.6-7.4-9.4A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.4 2.6C19.4 15.4 12 20 12 20z"/>',
  balanca: '<circle cx="12" cy="12" r="8.6"/><path d="M12 12l4-3"/>',
  vazio: '<circle cx="12" cy="12" r="9"/><path d="M8.4 13.6h7.2"/>',
  engrenagem: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.8 12H2.4M21.6 12h-2.4M6.8 6.8 5.1 5.1M18.9 18.9l-1.7-1.7M17.2 6.8l1.7-1.7M5.1 18.9l1.7-1.7"/>',
  raio: '<path d="M13.4 2.6 5.6 13.4h5l-1.4 8 8.2-11h-5.2z"/>',
};

export function icone(nome, tamanho = null) {
  const desenho = D[nome] || D.vazio;
  const medida = tamanho ? ` width="${tamanho}" height="${tamanho}"` : "";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${medida}>${desenho}</svg>`;
}

// Ícone de cada aba e a cor de dados do módulo correspondente.
export const ICONE_ABA = { hoje: "hoje", metas: "metas", corpo: "corpo", dinheiro: "dinheiro", eu: "eu" };

// A ordem aqui é a ordem em que as cores aparecem na tela — foi validada para
// daltonismo e contraste nos dois modos. Mudar a ordem exige revalidar.
export const COR_MODULO = {
  habitos: "var(--c-rotina)",
  agua: "var(--c-agua)",
  metas: "var(--c-metas)",
  treino: "var(--c-treino)",
  financas: "var(--c-dinheiro)",
  agenda: "var(--c-agenda)",
  diario: "var(--c-humor)",
};

export const COR_ABA = {
  hoje: "var(--c-agua)",
  metas: "var(--c-metas)",
  corpo: "var(--c-treino)",
  dinheiro: "var(--c-dinheiro)",
  eu: "var(--c-humor)",
};

export const ICONE_MODULO = {
  habitos: "check",
  agua: "gota",
  metas: "metas",
  treino: "corpo",
  financas: "dinheiro",
  agenda: "calendario",
  diario: "eu",
};
