import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import { formatarData } from '../../lib/formatar';
import * as comissoesService from '../../services/comissoes';
import * as representantesService from '../../services/representantes';
import { Paginacao } from '../notas/Paginacao';
import { rotuloModelo } from '../pedidos/pedidosUtils';
import { useConsulta } from '../pedidos/useConsulta';
import { AlertCircle } from 'lucide-react';
import './Comissoes.css';

const FILTROS = { empresa: '', competencia: '' };

export function PendenciasApuracao() {
  const nomeEmpresa = useNomesEmpresas();
  const { itens, pagina, filtros, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima, filtrar } =
    useConsulta(comissoesService.listarPendenciasComissao, FILTROS);
  const nomeRepresentante = useNomesPorId(
    itens.map((pendente) => pendente.representante_id),
    representantesService.obterRepresentante
  );
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);
  const linhas = itens.map((pendente) => ({ ...pendente, id: pendente.entrega_id }));

  const colunas = [
    {
      label: 'Pedido',
      field: 'pedido_numero',
      width: '12%',
      render: (numero, pendente) => <Link to={`/pedidos/${pendente.pedido_id}`}>{`Pedido ${numero}`}</Link>,
    },
    { label: 'Empresa', field: 'empresa_id', width: '16%', render: (empresaId) => nomeEmpresa(empresaId) },
    {
      label: 'Representante',
      field: 'representante_id',
      width: '30%',
      render: (representanteId) => nomeRepresentante(representanteId),
    },
    { label: 'Modelo', field: 'modelo', width: '16%', render: (modelo) => rotuloModelo(modelo) },
    { label: 'Saída', field: 'saiu_em', width: '14%', render: (saiuEm) => formatarData(saiuEm) },
  ];

  return (
    <>
      <div className="comissoes-filtros-extras">
        <div className="comissoes-filtro-campo">
          <label className="filter-label" htmlFor="pendencias-comissao-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="pendencias-comissao-empresa"
            className="filter-input"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
        <div className="comissoes-filtro-campo">
          <label className="filter-label" htmlFor="pendencias-comissao-competencia">
            Competência
          </label>
          <input
            id="pendencias-comissao-competencia"
            className="filter-input"
            type="month"
            value={filtros.competencia}
            onChange={(evento) => filtrar({ competencia: evento.target.value })}
          />
        </div>
        <span className="comissoes-form-ajuda">Entregas que já saíram e ainda não viraram comissão.</span>
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
          <div className="comissoes-status">Carregando pendências…</div>
        ) : linhas.length > 0 ? (
          <>
            <DataGrid columns={colunas} data={linhas} selectable={false} />
            <Paginacao pagina={pagina} temProxima={temProxima} irParaAnterior={irParaAnterior} irParaProxima={irParaProxima} />
          </>
        ) : erro ? null : (
          <div className="comissoes-status">Nenhuma entrega pendente de apuração.</div>
        )}
      </div>
    </>
  );
}
