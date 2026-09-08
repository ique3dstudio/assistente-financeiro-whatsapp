// Seus dados pessoais. O peso alimenta a meta de água e, mais tarde, as calorias;
// `modulos_ativos` decide quais abas aparecem no app.
import { getSupabase } from "./supabase.js";

const CAMPOS = ["nome", "peso_kg", "altura_cm", "nascimento", "modulos_ativos"];

export async function lerPerfil(usuario) {
  const { data, error } = await getSupabase().from("perfil").select("*").eq("user_id", usuario).maybeSingle();

  if (error) throw new Error(`Falha ao ler perfil: ${error.message}`);
  return data || { user_id: usuario, nome: null, peso_kg: null, altura_cm: null, nascimento: null, modulos_ativos: ["agua", "habitos", "financas"] };
}

export async function salvarPerfil(usuario, dados) {
  const limpos = Object.fromEntries(Object.entries(dados).filter(([chave]) => CAMPOS.includes(chave)));

  if (limpos.peso_kg !== undefined && limpos.peso_kg !== null) {
    const peso = Number(limpos.peso_kg);
    if (!Number.isFinite(peso) || peso < 20 || peso > 400) throw new Error("Peso inválido");
    limpos.peso_kg = peso;
  }
  if (limpos.altura_cm !== undefined && limpos.altura_cm !== null) {
    const altura = Number(limpos.altura_cm);
    if (!Number.isFinite(altura) || altura < 80 || altura > 260) throw new Error("Altura inválida");
    limpos.altura_cm = Math.round(altura);
  }

  const { data, error } = await getSupabase()
    .from("perfil")
    .upsert({ user_id: usuario, ...limpos, atualizado_em: new Date().toISOString() }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw new Error(`Falha ao salvar perfil: ${error.message}`);
  return data;
}
