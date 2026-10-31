import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="text-center">
        <div className="mx-auto w-fit">
          <Logo />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Esta página não existe</h1>
        <p className="mt-1 text-ink-soft">Confira o endereço ou volte para o início.</p>
        <Link href="/" className="btn btn-primary mt-5">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
