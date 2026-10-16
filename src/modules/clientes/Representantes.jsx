import React, { useEffect, useMemo, useState } from 'react';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';
import { DataGrid } from '../../app/components/DataGrid';
import { StatusBadge } from '../../app/components/StatusBadge';
import * as usuariosService from '../../services/usuarios';
import { formatarPercentual } from './clientesUtils';
import { RepresentanteFormModal } from './RepresentanteFormModal';
import { useRepresentantes } from './useRepresentantes';
import { AlertCircle, ChevronLeft, ChevronRight, Pencil, Plus, Power, PowerOff, Search } from 'lucide-react';
import './Clientes.css';

function useUsuariosParaVinculo(ativo) {
  const [estado, setEstado] = useState({ usuarios: null, erro: null });

  useEffect(() => {
    if (!ativo) return undefined;
    const controle = new AbortController();

    usuariosService
      .listarTodosUsuarios({ sinal: controle.signal })
      .then((usuarios) => setEstado({ usuarios: usuarios || [], erro: null }))
      .catch((e) => {
        if (e && e.name === 'AbortError') return;
        setEstado({ usuarios: null, erro: (e && e.message) || 'Erro ao carregar os usuários.' });
      });

    return () => controle.abort();
  }, [ativo]);

  return estado;
}

export default function Representantes() {
  const { administrador } = useAutenticacao();
  const {
    representantes,
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
  } = useRepresentantes();
  const { usuarios, erro: erroUsuarios } = useUsuariosParaVinculo(administrador);

  const [termo, setTermo] = useState('');
  const [representanteModal, setRepresentanteModal] = useState(undefined);
  const [erroAcao, setErroAcao] = useState(null);
  const [alternando, setAlternando] = useState(null);

  const nomeUsuario = useMemo(
    () => Object.fromEntries((usuarios || []).map((usuario) => [usuario.id, usuario.nome])),
    [usuarios]
  );

  const filtrando = !!(filtros.busca || filtros.ativos);

  const buscar = (evento) => {
    evento.preventDefault();
    filtrar({ busca: termo.trim() });
  };

  const trocarSituacao = async (representante) => {
    setErroAcao(null);
    setAlternando(representante.id);
    try {
      await alternarSituacao(representante);
    } catch (e) {
      setErroAcao(e.message || 'Erro ao alterar a situação do representante.');
    } finally {
      setAlternando(null);
    }
  };

  const loginDe = (usuarioId) => {
    if (!usuarioId) return 'Sem login';
    if (!administrador) return 'Com login';
    return nomeUsuario[usuarioId] || 'Com login';
  };

  const colunas = [
    {
      label: 'Nome',
      field: 'nome',
      width: '24%',
      render: (nome, representante) => (
        <div className="clientes-empilhado">
          <span>{nome}</span>
          {representante.email && <span className="clientes-secundario">{representante.email}</span>}
        </div>
      ),
    },
    {
      label: 'Documento',
      field: 'documento',
      width: '16%',
      render: (_, representante) => representante.documento_formatado || representante.documento || '—',
    },
    { label: 'Login', field: 'usuario_id', width: '16%', render: (usuarioId) => loginDe(usuarioId) },
    {
      label: 'Pronta entrega',
      field: 'comissao_pronta_entrega_bp',
      width: '11%',
      render: (valor) => formatarPercentual(valor),
    },
    {
      label: 'Importação',
      field: 'comissao_importacao_bp',
      width: '11%',
      render: (valor) => formatarPercentual(valor),
    },
    {
      label: 'Situação',
      field: 'ativo',
      width: '10%',
      render: (ativo) => <StatusBadge status={ativo ? 'success' : 'danger'} label={ativo ? 'Ativo' : 'Inativo'} />,
    },
  ];

  if (administrador) {
    colunas.push({
      label: 'Ações',
      field: 'id',
      width: '100px',
      render: (id, representante) => (
        <div className="leads-acoes">
          <button
            type="button"
            className="leads-acao-btn"
            title="Editar representante"
            aria-label="Editar representante"
            onClick={() => setRepresentanteModal(representante)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="leads-acao-btn"
            title={representante.ativo ? 'Desativar representante' : 'Ativar representante'}
            aria-label={representante.ativo ? 'Desativar representante' : 'Ativar representante'}
            onClick={() => trocarSituacao(representante)}
            disabled={alternando === id}
          >
            {representante.ativo ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
        </div>
      ),
    });
  }

  return (
    <div className="clientes-container">
      <div className="clientes-toolbar">
        <div className="clientes-toolbar-titulo">Representantes</div>
        <div className="clientes-toolbar-acoes">
          <form className="clientes-busca" role="search" onSubmit={buscar}>
            <input
              type="search"
              className="filter-input"
              aria-label="Buscar representante"
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
          <label className="filter-label" htmlFor="representantes-situacao">
            Situação
          </label>
          <select
            id="representantes-situacao"
            className="filter-input clientes-filtro"
            value={filtros.ativos}
            onChange={(evento) => filtrar({ ativos: evento.target.value })}
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          {administrador && (
            <button
              type="button"
              className="filter-btn filter-btn-primary"
              style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setRepresentanteModal(null)}
            >
              <Plus size={16} /> Novo Representante
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
          <div className="clientes-status">Carregando representantes…</div>
        ) : representantes.length > 0 ? (
          <>
            <DataGrid
              key={`${chaveDados ?? 'representantes'}-${usuarios ? 'u' : ''}`}
              columns={colunas}
              data={representantes}
              selectable={false}
            />
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
            {filtrando ? 'Nenhum representante encontrado com estes filtros.' : 'Nenhum representante cadastrado.'}
          </div>
        )}
      </div>

      {representanteModal !== undefined && (
        <RepresentanteFormModal
          key={representanteModal?.id ?? 'novo-representante'}
          representante={representanteModal}
          usuarios={usuarios}
          erroUsuarios={erroUsuarios}
          onFechar={() => setRepresentanteModal(undefined)}
          onSalvar={(dados) => (representanteModal ? atualizar(representanteModal.id, dados) : criar(dados))}
        />
      )}
    </div>
  );
}
