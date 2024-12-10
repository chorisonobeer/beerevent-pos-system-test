import "../styles/globals.css";
import { ErrorProvider } from "../contexts/ErrorContext";

function MyApp({ Component, pageProps }) {
  return (
    <ErrorProvider>
      <Component {...pageProps} />
    </ErrorProvider>
  );
}

export default MyApp;
