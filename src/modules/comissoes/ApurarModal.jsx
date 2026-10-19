import React, { useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import * as comissoesService from '../../services/comissoes';
import { mesAtualEmBrasilia } from './comissoesUtils';
import './Comissoes.css';

export function ApurarModal({ onConcluido, onFechar }) {
  const [empresa, setEmpresa] = useState('');
  const [competencia, setCompetencia] = useState('');

  const validar = () =>
    competencia && competencia > mesAtualEmBrasilia() ? 'A competência não pode ser posterior ao mês corrente.' : null;

  const apurar = async () => {
    const resposta = await comissoesService.apurarComissoes({ empresa_id: empresa, competencia });
    onConcluido(resposta?.dados ?? null);
  };

  return (
    <AcaoModal
      titulo="Apurar comissões"
      rotuloConfirmar="Apurar"
      validar={validar}
      onConfirmar={apurar}
      onFechar={onFechar}
      onRecarregar={onFechar}
    >
      <p className="comissoes-texto">
        Grava uma comissão para cada entrega que já saiu e ainda não foi apurada, pelo percentual do pedido. Rodar de
        novo é seguro: só apura o que falta, até 500 entregas por vez.
      </p>
      <div className="comissoes-form-linha">
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="apurar-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="apurar-empresa"
            className="filter-input"
            valor={empresa}
            onAlterar={setEmpresa}
            selecionarUnica={false}
            placeholder="Todas do acesso"
          />
        </div>
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="apurar-competencia">
            Competência até
          </label>
          <input
            id="apurar-competencia"
            className="filter-input"
            type="month"
            max={mesAtualEmBrasilia()}
            value={competencia}
            onChange={(evento) => setCompetencia(evento.target.value)}
          />
          <span className="comissoes-form-ajuda">Vazio: todas as saídas pendentes.</span>
        </div>
      </div>
    </AcaoModal>
  );
}
