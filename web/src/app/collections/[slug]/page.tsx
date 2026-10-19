import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import CollectionDetail from "@/components/altier/CollectionDetail";
import { collectionBySlug, collections } from "@/data/site";

export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const c = collectionBySlug((await params).slug);
  return c ? { title: `${c.name} in ${c.finish}`, description: c.story } : {};
}

// Params are read inside Suspense so navigations render instantly; every collection is prerendered anyway.
export default function Page({ params }: PageProps<"/collections/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-onyx" />}>
      <Collection params={params} />
    </Suspense>
  );
}

async function Collection({ params }: { params: PageProps<"/collections/[slug]">["params"] }) {
  const c = collectionBySlug((await params).slug);
  if (!c) notFound();
  return <CollectionDetail collection={c} />;
}
