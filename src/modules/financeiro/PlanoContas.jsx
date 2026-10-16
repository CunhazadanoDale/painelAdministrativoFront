import React, { useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { Modal } from '../../app/components/Modal';
import { StatusBadge } from '../../app/components/StatusBadge';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import { CategoriaFinanceiraFormModal } from './CategoriaFinanceiraFormModal';
import { rotuloDaLinha, rotuloDaNatureza } from './planoContasUtils';
import { usePlanoContas } from './usePlanoContas';
import { AlertCircle, CornerDownRight, FolderPlus, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Financeiro.css';

export default function PlanoContas() {
  const { financeiro, administrador } = useAutenticacao();
  const {
    raizes,
    soAtivas,
    carregando,
    erro,
    recarregar,
    mostrarSoAtivas,
    criar,
    atualizar,
    alternarSituacao,
    excluir,
  } = usePlanoContas();

  const [formulario, setFormulario] = useState(null);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [conflitoAcao, setConflitoAcao] = useState(null);
  const [alternando, setAlternando] = useState(null);

  const temAcoes = financeiro || administrador;

  const trocarSituacao = async (categoria) => {
    setErroAcao(null);
    setConflitoAcao(null);
    setAlternando(categoria.id);
    try {
      await alternarSituacao(categoria);
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) {
        setConflitoAcao(e.message);
      } else {
        setErroAcao(e.message || 'Erro ao alterar a situação da categoria.');
      }
    } finally {
      setAlternando(null);
    }
  };

  const recarregarDepoisDoConflito = () => {
    setConflitoAcao(null);
    recarregar();
  };

  const confirmarExclusao = async () => {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await excluir(categoriaParaExcluir.id);
      setCategoriaParaExcluir(null);
    } catch (e) {
      setErroExclusao(e.message || 'Erro ao excluir a categoria.');
    } finally {
      setExcluindo(false);
    }
  };

  const acoesDe = (categoria, raiz) => (
    <div className="leads-acoes">
      {financeiro && (
        <>
          {raiz && (
            <button
              type="button"
              className="leads-acao-btn"
              title="Nova subcategoria"
              aria-label="Nova subcategoria"
              onClick={() => setFormulario({ pai: categoria })}
            >
              <FolderPlus size={14} />
            </button>
          )}
          <button
            type="button"
            className="leads-acao-btn"
            title="Editar categoria"
            aria-label="Editar categoria"
            onClick={() => setFormulario({ categoria })}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="leads-acao-btn"
            title={categoria.ativa ? 'Desativar categoria' : 'Ativar categoria'}
            aria-label={categoria.ativa ? 'Desativar categoria' : 'Ativar categoria'}
            onClick={() => trocarSituacao(categoria)}
            disabled={alternando === categoria.id}
          >
            {categoria.ativa ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
        </>
      )}
      {administrador && (
        <button
          type="button"
          className="leads-acao-btn leads-acao-perigo"
          title="Excluir categoria"
          aria-label="Excluir categoria"
          onClick={() => {
            setErroExclusao(null);
            setCategoriaParaExcluir(categoria);
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );

  const linhaDe = (categoria, raiz) => (
    <tr key={categoria.id} className={raiz ? 'plano-raiz' : 'plano-sub'}>
      <td>
        <div className="plano-nome">
          {!raiz && <CornerDownRight size={14} aria-hidden="true" className="plano-seta" />}
          <span>{categoria.nome}</span>
          {categoria.lancavel && <StatusBadge status="info" label="Lançável" />}
        </div>
      </td>
      <td>{categoria.codigo || '—'}</td>
      <td>{rotuloDaNatureza(categoria.natureza)}</td>
      <td>{rotuloDaLinha(categoria.linha_dre)}</td>
      <td>
        <StatusBadge
          status={categoria.ativa ? 'success' : 'danger'}
          label={categoria.ativa ? 'Ativa' : 'Inativa'}
        />
      </td>
      {temAcoes && <td>{acoesDe(categoria, raiz)}</td>}
    </tr>
  );

  return (
    <div className="financeiro-container">
      <div className="financeiro-toolbar">
        <div className="financeiro-toolbar-titulo">Plano de Contas</div>
        <div className="financeiro-toolbar-acoes">
          <label className="filter-label plano-so-ativas" htmlFor="plano-so-ativas">
            <input
              id="plano-so-ativas"
              type="checkbox"
              checked={soAtivas}
              onChange={(evento) => mostrarSoAtivas(evento.target.checked)}
            />
            Só ativas
          </label>
          {financeiro && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setFormulario({})}
            >
              <Plus size={16} /> Nova Categoria
            </button>
          )}
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

      {erroAcao && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erroAcao}</span>
          <button type="button" onClick={() => setErroAcao(null)}>
            Fechar
          </button>
        </div>
      )}

      {conflitoAcao && (
        <AvisoConflito mensagem={conflitoAcao} onRecarregar={recarregarDepoisDoConflito} />
      )}

      <div className="financeiro-conteudo">
        {carregando ? (
          <div className="financeiro-status">Carregando o plano de contas…</div>
        ) : raizes.length > 0 ? (
          <div className="datagrid-container">
            <table className="datagrid plano-tabela">
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>Categoria</th>
                  <th style={{ width: '12%' }}>Código</th>
                  <th style={{ width: '13%' }}>Natureza</th>
                  <th style={{ width: '18%' }}>Linha da DRE</th>
                  <th style={{ width: '9%' }}>Situação</th>
                  {temAcoes && <th style={{ width: '130px' }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {raizes.flatMap((raiz) => [
                  linhaDe(raiz, true),
                  ...(raiz.subcategorias ?? []).map((subcategoria) => linhaDe(subcategoria, false)),
                ])}
              </tbody>
            </table>
          </div>
        ) : erro ? null : (
          <div className="financeiro-status">
            {soAtivas ? 'Nenhuma categoria ativa no plano de contas.' : 'Nenhuma categoria no plano de contas.'}
          </div>
        )}
      </div>

      {formulario && (
        <CategoriaFinanceiraFormModal
          key={formulario.categoria?.id ?? formulario.pai?.id ?? 'nova-raiz'}
          categoria={formulario.categoria ?? null}
          pai={formulario.pai ?? null}
          onFechar={() => setFormulario(null)}
          onSalvar={(dados) =>
            formulario.categoria ? atualizar(formulario.categoria.id, dados) : criar(dados)
          }
        />
      )}

      <Modal
        aberto={!!categoriaParaExcluir}
        titulo="Excluir categoria"
        onFechar={excluindo ? () => {} : () => setCategoriaParaExcluir(null)}
        largura="440px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setCategoriaParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="filter-btn financeiro-excluir-confirmar"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={confirmarExclusao}
              disabled={excluindo}
            >
              {excluindo ? 'Excluindo…' : 'Excluir'}
            </button>
          </>
        }
      >
        <p>
          Tem certeza que deseja excluir a categoria <strong>{categoriaParaExcluir?.nome}</strong>? Só é possível
          excluir categoria sem subcategorias e sem lançamentos; o caminho normal é desativar.
        </p>
        {erroExclusao && <div className="financeiro-form-erro-api">{erroExclusao}</div>}
      </Modal>
    </div>
  );
}
