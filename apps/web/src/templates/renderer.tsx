import { SiteRow } from "@/lib/repository";

import { ModernElegantLabTemplate } from "./modern-elegant-lab";

type TemplateRendererProps = {
  site: SiteRow;
  host: string;
};

export function TemplateRenderer({ site, host }: TemplateRendererProps) {
  if (site.template_id === "modern-elegant-lab") {
    return <ModernElegantLabTemplate site={site} host={host} />;
  }

  return <ModernElegantLabTemplate site={site} host={host} />;
}
