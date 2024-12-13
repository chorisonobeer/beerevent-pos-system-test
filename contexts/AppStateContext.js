import { createContext, useContext, useState, useEffect } from "react";

const AppStateContext = createContext();

export function AppStateProvider({ children }) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // オンライン/オフライン状態の監視
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // 初期状態の設定
    setIsOffline(!navigator.onLine);

    // イベントリスナーの設定
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AppStateContext.Provider value={{ isOffline }}>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-red-50 text-red-800 px-4 py-2 text-sm text-center z-50">
          現在オフラインモードの為 最新でない場合があります
        </div>
      )}
      <div className={isOffline ? "pt-10" : ""}>{children}</div>
    </AppStateContext.Provider>
  );
}

export const useAppState = () => useContext(AppStateContext);
