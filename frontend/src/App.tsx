import { Link, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Schemes from "./pages/Schemes";
import Apply from "./pages/Apply";
import Track from "./pages/Track";

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-saffron text-white" : "text-gray-700 hover:bg-orange-50"
      }`}
    >
      {label}
    </Link>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🇮🇳</span>
            <div>
              <h1 className="font-bold text-lg leading-tight text-india-green">Yojana Setu</h1>
              <p className="text-xs text-gray-500 hidden sm:block">योजना सेतु — Scheme bridge</p>
            </div>
          </Link>
          <nav className="flex flex-wrap gap-1 justify-end">
            <NavLink to="/" label="Profile" />
            <NavLink to="/schemes" label="Schemes" />
            <NavLink to="/track" label="Track" />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schemes" element={<Schemes />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/track" element={<Track />} />
        </Routes>
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        Yojana Setu — Hackathon demo · No authentication · Data stored locally
      </footer>
    </div>
  );
}
