import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Modal } from './Modal';
import './DataGrid.css';
import './ImportacaoCsvModal.css';

const LIMITE_BYTES = 5 * 1024 * 1024;

function resumoDe(relatorio) {
  if (relatorio.simulacao) return `${relatorio.importadas} de ${relatorio.total} linhas seriam importadas.`;
  return `${relatorio.importadas} de ${relatorio.total} linhas importadas.`;
}

function chavePadrao(item) {
  return item.chave;
}

export function ImportacaoCsvModal({
  titulo,
  cabecalho,
  ajuda,
  rotuloChave = 'Chave',
  chaveDe = chavePadrao,
  importar,
  baixarModelo,
  podeEnviar = true,
  avisoSemEnvio,
  children,
  onFechar,
  onImportado,
}) {
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState(null);
  const [relatorio, setRelatorio] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  const escolher = (evento) => {
    setArquivo((evento.target.files && evento.target.files[0]) || null);
    setRelatorio(null);
    setErro(null);
  };

  const enviar = async (simular) => {
    if (!podeEnviar) {
      setErro(avisoSemEnvio);
      return;
    }
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
      const resposta = await importar(arquivo, { simular });
      const dados = resposta?.dados ?? null;
      setRelatorio(dados);
      if (!simular && dados) onImportado();
    } catch (e) {
      setErro(e.message || 'Erro ao importar o arquivo.');
    } finally {
      setEnviando(false);
    }
  };

  const baixar = async () => {
    setErro(null);
    setBaixando(true);
    try {
      await baixarModelo();
    } catch (e) {
      setErro(e.message || 'Erro ao baixar o modelo.');
    } finally {
      setBaixando(false);
    }
  };

  const rejeitadas = relatorio?.rejeitadas ?? [];

  return (
    <Modal
      aberto
      titulo={titulo}
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
      <div className="importacao-csv">
        <span className="importacao-csv-ajuda">
          CSV separado por ponto e vírgula (o “CSV” do Excel em português serve), até 5 MB e 5.000 linhas, com este
          cabeçalho na primeira linha:
        </span>
        <code className="importacao-csv-cabecalho">{cabecalho}</code>
        {ajuda && <span className="importacao-csv-ajuda">{ajuda}</span>}
        {baixarModelo && (
          <button
            type="button"
            className="filter-btn filter-btn-secondary importacao-csv-modelo"
            onClick={baixar}
            disabled={baixando || enviando}
          >
            <Download size={16} /> {baixando ? 'Baixando…' : 'Baixar modelo'}
          </button>
        )}

        {children}

        <div className="importacao-csv-campo">
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
          <div className="importacao-csv-erro" role="alert">
            {erro}
          </div>
        )}

        {relatorio && (
          <div className="importacao-csv-relatorio" role="status">
            {relatorio.simulacao && <strong>Simulação: nada foi gravado. </strong>}
            <span>{resumoDe(relatorio)}</span>
          </div>
        )}

        {relatorio &&
          (rejeitadas.length === 0 ? (
            <span className="importacao-csv-ajuda">Nenhuma linha rejeitada.</span>
          ) : (
            <div className="datagrid-container importacao-csv-rejeitadas">
              <table className="datagrid">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>{rotuloChave}</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {rejeitadas.map((item) => (
                    <tr key={`${item.linha}-${chaveDe(item)}`}>
                      <td>{item.linha}</td>
                      <td>{chaveDe(item) || '—'}</td>
                      <td className="importacao-csv-motivo">{item.motivo}</td>
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
