"use client"
import AdminNavbar from "./Navbar/Admin_navbar";

export default function RootLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F4F2EE] font-sans antialiased">
      <AdminNavbar />
      <main className="pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}