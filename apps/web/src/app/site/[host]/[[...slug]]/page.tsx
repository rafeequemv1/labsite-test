import { notFound } from "next/navigation";

import { getPublishedSiteByHost } from "@/lib/repository";
import { TemplateRenderer } from "@/templates/renderer";

type TenantPageProps = {
  params: Promise<{ host: string; slug?: string[] }>;
};

export default async function TenantSitePage({ params }: TenantPageProps) {
  const { host, slug } = await params;
  const site = await getPublishedSiteByHost(host);

  if (!site) {
    notFound();
  }

  const requestedPath = slug?.length ? `/${slug.join("/")}` : "/";
  void requestedPath;

  return <TemplateRenderer site={site} host={host} />;
}
