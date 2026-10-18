import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import * as clientesService from '../../services/clientes';
import { CABECALHO_IMPORTACAO } from './clientesUtils';
import '../../app/components/DataGrid.css';
import './Clientes.css';

const LIMITE_BYTES = 5 * 1024 * 1024;

function resumoDe(relatorio) {
  if (relatorio.simulacao) return `${relatorio.importadas} de ${relatorio.total} linhas seriam importadas.`;
  return `${relatorio.importadas} de ${relatorio.total} linhas importadas.`;
}

export function ImportacaoClientesModal({ onFechar, onImportado }) {
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState(null);
  const [relatorio, setRelatorio] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const escolher = (evento) => {
    setArquivo((evento.target.files && evento.target.files[0]) || null);
    setRelatorio(null);
    setErro(null);
  };

  const enviar = async (simular) => {
    if (!arquivo) {
      setErro('Escolha o arquivo CSV.');
      return;
    }
    if (arquivo.size > LIMITE_BYTES) {
      setErro('O arquivo tem mais de 5 MB; divida em partes.');
      return;
    }
    setErro(null);
    setRelatorio(null);
    setEnviando(true);
    try {
      const resposta = await clientesService.importarClientes(arquivo, { simular });
      const dados = resposta?.dados ?? null;
      setRelatorio(dados);
      if (!simular && dados) onImportado();
    } catch (e) {
      setErro(e.message || 'Erro ao importar os clientes.');
    } finally {
      setEnviando(false);
    }
  };

  const rejeitadas = relatorio?.rejeitadas ?? [];

  return (
    <Modal
      aberto
      titulo="Importar clientes"
      onFechar={enviando ? () => {} : onFechar}
      largura="760px"
      rodape={
        <>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={onFechar}
            disabled={enviando}
          >
            Fechar
          </button>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={() => enviar(true)}
            disabled={enviando}
          >
            Simular
          </button>
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={() => enviar(false)}
            disabled={enviando}
          >
            {enviando ? 'Enviando…' : 'Importar'}
          </button>
        </>
      }
    >
      <div className="clientes-form">
        <span className="clientes-form-ajuda">
          CSV em UTF-8 (no Excel: “CSV UTF-8”), separado por ponto e vírgula, até 5 MB e 5.000 linhas, com este
          cabeçalho na primeira linha:
        </span>
        <code className="clientes-importacao-cabecalho">{CABECALHO_IMPORTACAO}</code>
        <span className="clientes-form-ajuda">
          Grupo pelo nome (criado se não existir), representante pelo CPF ou CNPJ e as regras com sim ou nao. Nada é
          sobrescrito: documento já cadastrado rejeita a linha. Simule antes para ver o que seria rejeitado.
        </span>

        <div className="clientes-form-campo">
          <label className="filter-label" htmlFor="importacao-arquivo">
            Arquivo CSV *
          </label>
          <input
            id="importacao-arquivo"
            className="filter-input"
            type="file"
            accept=".csv,text/csv"
            onChange={escolher}
            disabled={enviando}
          />
        </div>

        {erro && (
          <div className="clientes-form-erro-api" role="alert">
            {erro}
          </div>
        )}

        {relatorio && (
          <div className="clientes-importacao-relatorio" role="status">
            {relatorio.simulacao && <strong>Simulação: nada foi gravado. </strong>}
            <span>{resumoDe(relatorio)}</span>
          </div>
        )}

        {relatorio &&
          (rejeitadas.length === 0 ? (
            <span className="clientes-form-ajuda">Nenhuma linha rejeitada.</span>
          ) : (
            <div className="datagrid-container clientes-importacao-rejeitadas">
              <table className="datagrid">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Documento</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {rejeitadas.map((item) => (
                    <tr key={`${item.linha}-${item.documento}`}>
                      <td>{item.linha}</td>
                      <td>{item.documento || '—'}</td>
                      <td className="clientes-importacao-motivo">{item.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </Modal>
  );
}
