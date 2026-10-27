import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '../../app/components/DataGrid';
import { StatusBadge } from '../../app/components/StatusBadge';
import { FilterPanel, FilterGroup } from '../../app/components/FilterPanel';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { formatarMoeda } from '../../lib/formatar';
import { ImportacaoProdutosModal } from './ImportacaoProdutosModal';
import { ProdutoFormModal } from './ProdutoFormModal';
import { useProdutos, FILTROS_PADRAO } from './useProdutos';
import {
  Plus,
  Pencil,
  Eye,
  Star,
  UserCheck,
  UserX,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
} from 'lucide-react';
import './Produtos.css';

export default function Produtos() {
  const navigate = useNavigate();
  const { administrador } = useAutenticacao();
  const {
    produtos,
    subcategorias,
    categoriaMapa,
    resumo,
    temProxima,
    pagina,
    carregando,
    erro,
    chaveDados,
    erroCategorias,
    erroResumo,
    recarregar,
    recarregarAuxiliares,
    aplicarFiltros,
    limparFiltros,
    irParaAnterior,
    irParaProxima,
    criar,
    atualizar,
    alternarAtivo,
    alternarDestaque,
  } = useProdutos();

  const [buscaRascunho, setBuscaRascunho] = useState('');
  const [filtrosRascunho, setFiltrosRascunho] = useState(FILTROS_PADRAO);
  const [produtoModal, setProdutoModal] = useState(undefined);
  const [importando, setImportando] = useState(false);
  const [erroAcao, setErroAcao] = useState(null);

  const aplicar = () => aplicarFiltros({ ...filtrosRascunho, busca: buscaRascunho.trim() });

  const limpar = () => {
    setBuscaRascunho('');
    setFiltrosRascunho(FILTROS_PADRAO);
    limparFiltros();
  };

  const executarAcao = async (acaoExecutar) => {
    setErroAcao(null);
    try {
      await acaoExecutar();
    } catch (e) {
      setErroAcao(e.message || 'Erro na operação.');
    }
  };

  const salvar = async (dados) => {
    if (produtoModal) {
      await atualizar(produtoModal.id, dados);
    } else {
      const criado = await criar(dados);
      if (criado && criado.id) navigate(`/produtos/${criado.id}`);
    }
  };

  const alterarFiltroRascunho = (campo) => (evento) =>
    setFiltrosRascunho((atual) => ({ ...atual, [campo]: evento.target.value }));

  const textoPreco = (produto) => {
    if (produto.preco_centavos === null || produto.preco_centavos === undefined) {
      return <span className="produtos-preco-sob-consulta">Sob consulta</span>;
    }
    if (
      produto.preco_promocional_centavos !== null &&
      produto.preco_promocional_centavos !== undefined
    ) {
      return (
        <span className="produtos-preco-promocional">
          <span className="produtos-preco-antigo">{formatarMoeda(produto.preco_centavos)}</span>
          {formatarMoeda(produto.preco_promocional_centavos)}
        </span>
      );
    }
    return formatarMoeda(produto.preco_centavos);
  };

  const colunas = [
    {
      label: 'Produto',
      field: 'nome',
      width: '22%',
      render: (nome, produto) => (
        <span className="produtos-nome-celula">
          <span>{nome}</span>
          {produto.codigo && <small>{produto.codigo}</small>}
        </span>
      ),
    },
    {
      label: 'Categoria',
      field: 'categoria_id',
      width: '16%',
      render: (categoriaId) => categoriaMapa[categoriaId]?.nome ?? '—',
    },
    { label: 'Preço', field: 'preco_centavos', width: '14%', render: (_, produto) => textoPreco(produto) },
    {
      label: 'Saldo',
      field: 'saldo',
      width: '14%',
      render: (saldo, produto) => (
        <span className="produtos-saldo-celula">
          <span>{saldo}</span>
          {produto.estoque_baixo && <StatusBadge status="warning" label="Estoque baixo" />}
        </span>
      ),
    },
    {
      label: 'Situação',
      field: 'ativo',
      width: '10%',
      render: (ativo) => (
        <StatusBadge status={ativo ? 'success' : 'danger'} label={ativo ? 'Ativo' : 'Inativo'} />
      ),
    },
    {
      label: 'Destaque',
      field: 'destaque',
      width: '10%',
      render: (destaque) =>
        destaque ? <StatusBadge status="info" label="Destaque" /> : <span>—</span>,
    },
    {
      label: 'Ações',
      field: 'id',
      width: administrador ? '150px' : '60px',
      render: (id, produto) => (
        <div className="leads-acoes">
          <button
            type="button"
            className="leads-acao-btn"
            title="Ver detalhe"
            onClick={() => navigate(`/produtos/${id}`)}
          >
            <Eye size={14} />
          </button>
          {administrador && (
            <>
              <button
                type="button"
                className="leads-acao-btn"
                title="Editar produto"
                onClick={() => setProdutoModal(produto)}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="leads-acao-btn"
                title={produto.destaque ? 'Remover destaque' : 'Destacar produto'}
                onClick={() => executarAcao(() => alternarDestaque(produto))}
              >
                <Star size={14} />
              </button>
              <button
                type="button"
                className="leads-acao-btn"
                title={produto.ativo ? 'Desativar' : 'Ativar'}
                onClick={() => executarAcao(() => alternarAtivo(produto))}
              >
                {produto.ativo ? <UserX size={14} /> : <UserCheck size={14} />}
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="produtos-container">
      <div className="produtos-toolbar">
        <div className="produtos-toolbar-titulo">
          Produtos {carregando ? '…' : `(${produtos.length})`}
        </div>
        <div className="produtos-toolbar-acoes">
          <input
            className="filter-input produtos-busca"
            type="search"
            placeholder="Buscar por nome ou código…"
            value={buscaRascunho}
            onChange={(evento) => setBuscaRascunho(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') aplicar();
            }}
          />
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px' }}
            onClick={aplicar}
          >
            <Search size={14} /> Buscar
          </button>
          {administrador && (
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setImportando(true)}
            >
              <Upload size={16} /> Importar CSV
            </button>
          )}
          {administrador && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{
                flex: 'none',
                width: 'auto',
                padding: '4px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={() => setProdutoModal(null)}
            >
              <Plus size={16} /> Novo Produto
            </button>
          )}
        </div>
      </div>

      {resumo && (
        <div className="produtos-resumo">
          <div className="produtos-resumo-cartao">
            <span className="produtos-resumo-rotulo">Total de produtos</span>
            <span className="produtos-resumo-valor">{resumo.total_produtos}</span>
          </div>
          <div className="produtos-resumo-cartao">
            <span className="produtos-resumo-rotulo">Produtos ativos</span>
            <span className="produtos-resumo-valor">{resumo.produtos_ativos}</span>
          </div>
          <div className="produtos-resumo-cartao">
            <span className="produtos-resumo-rotulo">Valor em estoque</span>
            <span className="produtos-resumo-valor">
              {formatarMoeda(resumo.valor_estoque_centavos)}
            </span>
          </div>
          <div className="produtos-resumo-cartao">
            <span className="produtos-resumo-rotulo">Estoque baixo</span>
            <span className="produtos-resumo-valor">{resumo.produtos_estoque_baixo}</span>
          </div>
        </div>
      )}

      <div className="produtos-corpo">
        <FilterPanel
          title="FILTROS DE ESTOQUE"
          onApply={aplicar}
          onClear={limpar}
        >
          <FilterGroup label="Categoria">
            <select
              className="filter-input"
              value={filtrosRascunho.categoria_id}
              onChange={alterarFiltroRascunho('categoria_id')}
            >
              <option value="">Todas</option>
              {subcategorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoriaMapa[categoria.categoria_pai_id]?.nome
                    ? `${categoriaMapa[categoria.categoria_pai_id].nome} › ${categoria.nome}`
                    : categoria.nome}
                </option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup label="Situação">
            <select
              className="filter-input"
              value={filtrosRascunho.ativo}
              onChange={alterarFiltroRascunho('ativo')}
            >
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </FilterGroup>
          <FilterGroup label="Destaque">
            <select
              className="filter-input"
              value={filtrosRascunho.destaque}
              onChange={alterarFiltroRascunho('destaque')}
            >
              <option value="">Todos</option>
              <option value="true">Somente destaques</option>
              <option value="false">Sem destaque</option>
            </select>
          </FilterGroup>
          <FilterGroup label="Estoque">
            <select
              className="filter-input"
              value={filtrosRascunho.estoque_baixo}
              onChange={alterarFiltroRascunho('estoque_baixo')}
            >
              <option value="">Todos</option>
              <option value="true">Somente estoque baixo</option>
            </select>
          </FilterGroup>
        </FilterPanel>

        <div className="produtos-conteudo">
          {erro && (
            <div className="leads-erro">
              <AlertCircle size={16} />
              <span>{erro}</span>
              <button type="button" onClick={recarregar}>
                Tentar novamente
              </button>
            </div>
          )}

          {(erroCategorias || erroResumo) && (
            <div className="leads-erro produtos-erro-acao">
              <AlertCircle size={16} />
              <span>
                {[
                  erroCategorias && `Não foi possível carregar as categorias: ${erroCategorias}`,
                  erroResumo && `Não foi possível carregar o resumo do estoque: ${erroResumo}`,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </span>
              <button type="button" onClick={recarregarAuxiliares}>
                Tentar novamente
              </button>
            </div>
          )}

          {erroAcao && (
            <div className="leads-erro produtos-erro-acao">
              <AlertCircle size={16} />
              <span>{erroAcao}</span>
              <button type="button" onClick={() => setErroAcao(null)}>
                Fechar
              </button>
            </div>
          )}

          {erro ? null : carregando ? (
            <div className="produtos-status">Carregando produtos…</div>
          ) : produtos.length === 0 ? (
            <div className="produtos-status">Nenhum produto encontrado.</div>
          ) : (
            <>
              <DataGrid
                key={chaveDados ?? 'produtos'}
                columns={colunas}
                data={produtos}
                selectable={false}
              />
              {(produtos.length > 0 || pagina > 1) && (
                <div className="produtos-paginacao">
                  <button
                    type="button"
                    className="filter-btn filter-btn-secondary"
                    style={{ flex: 'none', padding: '4px 10px' }}
                    title="Página anterior"
                    onClick={irParaAnterior}
                    disabled={pagina <= 1}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="produtos-paginacao-texto">Página {pagina}</span>
                  <button
                    type="button"
                    className="filter-btn filter-btn-secondary"
                    style={{ flex: 'none', padding: '4px 10px' }}
                    title="Próxima página"
                    onClick={irParaProxima}
                    disabled={!temProxima}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {importando && <ImportacaoProdutosModal onFechar={() => setImportando(false)} onImportado={recarregar} />}

      {produtoModal !== undefined && (
        <ProdutoFormModal
          key={produtoModal?.id ?? 'novo-produto'}
          produto={produtoModal}
          subcategorias={subcategorias}
          categoriaMapa={categoriaMapa}
          onFechar={() => setProdutoModal(undefined)}
          onSalvar={salvar}
        />
      )}
    </div>
  );
}
