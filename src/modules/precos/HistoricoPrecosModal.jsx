import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { StatusBadge } from '../../app/components/StatusBadge';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as precosService from '../../services/tabelaPrecos';
import { hojeEmBrasilia, rotuloModelo } from '../pedidos/pedidosUtils';
import { useHistoricoPrecos } from './useHistoricoPrecos';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Precos.css';

export function HistoricoPrecosModal({ produto, modelo, administrador, onAlterou, onFechar }) {
  const { itens, carregando, erro, recarregar } = useHistoricoPrecos(produto.id, modelo);
  const [confirmando, setConfirmando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const hoje = hojeEmBrasilia();

  const excluir = async (id) => {
    setExcluindo(id);
    setErroAcao(null);
    try {
      await precosService.excluirPreco(id);
      setConfirmando(null);
      recarregar();
      onAlterou();
    } catch (e) {
      setErroAcao(e.message || 'Erro ao excluir o preço.');
    } finally {
      setExcluindo(null);
    }
  };

  const situacaoDe = (item, indice) => {
    if (item.vigente_de > hoje) return <StatusBadge status="info" label="Futura" />;
    const primeiraVigente = itens.findIndex((outro) => outro.vigente_de <= hoje);
    return indice === primeiraVigente ? <StatusBadge status="success" label="Vigente" /> : <StatusBadge status="neutral" label="Encerrada" />;
  };

  return (
    <Modal
      aberto
      titulo={`Histórico de preços — ${produto.nome}`}
      onFechar={onFechar}
      largura="680px"
      rodape={
        <button
          type="button"
          className="filter-btn filter-btn-secondary"
          style={{ flex: 'none', padding: '8px 16px' }}
          onClick={onFechar}
        >
          Fechar
        </button>
      }
    >
      <div className="precos-form">
        <span className="precos-form-ajuda">Modelo {rotuloModelo(modelo)}, da vigência mais recente para a mais antiga.</span>
        {erroAcao && (
          <div className="precos-form-erro-api" role="alert">
            {erroAcao}
          </div>
        )}
        {erro ? (
          <div className="leads-erro">
            <AlertCircle size={16} />
            <span>{erro}</span>
            <button type="button" onClick={recarregar}>
              Tentar novamente
            </button>
          </div>
        ) : carregando && itens.length === 0 ? (
          <span className="precos-secundario">Carregando histórico…</span>
        ) : itens.length === 0 ? (
          <span className="precos-secundario">Nenhum preço lançado na tabela para este modelo.</span>
        ) : (
          <div className="datagrid-container">
            <table className="datagrid" aria-label="Histórico de preços">
              <thead>
                <tr>
                  <th>Vigente de</th>
                  <th>Preço</th>
                  <th>Observação</th>
                  <th>Situação</th>
                  {administrador && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {itens.map((item, indice) => (
                  <tr key={item.id}>
                    <td>{formatarData(item.vigente_de)}</td>
                    <td>{formatarMoeda(item.preco_centavos)}</td>
                    <td>{item.observacao || '—'}</td>
                    <td>{situacaoDe(item, indice)}</td>
                    {administrador && (
                      <td>
                        {item.vigente_de > hoje &&
                          (confirmando === item.id ? (
                            <button
                              type="button"
                              className="filter-btn precos-perigo"
                              style={{ flex: 'none', width: 'auto', padding: '2px 10px' }}
                              onClick={() => excluir(item.id)}
                              disabled={excluindo === item.id}
                            >
                              Confirmar exclusão
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="filter-btn filter-btn-secondary"
                              style={{ flex: 'none', width: 'auto', padding: '2px 10px' }}
                              onClick={() => setConfirmando(item.id)}
                            >
                              Excluir
                            </button>
                          ))}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
