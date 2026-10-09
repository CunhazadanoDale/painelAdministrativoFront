import React, { useRef, useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { AlertCircle, Trash2 } from 'lucide-react';
import { centavosParaTexto, formatarMoeda, paraCentavos } from '../../lib/formatar';
import * as arquivosService from '../../services/arquivos';
import { LIMITE_ARQUIVO } from './solicitacoesUtils';
import './Solicitacoes.css';

export function PagamentoModal({ solicitacao, onFechar, onConfirmar }) {
  const sequencia = useRef(0);
  const [valor, setValor] = useState(centavosParaTexto(solicitacao.valor_centavos));
  const [pagoEm, setPagoEm] = useState('');
  const [comprovante, setComprovante] = useState(null);
  const [erro, setErro] = useState(null);
  const [erroApi, setErroApi] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const selecionarComprovante = async (event) => {
    const arquivo = Array.from(event.target.files || [])[0];
    event.target.value = '';
    if (!arquivo) return;

    sequencia.current += 1;
    const chave = `comprovante-${sequencia.current}`;
    setComprovante({ chave, id: null, nome: arquivo.name, tamanho: arquivo.size, progresso: 0, erro: null });
    setErroApi(null);

    if (arquivo.type !== 'application/pdf') {
      setComprovante((atual) => ({ ...atual, erro: 'O comprovante deve ser um arquivo PDF.' }));
      return;
    }
    if (arquivo.size > LIMITE_ARQUIVO) {
      setComprovante((atual) => ({ ...atual, erro: 'arquivo excede o limite de 10MB' }));
      return;
    }

    try {
      const enviado = await arquivosService.enviarArquivo(arquivo, {
        aoProgresso: (progresso) =>
          setComprovante((atual) => (atual && atual.chave === chave ? { ...atual, progresso } : atual)),
      });
      setComprovante((atual) =>
        atual && atual.chave === chave
          ? {
              ...atual,
              id: enviado ? enviado.id : null,
              progresso: 100,
              erro: enviado && enviado.id ? null : 'Falha ao registrar o comprovante.',
            }
          : atual
      );
    } catch (e) {
      setComprovante((atual) =>
        atual && atual.chave === chave
          ? { ...atual, erro: (e && e.message) || 'Erro ao enviar o comprovante.' }
          : atual
      );
    }
  };

  const removerComprovante = async () => {
    setErroApi(null);
    if (comprovante && comprovante.id) {
      try {
        await arquivosService.removerArquivo(comprovante.id);
      } catch (e) {
        setErroApi((e && e.message) || 'Erro ao remover o comprovante.');
        return;
      }
    }
    setComprovante(null);
  };

  const enviar = async (event) => {
    event.preventDefault();
    const centavos = paraCentavos(valor);
    if (!valor.trim() || !Number.isFinite(centavos) || centavos <= 0) {
      setErro('Informe um valor maior que zero.');
      return;
    }
    if (comprovante && !comprovante.id && !comprovante.erro) {
      setErro('Aguarde a conclusão do envio do comprovante.');
      return;
    }
    if (comprovante && comprovante.erro) {
      setErro('Remova ou reenvie o comprovante com erro.');
      return;
    }

    setErro(null);
    setEnviando(true);
    setErroApi(null);
    try {
      const dados = { valor_centavos: centavos };
      if (comprovante && comprovante.id) dados.comprovante_arquivo_id = comprovante.id;
      if (pagoEm) dados.pago_em = new Date(pagoEm).toISOString();
      await onConfirmar(dados);
      onFechar();
    } catch (e) {
      setErroApi((e && e.message) || 'Erro ao registrar o pagamento.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo="Registrar pagamento"
      onFechar={enviando ? () => {} : onFechar}
      largura="520px"
      rodape={
        <>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={onFechar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="pagamento-form"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            disabled={enviando}
          >
            {enviando ? 'Registrando…' : 'Registrar'}
          </button>
        </>
      }
    >
      <form id="pagamento-form" className="solicitacoes-form" onSubmit={enviar} noValidate>
        {erroApi && <div className="solicitacoes-form-erro-api">{erroApi}</div>}

        <div className="solicitacoes-form-campo">
          <label className="filter-label" htmlFor="pagamento-valor">
            Valor pago *
          </label>
          <input
            id="pagamento-valor"
            className="filter-input"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(event) => setValor(event.target.value)}
            disabled={enviando}
            autoFocus
          />
          <span className="solicitacoes-form-dica">
            Estimado: {formatarMoeda(solicitacao.valor_centavos)}
          </span>
          {erro && <span className="solicitacoes-form-erro">{erro}</span>}
        </div>

        <div className="solicitacoes-form-campo">
          <label className="filter-label" htmlFor="pagamento-data">
            Data do pagamento
          </label>
          <input
            id="pagamento-data"
            className="filter-input"
            type="datetime-local"
            value={pagoEm}
            onChange={(event) => setPagoEm(event.target.value)}
            disabled={enviando}
          />
        </div>

        <div className="solicitacoes-form-campo solicitacoes-form-campo-full">
          <label className="filter-label" htmlFor="pagamento-comprovante">
            Comprovante (PDF — até 10MB)
          </label>
          <input
            id="pagamento-comprovante"
            className="filter-input"
            type="file"
            accept="application/pdf"
            onChange={selecionarComprovante}
            disabled={enviando || !!comprovante}
          />
          {comprovante && (
            <div className="solicitacoes-arquivo-item">
              <div className="solicitacoes-arquivo-info">
                <span className="solicitacoes-arquivo-nome" title={comprovante.nome}>
                  {comprovante.nome}
                </span>
                <span className="solicitacoes-arquivo-meta">
                  {!comprovante.erro && comprovante.progresso < 100
                    ? `— ${comprovante.progresso}%`
                    : ''}
                </span>
              </div>
              {!comprovante.erro && comprovante.progresso < 100 && (
                <div className="solicitacoes-progresso">
                  <div
                    className="solicitacoes-progresso-barra"
                    style={{ width: `${comprovante.progresso}%` }}
                  />
                </div>
              )}
              {comprovante.erro && (
                <span className="solicitacoes-arquivo-erro">
                  <AlertCircle size={12} /> {comprovante.erro}
                </span>
              )}
              <button
                type="button"
                className="leads-acao-btn leads-acao-perigo"
                title="Remover comprovante"
                disabled={enviando || (!comprovante.id && !comprovante.erro)}
                onClick={removerComprovante}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
