"use client";

import { useState, useEffect } from "react";

export function WelcomePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isReturningUser = localStorage.getItem("NimStudio");
    if (!isReturningUser || isReturningUser !== "true") {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const handleClose = () => {
    localStorage.setItem("NimStudio", "true");
    setShow(false);
  };

  const handleDocs = () => {
    localStorage.setItem("NimStudio", "true");
    setShow(false);
    window.open(
      "https://github.com/aftababu/NimStudio",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="fixed inset-0 !w-screen !h-screen z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-outline-variant rounded-2xl p-lg  min-w-sm  shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-sm mb-md text-primary">
          <span className="material-symbols-outlined text-[28px]">info</span>
          <h2 className="text-xl font-semibold text-on-surface whitespace-nowrap">
            Welcome to NimStudio
          </h2>
        </div>
        <p className="text-on-surface-variant leading-relaxed mb-xl">
          It might be slow due to the free API. To continue and learn more,
          please read the docs.
        </p>
        <div className="flex items-center justify-end gap-sm">
          <button
            onClick={handleClose}
            className="px-md py-sm text-on-surface hover:bg-surface-container-high rounded-lg transition-colors font-medium"
          >
            Skip
          </button>
          <button
            onClick={handleDocs}
            className="px-md py-sm bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors font-medium flex items-center gap-xs shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">
              menu_book
            </span>
            Docs
          </button>
        </div>
      </div>
    </div>
  );
}
