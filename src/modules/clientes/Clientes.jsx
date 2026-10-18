import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { DataGrid } from '../../app/components/DataGrid';
import { Modal } from '../../app/components/Modal';
import { StatusBadge } from '../../app/components/StatusBadge';
import { ClienteFormModal } from './ClienteFormModal';
import { ImportacaoClientesModal } from './ImportacaoClientesModal';
import { TIPOS_CLIENTE, UFS, rotuloTipoCliente } from './clientesUtils';
import { useCadastrosCliente } from './useCadastrosCliente';
import { useClientes } from './useClientes';
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
import './Clientes.css';

export default function Clientes() {
  const { comercial, administrador } = useAutenticacao();
  const { grupos, representantes, nomeGrupo, nomeRepresentante } = useCadastrosCliente(comercial);
  const {
    clientes,
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
  } = useClientes();

  const [termo, setTermo] = useState('');
  const [clienteModal, setClienteModal] = useState(undefined);
  const [clienteParaExcluir, setClienteParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [alternando, setAlternando] = useState(null);
  const [importando, setImportando] = useState(false);

  const filtrando = Object.values(filtros).some(Boolean);

  const buscar = (evento) => {
    evento.preventDefault();
    filtrar({ busca: termo.trim() });
  };

  const trocarSituacao = async (cliente) => {
    setErroAcao(null);
    setAlternando(cliente.id);
    try {
      await alternarSituacao(cliente);
    } catch (e) {
      setErroAcao(e.message || 'Erro ao alterar a situação do cliente.');
    } finally {
      setAlternando(null);
    }
  };

  const confirmarExclusao = async () => {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await excluir(clienteParaExcluir.id);
      setClienteParaExcluir(null);
    } catch (e) {
      setErroExclusao(e.message || 'Erro ao excluir o cliente.');
    } finally {
      setExcluindo(false);
    }
  };

  const colunas = [
    {
      label: 'Nome',
      field: 'nome',
      width: '24%',
      render: (nome, cliente) => (
        <div className="clientes-empilhado">
          <Link to={`/clientes/${cliente.id}`}>{nome}</Link>
          {cliente.nome_fantasia && <span className="clientes-secundario">{cliente.nome_fantasia}</span>}
        </div>
      ),
    },
    { label: 'Documento', field: 'documento_formatado', width: '15%' },
    { label: 'Tipo', field: 'tipo', width: '10%', render: (tipo) => rotuloTipoCliente(tipo) },
    {
      label: 'Cidade',
      field: 'cidade',
      width: '14%',
      render: (cidade, cliente) => `${cidade}/${cliente.uf}`,
    },
    { label: 'Grupo', field: 'grupo_id', width: '12%', render: (grupoId) => nomeGrupo(grupoId) },
    {
      label: 'Representante',
      field: 'representante_id',
      width: '12%',
      render: (representanteId) => nomeRepresentante(representanteId),
    },
    {
      label: 'Situação',
      field: 'ativo',
      width: '8%',
      render: (ativo) => <StatusBadge status={ativo ? 'success' : 'danger'} label={ativo ? 'Ativo' : 'Inativo'} />,
    },
  ];

  if (comercial || administrador) {
    colunas.push({
      label: 'Ações',
      field: 'id',
      width: '110px',
      render: (id, cliente) => (
        <div className="leads-acoes">
          {comercial && (
            <>
              <button
                type="button"
                className="leads-acao-btn"
                title="Editar cliente"
                aria-label="Editar cliente"
                onClick={() => setClienteModal(cliente)}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="leads-acao-btn"
                title={cliente.ativo ? 'Desativar cliente' : 'Ativar cliente'}
                aria-label={cliente.ativo ? 'Desativar cliente' : 'Ativar cliente'}
                onClick={() => trocarSituacao(cliente)}
                disabled={alternando === id}
              >
                {cliente.ativo ? <PowerOff size={14} /> : <Power size={14} />}
              </button>
            </>
          )}
          {administrador && (
            <button
              type="button"
              className="leads-acao-btn leads-acao-perigo"
              title="Excluir cliente"
              aria-label="Excluir cliente"
              onClick={() => {
                setErroExclusao(null);
                setClienteParaExcluir(cliente);
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    });
  }

  const dadosDaChave = `${chaveDados ?? 'clientes'}-${grupos ? 'g' : ''}-${representantes ? 'r' : ''}`;

  return (
    <div className="clientes-container">
      <div className="clientes-toolbar">
        <div className="clientes-toolbar-titulo">Clientes</div>
        <div className="clientes-toolbar-acoes">
          <form className="clientes-busca" role="search" onSubmit={buscar}>
            <input
              type="search"
              className="filter-input"
              aria-label="Buscar cliente"
              placeholder="Nome ou documento"
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
          <label className="filter-label" htmlFor="clientes-tipo">
            Tipo
          </label>
          <select
            id="clientes-tipo"
            className="filter-input clientes-filtro"
            value={filtros.tipo}
            onChange={(evento) => filtrar({ tipo: evento.target.value })}
          >
            <option value="">Todos</option>
            {TIPOS_CLIENTE.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.rotulo}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="clientes-uf">
            UF
          </label>
          <select
            id="clientes-uf"
            className="filter-input clientes-filtro"
            value={filtros.uf}
            onChange={(evento) => filtrar({ uf: evento.target.value })}
          >
            <option value="">Todas</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          <label className="filter-label" htmlFor="clientes-grupo">
            Grupo
          </label>
          <select
            id="clientes-grupo"
            className="filter-input clientes-filtro"
            value={filtros.grupo}
            onChange={(evento) => filtrar({ grupo: evento.target.value })}
          >
            <option value="">Todos</option>
            {(grupos || []).map((grupo) => (
              <option key={grupo.id} value={grupo.id}>
                {grupo.nome}
              </option>
            ))}
          </select>
          {comercial && (
            <>
              <label className="filter-label" htmlFor="clientes-representante">
                Representante
              </label>
              <select
                id="clientes-representante"
                className="filter-input clientes-filtro"
                value={filtros.representante}
                onChange={(evento) => filtrar({ representante: evento.target.value })}
              >
                <option value="">Todos</option>
                {(representantes || []).map((representante) => (
                  <option key={representante.id} value={representante.id}>
                    {representante.nome}
                  </option>
                ))}
              </select>
            </>
          )}
          <label className="filter-label" htmlFor="clientes-situacao">
            Situação
          </label>
          <select
            id="clientes-situacao"
            className="filter-input clientes-filtro"
            value={filtros.ativo}
            onChange={(evento) => filtrar({ ativo: evento.target.value })}
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
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
          {comercial && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setClienteModal(null)}
            >
              <Plus size={16} /> Novo Cliente
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

      <div className="clientes-conteudo">
        {carregando ? (
          <div className="clientes-status">Carregando clientes…</div>
        ) : clientes.length > 0 ? (
          <>
            <DataGrid key={dadosDaChave} columns={colunas} data={clientes} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="clientes-paginacao">
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
                <span className="clientes-paginacao-texto">Página {pagina}</span>
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
          <div className="clientes-status">
            {filtrando ? 'Nenhum cliente encontrado com estes filtros.' : 'Nenhum cliente cadastrado.'}
          </div>
        )}
      </div>

      {clienteModal !== undefined && (
        <ClienteFormModal
          key={clienteModal?.id ?? 'novo-cliente'}
          cliente={clienteModal}
          grupos={grupos}
          representantes={representantes}
          onFechar={() => setClienteModal(undefined)}
          onSalvar={(dados) => (clienteModal ? atualizar(clienteModal.id, dados) : criar(dados))}
        />
      )}

      {importando && <ImportacaoClientesModal onFechar={() => setImportando(false)} onImportado={recarregar} />}

      <Modal
        aberto={!!clienteParaExcluir}
        titulo="Excluir cliente"
        onFechar={excluindo ? () => {} : () => setClienteParaExcluir(null)}
        largura="440px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setClienteParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="filter-btn clientes-excluir-confirmar"
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
          Tem certeza que deseja excluir o cliente <strong>{clienteParaExcluir?.nome}</strong>? Só é possível excluir
          cliente sem obra nem outro vínculo; o caminho normal é desativar.
        </p>
        {erroExclusao && <div className="clientes-form-erro-api">{erroExclusao}</div>}
      </Modal>
    </div>
  );
}
