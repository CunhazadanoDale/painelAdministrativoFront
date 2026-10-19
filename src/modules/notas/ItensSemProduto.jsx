import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { DataGrid } from '../../app/components/DataGrid';
import { SeletorEmpresa } from '../../app/components/SeletorEmpresa';
import { useNomesEmpresas } from '../../app/empresas/useNomesEmpresas';
import { formatarMoeda } from '../../lib/formatar';
import * as notasService from '../../services/notasFiscais';
import { LigarProdutoModal } from './AcoesDaNota';
import { Paginacao } from './Paginacao';
import { dataEmBrasilia, formatarQuantidade } from './notasUtils';
import { useItensSemProduto } from './useItensSemProduto';
import { AlertCircle } from 'lucide-react';
import './Notas.css';

export default function ItensSemProduto() {
  const { financeiro } = useAutenticacao();
  const nomeEmpresa = useNomesEmpresas();
  const { itens, pagina, filtros, temProxima, carregando, erro, recarregar, irParaAnterior, irParaProxima, filtrar } =
    useItensSemProduto();
  const [ligando, setLigando] = useState(null);
  const filtrarEmpresa = useCallback((empresa) => filtrar({ empresa }), [filtrar]);

  const ligar = async (numeroItem, produtoId) => {
    const notaId = ligando.nota_fiscal_id;
    const resposta = await notasService.obterNota(notaId);
    await notasService.ligarItemAoProduto(notaId, numeroItem, { versao: resposta?.dados?.versao, produto_id: produtoId });
    recarregar();
  };

  const linhas = itens.map((pendente) => ({ ...pendente, id: `${pendente.nota_fiscal_id}-${pendente.item.numero_item}` }));

  const colunas = [
    {
      label: 'Nota',
      field: 'numero_nota',
      width: '9%',
      render: (numero, pendente) => (
        <Link to={`/notas-fiscais/${pendente.nota_fiscal_id}`}>{`${pendente.serie}-${numero}`}</Link>
      ),
    },
    { label: 'Emitida em', field: 'emitida_em', width: '10%', render: (emitidaEm) => dataEmBrasilia(emitidaEm) },
    { label: 'Empresa', field: 'empresa_id', width: '12%', render: (empresaId) => nomeEmpresa(empresaId) },
    { label: 'Item', field: 'item', width: '6%', render: (item) => item.numero_item },
    { label: 'Código', field: 'item', width: '12%', render: (item) => item.codigo },
    { label: 'Descrição', field: 'item', render: (item) => item.descricao },
    { label: 'Quantidade', field: 'item', width: '10%', render: (item) => formatarQuantidade(item.quantidade) },
    { label: 'Valor', field: 'item', width: '11%', render: (item) => formatarMoeda(item.valor_centavos) },
    ...(financeiro
      ? [
          {
            label: 'Ações',
            field: 'id',
            width: '12%',
            render: (_, pendente) => (
              <button
                type="button"
                className="filter-btn filter-btn-secondary"
                style={{ flex: 'none', width: 'auto', padding: '2px 10px' }}
                onClick={() => setLigando(pendente)}
              >
                Ligar produto
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="notas-container">
      <div className="notas-toolbar">
        <div className="notas-toolbar-titulo">Itens de nota sem produto</div>
        <div className="notas-toolbar-acoes">
          <label className="filter-label" htmlFor="itens-sem-produto-empresa">
            Empresa
          </label>
          <SeletorEmpresa
            id="itens-sem-produto-empresa"
            className="filter-input notas-filtro"
            valor={filtros.empresa}
            onAlterar={filtrarEmpresa}
            apenasAtivas={false}
            selecionarUnica={false}
            placeholder="Todas"
          />
        </div>
      </div>

      <span className="notas-form-ajuda">
        Itens das notas autorizadas cujo código não bateu com nenhum produto do cadastro. Ligar o item ao produto tira-o
        desta lista.
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
          <div className="notas-status">Carregando itens…</div>
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
          <div className="notas-status">Nenhum item de nota sem produto.</div>
        )}
      </div>

      {ligando && (
        <LigarProdutoModal
          item={ligando.item}
          onConfirmar={ligar}
          onFechar={() => setLigando(null)}
          onRecarregar={recarregar}
        />
      )}
    </div>
  );
}
