export type PublishResult = {
  deploymentId: string;
  previewUrl: string;
};

export function createPreviewUrl(siteSlug: string): string {
  return `https://${siteSlug}.vercel.app`;
}
