"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { UserDropdown } from "../common/UserDropdown";

type Theme = "noir" | "warm";

export function Navigation() {
  const { user, isAdmin, isAuthenticated, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">(
    "login"
  );
  const [theme, setTheme] = useState<Theme>("noir");

  // The inline script in the layout sets data-theme before paint; mirror it
  // into state so the toggle label stays in sync.
  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme") as Theme) || "noir";
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "noir" ? "warm" : "noir";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("cena-theme", next);
    } catch {
      /* ignore storage failures (private mode) */
    }
  };

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <>
      <nav
        className="sticky top-0 z-40 flex items-center gap-6 px-5 py-4 md:px-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,8,10,.95), rgba(8,8,10,.55) 70%, transparent)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Link href="/" className="flex items-center gap-3">
          <span
            className="grid h-[30px] w-[30px] place-items-center rounded-[7px]"
            style={{
              background: "var(--accent)",
              boxShadow: "0 6px 16px -4px var(--accent)",
            }}
          >
            <span className="block h-[9px] w-[13px] rounded-[2px] border-2 border-white" />
          </span>
          <span
            className="font-display text-[21px] tracking-[0.16em]"
            style={{ color: "var(--text)" }}
          >
            CENA
          </span>
        </Link>

        <div className="ml-3 hidden items-center gap-6 sm:flex">
          <Link
            href="/"
            className="text-sm font-semibold"
            style={{ color: "var(--text)" }}
          >
            Biblioteca
          </Link>
        </div>

        <div className="flex-1" />

        <button
          onClick={toggleTheme}
          title="Alternar direção visual"
          className="flex items-center gap-2 rounded-full px-3 py-[7px] text-[12.5px] font-semibold"
          style={{ border: "1px solid var(--border2)", color: "var(--muted)" }}
        >
          <span
            className="h-[9px] w-[9px] rounded-full"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)",
            }}
          />
          {theme === "warm" ? "Cinema" : "Noir"}
        </button>

        {isAdmin && (
          <Link
            href="/upload"
            title="Carregar legendas"
            className="grid h-[34px] w-[34px] place-items-center rounded-lg"
            style={{ border: "1px solid var(--border2)", color: "var(--muted)" }}
          >
            <Upload className="h-[17px] w-[17px]" />
          </Link>
        )}

        {isAuthenticated ? (
          <UserDropdown user={user} isAdmin={isAdmin} onSignOut={signOut} />
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openAuthModal("login")}
              className="px-3 py-2 text-sm font-medium"
              style={{ color: "var(--muted)" }}
            >
              Entrar
            </button>
            <button
              onClick={() => openAuthModal("signup")}
              className="rounded-lg px-4 py-2 text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              Criar conta
            </button>
          </div>
        )}
      </nav>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
    </>
  );
}
