import React, { useState } from 'react';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { CategoriaFormModal } from './CategoriaFormModal';
import { useCategorias } from './useCategorias';
import { AlertCircle, FolderTree, Pencil, Plus, UserCheck, UserX } from 'lucide-react';
import './Categorias.css';

export default function Categorias() {
  const { administrador } = useAutenticacao();
  const { raizes, filhasDe, carregando, erro, chaveDados, recarregar, criar, atualizar, alternarAtivo } =
    useCategorias();

  const [categoriaModal, setCategoriaModal] = useState(undefined);
  const [categoriaPai, setCategoriaPai] = useState(undefined);
  const [erroAcao, setErroAcao] = useState(null);

  const executarAcao = async (acaoExecutar) => {
    setErroAcao(null);
    try {
      await acaoExecutar();
    } catch (e) {
      setErroAcao(e.message || 'Erro na operação.');
    }
  };

  const salvar = async (dados) => {
    if (categoriaModal) {
      await atualizar(categoriaModal.id, {
        nome: dados.nome,
        ordem: dados.ordem,
        icone: dados.icone,
      });
    } else {
      await criar(dados);
    }
  };

  const acoes = (categoria) =>
    administrador && (
      <div className="categorias-acoes">
        <button
          type="button"
          className="leads-acao-btn"
          title="Editar categoria"
          onClick={() => {
            setCategoriaPai(undefined);
            setCategoriaModal(categoria);
          }}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="leads-acao-btn"
          title={categoria.ativo ? 'Desativar' : 'Ativar'}
          onClick={() => executarAcao(() => alternarAtivo(categoria))}
        >
          {categoria.ativo ? <UserX size={14} /> : <UserCheck size={14} />}
        </button>
        {!categoria.categoria_pai_id && (
          <button
            type="button"
            className="leads-acao-btn"
            title="Adicionar subcategoria"
            onClick={() => {
              setCategoriaModal(null);
              setCategoriaPai(categoria);
            }}
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    );

  const linha = (categoria, nivel) => (
    <div key={categoria.id} className={`categorias-linha nivel-${nivel}`}>
      <span className={`categorias-nome ${nivel > 0 ? 'subcategoria' : ''}`}>
        {nivel > 0 && <span className="categorias-ramo">└</span>}
        {categoria.nome}
      </span>
      <span className="categorias-slug">{categoria.slug}</span>
      <span className="categorias-ordem">{categoria.ordem}</span>
      <span className="categorias-icone">{categoria.icone || '—'}</span>
      <span className="categorias-situacao">
        <StatusBadge
          status={categoria.ativo ? 'success' : 'danger'}
          label={categoria.ativo ? 'Ativa' : 'Inativa'}
        />
      </span>
      {acoes(categoria)}
    </div>
  );

  return (
    <div className="categorias-container">
      <div className="categorias-toolbar">
        <div className="categorias-toolbar-titulo">Categorias</div>
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
            onClick={() => {
              setCategoriaPai(undefined);
              setCategoriaModal(null);
            }}
          >
            <Plus size={16} /> Nova Categoria
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

      {erroAcao && (
        <div className="leads-erro categorias-erro-acao">
          <AlertCircle size={16} />
          <span>{erroAcao}</span>
          <button type="button" onClick={() => setErroAcao(null)}>
            Fechar
          </button>
        </div>
      )}

      <div className="categorias-conteudo" key={chaveDados ?? 'categorias'}>
        {carregando ? (
          <div className="categorias-status">Carregando categorias…</div>
        ) : raizes.length === 0 ? (
          erro ? null : (
            <div className="categorias-status">
              <FolderTree size={20} />
              <span>Nenhuma categoria cadastrada.</span>
            </div>
          )
        ) : (
          <div className="categorias-arvore">
            <div className="categorias-cabecalho">
              <span className="categorias-nome">Nome</span>
              <span className="categorias-slug">Slug</span>
              <span className="categorias-ordem">Ordem</span>
              <span className="categorias-icone">Ícone</span>
              <span className="categorias-situacao">Situação</span>
              <span className="categorias-acoes-col" />
            </div>
            {raizes.map((raiz) => (
              <div key={raiz.id} className="categorias-grupo">
                {linha(raiz, 0)}
                {(filhasDe[raiz.id] || []).map((filha) => linha(filha, 1))}
              </div>
            ))}
          </div>
        )}
      </div>

      {categoriaModal !== undefined && (
        <CategoriaFormModal
          key={categoriaModal?.id ?? (categoriaPai ? `sub-${categoriaPai.id}` : 'nova-categoria')}
          categoria={categoriaModal}
          categoriaPai={categoriaPai}
          raizes={raizes}
          onFechar={() => setCategoriaModal(undefined)}
          onSalvar={salvar}
        />
      )}
    </div>
  );
}
