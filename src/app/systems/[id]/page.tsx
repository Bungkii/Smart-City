import { notFound } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { systemIds, type SystemId } from "@/lib/model";

export function generateStaticParams() {
  return systemIds.map((id) => ({ id }));
}

export default async function SystemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!systemIds.includes(id as SystemId)) notFound();
  return <Dashboard systemId={id as SystemId} />;
}
