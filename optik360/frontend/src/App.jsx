import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Urunler from './pages/Urunler.jsx';
import Stok from './pages/Stok.jsx';
import Bayiler from './pages/Bayiler.jsx';
import CariHesaplar from './pages/CariHesaplar.jsx';
import Siparisler from './pages/Siparisler.jsx';
import Faturalar from './pages/Faturalar.jsx';
import Tahsilatlar from './pages/Tahsilatlar.jsx';

function ProtectedRoute({ children }) {
  const { girisli } = useAuth();
  return girisli ? children : <Navigate to="/giris" replace />;
}

function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const pages = {
    dashboard:   <Dashboard />,
    urunler:     <Urunler />,
    stok:        <Stok />,
    bayiler:     <Bayiler />,
    cari:        <CariHesaplar />,
    siparisler:  <Siparisler />,
    faturalar:   <Faturalar />,
    tahsilatlar: <Tahsilatlar />,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar activeTab={activeTab} />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {pages[activeTab] || <div style={{ padding: '2rem', color: 'var(--muted)' }}>Sayfa bulunamadı</div>}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/giris" element={<Login />} />
      <Route path="/app"   element={<ProtectedRoute><MainApp /></ProtectedRoute>} />
      <Route path="/"      element={<Navigate to="/app" replace />} />
      <Route path="*"      element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
