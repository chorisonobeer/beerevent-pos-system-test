import React from "react";

export function OfflineNotification({ isOffline }) {
  if (!isOffline) return null;

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
      <div
        className="bg-yellow-50 border border-yellow-200 rounded-full px-4 py-2 
                    shadow-lg flex items-center space-x-2"
      >
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        <span className="text-sm text-yellow-800">
          オフラインモードで動作中
        </span>
      </div>
    </div>
  );
}
