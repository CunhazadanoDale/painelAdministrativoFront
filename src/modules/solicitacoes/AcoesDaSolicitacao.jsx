import React, { useCallback, useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { formatarData } from '../../lib/formatar';
import * as fornecedoresService from '../../services/fornecedores';
import { SeletorCategoriaDespesa } from '../financeiro/SeletorCategoriaDespesa';
import { hojeISO } from './solicitacoesUtils';

const LIMITE_MOTIVO = 500;

const buscarFornecedores = (texto, sinal) =>
  fornecedoresService
    .listarFornecedores({ busca: texto, ativo: 'true', tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const opcaoDeFornecedor = (fornecedor) => ({ valor: fornecedor.id, rotulo: fornecedor.nome });

export function ClassificarModal({ solicitacao, nomeFornecedor, onConfirmar, onFechar, onRecarregar }) {
  const [fornecedorId, setFornecedorId] = useState(solicitacao.fornecedor_id ?? '');
  const [categoriaId, setCategoriaId] = useState(solicitacao.categoria_financeira_id ?? '');
  const [competencia, setCompetencia] = useState(solicitacao.competencia ?? '');
  const competenciaFixa = solicitacao.origem && solicitacao.origem !== 'manual';
  const alterarCategoria = useCallback((valor) => setCategoriaId(valor), []);

  const validar = () => {
    const erros = [];
    if (!categoriaId) erros.push('Escolha a categoria financeira.');
    if (!competencia) erros.push('Informe a competência.');
    return erros;
  };

  return (
    <AcaoModal
      titulo="Classificar a conta a pagar"
      rotuloConfirmar="Classificar"
      largura="560px"
      validar={validar}
      onConfirmar={() =>
        onConfirmar({ fornecedor_id: fornecedorId || null, categoria_financeira_id: categoriaId, competencia })
      }
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="acao-modal-texto">
        Sem categoria a solicitação não pode ser paga. A classificação substitui a anterior inteira.
      </p>
      <div className="acao-modal-campo">
        <label className="filter-label" htmlFor="classificar-fornecedor">
          Fornecedor
        </label>
        <BuscaRemota
          id="classificar-fornecedor"
          nomeBusca="fornecedor da classificação"
          valor={fornecedorId}
          rotuloAtual={nomeFornecedor(fornecedorId)}
          buscar={buscarFornecedores}
          opcaoDe={opcaoDeFornecedor}
          onEscolher={(fornecedor) => setFornecedorId(fornecedor ? fornecedor.id : '')}
          placeholderBusca="Nome ou documento"
        />
      </div>
      <div className="acao-modal-campo">
        <label className="filter-label" htmlFor="classificar-categoria">
          Categoria financeira *
        </label>
        <SeletorCategoriaDespesa id="classificar-categoria" valor={categoriaId} onAlterar={alterarCategoria} />
      </div>
      <div className="acao-modal-campo">
        <label className="filter-label" htmlFor="classificar-competencia">
          Competência *
        </label>
        <input
          id="classificar-competencia"
          className="filter-input"
          type="month"
          value={competencia}
          onChange={(evento) => setCompetencia(evento.target.value)}
          disabled={competenciaFixa}
        />
        {competenciaFixa && (
          <span className="acao-modal-texto">A competência de solicitação gerada automaticamente não muda.</span>
        )}
      </div>
    </AcaoModal>
  );
}

export function AdiarModal({ solicitacao, onConfirmar, onFechar, onRecarregar }) {
  const atual = String(solicitacao.prazo_pagamento).slice(0, 10);
  const [vencimento, setVencimento] = useState('');
  const [motivo, setMotivo] = useState('');

  const validar = () => {
    const erros = [];
    if (!vencimento) erros.push('Informe o novo vencimento.');
    else if (vencimento <= atual) erros.push(`O novo vencimento deve ser depois de ${formatarData(solicitacao.prazo_pagamento)}.`);
    else if (vencimento < hojeISO()) erros.push('O novo vencimento não pode ser antes de hoje.');
    if (!motivo.trim()) erros.push('Informe o motivo do adiamento.');
    else if (motivo.trim().length > LIMITE_MOTIVO) erros.push(`O motivo tem no máximo ${LIMITE_MOTIVO} caracteres.`);
    return erros;
  };

  return (
    <AcaoModal
      titulo="Adiar o vencimento"
      rotuloConfirmar="Adiar"
      validar={validar}
      onConfirmar={() => onConfirmar({ vencimento, motivo: motivo.trim() })}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="acao-modal-texto">
        Vencimento atual: {formatarData(solicitacao.prazo_pagamento)}. A competência e o status não mudam.
      </p>
      <div className="acao-modal-campo">
        <label className="filter-label" htmlFor="adiar-vencimento">
          Novo vencimento *
        </label>
        <input
          id="adiar-vencimento"
          className="filter-input"
          type="date"
          value={vencimento}
          onChange={(evento) => setVencimento(evento.target.value)}
        />
      </div>
      <div className="acao-modal-campo">
        <label className="filter-label" htmlFor="adiar-motivo">
          Motivo *
        </label>
        <textarea
          id="adiar-motivo"
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

export function EstornoModal({ pagamento, onConfirmar, onFechar, onRecarregar }) {
  const [motivo, setMotivo] = useState('');
  const [data, setData] = useState('');

  const validar = () => {
    const erros = [];
    if (!motivo.trim()) erros.push('Informe o motivo do estorno.');
    else if (motivo.trim().length > LIMITE_MOTIVO) erros.push(`O motivo tem no máximo ${LIMITE_MOTIVO} caracteres.`);
    if (data) {
      const instante = new Date(data);
      if (instante > new Date()) erros.push('A data do estorno não pode estar no futuro.');
      else if (pagamento && instante < new Date(pagamento.pago_em)) erros.push('A data do estorno não pode ser antes do pagamento.');
    }
    return erros;
  };

  return (
    <AcaoModal
      titulo="Estornar pagamento"
      rotuloConfirmar="Estornar"
      validar={validar}
      onConfirmar={() =>
        onConfirmar(data ? { motivo: motivo.trim(), estornado_em: new Date(data).toISOString() } : { motivo: motivo.trim() })
      }
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="acao-modal-texto">
        O pagamento continua registrado, marcado como estornado, e a solicitação volta para aprovada: pode ser paga de
        novo ou cancelada.
      </p>
      <div className="acao-modal-campo">
        <label className="filter-label" htmlFor="estorno-motivo">
          Motivo *
        </label>
        <textarea
          id="estorno-motivo"
          className="filter-input"
          rows={3}
          maxLength={LIMITE_MOTIVO}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
      <div className="acao-modal-campo">
        <label className="filter-label" htmlFor="estorno-data">
          Data do estorno
        </label>
        <input
          id="estorno-data"
          className="filter-input"
          type="datetime-local"
          value={data}
          onChange={(evento) => setData(evento.target.value)}
        />
        <span className="acao-modal-texto">Vazia: agora.</span>
      </div>
    </AcaoModal>
  );
}
