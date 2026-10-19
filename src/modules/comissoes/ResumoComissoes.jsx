import React, { useCallback, useState } from 'react';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { formatarMoeda } from '../../lib/formatar';
import { carregarRepresentantes, mesAtualEmBrasilia, opcaoDeRepresentante } from './comissoesUtils';
import { Valor } from './ContaAPagar';
import { useResumoComissoes } from './useResumoComissoes';
import { AlertCircle } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Comissoes.css';

export function ResumoComissoes({ financeiro }) {
  const nomeEmpresa = useNomesEmpresas();
  const { resumo, filtros, carregando, erro, recarregar, filtrar } = useResumoComissoes(mesAtualEmBrasilia());
  const [competencia, setCompetencia] = useState(filtros.competencia);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  const filtrarRepresentante = useCallback((representante) => filtrar({ representante }), [filtrar]);

  const alterarCompetencia = (evento) => {
    const valor = evento.target.value;
    setCompetencia(valor);
    if (valor) filtrar({ competencia: valor });
  };

  const linhas = resumo?.linhas ?? [];

  return (
    <>
      <div className="comissoes-filtros-extras">
        <div className="comissoes-filtro-campo">
          <label className="filter-label" htmlFor="resumo-comissoes-competencia">
            Competência *
          </label>
          <input
            id="resumo-comissoes-competencia"
            className="filter-input"
            type="month"
            value={competencia}
            onChange={alterarCompetencia}
            aria-invalid={!competencia || undefined}
          />
        </div>
        <div className="comissoes-filtro-campo">
          <label className="filter-label" htmlFor="resumo-comissoes-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="resumo-comissoes-empresa"
            className="filter-input"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
        {financeiro && (
          <div className="comissoes-filtro-campo">
            <label className="filter-label" htmlFor="resumo-comissoes-representante">
              Representante
            </label>
            <SeletorRemoto
              id="resumo-comissoes-representante"
              className="filter-select"
              valor={filtros.representante}
              onAlterar={filtrarRepresentante}
              carregar={carregarRepresentantes}
              opcaoDe={opcaoDeRepresentante}
              placeholder="Todos"
              textoVazio="Nenhum representante"
              textoErro="Erro ao carregar os representantes."
              selecionarUnica={false}
            />
          </div>
        )}
        {!competencia && <span className="comissoes-form-erro">Informe a competência do resumo.</span>}
      </div>
      <span className="comissoes-form-ajuda">
        Comissões pela data da saída e ajustes pela competência informada neles. Em aberto ainda não entrou em
        fechamento; pago é a parte fechada cuja conta a pagar já foi paga.
      </span>

      {erro ? (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      ) : carregando && !resumo ? (
        <div className="comissoes-status">Carregando resumo…</div>
      ) : linhas.length === 0 ? (
        <div className="comissoes-status">Nenhuma comissão nem ajuste na competência.</div>
      ) : (
        <>
          <div className="datagrid-container">
            <table className="datagrid" aria-label="Resumo de comissões">
              <thead>
                <tr>
                  <th>Representante</th>
                  <th>Empresa</th>
                  <th>Comissões</th>
                  <th>Ajustes</th>
                  <th>Total</th>
                  <th>Em aberto</th>
                  <th>Fechado</th>
                  <th>Pago</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <tr key={`${linha.empresa_id}-${linha.representante_id}`}>
                    <td>{linha.representante_nome}</td>
                    <td>{nomeEmpresa(linha.empresa_id)}</td>
                    <td>{formatarMoeda(linha.comissoes_centavos)}</td>
                    <td>
                      <Valor centavos={linha.ajustes_centavos} />
                    </td>
                    <td>
                      <strong>
                        <Valor centavos={linha.total_centavos} />
                      </strong>
                    </td>
                    <td>{formatarMoeda(linha.em_aberto_centavos)}</td>
                    <td>{formatarMoeda(linha.fechado_centavos)}</td>
                    <td>{formatarMoeda(linha.pago_centavos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <strong className="comissoes-total">{`Total da competência: ${formatarMoeda(resumo.total_centavos)}`}</strong>
        </>
      )}
    </>
  );
}
