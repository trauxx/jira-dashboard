import { NextResponse } from "next/server";

const API_URL = process.env.TICKETS_API_URL || "https://api.acessofacil.com/v2";
const COMPANY_ORIGIN =
  process.env.TICKETS_COMPANY_ORIGIN || "https://meubilhete.com.br";

// Valida o x-access-token na tickets-apiv2 (GET /user/me).
// Retorna 200 com o usuário enquanto o token for válido; 401 quando expirar.
export async function GET(req: Request) {
  const token = req.headers.get("x-access-token");

  if (!token) {
    return NextResponse.json({ error: "Token ausente" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/user/me`, {
      headers: {
        Accept: "application/json",
        Origin: COMPANY_ORIGIN,
        "x-access-token": token,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.status) {
      return NextResponse.json(
        { error: data?.message || "Token inválido ou expirado" },
        { status: res.status === 200 ? 401 : res.status },
      );
    }

    return NextResponse.json({ valid: true, user: data.result });
  } catch (error) {
    // Falha de rede não invalida a sessão — o client decide manter o token
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
