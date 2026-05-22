import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Pozisyonlar from './pages/Pozisyonlar.jsx';
import Degerlendirmeler from './pages/Degerlendirmeler.jsx';
import BelgeAnaliz from './pages/BelgeAnaliz.jsx';
import TestModulu from './pages/TestModulu.jsx';
import AdayKiyasla from './pages/AdayKiyasla.jsx';
import PerformansRaporu from './pages/PerformansRaporu.jsx';
import UcretsizDenemeTesti from './pages/UcretsizDenemeTesti.jsx';
import EvrakKutusu from './pages/EvrakKutusu.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children }) {
  const { girisli } = useAuth();
  return girisli ? children : <Navigate to="/giris" replace />;
}

function MainApp() {
  const { user, cikisYap } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [selectedPozId, setSelectedPozId] = useState(null);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sol Sidebar */}
      <Sidebar
        activeTab={tab}
        onTabChange={setTab}
        selectedId={selectedPozId}
        onSelect={(id) => { setSelectedPozId(id); setTab('pozisyonlar'); }}
        user={user}
        onCikis={cikisYap}
      />

      {/* Sağ: TopBar + İçerik */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar activeTab={tab} user={user} onCikis={cikisYap} />

        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {tab === 'dashboard' && (
            <Dashboard user={user} onTabChange={setTab} />
          )}
          {tab === 'pozisyonlar' && (
            <Pozisyonlar selectedId={selectedPozId} onSelect={setSelectedPozId} />
          )}
          {tab === 'degerlendirmeler' && <Degerlendirmeler />}
          {tab === 'belge'           && <BelgeAnaliz />}
          {tab === 'test'            && <TestModulu />}
          {tab === 'kiyasla'         && <AdayKiyasla />}
          {tab === 'rapor'           && <PerformansRaporu />}
          {tab === 'deneme'          && <UcretsizDenemeTesti />}
          {tab === 'evrak'           && <EvrakKutusu />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/giris" element={<Login />} />
            <Route path="/app" element={
              <ProtectedRoute><MainApp /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
