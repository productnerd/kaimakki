import type { Metadata } from "next";
import { VERTICALS, VERTICAL_SLUGS } from "@/lib/verticals";
import VerticalLandingPage from "@/components/landing/VerticalLandingPage";

export function generateStaticParams() {
  return VERTICAL_SLUGS.map((vertical) => ({ vertical }));
}

export function generateMetadata({
  params,
}: {
  params: { vertical: string };
}): Metadata {
  const v = VERTICALS[params.vertical];
  if (!v) return { title: "Kaimakki Studio" };

  return {
    title: v.metaTitle,
    description: v.metaDescription,
    alternates: {
      canonical: `https://productnerd.github.io/kaimakki/for/${params.vertical}`,
    },
    openGraph: {
      title: v.metaTitle,
      description: v.metaDescription,
      type: "website",
      url: `https://productnerd.github.io/kaimakki/for/${params.vertical}`,
    },
  };
}

export default function VerticalPage({
  params,
}: {
  params: { vertical: string };
}) {
  return <VerticalLandingPage vertical={params.vertical} />;
}
