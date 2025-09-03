import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/s/"],
      },
    ],
    sitemap: "https://moyera.site/sitemap.xml",
  };
}
