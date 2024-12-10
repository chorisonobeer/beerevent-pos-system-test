import React from "react";

export function LoadingSpinner({ size = "medium", fullScreen = false }) {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  };

  const spinner = (
    <div className={`relative ${sizeClasses[size]}`}>
      <div className="absolute w-full h-full border-4 border-slate-200 rounded-full"></div>
      <div className="absolute w-full h-full border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
        {spinner}
      </div>
    );
  }

  return <div className="flex justify-center p-4">{spinner}</div>;
}
