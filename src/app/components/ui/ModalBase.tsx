"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import type { ReactNode } from "react";

interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  /** Sizing/spacing classes for the content panel (e.g. "rounded-xl max-w-md w-full p-6"). */
  contentClassName?: string;
  children: ReactNode;
}

/**
 * Shared modal scaffolding: a Radix Dialog wrapped in framer-motion
 * enter/exit animations with the app's dimmed, blurred overlay and a
 * centered surface panel. Callers provide the panel's sizing via
 * `contentClassName` and the panel contents (title, body, close button) as
 * children.
 */
export default function ModalBase({
  isOpen,
  onClose,
  contentClassName = "",
  children,
}: ModalBaseProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
          <Dialog.Portal>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50"
                style={{
                  background: "rgba(4,4,6,.72)",
                  backdropFilter: "blur(4px)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={`fixed top-1/2 left-1/2 z-50 ${contentClassName}`}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border2)",
                }}
                initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
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
