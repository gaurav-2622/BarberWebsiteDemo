import type { MetadataRoute } from "next";

import { getPublicSiteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getPublicSiteUrl();

  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/book`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
