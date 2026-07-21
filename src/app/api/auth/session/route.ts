import { NextResponse } from "next/server";
import { getApiConfig } from "@/lib/apiConfig";

// Valida o x-access-token na tickets-apiv2 (GET /user/me).
// Retorna 200 com o usuário enquanto o token for válido; 401 quando expirar.
export async function GET(req: Request) {
  const token = req.headers.get("x-access-token");

  if (!token) {
    return NextResponse.json({ error: "Token ausente" }, { status: 401 });
  }

  try {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const { apiUrl, origin } = getApiConfig(host);

    const res = await fetch(`${apiUrl}/user/me`, {
      headers: {
        Accept: "application/json",
        Origin: origin,
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
