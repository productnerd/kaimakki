"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import ChatWidget from "@/components/chat/ChatWidget";
import { useAuth } from "@/providers/AuthProvider";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isOnboarding = pathname === "/onboarding";
  const isDashboard = pathname.startsWith("/dashboard");
  const chatMode = user && isDashboard ? "dashboard" : "landing";

  return (
    <>
      <Header />
      <main className={isOnboarding ? "flex-1 overflow-hidden" : "flex-1"}>
        {children}
      </main>
      {!isOnboarding && <Footer />}
      <CartDrawer />
      {!isOnboarding && <ChatWidget mode={chatMode} />}
    </>
  );
}
