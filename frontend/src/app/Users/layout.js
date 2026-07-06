import Navbar from "./Navbar/navbar";
import Footer from "./Footer/footer";

export default function RootLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}