import React, { useCallback, useEffect, useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { DataGrid } from '../../app/components/DataGrid';
import { Modal } from '../../app/components/Modal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarDataHora, formatarMoeda } from '../../lib/formatar';
import * as caixaService from '../../services/caixa';
import * as contasService from '../../services/contasBancarias';
import { Paginacao } from '../notas/Paginacao';
import { useConsulta } from '../pedidos/useConsulta';
import { formatarCompetencia } from '../solicitacoes/solicitacoesUtils';
import { nomeDaConta } from './caixaUtils';
import { FecharMesModal } from './FecharMesModal';
import { MovimentosSemLinha } from './MovimentosSemLinha';
import { AlertCircle, Lock } from 'lucide-react';
import './Caixa.css';

const FILTROS = { empresa: '', conta: '', competencia: '' };
const BOTAO_LINHA = { flex: 'none', width: 'auto', padding: '2px 10px' };
const LIMITE_MOTIVO = 500;

function DetalheFechamentoModal({ fechamento, onFechar }) {
  const [estado, setEstado] = useState({ detalhe: null, erro: null });
  const id = fechamento.id;

  useEffect(() => {
    const controle = new AbortController();
    caixaService
      .obterFechamentoCaixa(id, { sinal: controle.signal })
      .then((resposta) => {
        if (!controle.signal.aborted) setEstado({ detalhe: resposta?.dados ?? null, erro: null });
      })
      .catch((e) => {
        if (!controle.signal.aborted) setEstado({ detalhe: null, erro: e.message || 'Erro ao carregar o fechamento.' });
      });
    return () => controle.abort();
  }, [id]);

  const { detalhe, erro } = estado;

  return (
    <Modal
      aberto
      titulo={`Fechamento ${formatarCompetencia(fechamento.competencia)}`}
      onFechar={onFechar}
      largura="720px"
      rodape={
        <button type="button" className="filter-btn filter-btn-secondary" style={{ flex: 'none', padding: '8px 16px' }} onClick={onFechar}>
          Voltar
        </button>
      }
    >
      <div className="caixa-form">
        {erro && <span className="caixa-form-erro">{erro}</span>}
        {!detalhe && !erro && <span className="caixa-secundario">Carregando…</span>}
        {detalhe && (
          <>
            <span>
              Saldo inicial {formatarMoeda(detalhe.saldo_inicial_centavos)} · entradas {formatarMoeda(detalhe.entradas_centavos)}{' '}
              · saídas {formatarMoeda(detalhe.saidas_centavos)} · saldo final <strong>{formatarMoeda(detalhe.saldo_final_centavos)}</strong>
            </span>
            {!detalhe.vigente && (
              <span className="caixa-form-erro">
                Reaberto em {formatarDataHora(detalhe.reaberto_em)}: {detalhe.motivo_reabertura}
              </span>
            )}
            {detalhe.conciliacoes_invalidadas > 0 ? (
              <span className="caixa-negativo">{`${detalhe.conciliacoes_invalidadas} conciliação(ões) invalidada(s) depois do fechamento.`}</span>
            ) : (
              <span className="caixa-secundario">Nenhuma conciliação invalidada depois do fechamento.</span>
            )}
            {(detalhe.movimentos_sem_linha ?? []).length > 0 ? (
              <>
                <span className="filter-label">Movimentos do sistema sem linha no extrato</span>
                <MovimentosSemLinha movimentos={detalhe.movimentos_sem_linha} />
              </>
            ) : (
              <span className="caixa-secundario">Nenhum movimento do sistema sem linha no extrato.</span>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function ReabrirModal({ fechamento, onReaberto, onFechar }) {
  const [motivo, setMotivo] = useState('');

  const validar = () => {
    if (!motivo.trim()) return 'Informe o motivo da reabertura.';
    if (motivo.trim().length > LIMITE_MOTIVO) return `O motivo tem no máximo ${LIMITE_MOTIVO} caracteres.`;
    return null;
  };

  const reabrir = async () => {
    await caixaService.reabrirFechamentoCaixa(fechamento.id, motivo.trim());
    onReaberto();
  };

  return (
    <AcaoModal
      titulo={`Reabrir fechamento ${formatarCompetencia(fechamento.competencia)}`}
      rotuloConfirmar="Reabrir"
      validar={validar}
      onConfirmar={reabrir}
      onFechar={onFechar}
      onRecarregar={onReaberto}
    >
      <p className="caixa-texto">
        Só o último mês fechado da conta pode ser reaberto. O mês volta a aceitar conciliações e classificações; o
        registro do fechamento fica guardado como reaberto.
      </p>
      <div className="caixa-form-campo">
        <label className="filter-label" htmlFor="reabrir-motivo">
          Motivo *
        </label>
        <textarea
          id="reabrir-motivo"
          className="filter-input"
          rows={3}
          maxLength={LIMITE_MOTIVO}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}

export function FechamentosCaixa({ administrador }) {
  const { itens, pagina, filtros, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima, filtrar } =
    useConsulta(caixaService.listarFechamentosCaixa, FILTROS);
  const nomeConta = useNomesPorId(
    itens.map((fechamento) => fechamento.conta_bancaria_id),
    contasService.obterContaBancaria,
    nomeDaConta
  );
  const [acao, setAcao] = useState(null);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const concluir = () => {
    setAcao(null);
    recarregar();
  };

  const colunas = [
    { label: 'Competência', field: 'competencia', width: '10%', render: (competencia) => formatarCompetencia(competencia) },
    { label: 'Conta', field: 'conta_bancaria_id', width: '18%', render: (contaId) => nomeConta(contaId) },
    { label: 'Saldo inicial', field: 'saldo_inicial_centavos', width: '11%', render: (valor) => formatarMoeda(valor) },
    { label: 'Entradas', field: 'entradas_centavos', width: '10%', render: (valor) => formatarMoeda(valor) },
    { label: 'Saídas', field: 'saidas_centavos', width: '10%', render: (valor) => formatarMoeda(valor) },
    { label: 'Saldo final', field: 'saldo_final_centavos', width: '11%', render: (valor) => formatarMoeda(valor) },
    { label: 'Saldo do banco', field: 'saldo_banco_centavos', width: '11%', render: (valor) => formatarMoeda(valor) },
    {
      label: 'Situação',
      field: 'vigente',
      width: '9%',
      render: (vigente) => (vigente ? <StatusBadge status="success" label="Fechado" /> : <StatusBadge status="neutral" label="Reaberto" />),
    },
    {
      label: 'Ações',
      field: 'id',
      width: '170px',
      render: (_, fechamento) => (
        <span className="caixa-celula">
          <button type="button" className="filter-btn filter-btn-secondary" style={BOTAO_LINHA} onClick={() => setAcao({ tipo: 'detalhe', fechamento })}>
            Detalhe
          </button>
          {administrador && fechamento.vigente && (
            <button type="button" className="filter-btn caixa-perigo" style={BOTAO_LINHA} onClick={() => setAcao({ tipo: 'reabrir', fechamento })}>
              Reabrir
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="caixa-filtros-extras">
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="fechamentos-caixa-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="fechamentos-caixa-empresa"
            className="filter-input"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
        <div className="caixa-filtro-campo">
          <label className="filter-label" htmlFor="fechamentos-caixa-competencia">
            Competência
          </label>
          <input
            id="fechamentos-caixa-competencia"
            className="filter-input"
            type="month"
            value={filtros.competencia}
            onChange={(evento) => filtrar({ competencia: evento.target.value })}
          />
        </div>
        <button
          type="button"
          className="filter-btn filter-btn-primary"
          style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={() => setAcao({ tipo: 'fechar' })}
        >
          <Lock size={14} /> Fechar mês
        </button>
      </div>

      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="caixa-conteudo">
        {carregando ? (
          <div className="caixa-status">Carregando fechamentos…</div>
        ) : itens.length > 0 ? (
          <>
            <DataGrid columns={colunas} data={itens} selectable={false} />
            <Paginacao pagina={pagina} temProxima={temProxima} irParaAnterior={irParaAnterior} irParaProxima={irParaProxima} />
          </>
        ) : erro ? null : (
          <div className="caixa-status">Nenhum mês fechado.</div>
        )}
      </div>

      {acao?.tipo === 'fechar' && <FecharMesModal onFechado={concluir} onFechar={() => setAcao(null)} />}
      {acao?.tipo === 'detalhe' && <DetalheFechamentoModal fechamento={acao.fechamento} onFechar={() => setAcao(null)} />}
      {acao?.tipo === 'reabrir' && <ReabrirModal fechamento={acao.fechamento} onReaberto={concluir} onFechar={() => setAcao(null)} />}
    </>
  );
}
