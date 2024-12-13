// contexts/OfflineContext.js
import { createContext, useContext, useState, useEffect } from "react";

const OfflineContext = createContext();

export function OfflineProvider({ children }) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // 初期状態の設定
    setIsOffline(!navigator.onLine);

    // オンライン/オフライン状態の監視
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOffline }}>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-red-50 text-red-800 px-4 py-2 text-sm text-center">
          現在オフラインモードの為 最新でない場合があります
        </div>
      )}
      <div className={isOffline ? "pt-10" : ""}>{children}</div>
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);
