import "../styles/globals.css";
import { Toaster } from "react-hot-toast";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "rgba(10, 5, 32, 0.95)",
            color: "#f1f5f9",
            border: "1px solid rgba(124, 58, 237, 0.3)",
            borderRadius: "14px",
            fontSize: "13px",
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1)",
          },
          success: {
            iconTheme: { primary: "#10b981", secondary: "rgba(10,5,32,0.9)" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "rgba(10,5,32,0.9)" },
          },
          loading: {
            iconTheme: { primary: "#a78bfa", secondary: "rgba(10,5,32,0.9)" },
          },
        }}
      />
    </>
  );
}
