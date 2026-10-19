import React, { useCallback, useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as arquivosService from '../../services/arquivos';
import * as caixaService from '../../services/caixa';
import * as contasService from '../../services/contasBancarias';
import { opcaoDeConta, rotuloMotivoIgnorada } from './caixaUtils';
import '../../app/components/DataGrid.css';
import './Caixa.css';

const LIMITE_BYTES = 5 * 1024 * 1024;

const carregarContas = (sinal) => contasService.listarTodasContasBancarias({ ativa: true, sinal });

function Relatorio({ relatorio }) {
  const ignoradas = relatorio.ignoradas ?? [];
  return (
    <div className="caixa-resultado" role="status">
      <strong>{relatorio.simulacao ? 'Simulação: nada foi gravado.' : 'Extrato importado.'}</strong>
      <span>
        Período de {formatarData(relatorio.periodo_inicio)} a {formatarData(relatorio.periodo_fim)}
        {relatorio.saldo_banco_centavos !== null && relatorio.saldo_banco_centavos !== undefined
          ? ` · saldo do banco ${formatarMoeda(relatorio.saldo_banco_centavos)} em ${formatarData(relatorio.saldo_banco_em)}`
          : ''}
        .
      </span>
      <span>{`${relatorio.total} linha(s): ${relatorio.novas} nova(s), ${relatorio.repetidas} repetida(s), ${ignoradas.length} ignorada(s).`}</span>
      {ignoradas.length > 0 && (
        <div className="datagrid-container">
          <table className="datagrid" aria-label="Linhas ignoradas">
            <thead>
              <tr>
                <th>Data</th>
                <th>Valor</th>
                <th>Descrição</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {ignoradas.map((linha) => (
                <tr key={linha.sequencia}>
                  <td>{formatarData(linha.data)}</td>
                  <td>{formatarMoeda(linha.valor_centavos)}</td>
                  <td>{linha.descricao}</td>
                  <td>{rotuloMotivoIgnorada(linha.motivo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ImportarExtratoModal({ onImportado, onFechar }) {
  const [arquivo, setArquivo] = useState(null);
  const [arquivoEnviado, setArquivoEnviado] = useState(null);
  const [contaId, setContaId] = useState('');
  const [relatorio, setRelatorio] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const alterarConta = useCallback((valor) => setContaId(valor), []);

  const escolher = (evento) => {
    setArquivo((evento.target.files && evento.target.files[0]) || null);
    setArquivoEnviado(null);
    setRelatorio(null);
    setErro(null);
  };

  const importar = async (simular) => {
    if (!arquivo) {
      setErro('Escolha o arquivo OFX.');
      return;
    }
    if (!/\.ofx$/i.test(arquivo.name)) {
      setErro('O arquivo precisa ser um extrato OFX (.ofx).');
      return;
    }
    if (arquivo.size > LIMITE_BYTES) {
      setErro('O extrato tem mais de 5 MB.');
      return;
    }
    setErro(null);
    setRelatorio(null);
    setEnviando(true);
    let enviadoAgora = null;
    try {
      let arquivoId = arquivoEnviado;
      if (!arquivoId) {
        enviadoAgora = await caixaService.enviarOfx(arquivo, {});
        arquivoId = enviadoAgora.id;
        setArquivoEnviado(arquivoId);
      }
      const resposta = await caixaService.importarExtrato({
        arquivo_id: arquivoId,
        conta_bancaria_id: contaId || null,
        simular,
      });
      setRelatorio(resposta?.dados ?? null);
      if (!simular) {
        setArquivoEnviado(null);
        onImportado();
      }
    } catch (e) {
      setErro(e.message || 'Erro ao importar o extrato.');
      const descartar = enviadoAgora?.id ?? arquivoEnviado;
      if (descartar) {
        setArquivoEnviado(null);
        arquivosService.removerArquivo(descartar).catch(() => {});
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo="Importar extrato OFX"
      onFechar={enviando ? () => {} : onFechar}
      largura="720px"
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
            onClick={() => importar(true)}
            disabled={enviando}
          >
            Simular
          </button>
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={() => importar(false)}
            disabled={enviando}
          >
            {enviando ? 'Enviando…' : 'Importar'}
          </button>
        </>
      }
    >
      <div className="caixa-form">
        <span className="caixa-form-ajuda">
          Exporte o extrato do banco em OFX. A conta é achada pelo banco, agência e número do arquivo; escolha a conta só
          se o arquivo não a identificar. Linhas já importadas são contadas como repetidas e não entram de novo. Simule
          antes para conferir.
        </span>
        <div className="caixa-form-linha">
          <div className="caixa-form-campo">
            <label className="filter-label" htmlFor="importar-ofx-arquivo">
              Arquivo OFX *
            </label>
            <input
              id="importar-ofx-arquivo"
              className="filter-input"
              type="file"
              accept=".ofx"
              onChange={escolher}
              disabled={enviando}
            />
          </div>
          <div className="caixa-form-campo">
            <label className="filter-label" htmlFor="importar-ofx-conta">
              Conta
            </label>
            <SeletorRemoto
              id="importar-ofx-conta"
              className="filter-select"
              valor={contaId}
              onAlterar={alterarConta}
              carregar={carregarContas}
              opcaoDe={opcaoDeConta}
              placeholder="Identificar pelo arquivo"
              textoVazio="Nenhuma conta ativa"
              textoErro="Erro ao carregar as contas bancárias."
              selecionarUnica={false}
              disabled={enviando}
            />
          </div>
        </div>

        {erro && (
          <div className="caixa-form-erro-api" role="alert">
            {erro}
          </div>
        )}
        {relatorio && <Relatorio relatorio={relatorio} />}
      </div>
    </Modal>
  );
}
