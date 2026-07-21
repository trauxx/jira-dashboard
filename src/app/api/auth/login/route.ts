import { NextResponse } from "next/server";
import { getApiConfig } from "@/lib/apiConfig";

interface LoginPayload {
  username?: string;
  password?: string;
  twoFactorCode?: string;
  turnstileToken?: string;
}

export async function POST(req: Request) {
  try {
    const body: LoginPayload = await req.json();
    const { username, password, twoFactorCode, turnstileToken } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios" },
        { status: 400 },
      );
    }

    const host = req.headers.get("host") || "";
    const { apiUrl, origin } = getApiConfig(host);

    console.log("[login] host=%s apiUrl=%s origin=%s", host, apiUrl, origin);

    const res = await fetch(`${apiUrl}/auth/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: origin,
      },
      cache: "no-store",
      body: JSON.stringify({
        username,
        password,
        ...(twoFactorCode ? { twoFactorCode } : {}),
        ...(turnstileToken ? { turnstileToken } : {}),
        origin: "web",
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.status) {
      return NextResponse.json(
        {
          error: data?.message || `Erro ao autenticar (${res.status})`,
          _debug: { host, apiUrl, origin, apiStatus: res.status },
        },
        { status: res.status === 200 ? 401 : res.status },
      );
    }

    const result = data.result;

    // Usuário com 2FA habilitado: a API devolve token nulo e twoFactor=true
    if (result?.twoFactor && !result?.token) {
      return NextResponse.json({
        twoFactor: true,
        twoFactorQrCode: result.twoFactorQrCode ?? null,
        twoFactorUrl: result.twoFactorUrl ?? null,
      });
    }

    if (!result?.token) {
      return NextResponse.json(
        { error: "Resposta de autenticação inválida" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      token: result.token,
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        name: result.name,
        companyId: result.companyId,
        permissions: result.permissions ?? [],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
