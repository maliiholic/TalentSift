import './globals.css';
import Providers from "./Providers";

export const metadata = {
  title: {
    default: "TalentSift - AI-Powered Recruitment Platform",
    template: "%s | TalentSift"
  },
  description: "TalentSift matches candidate potentials with recruiter intents through dynamic job discovery, automated AI practice interviews, and streamlined applicant screening dashboards.",
  keywords: ["AI hiring", "AI interview screening", "job search", "practice interview prep", "recruiter screening", "TalentSift"],
  authors: [{ name: "TalentSift Team" }],
  metadataBase: new URL("https://talentsift-ghee.onrender.com"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://talentsift-ghee.onrender.com",
    title: "TalentSift - AI-Powered Recruitment Platform",
    description: "Match candidate potentials with recruiter intents through dynamic job discovery and automated AI practice interviews.",
    siteName: "TalentSift",
  },
  twitter: {
    card: "summary_large_image",
    title: "TalentSift - AI-Powered Recruitment Platform",
    description: "Match candidate potentials with recruiter intents through dynamic job discovery and automated AI practice interviews.",
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}