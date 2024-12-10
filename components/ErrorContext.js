import React, { createContext, useContext, useState, useCallback } from "react";
import { ErrorNotification } from "../components/ErrorNotification";
import { OfflineNotification } from "../components/OfflineNotification";
import { setupOnlineListener } from "../utils/errorHandling";

const ErrorContext = createContext({
  setError: () => {},
  clearError: () => {},
});

export function ErrorProvider({ children }) {
  const [error, setErrorState] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  React.useEffect(() => {
    setupOnlineListener((online) => {
      setIsOffline(!online);
    });
  }, []);

  const setError = useCallback((message) => {
    setErrorState(message);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  return (
    <ErrorContext.Provider value={{ setError, clearError }}>
      {error && <ErrorNotification message={error} onClose={clearError} />}
      <OfflineNotification isOffline={isOffline} />
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  return useContext(ErrorContext);
}
