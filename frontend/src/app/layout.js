"use client"
import './globals.css';
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Store,persistor } from "../Store";
import { GoogleOAuthProvider } from '@react-oauth/google';
import Protect from "./others/protected_routes";
import { useEffect } from 'react';
import { setAuthToken } from "./others/auth";

export default function RootLayout({ children }) {
  useEffect(() => {
    try {
      const token = localStorage.getItem('access');
      setAuthToken(token);
    } catch (e) {
      // localStorage not available or other error
    }
  }, []);
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <GoogleOAuthProvider clientId="166424008698-umf0iijpbmf0he2qdg70ebpbjhv9ol4b.apps.googleusercontent.com">
          <Provider store={Store}>
            <PersistGate loading={null} persistor={persistor}>
              <Protect>
                {children}
              </Protect>
            </PersistGate>
          </Provider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}