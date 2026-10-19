import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../app/components/Modal';
import * as arquivosService from '../../services/arquivos';
import * as notasService from '../../services/notasFiscais';
import { numeroDaNota, rotuloAviso } from './notasUtils';
import './Notas.css';

const LIMITE_BYTES = 10 * 1024 * 1024;

function ehXml(arquivo) {
  return /\.xml$/i.test(arquivo.name) || /xml/.test(arquivo.type);
}

async function importarNota(arquivoId) {
  const resposta = await notasService.importarNota({ arquivo_id: arquivoId });
  const nota = resposta?.dados;
  return {
    notaId: nota.id,
    mensagem: `Nota ${numeroDaNota(nota)} importada.`,
    detalhes: [],
    avisos: nota.avisos ?? [],
  };
}

async function importarEvento(arquivoId) {
  const resposta = await notasService.importarEventoNota(arquivoId);
  const dados = resposta?.dados ?? {};
  const nota = dados.nota_fiscal;
  const cancelamento = dados.evento?.tipo === 'cancelamento';
  const cancelados = dados.titulos_cancelados?.length ?? 0;
  const marcados = dados.titulos_marcados?.length ?? 0;
  return {
    notaId: nota.id,
    mensagem: `${cancelamento ? 'Cancelamento' : 'Carta de correção'} registrad${cancelamento ? 'o' : 'a'} na nota ${numeroDaNota(nota)}.`,
    detalhes:
      cancelamento && (cancelados || marcados)
        ? [`${cancelados} título(s) cancelado(s) e ${marcados} marcado(s) para o financeiro resolver.`]
        : [],
    avisos: dados.avisos ?? [],
  };
}

const TIPOS = {
  nota: {
    titulo: 'Importar NF-e',
    rotulo: 'XML da nota *',
    ajuda:
      'O XML autorizado (nfeProc, com o protocolo da SEFAZ) de uma NF-e modelo 55 emitida por uma empresa do grupo. A empresa, o cliente e os produtos são achados pelo XML; o cliente que não existir é criado.',
    importar: importarNota,
  },
  evento: {
    titulo: 'Importar evento da NF-e',
    rotulo: 'XML do evento *',
    ajuda:
      'O XML do evento (procEventoNFe) de cancelamento ou de carta de correção de uma nota já importada. O cancelamento cancela os títulos ainda sem movimento.',
    importar: importarEvento,
  },
};

export function ImportarXmlModal({ tipo, onFechar, onImportado }) {
  const config = TIPOS[tipo];
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState(null);
  const [progresso, setProgresso] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const escolher = (evento) => {
    setArquivo((evento.target.files && evento.target.files[0]) || null);
    setErro(null);
    setResultado(null);
  };

  const importar = async () => {
    if (!arquivo) {
      setErro('Escolha o arquivo XML.');
      return;
    }
    if (!ehXml(arquivo)) {
      setErro('O arquivo precisa ser o XML da NF-e (.xml).');
      return;
    }
    if (arquivo.size > LIMITE_BYTES) {
      setErro('O XML tem mais de 10 MB.');
      return;
    }
    setErro(null);
    setResultado(null);
    setEnviando(true);
    let enviado = null;
    try {
      enviado = await notasService.enviarXml(arquivo, { aoProgresso: setProgresso });
      const novo = await config.importar(enviado.id);
      setResultado(novo);
      onImportado();
    } catch (e) {
      setErro(e.message || 'Erro ao importar o XML.');
      if (enviado) arquivosService.removerArquivo(enviado.id).catch(() => {});
    } finally {
      setEnviando(false);
      setProgresso(null);
    }
  };

  return (
    <Modal
      aberto
      titulo={config.titulo}
      onFechar={enviando ? () => {} : onFechar}
      largura="600px"
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
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={importar}
            disabled={enviando}
          >
            {enviando ? (progresso !== null && progresso < 100 ? `Enviando… ${progresso}%` : 'Importando…') : 'Importar'}
          </button>
        </>
      }
    >
      <div className="notas-form">
        <span className="notas-form-ajuda">{config.ajuda}</span>
        <div className="notas-form-campo">
          <label className="filter-label" htmlFor={`importar-${tipo}-arquivo`}>
            {config.rotulo}
          </label>
          <input
            id={`importar-${tipo}-arquivo`}
            className="filter-input"
            type="file"
            accept=".xml,application/xml,text/xml"
            onChange={escolher}
            disabled={enviando}
          />
        </div>

        {erro && (
          <div className="notas-form-erro-api" role="alert">
            {erro}
          </div>
        )}

        {resultado && (
          <div className="notas-importacao-resultado" role="status">
            <strong>{resultado.mensagem}</strong>
            {resultado.detalhes.map((detalhe) => (
              <span key={detalhe}>{detalhe}</span>
            ))}
            {resultado.avisos.length > 0 && (
              <ul className="notas-avisos">
                {resultado.avisos.map((aviso) => (
                  <li key={aviso}>{rotuloAviso(aviso)}</li>
                ))}
              </ul>
            )}
            <Link to={`/notas-fiscais/${resultado.notaId}`}>Abrir a nota</Link>
          </div>
        )}
      </div>
    </Modal>
  );
}
