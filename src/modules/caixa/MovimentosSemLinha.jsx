import React from 'react';
import { Link } from 'react-router-dom';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import { linkDoMovimento, rotuloMovimento } from './caixaUtils';
import '../../app/components/DataGrid.css';
import './Caixa.css';

export function MovimentosSemLinha({ movimentos }) {
  return (
    <div className="datagrid-container">
      <table className="datagrid" aria-label="Movimentos sem linha no extrato">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {movimentos.map((movimento) => {
            const link = linkDoMovimento(movimento);
            return (
              <tr key={`${movimento.tipo}:${movimento.id}`}>
                <td>{formatarData(movimento.data)}</td>
                <td>{link ? <Link to={link}>{rotuloMovimento(movimento.tipo)}</Link> : rotuloMovimento(movimento.tipo)}</td>
                <td>{movimento.descricao}</td>
                <td>{formatarMoeda(movimento.valor_centavos)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
