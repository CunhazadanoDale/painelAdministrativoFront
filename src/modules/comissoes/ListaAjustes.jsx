import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarMoeda } from '../../lib/formatar';
import * as comissoesService from '../../services/comissoes';
import * as pedidosService from '../../services/pedidos';
import * as representantesService from '../../services/representantes';
import { Paginacao } from '../notas/Paginacao';
import { useConsulta } from '../pedidos/useConsulta';
import { AjusteModal } from './AjusteModal';
import {
  carregarRepresentantes,
  descricaoDoPedido,
  formatarCompetencia,
  opcaoDeRepresentante,
} from './comissoesUtils';
import { AlertCircle, Plus } from 'lucide-react';
import './Comissoes.css';

const FILTROS = { empresa: '', representante: '', competencia: '', aberto: '' };

export function ListaAjustes({ financeiro }) {
  const nomeEmpresa = useNomesEmpresas();
  const { itens, pagina, filtros, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima, filtrar } =
    useConsulta(comissoesService.listarAjustesComissao, FILTROS);
  const nomeRepresentante = useNomesPorId(
    itens.map((ajuste) => ajuste.representante_id),
    representantesService.obterRepresentante
  );
  const nomePedido = useNomesPorId(
    itens.map((ajuste) => ajuste.pedido_id),
    pedidosService.obterPedido,
    descricaoDoPedido
  );
  const [lancando, setLancando] = useState(false);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  const filtrarRepresentante = useCallback((representante) => filtrar({ representante }), [filtrar]);

  const colunas = [
    { label: 'Competência', field: 'competencia', width: '10%', render: (competencia) => formatarCompetencia(competencia) },
    { label: 'Empresa', field: 'empresa_id', width: '12%', render: (empresaId) => nomeEmpresa(empresaId) },
    {
      label: 'Representante',
      field: 'representante_id',
      width: '18%',
      render: (representanteId) => nomeRepresentante(representanteId),
    },
    {
      label: 'Pedido',
      field: 'pedido_id',
      width: '11%',
      render: (pedidoId) => (pedidoId ? <Link to={`/pedidos/${pedidoId}`}>{nomePedido(pedidoId)}</Link> : '—'),
    },
    {
      label: 'Valor',
      field: 'valor_centavos',
      width: '12%',
      render: (valor) => <span className={valor < 0 ? 'comissoes-negativo' : undefined}>{formatarMoeda(valor)}</span>,
    },
    { label: 'Motivo', field: 'motivo' },
    {
      label: 'Situação',
      field: 'fechamento_id',
      width: '11%',
      render: (fechamentoId) =>
        fechamentoId ? <StatusBadge status="success" label="Fechado" /> : <StatusBadge status="warning" label="Em aberto" />,
    },
  ];

  return (
    <>
      <div className="comissoes-filtros-extras">
        <div className="comissoes-filtro-campo">
          <label className="filter-label" htmlFor="ajustes-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="ajustes-empresa"
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
            <label className="filter-label" htmlFor="ajustes-representante">
              Representante
            </label>
            <SeletorRemoto
              id="ajustes-representante"
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
          <label className="filter-label" htmlFor="ajustes-competencia">
            Competência
          </label>
          <input
            id="ajustes-competencia"
            className="filter-input"
            type="month"
            value={filtros.competencia}
            onChange={(evento) => filtrar({ competencia: evento.target.value })}
          />
        </div>
        <div className="comissoes-filtro-campo">
          <label className="filter-label" htmlFor="ajustes-situacao">
            Situação
          </label>
          <select
            id="ajustes-situacao"
            className="filter-select"
            value={filtros.aberto}
            onChange={(evento) => filtrar({ aberto: evento.target.value })}
          >
            <option value="">Todos</option>
            <option value="true">Em aberto</option>
            <option value="false">Fechados</option>
          </select>
        </div>
        {financeiro && (
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setLancando(true)}
          >
            <Plus size={14} /> Novo ajuste
          </button>
        )}
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

      <div className="comissoes-conteudo">
        {carregando ? (
          <div className="comissoes-status">Carregando ajustes…</div>
        ) : itens.length > 0 ? (
          <>
            <DataGrid columns={colunas} data={itens} selectable={false} />
            <Paginacao pagina={pagina} temProxima={temProxima} irParaAnterior={irParaAnterior} irParaProxima={irParaProxima} />
          </>
        ) : erro ? null : (
          <div className="comissoes-status">Nenhum ajuste encontrado.</div>
        )}
      </div>

      {lancando && <AjusteModal onCriado={recarregar} onFechar={() => setLancando(false)} />}
    </>
  );
}
