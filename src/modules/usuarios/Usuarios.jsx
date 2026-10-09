import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { DataGrid } from '../../app/components/DataGrid';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useUsuarios } from './useUsuarios';
import { UsuarioFormModal } from './UsuarioFormModal';
import { SenhaModal } from './SenhaModal';
import { formatarDataHora } from '../../lib/formatar';
import {
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  UserCheck,
  UserX,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './Usuarios.css';

export default function Usuarios() {
  const {
    usuarios,
    cargos,
    cargoMapa,
    temProxima,
    pagina,
    q,
    carregando,
    erro,
    chaveDados,
    recarregar,
    aplicarBusca,
    irParaAnterior,
    irParaProxima,
    criar,
    atualizar,
    excluir,
    trocarSenha,
    ativar,
    desativar,
  } = useUsuarios();

  const [buscaRascunho, setBuscaRascunho] = useState('');
  const [formModal, setFormModal] = useState(undefined);
  const [senhaAlvo, setSenhaAlvo] = useState(null);
  const [excluirAlvo, setExcluirAlvo] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);

  const abrirCriacao = () => setFormModal(null);
  const abrirEdicao = (usuario) => setFormModal(usuario);

  const aplicar = () => aplicarBusca(buscaRascunho);

  const limparBusca = () => {
    setBuscaRascunho('');
    aplicarBusca('');
  };

  const salvar = async (dados) => {
    if (formModal) {
      await atualizar(formModal.id, { ...dados, ativo: formModal.ativo ?? true });
    } else {
      await criar(dados);
    }
  };

  const alternarSituacao = async (usuario) => {
    setErroAcao(null);
    try {
      if (usuario.ativo) {
        await desativar(usuario.id);
      } else {
        await ativar(usuario.id);
      }
    } catch (e) {
      setErroAcao(e.message || 'Erro ao alterar a situação do usuário.');
    }
  };

  const confirmarExclusao = async () => {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await excluir(excluirAlvo.id);
      setExcluirAlvo(null);
    } catch (e) {
      setErroExclusao(e.message || 'Erro ao excluir o usuário.');
    } finally {
      setExcluindo(false);
    }
  };

  const textoUltimoAcesso = (valor) => {
    if (!valor || String(valor).startsWith('0001-01-01')) return '—';
    return formatarDataHora(valor);
  };

  const colunas = [
    { label: 'Nome', field: 'nome', width: '22%' },
    { label: 'E-mail', field: 'email', width: '20%' },
    {
      label: 'Cargo',
      field: 'cargo_id',
      width: '15%',
      render: (cargoId) => cargoMapa[cargoId]?.nome ?? '—',
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
      label: 'Último acesso',
      field: 'ultimo_login',
      width: '15%',
      render: (valor) => textoUltimoAcesso(valor),
    },
    {
      label: 'Ações',
      field: 'id',
      width: '150px',
      render: (id, usuario) => (
        <div className="leads-acoes" onClick={(evento) => evento.stopPropagation()}>
          <button
            type="button"
            className="leads-acao-btn"
            title="Editar"
            onClick={() => abrirEdicao(usuario)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="leads-acao-btn"
            title="Trocar senha"
            onClick={() => {
              setErroAcao(null);
              setSenhaAlvo(usuario);
            }}
          >
            <KeyRound size={14} />
          </button>
          <button
            type="button"
            className="leads-acao-btn"
            title={usuario.ativo ? 'Desativar' : 'Ativar'}
            onClick={() => alternarSituacao(usuario)}
          >
            {usuario.ativo ? <UserX size={14} /> : <UserCheck size={14} />}
          </button>
          <button
            type="button"
            className="leads-acao-btn leads-acao-perigo"
            title="Excluir"
            onClick={() => {
              setErroExclusao(null);
              setExcluirAlvo(usuario);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="usuarios-container">
      <div className="usuarios-toolbar">
        <div className="usuarios-toolbar-titulo">
          Usuários {carregando ? '…' : `(${usuarios.length})`}
        </div>
        <div className="usuarios-toolbar-acoes">
          <input
            className="filter-input usuarios-busca"
            type="search"
            placeholder="Buscar por nome ou e-mail…"
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
            Buscar
          </button>
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
            onClick={abrirCriacao}
          >
            <Plus size={16} /> Novo Usuário
          </button>
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
        <div className="leads-erro usuarios-erro-acao">
          <AlertCircle size={16} />
          <span>{erroAcao}</span>
          <button type="button" onClick={() => setErroAcao(null)}>
            Fechar
          </button>
        </div>
      )}

      {q && (
        <div className="usuarios-busca-info">
          <span>Busca: “{q}”</span>
          <button type="button" onClick={limparBusca}>
            Limpar busca
          </button>
        </div>
      )}

      <div className="usuarios-conteudo">
        {carregando ? (
          <div className="usuarios-status">Carregando usuários…</div>
        ) : usuarios.length === 0 ? (
          erro ? null : <div className="usuarios-status">Nenhum usuário encontrado.</div>
        ) : (
          <>
            <DataGrid
              key={chaveDados ?? 'usuarios'}
              columns={colunas}
              data={usuarios}
              selectable={false}
            />
            {(usuarios.length > 0 || pagina > 1) && (
              <div className="usuarios-paginacao">
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
                <span className="usuarios-paginacao-texto">Página {pagina}</span>
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

      {formModal !== undefined && (
        <UsuarioFormModal
          key={formModal?.id ?? 'novo-usuario'}
          usuario={formModal}
          cargos={cargos}
          onFechar={() => setFormModal(undefined)}
          onSalvar={salvar}
        />
      )}

      {senhaAlvo && (
        <SenhaModal
          key={senhaAlvo.id}
          usuario={senhaAlvo}
          onFechar={() => setSenhaAlvo(null)}
          onSalvar={(novaSenha) => trocarSenha(senhaAlvo.id, novaSenha)}
        />
      )}

      <Modal
        aberto={!!excluirAlvo}
        titulo="Excluir usuário"
        onFechar={excluindo ? () => {} : () => setExcluirAlvo(null)}
        largura="420px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setExcluirAlvo(null)}
              disabled={excluindo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="filter-btn usuarios-excluir-confirmar"
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
          Tem certeza que deseja excluir o usuário{' '}
          <strong>{excluirAlvo?.nome}</strong>? Esta ação não pode ser desfeita.
        </p>
        {erroExclusao && <div className="usuarios-form-erro-api">{erroExclusao}</div>}
      </Modal>
    </div>
  );
}
