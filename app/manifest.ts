import type { MetadataRoute } from "next";

// PWA manifesti: telefonda "ana ekrana ekle" ile tam ekran uygulama gibi açılır.
// Service worker bilinçli yok — uygulama tamamen gerçek zamanlı, offline anlamsız.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rve — Birlikte İzle",
    short_name: "Rve",
    description:
      "Arkadaşlarınla senkronize video gecesi: oda kur, kodu paylaş, aynı anda izleyin.",
    lang: "tr",
    id: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0b10",
    theme_color: "#0d0b10",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
