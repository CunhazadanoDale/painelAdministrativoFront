import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from './app/layout/AppShell';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import { useAutenticacao } from './app/autenticacao/useAutenticacao';

import Login from './modules/login/Login';
import Dashboard from './modules/dashboard/Dashboard';
import Leads from './modules/leads/Leads';
import LeadDetalhe from './modules/leads/LeadDetalhe';
import Funis from './modules/funis/Funis';
import Solicitacoes from './modules/solicitacoes/Solicitacoes';
import SolicitacaoDetalhe from './modules/solicitacoes/SolicitacaoDetalhe';
import Usuarios from './modules/usuarios/Usuarios';
import Cargos from './modules/cargos/Cargos';
import Aprovadores from './modules/aprovadores/Aprovadores';

const Negociacoes = () => <div>Negociações Module</div>;
const Formularios = () => <div>Formulários Module</div>;
const Produtos = () => <div>Produtos Module</div>;
const Relatorios = () => <div>Relatórios Module</div>;
const Configuracoes = () => <div>Configurações Module</div>;

function App() {
  const localizacao = useLocation();
  const { autenticado, administrador } = useAutenticacao();

  if (!autenticado) {
    return (
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppShell>
        <ErrorBoundary key={localizacao.pathname}>
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadDetalhe />} />
            <Route path="/funis" element={<Funis />} />
            <Route path="/negociacoes" element={<Negociacoes />} />
            <Route path="/solicitacoes" element={<Solicitacoes />} />
            <Route path="/solicitacoes/:id" element={<SolicitacaoDetalhe />} />
            <Route path="/pagamentos" element={<Navigate to="/solicitacoes" replace />} />
            <Route
              path="/usuarios"
              element={administrador ? <Usuarios /> : <Navigate to="/" replace />}
            />
            <Route
              path="/cargos"
              element={administrador ? <Cargos /> : <Navigate to="/" replace />}
            />
            <Route
              path="/aprovadores"
              element={administrador ? <Aprovadores /> : <Navigate to="/" replace />}
            />
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
