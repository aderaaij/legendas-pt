"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";

interface StudyShellProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * Modal chrome (overlay + animated panel) shared by every study session.
 * Children only mount while open, so a session hook placed inside starts
 * fresh on every open and stops (listeners included) once it closes.
 */
export function StudyShell({
  open,
  onClose,
  children,
  maxWidth = "620px",
}: StudyShellProps) {
  return (
    <AnimatePresence>
      {open && (
        <Dialog.Root open={open} onOpenChange={onClose}>
          <Dialog.Portal>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-[80]"
                style={{ background: "rgba(4,4,6,.72)", backdropFilter: "blur(8px)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed left-1/2 top-1/2 z-[80] w-full overflow-hidden"
                style={{
                  maxWidth,
                  borderRadius: 20,
                  background: "var(--surface)",
                  border: "1px solid var(--border2)",
                  boxShadow: "0 40px 100px -20px rgba(0,0,0,.85)",
                }}
                initial={{ opacity: 0, scale: 0.97, x: "-50%", y: "-48%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.97, x: "-50%", y: "-48%" }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
}
