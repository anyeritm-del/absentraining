"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Google Sign-In"));
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton({
  onSignIn,
}: {
  onSignIn: (idToken: string) => void;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGisScript()
      .then(() => {
        if (cancelled || !window.google || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onSignIn(response.credential),
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "signin_with",
        });
      })
      .catch(() => setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [clientId, onSignIn]);

  if (!clientId) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Google Sign-In belum dikonfigurasi (NEXT_PUBLIC_GOOGLE_CLIENT_ID kosong)
      </p>
    );
  }

  if (loadError) {
    return <p className="text-sm text-red-600 dark:text-red-400">Gagal memuat Google Sign-In</p>;
  }

  return <div ref={buttonRef} />;
}
