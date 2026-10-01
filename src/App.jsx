import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from './app/layout/AppShell';
import { ErrorBoundary } from './app/components/ErrorBoundary';

import Dashboard from './modules/dashboard/Dashboard';
import Leads from './modules/leads/Leads';
import LeadDetalhe from './modules/leads/LeadDetalhe';
import Funis from './modules/funis/Funis';

// Placeholder modules for the ones not implemented yet
const Negociacoes = () => <div>Negociações Module</div>;
const Pagamentos = () => <div>Pagamentos Module</div>;
const Formularios = () => <div>Formulários Module</div>;
const Produtos = () => <div>Produtos Module</div>;
const Relatorios = () => <div>Relatórios Module</div>;
const Configuracoes = () => <div>Configurações Module</div>;

function App() {
  const localizacao = useLocation();

  // Boundary externo: pega falhas do shell (sidebar/topbar) e mostra o
  // fallback de página cheia. O interno envolve só as rotas e usa `key`
  // para recriar o estado a cada navegação (erro de uma rota não fica
  // preso nas demais).
  return (
    <ErrorBoundary>
      <AppShell>
        <ErrorBoundary key={localizacao.pathname}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadDetalhe />} />
            <Route path="/funis" element={<Funis />} />
            <Route path="/negociacoes" element={<Negociacoes />} />
            <Route path="/pagamentos" element={<Pagamentos />} />
            <Route path="/formularios" element={<Formularios />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </AppShell>
    </ErrorBoundary>
  );
}

export default App;
