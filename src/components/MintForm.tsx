"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { isMint } from "@/lib/adapters/types";

export function MintForm({
  to = "/app/mercado",
  size = "md",
  autoFocus = false,
  label = "Endereço do token",
}: {
  to?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("mint") ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!isMint(v)) {
      setError("Cole um endereço de mint da Solana (32 a 44 caracteres em base58).");
      return;
    }
    setError(null);
    const join = to.includes("?") ? "&" : "?";
    router.push(`${to}${join}mint=${v}#consultar`);
  }

  const big = size === "lg";
  return (
    <form onSubmit={submit} className="w-full">
      <label className="mb-2 block text-sm text-ink-soft" htmlFor="mint-address">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="mint-address"
          autoFocus={autoFocus}
          className={`input mono ${big ? "py-3 text-base" : ""}`}
          placeholder="Cole o endereço do token na Solana"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button className={`btn btn-beam shrink-0 ${big ? "py-3" : ""}`} type="submit">
          Ler este token
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rock">
          {error}
        </p>
      )}
    </form>
  );
}
