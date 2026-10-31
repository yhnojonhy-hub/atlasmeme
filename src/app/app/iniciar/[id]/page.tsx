import Link from "next/link";
import { notFound } from "next/navigation";
import { RunView } from "@/components/RunView";
import { getRun } from "@/lib/launcher/store";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{run.brief.name}</h1>
          <p className="mt-1 max-w-2xl text-ink-soft">{run.brief.theme}</p>
        </div>
        <Link href="/app/iniciar" className="btn btn-ghost text-sm">
          Todas as execuções
        </Link>
      </div>
      <RunView id={id} />
    </>
  );
}
