import React, { useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { DataGrid } from '../../app/components/DataGrid';
import { Modal } from '../../app/components/Modal';
import { StatusBadge } from '../../app/components/StatusBadge';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import { FornecedorFormModal } from './FornecedorFormModal';
import { ImportacaoFornecedoresModal } from './ImportacaoFornecedoresModal';
import { MOEDAS, identificacaoDe } from './fornecedoresUtils';
import { useFornecedores } from './useFornecedores';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import './Fornecedores.css';

export default function Fornecedores() {
  const { financeiro, administrador } = useAutenticacao();
  const {
    fornecedores,
    pagina,
    filtros,
    temProxima,
    carregando,
    erro,
    chaveDados,
    recarregar,
    irParaAnterior,
    irParaProxima,
    filtrar,
    criar,
    atualizar,
    alternarSituacao,
    excluir,
  } = useFornecedores();

  const [termo, setTermo] = useState('');
  const [fornecedorModal, setFornecedorModal] = useState(undefined);
  const [importando, setImportando] = useState(false);
  const [fornecedorParaExcluir, setFornecedorParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [conflitoAcao, setConflitoAcao] = useState(null);
  const [alternando, setAlternando] = useState(null);

  const filtrando = !!(filtros.busca || filtros.moeda || filtros.ativo);
  const temAcoes = financeiro || administrador;

  const buscar = (evento) => {
    evento.preventDefault();
    filtrar({ busca: termo.trim() });
  };

  const trocarSituacao = async (fornecedor) => {
    setErroAcao(null);
    setConflitoAcao(null);
    setAlternando(fornecedor.id);
    try {
      await alternarSituacao(fornecedor);
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) {
        setConflitoAcao(e.message);
      } else {
        setErroAcao(e.message || 'Erro ao alterar a situação do fornecedor.');
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
      await excluir(fornecedorParaExcluir.id);
      setFornecedorParaExcluir(null);
    } catch (e) {
      setErroExclusao(e.message || 'Erro ao excluir o fornecedor.');
    } finally {
      setExcluindo(false);
    }
  };

  const colunas = [
    {
      label: 'Nome',
      field: 'nome',
      width: '30%',
      render: (nome, fornecedor) => (
        <div className="fornecedores-nome">
          <span>{nome}</span>
          {fornecedor.nome_fantasia && (
            <span className="fornecedores-nome-fantasia">{fornecedor.nome_fantasia}</span>
          )}
        </div>
      ),
    },
    {
      label: 'Documento',
      field: 'documento',
      width: '18%',
      render: (_, fornecedor) => identificacaoDe(fornecedor),
    },
    { label: 'País', field: 'pais', width: '6%' },
    { label: 'Moeda', field: 'moeda_padrao', width: '7%' },
    {
      label: 'Contato',
      field: 'contato_nome',
      width: '20%',
      render: (contato, fornecedor) => (
        <div className="fornecedores-nome">
          <span>{contato || '—'}</span>
          {fornecedor.email && <span className="fornecedores-nome-fantasia">{fornecedor.email}</span>}
        </div>
      ),
    },
    {
      label: 'Situação',
      field: 'ativo',
      width: '9%',
      render: (ativo) => (
        <StatusBadge status={ativo ? 'success' : 'danger'} label={ativo ? 'Ativo' : 'Inativo'} />
      ),
    },
  ];

  if (temAcoes) {
    colunas.push({
      label: 'Ações',
      field: 'id',
      width: '110px',
      render: (id, fornecedor) => (
        <div className="leads-acoes">
          {financeiro && (
            <>
              <button
                type="button"
                className="leads-acao-btn"
                title="Editar fornecedor"
                aria-label="Editar fornecedor"
                onClick={() => setFornecedorModal(fornecedor)}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="leads-acao-btn"
                title={fornecedor.ativo ? 'Desativar fornecedor' : 'Ativar fornecedor'}
                aria-label={fornecedor.ativo ? 'Desativar fornecedor' : 'Ativar fornecedor'}
                onClick={() => trocarSituacao(fornecedor)}
                disabled={alternando === id}
              >
                {fornecedor.ativo ? <PowerOff size={14} /> : <Power size={14} />}
              </button>
            </>
          )}
          {administrador && (
            <button
              type="button"
              className="leads-acao-btn leads-acao-perigo"
              title="Excluir fornecedor"
              aria-label="Excluir fornecedor"
              onClick={() => {
                setErroExclusao(null);
                setFornecedorParaExcluir(fornecedor);
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    });
  }

  return (
    <div className="fornecedores-container">
      <div className="fornecedores-toolbar">
        <div className="fornecedores-toolbar-titulo">Fornecedores</div>
        <div className="fornecedores-toolbar-acoes">
          <form className="fornecedores-busca" role="search" onSubmit={buscar}>
            <input
              type="search"
              className="filter-input"
              aria-label="Buscar fornecedor"
              placeholder="Nome, documento ou identificação"
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
            />
            <button
              type="submit"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '4px 10px' }}
              title="Buscar"
              aria-label="Buscar"
            >
              <Search size={14} />
            </button>
          </form>
          <label className="filter-label" htmlFor="fornecedores-moeda">
            Moeda
          </label>
          <select
            id="fornecedores-moeda"
            className="filter-input fornecedores-filtro"
            value={filtros.moeda}
            onChange={(evento) => filtrar({ moeda: evento.target.value })}
          >
            <option value="">Todas</option>
            {MOEDAS.map((moeda) => (
              <option key={moeda} value={moeda}>
                {moeda}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="fornecedores-situacao">
            Situação
          </label>
          <select
            id="fornecedores-situacao"
            className="filter-input fornecedores-filtro"
            value={filtros.ativo}
            onChange={(evento) => filtrar({ ativo: evento.target.value })}
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          {financeiro && (
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setImportando(true)}
            >
              <Upload size={16} /> Importar CSV
            </button>
          )}
          {financeiro && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setFornecedorModal(null)}
            >
              <Plus size={16} /> Novo Fornecedor
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

      <div className="fornecedores-conteudo">
        {carregando ? (
          <div className="fornecedores-status">Carregando fornecedores…</div>
        ) : fornecedores.length > 0 ? (
          <>
            <DataGrid
              key={chaveDados ?? 'fornecedores'}
              columns={colunas}
              data={fornecedores}
              selectable={false}
            />
            {(temProxima || pagina > 1) && (
              <div className="fornecedores-paginacao">
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
                <span className="fornecedores-paginacao-texto">Página {pagina}</span>
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
        ) : erro ? null : (
          <div className="fornecedores-status">
            {filtrando ? 'Nenhum fornecedor encontrado com estes filtros.' : 'Nenhum fornecedor cadastrado.'}
          </div>
        )}
      </div>

      {importando && <ImportacaoFornecedoresModal onFechar={() => setImportando(false)} onImportado={recarregar} />}

      {fornecedorModal !== undefined && (
        <FornecedorFormModal
          key={fornecedorModal?.id ?? 'novo-fornecedor'}
          fornecedor={fornecedorModal}
          onFechar={() => setFornecedorModal(undefined)}
          onSalvar={(dados) =>
            fornecedorModal ? atualizar(fornecedorModal.id, dados) : criar(dados)
          }
        />
      )}

      <Modal
        aberto={!!fornecedorParaExcluir}
        titulo="Excluir fornecedor"
        onFechar={excluindo ? () => {} : () => setFornecedorParaExcluir(null)}
        largura="440px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setFornecedorParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="filter-btn fornecedores-excluir-confirmar"
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
          Tem certeza que deseja excluir o fornecedor <strong>{fornecedorParaExcluir?.nome}</strong>? Só é
          possível excluir fornecedor sem nenhum vínculo; o caminho normal é desativar.
        </p>
        {erroExclusao && <div className="fornecedores-form-erro-api">{erroExclusao}</div>}
      </Modal>
    </div>
  );
}
