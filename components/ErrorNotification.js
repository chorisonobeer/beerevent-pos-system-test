import React, { useState, useEffect } from "react";

export function ErrorNotification({
  message,
  type = "error",
  onClose,
  autoClose = 5000,
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose, isVisible]);

  if (!isVisible) return null;

  const getStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-500 text-green-700";
      case "warning":
        return "bg-yellow-50 border-yellow-500 text-yellow-700";
      default:
        return "bg-red-50 border-red-500 text-red-700";
    }
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
      <div
        className={`border-l-4 p-4 rounded shadow-lg flex items-center max-w-sm mx-auto ${getStyles()}`}
      >
        <div className="flex-grow">{message}</div>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="ml-4 hover:opacity-70"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
