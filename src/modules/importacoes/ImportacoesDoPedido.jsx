import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../app/components/StatusBadge';
import { formatarData } from '../../lib/formatar';
import { statusDaImportacao } from './importacoesUtils';
import { useImportacoesDoPedido } from './useImportacoesDoPedido';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Importacoes.css';

export function ImportacoesDoPedido({ pedidoId, geracao, nomeProduto }) {
  const { linhas, carregando, erro, recarregar } = useImportacoesDoPedido(pedidoId, geracao);

  if (erro) {
    return (
      <div className="leads-erro">
        <AlertCircle size={16} />
        <span>{erro}</span>
        <button type="button" onClick={recarregar}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (carregando && linhas.length === 0) return <div className="importacoes-secundario">Carregando importações…</div>;
  if (linhas.length === 0) {
    return <div className="importacoes-secundario">Nenhuma importação alocada a este pedido.</div>;
  }

  return (
    <div className="datagrid-container">
      <table className="datagrid">
        <thead>
          <tr>
            <th>Importação</th>
            <th>Produto</th>
            <th>Alocado</th>
            <th>Chegada prevista</th>
            <th>Recebida em</th>
            <th>Reservado</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => {
            const situacao = statusDaImportacao(linha.importacao_status);
            return (
              <tr key={`${linha.importacao_id}|${linha.pedido_item_id}`}>
                <td>
                  <span className="importacoes-selo">
                    <Link to={`/importacoes/${linha.importacao_id}`}>Importação {linha.importacao_numero}</Link>
                    <StatusBadge status={situacao.cor} label={situacao.rotulo} />
                  </span>
                </td>
                <td>{nomeProduto(linha.produto_id)}</td>
                <td>{linha.quantidade}</td>
                <td>{formatarData(linha.chegada_prevista)}</td>
                <td>{formatarData(linha.recebida_em)}</td>
                <td>{linha.reservada ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
