import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { QuoteProvider } from "@/components/quote-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/content";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vinakhang.com.vn"),
  title: {
    default: "Vina Khang - Vải Teflon, băng tải và vật tư chịu nhiệt",
    template: "%s | Vina Khang",
  },
  description: site.description,
  keywords: [
    "vải teflon",
    "băng tải teflon",
    "băng keo chịu nhiệt",
    "băng tải máy ép keo",
    "dây đai hàn nhiệt",
    "vật tư công nghiệp",
  ],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: site.name,
    title: "Vina Khang - Vật liệu Teflon chịu nhiệt cho sản xuất công nghiệp",
    description: site.description,
    images: [{ url: "/images/products/vai-chiu-nhiet-cao-cap.webp", width: 720, height: 540 }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-white">
        <QuoteProvider>
          <Suspense
            fallback={
              <div className="h-[72px] border-b border-line bg-white lg:h-[112px]" />
            }
          >
            <SiteHeader />
          </Suspense>
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </QuoteProvider>
      </body>
    </html>
  );
}
