import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData, formatarMoeda } from '../../lib/formatar';
import * as comissoesService from '../../services/comissoes';
import * as representantesService from '../../services/representantes';
import { Paginacao } from '../notas/Paginacao';
import { useConsulta } from '../pedidos/useConsulta';
import { carregarRepresentantes, formatarCompetencia, opcaoDeRepresentante } from './comissoesUtils';
import { ContaAPagar, Valor } from './ContaAPagar';
import { FecharModal } from './FecharModal';
import { AlertCircle, Lock } from 'lucide-react';
import './Comissoes.css';

const FILTROS = { empresa: '', representante: '', competencia: '' };

function ResultadoFechamento({ resultado }) {
  const fechados = resultado.fechados ?? [];
  const falhas = resultado.falhas ?? [];
  const total = fechados.reduce((soma, fechamento) => soma + fechamento.total_centavos, 0);
  const nomeRepresentante = useNomesPorId(
    falhas.map((falha) => falha.representante_id),
    representantesService.obterRepresentante
  );

  return (
    <section className="comissoes-resultado" role="region" aria-label="Resultado do fechamento">
      <strong>{`${fechados.length} fechamento(s) gerado(s), total de ${formatarMoeda(total)}.`}</strong>
      {(resultado.apuracao?.falhas?.length ?? 0) > 0 && (
        <span>{resultado.apuracao.falhas.length} entrega(s) não apuraram; os representantes delas não fecharam.</span>
      )}
      {falhas.length > 0 && (
        <ul className="comissoes-falhas">
          {falhas.map((falha) => (
            <li key={falha.representante_id}>
              {nomeRepresentante(falha.representante_id)}: {falha.motivo}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ListaFechamentos({ financeiro }) {
  const nomeEmpresa = useNomesEmpresas();
  const { itens, pagina, filtros, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima, filtrar } =
    useConsulta(comissoesService.listarFechamentosComissao, FILTROS);
  const nomeRepresentante = useNomesPorId(
    itens.map((fechamento) => fechamento.representante_id),
    representantesService.obterRepresentante
  );
  const [fechando, setFechando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  const filtrarRepresentante = useCallback((representante) => filtrar({ representante }), [filtrar]);

  const concluir = (dados) => {
    setResultado(dados);
    recarregar();
  };

  const colunas = [
    {
      label: 'Competência',
      field: 'competencia',
      width: '10%',
      render: (competencia, fechamento) => (
        <Link to={`/comissoes/fechamentos/${fechamento.id}`}>{formatarCompetencia(competencia)}</Link>
      ),
    },
    { label: 'Empresa', field: 'empresa_id', width: '11%', render: (empresaId) => nomeEmpresa(empresaId) },
    {
      label: 'Representante',
      field: 'representante_id',
      width: '18%',
      render: (representanteId) => nomeRepresentante(representanteId),
    },
    { label: 'Comissões', field: 'comissoes_centavos', width: '11%', render: (valor) => <Valor centavos={valor} /> },
    { label: 'Ajustes', field: 'ajustes_centavos', width: '11%', render: (valor) => <Valor centavos={valor} /> },
    { label: 'Total', field: 'total_centavos', width: '11%', render: (valor) => <strong>{formatarMoeda(valor)}</strong> },
    { label: 'Vencimento', field: 'vencimento', width: '10%', render: (vencimento) => formatarData(vencimento) },
    {
      label: 'Conta a pagar',
      field: 'solicitacao_id',
      width: '18%',
      render: (_, fechamento) => <ContaAPagar fechamento={fechamento} />,
    },
  ];

  return (
    <>
      <div className="comissoes-filtros-extras">
        <div className="comissoes-filtro-campo">
          <label className="filter-label" htmlFor="fechamentos-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="fechamentos-empresa"
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
            <label className="filter-label" htmlFor="fechamentos-representante">
              Representante
            </label>
            <SeletorRemoto
              id="fechamentos-representante"
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
        <div className="comissoes-filtro-campo">
          <label className="filter-label" htmlFor="fechamentos-competencia">
            Competência
          </label>
          <input
            id="fechamentos-competencia"
            className="filter-input"
            type="month"
            value={filtros.competencia}
            onChange={(evento) => filtrar({ competencia: evento.target.value })}
          />
        </div>
        {financeiro && (
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setFechando(true)}
          >
            <Lock size={14} /> Fechar competência
          </button>
        )}
      </div>

      {resultado && <ResultadoFechamento resultado={resultado} />}

      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="comissoes-conteudo">
        {carregando ? (
          <div className="comissoes-status">Carregando fechamentos…</div>
        ) : itens.length > 0 ? (
          <>
            <DataGrid columns={colunas} data={itens} selectable={false} />
            <Paginacao pagina={pagina} temProxima={temProxima} irParaAnterior={irParaAnterior} irParaProxima={irParaProxima} />
          </>
        ) : erro ? null : (
          <div className="comissoes-status">Nenhum fechamento encontrado.</div>
        )}
      </div>

      {fechando && <FecharModal onConcluido={concluir} onFechar={() => setFechando(false)} />}
    </>
  );
}
