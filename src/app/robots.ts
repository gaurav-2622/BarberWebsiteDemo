import type { MetadataRoute } from "next";

import { getPublicSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/booking/manage", "/booking/success", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
