import React, { useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import * as comissoesService from '../../services/comissoes';
import { SeletorCategoriaDespesa } from '../financeiro/SeletorCategoriaDespesa';
import { carregarRepresentantes, mesAnterior, mesAtualEmBrasilia, opcaoDeRepresentante } from './comissoesUtils';
import './Comissoes.css';

export function FecharModal({ onConcluido, onFechar }) {
  const mesAtual = mesAtualEmBrasilia();
  const [empresa, setEmpresa] = useState('');
  const [competencia, setCompetencia] = useState(mesAnterior(mesAtual));
  const [categoria, setCategoria] = useState('');
  const [representante, setRepresentante] = useState('');

  const validar = () => {
    const erros = [];
    if (!empresa) erros.push('Selecione a empresa.');
    if (!competencia) erros.push('Informe a competência.');
    else if (competencia >= mesAtual) erros.push('Só fecha competência de mês já encerrado.');
    if (!categoria) erros.push('Escolha a categoria de despesa da conta a pagar.');
    return erros;
  };

  const fechar = async () => {
    const resposta = await comissoesService.fecharComissoes({
      empresa_id: empresa,
      competencia,
      categoria_financeira_id: categoria,
      representante_id: representante || null,
    });
    onConcluido(resposta?.dados ?? null);
  };

  return (
    <AcaoModal
      titulo="Fechar competência de comissões"
      rotuloConfirmar="Fechar competência"
      validar={validar}
      onConfirmar={fechar}
      onFechar={onFechar}
      onRecarregar={onFechar}
      largura="600px"
    >
      <p className="comissoes-texto">
        Apura antes as saídas pendentes da empresa e gera um fechamento por representante com as comissões e os ajustes
        em aberto até a competência, cada um com a conta a pagar ao fornecedor do representante, vencendo no dia 15 do
        mês seguinte. O fechamento não é desfeito: correção depois vira ajuste.
      </p>
      <div className="comissoes-form-linha">
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="fechar-empresa">
            Empresa *
          </label>
          <SeletorEmpresa id="fechar-empresa" className="filter-input" valor={empresa} onAlterar={setEmpresa} />
        </div>
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="fechar-competencia">
            Competência *
          </label>
          <input
            id="fechar-competencia"
            className="filter-input"
            type="month"
            max={mesAnterior(mesAtual)}
            value={competencia}
            onChange={(evento) => setCompetencia(evento.target.value)}
          />
        </div>
      </div>
      <div className="comissoes-form-linha">
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="fechar-categoria">
            Categoria da conta a pagar *
          </label>
          <SeletorCategoriaDespesa
            id="fechar-categoria"
            valor={categoria}
            onAlterar={setCategoria}
            placeholder="Selecione…"
          />
        </div>
        <div className="comissoes-form-campo">
          <label className="filter-label" htmlFor="fechar-representante">
            Representante
          </label>
          <SeletorRemoto
            id="fechar-representante"
            className="filter-select"
            valor={representante}
            onAlterar={setRepresentante}
            carregar={carregarRepresentantes}
            opcaoDe={opcaoDeRepresentante}
            placeholder="Todos com saldo"
            textoVazio="Nenhum representante"
            textoErro="Erro ao carregar os representantes."
            selecionarUnica={false}
          />
        </div>
      </div>
    </AcaoModal>
  );
}
