import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Notas.css';

export function Paginacao({ pagina, temProxima, irParaAnterior, irParaProxima }) {
  if (!temProxima && pagina <= 1) return null;

  return (
    <div className="notas-paginacao">
      <button
        type="button"
        className="filter-btn filter-btn-secondary"
        style={{ flex: 'none', padding: '4px 10px' }}
        title="Página anterior"
        onClick={irParaAnterior}
        disabled={pagina <= 1}
      >
        <ChevronLeft size={14} />
      </button>
      <span className="notas-paginacao-texto">Página {pagina}</span>
      <button
        type="button"
        className="filter-btn filter-btn-secondary"
        style={{ flex: 'none', padding: '4px 10px' }}
        title="Próxima página"
        onClick={irParaProxima}
        disabled={!temProxima}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
