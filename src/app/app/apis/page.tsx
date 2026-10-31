import { ApiStatus } from "@/components/ApiStatus";
import { Section } from "@/components/ui";

export const metadata = { title: "APIs" };

export default function Page() {
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">APIs e integrações</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Cada integração declara o que faz, o que não faz, quanto tempo fica em cache e se está no ar agora. Nada escondido.
        </p>
      </div>

      <ApiStatus />

      <Section title="Como a latência é tratada" lead="O que torna a leitura rápida sem inventar número.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Cache por tipo", "Pares 15 s, mint 5 min, saúde 30 s. A hora da leitura sempre aparece."],
            ["Uma rota por aba", "A aba pede ao servidor um agregado; sem N+1 no navegador."],
            ["Timeout e falha visível", "6–7 s por chamada. Falha vira estado “pendente”, não zero."],
            ["Mesmo host", "Front e API no mesmo processo/VM; RPC na região mais próxima."],
          ].map(([t, d]) => (
            <div key={t} className="card p-4">
              <div className="font-semibold">{t}</div>
              <p className="mt-1 text-sm text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
