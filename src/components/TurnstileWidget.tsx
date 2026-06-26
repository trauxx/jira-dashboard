"use client";

import { useRef, useEffect, useCallback } from "react";

const SITE_KEY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ??
  "1x00000000000000000000AA";

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, opts: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function TurnstileWidget({ onVerify, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const initWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: onVerify,
      "expired-callback": onExpire,
    });
  }, [onVerify, onExpire]);

  useEffect(() => {
    if (scriptLoadedRef.current) {
      initWidget();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="turnstile/v0/api.js"]',
    );
    if (existing) {
      scriptLoadedRef.current = true;
      initWidget();
      return;
    }

    const cb = "onloadTurnstileCallback";
    (window as unknown as Record<string, unknown>)[cb] = () => {
      scriptLoadedRef.current = true;
      initWidget();
    };

    const script = document.createElement("script");
    script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=${cb}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      delete (window as unknown as Record<string, unknown>)[cb];
    };
  }, [initWidget]);

  return <div ref={containerRef} />;
}
