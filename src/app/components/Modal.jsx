import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

/**
 * Modal genérico do design system.
 * Fecha por: botão X, clique no overlay ou tecla Esc.
 */
export function Modal({ aberto, titulo, onFechar, children, rodape, largura = '480px' }) {
  useEffect(() => {
    if (!aberto) return undefined;
    const aoPressionarEsc = (e) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', aoPressionarEsc);
    return () => window.removeEventListener('keydown', aoPressionarEsc);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className="modal-overlay" onClick={onFechar} role="presentation">
      <div
        className="modal-caixa"
        style={{ width: largura }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className="modal-header">
          <span className="modal-titulo">{titulo}</span>
          <button type="button" className="modal-fechar" onClick={onFechar} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  );
}
