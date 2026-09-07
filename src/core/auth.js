// Login de dono único: uma senha só (APP_SENHA), guardada num cookie assinado.
// Os dados já nascem com user_id, então virar multiusuário depois é trocar só este arquivo.
import crypto from "node:crypto";

const COOKIE = "vidaos_sessao";
const VALIDADE_DIAS = 365;

export const USUARIO = process.env.APP_USER_ID || "eu";

function segredo() {
  const valor = process.env.APP_SECRET;
  if (!valor) throw new Error("APP_SECRET precisa estar no .env (qualquer texto longo e aleatório)");
  return valor;
}

function assinar(payload) {
  return crypto.createHmac("sha256", segredo()).update(payload).digest("base64url");
}

function criarToken() {
  const expira = Date.now() + VALIDADE_DIAS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ usuario: USUARIO, expira })).toString("base64url");
  return `${payload}.${assinar(payload)}`;
}

function tokenValido(token) {
  if (!token || !token.includes(".")) return false;

  const [payload, assinatura] = token.split(".");
  const esperada = assinar(payload);

  // timingSafeEqual exige buffers do mesmo tamanho
  if (assinatura.length !== esperada.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada))) return false;

  try {
    const { expira } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return expira > Date.now();
  } catch {
    return false;
  }
}

function lerCookie(req, nome) {
  const bruto = req.headers.cookie;
  if (!bruto) return null;

  for (const parte of bruto.split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === nome) return decodeURIComponent(resto.join("="));
  }
  return null;
}

export function autenticado(req) {
  return tokenValido(lerCookie(req, COOKIE));
}

export function entrar(req, res) {
  const senha = String(req.body?.senha || "");
  const correta = process.env.APP_SENHA || "";

  if (!correta) {
    return res.status(500).json({ erro: "APP_SENHA não está configurada no servidor" });
  }
  if (senha.length !== correta.length || !crypto.timingSafeEqual(Buffer.from(senha), Buffer.from(correta))) {
    return res.status(401).json({ erro: "Senha incorreta" });
  }

  res.cookie(COOKIE, criarToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: VALIDADE_DIAS * 24 * 60 * 60 * 1000,
  });

  res.json({ ok: true });
}

export function sair(req, res) {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
}

export function exigirLogin(req, res, next) {
  if (!autenticado(req)) return res.status(401).json({ erro: "Não autenticado" });
  req.usuario = USUARIO;
  next();
}
