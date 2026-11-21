import { Suspense } from "react";
import Header from "@/components/layout/Header";
import MainContent from "@/components/layout/MainContent";
import Footer from "@/components/layout/Footer";
import BackToTop from "@/components/ui/BackToTop";
import FloatingContactButtons from "@/components/chatbot/FloatingContactButtons";
import { getCategoriesResult } from "@/lib/products-server";

// Public site chrome. Kept out of the root layout so the /admin area never
// renders the public header, chatbot or WhatsApp widgets.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="h-20" />}>
        <PublicHeader />
      </Suspense>
      <MainContent>{children}</MainContent>
      <Footer />
      <BackToTop />
      <FloatingContactButtons />
    </>
  );
}

async function PublicHeader() {
  const { categories } = await getCategoriesResult();
  return <Header categories={categories} />;
}
