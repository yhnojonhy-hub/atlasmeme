"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { isMint } from "@/lib/adapters/types";

export function MintForm({
  to = "/app/mercado",
  size = "md",
  autoFocus = false,
}: {
  to?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
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
    router.push(`${to}?mint=${v}`);
  }

  const big = size === "lg";
  return (
    <form onSubmit={submit} className="w-full">
      <div className={`flex flex-col gap-2 sm:flex-row ${big ? "" : ""}`}>
        <input
          autoFocus={autoFocus}
          className={`input ${big ? "py-3 text-base" : ""}`}
          placeholder="Cole o endereço do mint, por exemplo EPjF…Dt1v"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Endereço do mint"
          spellCheck={false}
        />
        <button className={`btn btn-beam shrink-0 ${big ? "py-3" : ""}`} type="submit">
          Ver o que está on-chain
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
