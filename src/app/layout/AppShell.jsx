import React from 'react';
import './AppShell.css';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
