import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

const FOCAVEIS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function elementosFocaveis(caixa) {
  return caixa ? Array.from(caixa.querySelectorAll(FOCAVEIS)) : [];
}

export function Modal({ aberto, titulo, onFechar, children, rodape, largura = '480px' }) {
  const caixaRef = useRef(null);
  const alteradoRef = useRef(false);
  const idTitulo = useId();

  useEffect(() => {
    if (!aberto) return undefined;
    const aoPressionarEsc = (e) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', aoPressionarEsc);
    return () => window.removeEventListener('keydown', aoPressionarEsc);
  }, [aberto, onFechar]);

  useEffect(() => {
    if (!aberto) return undefined;
    alteradoRef.current = false;
    const anterior = document.activeElement;
    const caixa = caixaRef.current;
    if (caixa && !caixa.contains(document.activeElement)) {
      const [primeiro] = elementosFocaveis(caixa);
      (primeiro || caixa).focus();
    }
    return () => {
      if (anterior && typeof anterior.focus === 'function' && document.contains(anterior)) {
        anterior.focus();
      }
    };
  }, [aberto]);

  if (!aberto) return null;

  const prenderFoco = (e) => {
    if (e.key !== 'Tab') return;
    const focaveis = elementosFocaveis(caixaRef.current);
    if (focaveis.length === 0) {
      e.preventDefault();
      return;
    }
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const atual = document.activeElement;
    if (e.shiftKey && (atual === primeiro || !caixaRef.current.contains(atual))) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && atual === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  };

  const marcarAlterado = () => {
    alteradoRef.current = true;
  };

  const fecharPeloFundo = () => {
    if (!alteradoRef.current) onFechar();
  };

  return (
    <div className="modal-overlay" onClick={fecharPeloFundo} role="presentation">
      <div
        ref={caixaRef}
        className="modal-caixa"
        style={{ width: largura }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={prenderFoco}
        onInputCapture={marcarAlterado}
        onChangeCapture={marcarAlterado}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
      >
        <div className="modal-header">
          <span className="modal-titulo" id={idTitulo}>
            {titulo}
          </span>
          <button type="button" className="modal-fechar" onClick={onFechar} aria-label="Fechar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  );
}
