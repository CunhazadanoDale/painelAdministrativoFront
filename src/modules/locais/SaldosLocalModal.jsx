import React from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../app/components/Modal';
import { rotuloUnidade } from '../produtos/produtosUtils';
import { useSaldosDoLocal } from './useSaldosDoLocal';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Locais.css';

export function SaldosLocalModal({ local, onFechar }) {
  const {
    saldos,
    pagina,
    soComSaldo,
    temProxima,
    carregando,
    erro,
    recarregar,
    irParaAnterior,
    irParaProxima,
    mostrarSoComSaldo,
  } = useSaldosDoLocal(local.id);

  return (
    <Modal aberto titulo={`Saldos — ${local.nome}`} onFechar={onFechar} largura="760px">
      <div className="locais-saldos">
        <label className="filter-label locais-checkbox" htmlFor="saldos-so-com-saldo">
          <input
            id="saldos-so-com-saldo"
            type="checkbox"
            checked={soComSaldo}
            onChange={(evento) => mostrarSoComSaldo(evento.target.checked)}
          />
          Só produtos com saldo
        </label>

        {erro ? (
          <div className="leads-erro">
            <AlertCircle size={16} />
            <span>{erro}</span>
            <button type="button" onClick={recarregar}>
              Tentar novamente
            </button>
          </div>
        ) : carregando ? (
          <div className="locais-status">Carregando saldos…</div>
        ) : saldos.length === 0 ? (
          <div className="locais-status">
            {soComSaldo ? 'Nenhum produto com saldo neste local.' : 'Nenhum produto já passou por este local.'}
          </div>
        ) : (
          <div className="datagrid-container">
            <table className="datagrid">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Código</th>
                  <th>Unidade</th>
                  <th>Saldo</th>
                  <th>Reservado</th>
                  <th>Disponível</th>
                </tr>
              </thead>
              <tbody>
                {saldos.map((saldo) => (
                  <tr key={saldo.produto_id}>
                    <td>
                      <Link to={`/produtos/${saldo.produto_id}`}>{saldo.produto_nome}</Link>
                    </td>
                    <td>{saldo.produto_codigo || '—'}</td>
                    <td>{rotuloUnidade(saldo.unidade_medida)}</td>
                    <td>{saldo.quantidade}</td>
                    <td>{saldo.reservado}</td>
                    <td>{saldo.disponivel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!erro && (temProxima || pagina > 1) && (
          <div className="locais-paginacao">
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
            <span className="locais-paginacao-texto">Página {pagina}</span>
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
        )}
      </div>
    </Modal>
  );
}
