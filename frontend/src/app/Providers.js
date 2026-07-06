"use client";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Store, persistor } from "../Store";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import Protect from "./others/protected_routes";
import ChatBot from "./others/ChatBot";

export default function Providers({ children }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  if (!googleClientId) {
    return (
      <Provider store={Store}>
        <PersistGate loading={null} persistor={persistor}>
          <Protect>
            {children}
            <ChatBot />
          </Protect>
        </PersistGate>
      </Provider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <GoogleReCaptchaProvider
        reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
        scriptProps={{ async: true, defer: true, appendTo: "body" }}
      >
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
  );
}
