import "../styles/globals.css";
import { ErrorProvider } from "../contexts/ErrorContext";
import { AppStateProvider } from "../contexts/AppStateContext";

function MyApp({ Component, pageProps }) {
  return (
    <ErrorProvider>
      <AppStateProvider>
        <Component {...pageProps} />
      </AppStateProvider>
    </ErrorProvider>
  );
}

export default MyApp;
