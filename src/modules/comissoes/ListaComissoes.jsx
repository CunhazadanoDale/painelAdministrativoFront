import React, { useCallback } from 'react';
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
import { formatarPercentual } from '../clientes/clientesUtils';
import { Paginacao } from '../notas/Paginacao';
import { useConsulta } from '../pedidos/useConsulta';
import {
  carregarRepresentantes,
  descricaoDoPedido,
  formatarCompetencia,
  opcaoDeRepresentante,
} from './comissoesUtils';
import { AlertCircle } from 'lucide-react';
import './Comissoes.css';

const FILTROS = { empresa: '', representante: '', competencia: '', aberta: '' };

export function ListaComissoes({ financeiro }) {
  const nomeEmpresa = useNomesEmpresas();
  const { itens, pagina, filtros, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima, filtrar } =
    useConsulta(comissoesService.listarComissoes, FILTROS);
  const nomeRepresentante = useNomesPorId(
    itens.map((comissao) => comissao.representante_id),
    representantesService.obterRepresentante
  );
  const nomePedido = useNomesPorId(
    itens.map((comissao) => comissao.pedido_id),
    pedidosService.obterPedido,
    descricaoDoPedido
  );
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  const filtrarRepresentante = useCallback((representante) => filtrar({ representante }), [filtrar]);

  const colunas = [
    { label: 'Competência', field: 'competencia', width: '10%', render: (competencia) => formatarCompetencia(competencia) },
    { label: 'Empresa', field: 'empresa_id', width: '12%', render: (empresaId) => nomeEmpresa(empresaId) },
    {
      label: 'Representante',
      field: 'representante_id',
      width: '20%',
      render: (representanteId) => nomeRepresentante(representanteId),
    },
    {
      label: 'Pedido',
      field: 'pedido_id',
      width: '12%',
      render: (pedidoId) => <Link to={`/pedidos/${pedidoId}`}>{nomePedido(pedidoId)}</Link>,
    },
    { label: 'Base', field: 'base_centavos', width: '13%', render: (base) => formatarMoeda(base) },
    { label: '%', field: 'percentual_bp', width: '8%', render: (percentual) => formatarPercentual(percentual) },
    { label: 'Comissão', field: 'valor_centavos', width: '12%', render: (valor) => formatarMoeda(valor) },
    {
      label: 'Situação',
      field: 'fechamento_id',
      width: '11%',
      render: (fechamentoId) =>
        fechamentoId ? <StatusBadge status="success" label="Fechada" /> : <StatusBadge status="warning" label="Em aberto" />,
    },
  ];

  return (
    <>
      <div className="comissoes-filtros-extras">
        <div className="comissoes-filtro-campo">
          <label className="filter-label" htmlFor="comissoes-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="comissoes-empresa"
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
            <label className="filter-label" htmlFor="comissoes-representante">
              Representante
            </label>
            <SeletorRemoto
              id="comissoes-representante"
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
          <label className="filter-label" htmlFor="comissoes-competencia">
            Competência
          </label>
          <input
            id="comissoes-competencia"
            className="filter-input"
            type="month"
            value={filtros.competencia}
            onChange={(evento) => filtrar({ competencia: evento.target.value })}
          />
        </div>
        <div className="comissoes-filtro-campo">
          <label className="filter-label" htmlFor="comissoes-situacao">
            Situação
          </label>
          <select
            id="comissoes-situacao"
            className="filter-select"
            value={filtros.aberta}
            onChange={(evento) => filtrar({ aberta: evento.target.value })}
          >
            <option value="">Todas</option>
            <option value="true">Em aberto</option>
            <option value="false">Fechadas</option>
          </select>
        </div>
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
          <div className="comissoes-status">Carregando comissões…</div>
        ) : itens.length > 0 ? (
          <>
            <DataGrid columns={colunas} data={itens} selectable={false} />
            <Paginacao pagina={pagina} temProxima={temProxima} irParaAnterior={irParaAnterior} irParaProxima={irParaProxima} />
          </>
        ) : erro ? null : (
          <div className="comissoes-status">Nenhuma comissão encontrada.</div>
        )}
      </div>
    </>
  );
}
