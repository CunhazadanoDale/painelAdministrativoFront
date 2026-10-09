import React, { useState } from 'react';
import { DataGrid } from '../../app/components/DataGrid';
import { Modal } from '../../app/components/Modal';
import { useAprovadores } from './useAprovadores';
import { formatarDataHora } from '../../lib/formatar';
import { UserPlus, Trash2, AlertCircle } from 'lucide-react';
import './Aprovadores.css';

export default function Aprovadores() {
  const {
    aprovadores,
    usuariosPorId,
    usuariosDisponiveis,
    carregando,
    erro,
    recarregar,
    designar,
    remover,
  } = useAprovadores();

  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [designando, setDesignando] = useState(false);
  const [erroAcao, setErroAcao] = useState(null);
  const [aprovadorParaRemover, setAprovadorParaRemover] = useState(null);
  const [removendo, setRemovendo] = useState(false);
  const [erroRemocao, setErroRemocao] = useState(null);

  const nomeDoAprovador = (aprovador) => {
    if (!aprovador) return '';
    const usuario = usuariosPorId[aprovador.usuario_id];
    if (usuario) return usuario.nome;
    return `Usuário ${aprovador.usuario_id}`;
  };

  const aoDesignar = async () => {
    if (!usuarioSelecionado || designando) return;
    const usuario = usuariosDisponiveis.find(
      (item) => String(item.id) === usuarioSelecionado
    );
    if (!usuario) return;

    setDesignando(true);
    setErroAcao(null);
    try {
      await designar(usuario.id);
      setUsuarioSelecionado('');
    } catch (e) {
      setErroAcao(e.message || 'Erro ao designar o aprovador.');
    } finally {
      setDesignando(false);
    }
  };

  const confirmarRemocao = async () => {
    setRemovendo(true);
    setErroRemocao(null);
    try {
      await remover(aprovadorParaRemover.id);
      setAprovadorParaRemover(null);
    } catch (e) {
      setErroRemocao(e.message || 'Erro ao remover a designação.');
    } finally {
      setRemovendo(false);
    }
  };

  const colunas = [
    {
      label: 'Usuário',
      field: 'usuario_id',
      width: '50%',
      render: (usuarioId) => {
        const usuario = usuariosPorId[usuarioId];
        if (!usuario) return '—';
        return (
          <div className="aprovadores-usuario">
            <span className="aprovadores-usuario-nome">{usuario.nome}</span>
            <span className="aprovadores-usuario-email">{usuario.email}</span>
          </div>
        );
      },
    },
    {
      label: 'Designado em',
      field: 'criado_em',
      width: '22%',
      render: (valor) => formatarDataHora(valor),
    },
    {
      label: 'Ações',
      field: 'id',
      width: '80px',
      render: (id, aprovador) => (
        <div className="leads-acoes">
          <button
            type="button"
            className="leads-acao-btn leads-acao-perigo"
            title="Remover designação"
            onClick={() => {
              setErroRemocao(null);
              setAprovadorParaRemover(aprovador);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="aprovadores-container">
      <div className="aprovadores-toolbar">
        <div className="aprovadores-toolbar-titulo">Aprovadores</div>
        <div className="aprovadores-designacao">
          <select
            className="filter-select aprovadores-select"
            value={usuarioSelecionado}
            onChange={(event) => setUsuarioSelecionado(event.target.value)}
            disabled={designando || carregando}
            aria-label="Usuário a designar"
          >
            <option value="">
              {usuariosDisponiveis.length === 0
                ? 'Nenhum usuário disponível'
                : 'Selecione o usuário…'}
            </option>
            {usuariosDisponiveis.map((usuario) => (
              <option key={usuario.id} value={String(usuario.id)}>
                {usuario.nome} — {usuario.email}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="filter-btn filter-btn-primary aprovadores-designar-btn"
            onClick={aoDesignar}
            disabled={!usuarioSelecionado || designando || carregando}
          >
            <UserPlus size={16} /> {designando ? 'Designando…' : 'Designar'}
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
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erroAcao}</span>
          <button type="button" onClick={() => setErroAcao(null)}>
            Fechar
          </button>
        </div>
      )}

      <div className="aprovadores-conteudo">
        {carregando ? (
          <div className="aprovadores-status">Carregando aprovadores…</div>
        ) : aprovadores.length > 0 ? (
          <DataGrid columns={colunas} data={aprovadores} selectable={false} />
        ) : erro ? null : (
          <div className="aprovadores-vazio">Nenhum aprovador designado.</div>
        )}
      </div>

      <Modal
        aberto={!!aprovadorParaRemover}
        titulo="Remover designação"
        onFechar={removendo ? () => {} : () => setAprovadorParaRemover(null)}
        largura="420px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setAprovadorParaRemover(null)}
              disabled={removendo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="filter-btn aprovadores-remover-confirmar"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={confirmarRemocao}
              disabled={removendo}
            >
              {removendo ? 'Removendo…' : 'Remover'}
            </button>
          </>
        }
      >
        <p>
          Remover a designação de <strong>{nomeDoAprovador(aprovadorParaRemover)}</strong>?
          O histórico de aprovações é preservado.
        </p>
        {erroRemocao && <div className="aprovadores-form-erro-api">{erroRemocao}</div>}
      </Modal>
    </div>
  );
}
