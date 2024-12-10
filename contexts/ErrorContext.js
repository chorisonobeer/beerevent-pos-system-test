import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { ErrorNotification } from "../components/ErrorNotification";
import { OfflineNotification } from "../components/OfflineNotification";
import { setupOnlineListener } from "../utils/errorHandling";

const ErrorContext = createContext({
  setError: () => {},
  clearError: () => {},
});

export function ErrorProvider({ children }) {
  // isOfflineの初期値をnullに設定
  const [error, setErrorState] = useState(null);
  const [isOffline, setIsOffline] = useState(null);

  // マウント後にのみオンライン状態を設定
  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const setError = useCallback((message, type = "error") => {
    setErrorState({ message, type });
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  // isOfflineがnullの間はNotificationを表示しない
  return (
    <ErrorContext.Provider value={{ setError, clearError }}>
      {error && (
        <ErrorNotification
          message={error.message}
          type={error.type}
          onClose={clearError}
        />
      )}
      {isOffline !== null && <OfflineNotification isOffline={isOffline} />}
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error("useError must be used within an ErrorProvider");
  }
  return context;
}

export default ErrorContext;
