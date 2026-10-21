import React, { useCallback, useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import * as dividasService from '../../services/dividas';
import { mesAtualEmBrasilia } from './dividasUtils';
import './Dividas.css';

const descricaoDaDivida = (divida) => divida?.descricao;

function plural(quantidade, singular, varios) {
  return `${quantidade} ${quantidade === 1 ? singular : varios}`;
}

function textoDaGeracao(item) {
  return `${plural(item.contas, 'conta', 'contas')} de ${plural(item.parcelas, 'parcela', 'parcelas')}`;
}

export function GerarContasModal({ onGerar, onFechar }) {
  const [competencia, setCompetencia] = useState(mesAtualEmBrasilia);
  const [empresa, setEmpresa] = useState('');
  const [relatorio, setRelatorio] = useState(null);
  const [erro, setErro] = useState(null);
  const [gerando, setGerando] = useState(false);
  const alterarEmpresa = useCallback((valor) => setEmpresa(valor), []);

  const geradas = relatorio?.geradas ?? [];
  const recusadas = relatorio?.recusadas ?? [];
  const descricao = useNomesPorId(
    [...geradas, ...recusadas].map((item) => item.divida_id),
    dividasService.obterDivida,
    descricaoDaDivida
  );

  const gerar = async () => {
    setErro(null);
    setRelatorio(null);
    setGerando(true);
    try {
      setRelatorio(await onGerar({ competencia, empresa }));
    } catch (e) {
      setErro(e.message || 'Erro ao gerar as contas da competência.');
    } finally {
      setGerando(false);
    }
  };

  const totalContas = geradas.reduce((soma, item) => soma + item.contas, 0);
  const totalParcelas = geradas.reduce((soma, item) => soma + item.parcelas, 0);

  return (
    <Modal
      aberto
      titulo="Gerar as contas das dívidas"
      onFechar={gerando ? () => {} : onFechar}
      largura="560px"
      rodape={
        <>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={onFechar}
            disabled={gerando}
          >
            Fechar
          </button>
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={gerar}
            disabled={gerando}
          >
            {gerando ? 'Gerando…' : 'Gerar'}
          </button>
        </>
      }
    >
      <div className="dividas-form">
        <p className="dividas-texto">
          Gera as contas a pagar (amortização e juros) das parcelas previstas que vencem até o fim da competência, também
          as de meses anteriores que ficaram para trás. Nascem pendentes de aprovação; rodar de novo não duplica.
        </p>
        {erro && (
          <div className="dividas-form-erro-api" role="alert">
            {erro}
          </div>
        )}
        <div className="dividas-form-linha">
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="gerar-dividas-competencia">
              Competência *
            </label>
            <input
              id="gerar-dividas-competencia"
              className="filter-input"
              type="month"
              value={competencia}
              onChange={(evento) => setCompetencia(evento.target.value)}
              disabled={gerando}
            />
          </div>
          <div className="dividas-form-campo">
            <label className="filter-label" htmlFor="gerar-dividas-empresa">
              Empresa
            </label>
            <SeletorEmpresa
              id="gerar-dividas-empresa"
              className="filter-input"
              valor={empresa}
              onAlterar={alterarEmpresa}
              selecionarUnica={false}
              placeholder="Todas do meu acesso"
              disabled={gerando}
            />
          </div>
        </div>

        {relatorio && (
          <div className="dividas-relatorio" role="status">
            <strong>
              {geradas.length === 0
                ? 'Nenhuma parcela prevista a gerar até esta competência.'
                : `${plural(geradas.length, 'dívida com contas geradas', 'dívidas com contas geradas')}: ${plural(
                    totalContas,
                    'conta',
                    'contas'
                  )} de ${plural(totalParcelas, 'parcela', 'parcelas')}.`}
            </strong>
            {geradas.length > 0 && (
              <ul>
                {geradas.map((item) => (
                  <li key={item.divida_id}>{`${descricao(item.divida_id)}: ${textoDaGeracao(item)}`}</li>
                ))}
              </ul>
            )}
            {recusadas.length > 0 && (
              <>
                <span>Não geradas:</span>
                <ul>
                  {recusadas.map((item) => (
                    <li key={item.divida_id}>{`${descricao(item.divida_id)}: ${item.motivo}`}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
