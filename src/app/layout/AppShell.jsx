import React, { useState } from 'react';
import './AppShell.css';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell({ children }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const fecharMenu = () => setMenuAberto(false);

  return (
    <div className="app-shell">
      <Sidebar aberto={menuAberto} onFechar={fecharMenu} />
      {menuAberto && <div className="app-shell-fundo" onClick={fecharMenu} role="presentation" />}
      <div className="app-main">
        <TopBar onAbrirMenu={() => setMenuAberto(true)} />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
