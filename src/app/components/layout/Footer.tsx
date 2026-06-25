import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)" }}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row md:gap-0 lg:px-8">
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <span className="font-display tracking-[0.16em]" style={{ color: "var(--text)" }}>
            CENA
          </span>
          <span>© {new Date().getFullYear()} · Aprende português com televisão</span>
        </div>

        <div className="flex gap-6">
          <Link
            href="/privacy"
            className="text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--muted)" }}
          >
            Privacidade
          </Link>
          <Link
            href="/terms"
            className="text-sm transition-colors hover:opacity-80"
            style={{ color: "var(--muted)" }}
          >
            Termos
          </Link>
        </div>
      </div>
    </footer>
  );
}
