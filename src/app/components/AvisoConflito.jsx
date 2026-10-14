import React from 'react';
import { RefreshCw } from 'lucide-react';
import './AvisoConflito.css';

export function AvisoConflito({ mensagem, onRecarregar, recarregando = false }) {
  return (
    <div className="aviso-conflito" role="alert">
      <span>{mensagem}</span>
      <button
        type="button"
        className="aviso-conflito-btn"
        onClick={onRecarregar}
        disabled={recarregando}
      >
        <RefreshCw size={12} />
        {recarregando ? 'Recarregando…' : 'Recarregar dados'}
      </button>
    </div>
  );
}
