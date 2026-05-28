"use client"
import './globals.css';
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Store,persistor } from "../Store";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import Protect from "./others/protected_routes";
import ChatBot from "./others/ChatBot";
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
          <GoogleReCaptchaProvider reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""} scriptProps={{ async: true, defer: true, appendTo: "body" }}>
            <Provider store={Store}>
              <PersistGate loading={null} persistor={persistor}>
                <Protect>
                  {children}
                  <ChatBot />
                </Protect>
              </PersistGate>
            </Provider>
          </GoogleReCaptchaProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}