import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './app/layout/AppShell';

import Dashboard from './modules/dashboard/Dashboard';
import Leads from './modules/leads/Leads';

// Placeholder modules for the ones not implemented yet
const Negociacoes = () => <div>Negociações Module</div>;
const Pagamentos = () => <div>Pagamentos Module</div>;
const Formularios = () => <div>Formulários Module</div>;
const Produtos = () => <div>Produtos Module</div>;
const Relatorios = () => <div>Relatórios Module</div>;
const Configuracoes = () => <div>Configurações Module</div>;

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/negociacoes" element={<Negociacoes />} />
        <Route path="/pagamentos" element={<Pagamentos />} />
        <Route path="/formularios" element={<Formularios />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
