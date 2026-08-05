"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface UIContextValue {
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  captureOpen: boolean;
  setCaptureOpen: (v: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  return (
    <UIContext.Provider value={{ paletteOpen, setPaletteOpen, captureOpen, setCaptureOpen }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
