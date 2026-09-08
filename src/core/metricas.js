// Ponte entre módulos e metas: cada módulo publica números que uma meta pode
// acompanhar, e a meta lê esse número sozinha. É o que evita atualizar a mesma
// informação em dois lugares (E1.7 da especificação).
import { MODULOS } from "./modulos.js";

export async function metricasDisponiveis(usuario) {
  const listas = await Promise.all(
    MODULOS.filter((modulo) => modulo.metricas).map(async (modulo) => {
      try {
        const metricas = await modulo.metricas(usuario);
        return metricas.map((m) => ({ ...m, modulo: modulo.id, modulo_nome: modulo.nome }));
      } catch {
        return []; // módulo sem tabela ainda não impede o resto
      }
    })
  );

  return listas.flat();
}

export async function mapaDeMetricas(usuario) {
  const metricas = await metricasDisponiveis(usuario);
  return new Map(metricas.map((m) => [m.id, m]));
}
