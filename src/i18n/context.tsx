"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import en from "./en.json";
import hi from "./hi.json";

export type Language = "en" | "hi";

type NestedRecord = { [key: string]: string | NestedRecord };

const dictionaries: Record<Language, NestedRecord> = {
  en,
  hi,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("sb_language") as Language | null;
    if (saved === "en" || saved === "hi") {
      setLangState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    localStorage.setItem("sb_language", lang);
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split(".");
    let current: unknown = dictionaries[language];

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        // Fall back to English
        let fallback: unknown = dictionaries.en;
        for (const fbKey of keys) {
          if (fallback && typeof fallback === "object" && fbKey in fallback) {
            fallback = (fallback as Record<string, unknown>)[fbKey];
          } else {
            return path;
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== "string") {
      return path;
    }

    let text = current;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useLanguage must be used within an I18nProvider");
  }
  return context;
}

