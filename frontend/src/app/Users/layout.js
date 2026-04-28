export const dynamic = 'force-dynamic';

import Navbar from "./Navbar/navbar";

export default function RootLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}