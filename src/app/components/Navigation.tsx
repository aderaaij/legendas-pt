"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { Captions } from "lucide-react";
import { UserDropdown } from "./UserDropdown";
import Link from "next/link";

export function Navigation() {
  const { user, isAdmin, isAuthenticated, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">(
    "login"
  );

  const handleSignOut = async () => {
    await signOut();
  };

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="container px-8 mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 flex items-center gap-2"
            >
              <Captions size="48" /> LegendasPT
            </Link>

            <div className="hidden md:flex space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Home
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <UserDropdown 
                user={user}
                isAdmin={isAdmin}
                onSignOut={handleSignOut}
              />
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openAuthModal("login")}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal("signup")}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu - simplified for now */}
        <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-col space-y-2">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
    </>
  );
}
