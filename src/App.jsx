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
import Empresas from './modules/empresas/Empresas';
import Fornecedores from './modules/fornecedores/Fornecedores';
import ContasBancarias from './modules/financeiro/ContasBancarias';
import PlanoContas from './modules/financeiro/PlanoContas';
import Produtos from './modules/produtos/Produtos';
import ProdutoDetalhe from './modules/produtos/ProdutoDetalhe';
import Categorias from './modules/produtos/Categorias';
import Perfil from './modules/perfil/Perfil';

const Negociacoes = () => <div>Negociações Module</div>;
const Formularios = () => <div>Formulários Module</div>;
const Relatorios = () => <div>Relatórios Module</div>;
const Configuracoes = () => <div>Configurações Module</div>;

function destinoDepoisDoLogin(origem) {
  if (!origem || typeof origem.pathname !== 'string' || !origem.pathname.startsWith('/')) return '/';
  if (origem.pathname === '/login') return '/';
  return `${origem.pathname}${origem.search || ''}${origem.hash || ''}`;
}

function App() {
  const localizacao = useLocation();
  const { autenticado, administrador, comercial, financeiro } = useAutenticacao();

  if (!autenticado) {
    return (
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace state={{ de: localizacao }} />} />
        </Routes>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppShell>
        <ErrorBoundary key={localizacao.pathname}>
          <Routes>
            <Route
              path="/login"
              element={<Navigate to={destinoDepoisDoLogin(localizacao.state && localizacao.state.de)} replace />}
            />
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={comercial ? <Leads /> : <Navigate to="/" replace />} />
            <Route
              path="/leads/:id"
              element={comercial ? <LeadDetalhe /> : <Navigate to="/" replace />}
            />
            <Route path="/funis" element={comercial ? <Funis /> : <Navigate to="/" replace />} />
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
            <Route
              path="/empresas"
              element={administrador ? <Empresas /> : <Navigate to="/" replace />}
            />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route
              path="/contas-bancarias"
              element={financeiro ? <ContasBancarias /> : <Navigate to="/" replace />}
            />
            <Route path="/plano-de-contas" element={<PlanoContas />} />
            <Route path="/formularios" element={<Formularios />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/produtos/:id" element={<ProdutoDetalhe />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </AppShell>
    </ErrorBoundary>
  );
}

export default App;
