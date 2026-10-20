import React, { useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { formatarData } from '../../lib/formatar';
import { LIMITES, dataParaCampo, hojeEmBrasilia } from './importacoesUtils';

function CampoData({ id, rotulo, valor, onAlterar, max }) {
  return (
    <div className="importacoes-form-campo">
      <label className="filter-label" htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        className="filter-input"
        type="date"
        max={max}
        value={valor}
        onChange={(evento) => onAlterar(evento.target.value)}
      />
    </div>
  );
}

export function EmbarcarModal({ importacao, onConfirmar, onFechar, onRecarregar }) {
  const hoje = hojeEmBrasilia();
  const [embarcadaEm, setEmbarcadaEm] = useState(hoje);
  const [chegada, setChegada] = useState(dataParaCampo(importacao.chegada_prevista));
  const [documento, setDocumento] = useState('');

  const validar = () => {
    const erros = [];
    if (!embarcadaEm) erros.push('Informe a data do embarque.');
    else if (embarcadaEm > hoje) erros.push('O embarque não pode estar no futuro.');
    if (!chegada) erros.push('Informe a chegada prevista.');
    else if (embarcadaEm && chegada < embarcadaEm) erros.push('A chegada prevista não pode ser antes do embarque.');
    if (documento.trim().length > LIMITES.documento_embarque) {
      erros.push(`O documento de embarque tem no máximo ${LIMITES.documento_embarque} caracteres.`);
    }
    return erros;
  };

  return (
    <AcaoModal
      titulo={`Embarcar importação ${importacao.numero}`}
      rotuloConfirmar="Registrar embarque"
      validar={validar}
      onConfirmar={() =>
        onConfirmar({
          embarcada_em: embarcadaEm,
          chegada_prevista: chegada,
          documento_embarque: documento.trim() || null,
        })
      }
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="importacoes-texto">
        A chegada prevista alimenta os alertas de prazo dos pedidos alocados (prazo de 120 dias contados da entrada).
      </p>
      <div className="importacoes-form-linha">
        <CampoData id="embarque-data" rotulo="Embarcada em *" valor={embarcadaEm} onAlterar={setEmbarcadaEm} max={hoje} />
        <CampoData id="embarque-chegada" rotulo="Chegada prevista *" valor={chegada} onAlterar={setChegada} />
      </div>
      <div className="importacoes-form-campo">
        <label className="filter-label" htmlFor="embarque-documento">
          Documento de embarque (BL / AWB)
        </label>
        <input
          id="embarque-documento"
          className="filter-input"
          type="text"
          value={documento}
          maxLength={LIMITES.documento_embarque}
          onChange={(evento) => setDocumento(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}

export function DesembaracarModal({ importacao, onConfirmar, onFechar, onRecarregar }) {
  const hoje = hojeEmBrasilia();
  const embarcadaEm = dataParaCampo(importacao.embarcada_em);
  const [chegadaEm, setChegadaEm] = useState(hoje);
  const [desembaracadaEm, setDesembaracadaEm] = useState(hoje);
  const [declaracao, setDeclaracao] = useState('');

  const validar = () => {
    const erros = [];
    if (!chegadaEm) erros.push('Informe a data da chegada.');
    else if (chegadaEm > hoje) erros.push('A chegada não pode estar no futuro.');
    else if (embarcadaEm && chegadaEm < embarcadaEm) {
      erros.push(`A chegada não pode ser antes do embarque (${formatarData(importacao.embarcada_em)}).`);
    }
    if (!desembaracadaEm) erros.push('Informe a data do desembaraço.');
    else if (desembaracadaEm > hoje) erros.push('O desembaraço não pode estar no futuro.');
    else if (chegadaEm && desembaracadaEm < chegadaEm) erros.push('O desembaraço não pode ser antes da chegada.');
    if (!declaracao.trim()) erros.push('Informe o número da DI ou DUIMP.');
    else if (declaracao.trim().length > LIMITES.declaracao) {
      erros.push(`A declaração tem no máximo ${LIMITES.declaracao} caracteres.`);
    }
    return erros;
  };

  return (
    <AcaoModal
      titulo={`Desembaraçar importação ${importacao.numero}`}
      rotuloConfirmar="Registrar desembaraço"
      validar={validar}
      onConfirmar={() =>
        onConfirmar({ chegada_em: chegadaEm, desembaracada_em: desembaracadaEm, declaracao: declaracao.trim() })
      }
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <div className="importacoes-form-linha">
        <CampoData id="desembaraco-chegada" rotulo="Chegou em *" valor={chegadaEm} onAlterar={setChegadaEm} max={hoje} />
        <CampoData
          id="desembaraco-data"
          rotulo="Desembaraçada em *"
          valor={desembaracadaEm}
          onAlterar={setDesembaracadaEm}
          max={hoje}
        />
      </div>
      <div className="importacoes-form-campo">
        <label className="filter-label" htmlFor="desembaraco-declaracao">
          DI / DUIMP *
        </label>
        <input
          id="desembaraco-declaracao"
          className="filter-input"
          type="text"
          value={declaracao}
          maxLength={LIMITES.declaracao}
          onChange={(evento) => setDeclaracao(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}

export function CancelarImportacaoModal({ importacao, onConfirmar, onFechar, onRecarregar }) {
  const [motivo, setMotivo] = useState('');

  const validar = () => {
    if (!motivo.trim()) return 'Informe o motivo do cancelamento.';
    if (motivo.trim().length > LIMITES.motivo) return `O motivo tem no máximo ${LIMITES.motivo} caracteres.`;
    return null;
  };

  return (
    <AcaoModal
      titulo={`Cancelar importação ${importacao.numero}`}
      rotuloConfirmar="Cancelar a importação"
      validar={validar}
      onConfirmar={() => onConfirmar(motivo.trim())}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="importacoes-texto">
        Cancelar solta as alocações de pedidos. As contas a pagar já geradas (parcelas com câmbio fechado e custos)
        precisam estar canceladas ou rejeitadas em Solicitações antes.
      </p>
      <div className="importacoes-form-campo">
        <label className="filter-label" htmlFor="cancelar-importacao-motivo">
          Motivo *
        </label>
        <textarea
          id="cancelar-importacao-motivo"
          className="filter-input"
          rows={3}
          value={motivo}
          maxLength={LIMITES.motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}
