import React from 'react';
import { Link } from 'react-router-dom';
import { formatarMoeda } from '../../lib/formatar';
import { rotuloStatus } from '../solicitacoes/solicitacoesUtils';
import './Comissoes.css';

export function Valor({ centavos }) {
  return <span className={centavos < 0 ? 'comissoes-negativo' : undefined}>{formatarMoeda(centavos)}</span>;
}

export function ContaAPagar({ fechamento }) {
  return (
    <Link to={`/solicitacoes/${fechamento.solicitacao_id}`}>{rotuloStatus(fechamento.status_conta_a_pagar)}</Link>
  );
}
