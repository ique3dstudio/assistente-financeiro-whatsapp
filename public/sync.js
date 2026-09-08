// Fila de registros offline.
//
// Regra do app: registrar nunca pode falhar. Se a rede não está disponível, o
// registro vai para uma fila no próprio aparelho (IndexedDB, que sobrevive a
// fechar o app e reiniciar o celular) e sobe sozinho quando a conexão volta.
// Cada item leva um `origem_id`; o servidor usa isso para não duplicar.

const BANCO = "life-os";
const LOJA = "fila";

function abrir() {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => {
      const bd = pedido.result;
      if (!bd.objectStoreNames.contains(LOJA)) bd.createObjectStore(LOJA, { keyPath: "id", autoIncrement: true });
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

async function comLoja(modo, funcao) {
  const bd = await abrir();
  return new Promise((resolve, reject) => {
    const transacao = bd.transaction(LOJA, modo);
    const pedido = funcao(transacao.objectStore(LOJA));
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

export function novoOrigemId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enfileirar(caminho, opcoes) {
  try {
    await comLoja("readwrite", (loja) =>
      loja.add({ caminho, metodo: opcoes.method || "POST", corpo: opcoes.body || null, criado_em: Date.now() })
    );
    return true;
  } catch {
    return false; // navegador sem IndexedDB (aba privada antiga): não trava o app
  }
}

export async function pendentes() {
  try {
    return await comLoja("readonly", (loja) => loja.count());
  } catch {
    return 0;
  }
}

async function listar() {
  try {
    return await comLoja("readonly", (loja) => loja.getAll());
  } catch {
    return [];
  }
}

async function remover(id) {
  try {
    await comLoja("readwrite", (loja) => loja.delete(id));
  } catch {
    // nada a fazer
  }
}

// Envia a fila na ordem em que foi criada. Para no primeiro erro de rede, para
// não embaralhar a ordem dos registros.
export async function sincronizar() {
  const itens = (await listar()).sort((a, b) => a.criado_em - b.criado_em);
  let enviados = 0;

  for (const item of itens) {
    try {
      const resposta = await fetch(`/api${item.caminho}`, {
        method: item.metodo,
        headers: { "Content-Type": "application/json" },
        body: item.corpo,
      });

      // 4xx = o servidor recusou (dado inválido, sessão expirada). Insistir não
      // resolve e a fila travaria para sempre — então descartamos o item.
      if (resposta.ok || (resposta.status >= 400 && resposta.status < 500 && resposta.status !== 401)) {
        await remover(item.id);
        if (resposta.ok) enviados++;
        continue;
      }
      break;
    } catch {
      break; // ainda sem rede
    }
  }

  return { enviados, restantes: await pendentes() };
}
