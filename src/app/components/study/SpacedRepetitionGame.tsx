"use client";

import React, { useState } from "react";
import { RotateCcw, Trophy, Brain, ArrowLeftRight, X, Timer } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import { StudyCard } from "./StudyCard";
import { StudyProgressBar } from "./StudyProgressBar";
import { useSpacedRepetitionGame } from "./useSpacedRepetitionGame";
import { useFavorites } from "@/hooks/useFavorites";
import { StudyDirection } from "@/types/spaced-repetition";

interface SpacedRepetitionGameProps {
  episodeId: string;
  episodeTitle: string;
  open: boolean;
  onClose: () => void;
}

// Shared modal chrome (overlay + animated panel) so every state matches.
function Shell({
  open,
  onClose,
  children,
  maxWidth = "620px",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
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

export function SpacedRepetitionGame({
  episodeId,
  episodeTitle,
  open,
  onClose,
}: SpacedRepetitionGameProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [studyDirection, setStudyDirection] = useState<StudyDirection>("pt-en");

  const {
    cards,
    currentCard,
    currentCardIndex,
    showAnswer,
    loading,
    error,
    gameComplete,
    sessionStats,
    isAuthenticated,
    handleFlip,
    handleResponse,
    handleRestart,
    initializeGame,
    accuracy,
    duration,
  } = useSpacedRepetitionGame({ episodeId, studyDirection, onClose });

  const toggleDirection = () => {
    setStudyDirection((d) => (d === "pt-en" ? "en-pt" : "pt-en"));
  };

  const handleToggleFavorite = async (phraseId: string) => {
    try {
      await toggleFavorite(phraseId);
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (loading || gameComplete || !open) return;
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        setStudyDirection((d) => (d === "pt-en" ? "en-pt" : "pt-en"));
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [loading, gameComplete, open]);

  // ----- Loading -----
  if (loading) {
    return (
      <Shell open={open} onClose={onClose} maxWidth="420px">
        <div className="p-10 text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
          <p style={{ color: "var(--muted)" }}>A carregar cartões…</p>
        </div>
      </Shell>
    );
  }

  // ----- Error / no cards -----
  if (error) {
    return (
      <Shell open={open} onClose={onClose} maxWidth="420px">
        <div className="p-8 text-center">
          <Brain className="mx-auto mb-4 h-12 w-12" style={{ color: "var(--accent2)" }} />
          <Dialog.Title className="mb-2 text-lg font-extrabold">
            Sem cartões disponíveis
          </Dialog.Title>
          <Dialog.Description className="mb-6 text-sm" style={{ color: "var(--muted)" }}>
            {error}
          </Dialog.Description>
          <div className="flex gap-3">
            <Dialog.Close asChild>
              <button
                className="flex-1 rounded-lg py-2 text-sm font-semibold"
                style={{ background: "var(--surface2)", color: "var(--text)" }}
              >
                Fechar
              </button>
            </Dialog.Close>
            <button
              onClick={initializeGame}
              className="flex-1 rounded-lg py-2 text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              Tentar de novo
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ----- Complete -----
  if (gameComplete) {
    return (
      <Shell open={open} onClose={onClose} maxWidth="460px">
        <div className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            style={{ color: "var(--gold)" }}
            className="mb-4"
          >
            <Trophy className="mx-auto h-16 w-16" />
          </motion.div>
          <Dialog.Title className="mb-2 text-2xl font-extrabold">
            Sessão concluída!
          </Dialog.Title>
          <Dialog.Description className="mb-6 text-sm" style={{ color: "var(--muted)" }}>
            Bom trabalho com {episodeTitle}
          </Dialog.Description>

          <div
            className="mb-6 grid grid-cols-3 gap-4 rounded-2xl p-4"
            style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
          >
            <div>
              <div className="font-display text-2xl" style={{ color: "var(--blue)" }}>
                {sessionStats.studied}
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                cartões
              </div>
            </div>
            <div>
              <div className="font-display text-2xl" style={{ color: "var(--green)" }}>
                {accuracy.toFixed(0)}%
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                precisão
              </div>
            </div>
            <div>
              <div className="font-display text-2xl" style={{ color: "var(--gold)" }}>
                {Math.floor(duration / 60)}m
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                duração
              </div>
            </div>
          </div>

          {!isAuthenticated && (
            <div
              className="mb-6 rounded-xl p-4 text-left text-sm"
              style={{ background: "rgba(245,196,81,.1)", border: "1px solid rgba(245,196,81,.25)" }}
            >
              <p style={{ color: "var(--gold)" }}>
                <strong>Inicia sessão para guardar o teu progresso</strong> e obter
                um agendamento de repetição personalizado.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Dialog.Close asChild>
              <button
                className="flex-1 rounded-lg py-2 text-sm font-semibold"
                style={{ background: "var(--surface2)", color: "var(--text)" }}
              >
                Fechar
              </button>
            </Dialog.Close>
            <button
              onClick={handleRestart}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              <RotateCcw className="h-4 w-4" />
              Estudar de novo
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (!currentCard) return null;

  const dirLabel = studyDirection === "pt-en" ? "PT → EN" : "EN → PT";

  // ----- Active session -----
  return (
    <Shell open={open} onClose={onClose}>
      {/* Header */}
      <div
        className="flex items-center gap-[14px] px-6 py-5"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(180deg, var(--surface2), var(--surface))",
        }}
      >
        <div
          className="grid h-[38px] w-[38px] place-items-center rounded-[10px]"
          style={{ background: "var(--accent)", boxShadow: "0 8px 20px -6px var(--accent)" }}
        >
          <Timer className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1">
          <Dialog.Title className="text-base font-extrabold">Sessão de estudo</Dialog.Title>
          <Dialog.Description className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            {episodeTitle}
          </Dialog.Description>
        </div>
        <button
          onClick={toggleDirection}
          className="flex items-center gap-[7px] rounded-lg px-3 py-[7px] text-xs font-bold"
          style={{ border: "1px solid var(--border2)", color: "var(--muted)" }}
          title="Trocar direção (R)"
        >
          <ArrowLeftRight className="h-[14px] w-[14px]" />
          {dirLabel}
        </button>
        <Dialog.Close asChild>
          <button
            className="grid h-[34px] w-[34px] place-items-center rounded-lg"
            style={{ color: "var(--muted)", border: "1px solid transparent" }}
            aria-label="Fechar"
          >
            <X className="h-[17px] w-[17px]" />
          </button>
        </Dialog.Close>
      </div>

      <StudyProgressBar
        currentCard={currentCardIndex + 1}
        totalCards={cards.length}
        correctCards={sessionStats.correct}
        studiedCards={sessionStats.studied}
      />

      <AnimatePresence mode="wait">
        <StudyCard
          card={currentCard}
          onResponse={handleResponse}
          showAnswer={showAnswer}
          onFlip={handleFlip}
          cardNumber={currentCardIndex + 1}
          totalCards={cards.length}
          isFavorite={isFavorite(currentCard.phrase.id)}
          onToggleFavorite={handleToggleFavorite}
          studyDirection={studyDirection}
        />
      </AnimatePresence>

      {!isAuthenticated && (
        <div
          className="px-6 py-3 text-center text-xs"
          style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
        >
          Inicia sessão para guardar o progresso e teres repetição espaçada personalizada.
        </div>
      )}
    </Shell>
  );
}
