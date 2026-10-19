import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { useNomesPorId } from '../../app/nomes/useNomesPorId';
import * as clientesService from '../../services/clientes';
import { STATUS_ENTREGA } from '../pedidos/pedidosUtils';
import { Paginacao } from './Paginacao';
import { dataEmBrasilia } from './notasUtils';
import { useEntregasSemNota } from './useEntregasSemNota';
import { AlertCircle } from 'lucide-react';
import './Notas.css';

const buscarClientes = (texto, sinal) =>
  clientesService.listarClientes({ busca: texto, tamanho: 20, sinal }).then((resposta) => resposta?.dados ?? []);

const opcaoDeCliente = (cliente) => ({ valor: cliente.id, rotulo: cliente.nome });

export default function EntregasSemNota() {
  const nomeEmpresa = useNomesEmpresas();
  const { itens, pagina, filtros, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima, filtrar } =
    useEntregasSemNota();
  const nomeCliente = useNomesPorId(
    [...itens.map((entrega) => entrega.cliente_id), filtros.cliente],
    clientesService.obterCliente
  );
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const linhas = itens.map((entrega) => ({ ...entrega, id: entrega.entrega_id }));

  const colunas = [
    {
      label: 'Pedido',
      field: 'pedido_numero',
      width: '11%',
      render: (numero, entrega) => <Link to={`/pedidos/${entrega.pedido_id}`}>{`Pedido ${numero}`}</Link>,
    },
    { label: 'Empresa', field: 'empresa_id', width: '13%', render: (empresaId) => nomeEmpresa(empresaId) },
    { label: 'Cliente', field: 'cliente_id', width: '26%', render: (clienteId) => nomeCliente(clienteId) },
    {
      label: 'Status',
      field: 'status',
      width: '13%',
      render: (status) => {
        const situacao = STATUS_ENTREGA[status] ?? { rotulo: status, cor: 'neutral' };
        return <StatusBadge status={situacao.cor} label={situacao.rotulo} />;
      },
    },
    { label: 'Saída', field: 'saiu_em', width: '11%', render: (saiuEm) => dataEmBrasilia(saiuEm) },
    { label: 'Entregue em', field: 'entregue_em', width: '11%', render: (entregueEm) => dataEmBrasilia(entregueEm) },
    { label: 'Transportadora', field: 'transportadora', render: (transportadora) => transportadora || '—' },
  ];

  return (
    <div className="notas-container">
      <div className="notas-toolbar">
        <div className="notas-toolbar-titulo">Entregas sem nota fiscal</div>
        <div className="notas-toolbar-acoes">
          <label className="filter-label" htmlFor="entregas-sem-nota-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="entregas-sem-nota-empresa"
            className="filter-input notas-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
          <label className="filter-label" htmlFor="entregas-sem-nota-cliente">
            Cliente
          </label>
          <BuscaRemota
            id="entregas-sem-nota-cliente"
            nomeBusca="cliente das entregas"
            valor={filtros.cliente}
            rotuloAtual={nomeCliente(filtros.cliente)}
            buscar={buscarClientes}
            opcaoDe={opcaoDeCliente}
            onEscolher={(cliente) => filtrar({ cliente: cliente ? cliente.id : '' })}
            placeholderBusca="Nome ou documento"
          />
        </div>
      </div>

      <span className="notas-form-ajuda">
        Entregas que já saíram ou foram entregues e ainda não têm nota fiscal autorizada vinculada, das mais antigas para
        as mais novas. Vincule a nota no detalhe dela.
      </span>

      {erro && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="notas-conteudo">
        {carregando ? (
          <div className="notas-status">Carregando entregas…</div>
        ) : linhas.length > 0 ? (
          <>
            <DataGrid columns={colunas} data={linhas} selectable={false} />
            <Paginacao
              pagina={pagina}
              temProxima={temProxima}
              irParaAnterior={irParaAnterior}
              irParaProxima={irParaProxima}
            />
          </>
        ) : erro ? null : (
          <div className="notas-status">Todas as entregas que saíram têm nota fiscal.</div>
        )}
      </div>
    </div>
  );
}
