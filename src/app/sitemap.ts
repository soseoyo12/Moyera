import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://moyera.site";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/new`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.5 },
  ];

  return staticRoutes;
}
