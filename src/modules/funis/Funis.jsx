import React, { useState } from 'react';
import { Modal } from '../../app/components/Modal';
import { useFunis } from './useFunis';
import { FunilFormModal } from './FunilFormModal';
import { EtapaFormModal } from './EtapaFormModal';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
} from 'lucide-react';
import './Funis.css';

/**
 * Tela de gestão de funis e etapas (estrutura do CRM).
 * Painel esquerdo: funis. Painel direito: etapas do funil selecionado,
 * com reordenação por setas (PUT /funils/{id}/etapas/ordem).
 */
export default function Funis() {
  const {
    funis,
    funilSelecionado,
    funilSelecionadoId,
    etapas,
    contagens,
    carregandoFunis,
    carregandoEtapas,
    erroFunis,
    erroEtapas,
    selecionarFunil,
    criarNovoFunil,
    salvarFunil,
    excluirFunil,
    criarNovaEtapa,
    salvarEtapa,
    excluirEtapa,
    moverEtapa,
    recarregarFunis,
    recarregarEtapas,
  } = useFunis();

  // Modais: montados sob demanda (estado nasce preenchido).
  const [funilModal, setFunilModal] = useState(undefined);
  const [etapaModal, setEtapaModal] = useState(undefined);
  // Exclusão em andamento: { tipo: 'funil'|'etapa', item }.
  const [excluirAlvo, setExcluirAlvo] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);
  // Erro de ações no painel de etapas (reordenação, exclusão bloqueada).
  const [erroAcao, setErroAcao] = useState(null);

  const abrirNovoFunil = () => setFunilModal(null);
  const abrirEdicaoFunil = (funil) => setFunilModal(funil);

  const abrirNovaEtapa = () => setEtapaModal(null);
  const abrirEdicaoEtapa = (etapa) => setEtapaModal(etapa);

  const confirmarExclusao = async () => {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      if (excluirAlvo.tipo === 'funil') {
        await excluirFunil(excluirAlvo.item);
      } else {
        await excluirEtapa(excluirAlvo.item);
      }
      setExcluirAlvo(null);
    } catch (e) {
      setErroExclusao(e.message || 'Erro ao excluir.');
    } finally {
      setExcluindo(false);
    }
  };

  const executarAcao = async (acao) => {
    setErroAcao(null);
    try {
      await acao();
    } catch (e) {
      setErroAcao(e.message || 'Erro na operação.');
    }
  };

  return (
    <div className="funis-container">
      <div className="funis-toolbar">
        <div className="funis-toolbar-titulo">
          Funis {carregandoFunis ? '…' : `(${funis.length})`}
        </div>
        <button
          type="button"
          className="filter-btn filter-btn-primary"
          style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={abrirNovoFunil}
        >
          <Plus size={16} /> Novo Funil
        </button>
      </div>

      {erroFunis && (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erroFunis}</span>
          <button type="button" onClick={recarregarFunis}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className="funis-paineis">
        {/* Funis */}
        <section className="funis-painel">
          <header className="funis-painel-cabecalho">
            <h2>Funis</h2>
          </header>

          {carregandoFunis ? (
            <div className="funis-status">Carregando funis…</div>
          ) : funis.length === 0 && !erroFunis ? (
            <div className="funis-status">Nenhum funil cadastrado ainda.</div>
          ) : (
            <ul className="funis-lista">
              {funis.map((funil) => (
                <li
                  key={funil.funil_id}
                  className={`funis-item ${
                    funil.funil_id === funilSelecionadoId ? 'funis-item-ativo' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="funis-item-info"
                    onClick={() => selecionarFunil(funil.funil_id)}
                  >
                    <span className="funis-item-nome">{funil.nome}</span>
                    {!funil.ativo && <span className="funis-tag funis-tag-inativo">Inativo</span>}
                  </button>
                  <div className="funis-acoes">
                    <button
                      type="button"
                      className="funis-acao-btn"
                      title="Editar funil"
                      onClick={() => abrirEdicaoFunil(funil)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="funis-acao-btn funis-acao-perigo"
                      title="Excluir funil"
                      onClick={() => {
                        setErroExclusao(null);
                        setExcluirAlvo({ tipo: 'funil', item: funil });
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Etapas do funil selecionado */}
        <section className="funis-painel">
          <header className="funis-painel-cabecalho">
            <h2>{funilSelecionado ? `Etapas — ${funilSelecionado.nome}` : 'Etapas'}</h2>
            {funilSelecionado && (
              <button
                type="button"
                className="filter-btn filter-btn-primary"
                style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={abrirNovaEtapa}
              >
                <Plus size={14} /> Nova Etapa
              </button>
            )}
          </header>

          {erroAcao && (
            <div className="leads-erro funis-erro-acao">
              <AlertCircle size={16} />
              <span>{erroAcao}</span>
            </div>
          )}

          {!funilSelecionado ? (
            <div className="funis-status">
              Selecione um funil para ver e organizar as etapas.
            </div>
          ) : carregandoEtapas ? (
            <div className="funis-status">Carregando etapas…</div>
          ) : erroEtapas ? (
            <div className="leads-erro">
              <AlertCircle size={16} />
              <span>{erroEtapas}</span>
              <button type="button" onClick={recarregarEtapas}>
                Tentar novamente
              </button>
            </div>
          ) : etapas.length === 0 ? (
            <div className="funis-status">
              Nenhuma etapa neste funil. Crie a primeira etapa para começar a
              organizar os leads.
            </div>
          ) : (
            <ol className="funis-etapas">
              {etapas.map((etapa, indice) => (
                <li className="funis-etapa" key={etapa.etapa_id}>
                  <span className="funis-etapa-ordem">{indice + 1}</span>
                  <div className="funis-etapa-info">
                    <span className="funis-etapa-nome">
                      {etapa.nome}
                      {!etapa.ativo && <span className="funis-tag funis-tag-inativo">Inativa</span>}
                    </span>
                    <span className="funis-etapa-contagem">
                      {contagens[etapa.etapa_id] ?? 0} lead(s)
                    </span>
                  </div>
                  <div className="funis-acoes">
                    <button
                      type="button"
                      className="funis-acao-btn"
                      title="Mover para cima"
                      disabled={indice === 0}
                      onClick={() => executarAcao(() => moverEtapa(etapa, -1))}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="funis-acao-btn"
                      title="Mover para baixo"
                      disabled={indice === etapas.length - 1}
                      onClick={() => executarAcao(() => moverEtapa(etapa, 1))}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="funis-acao-btn"
                      title="Editar etapa"
                      onClick={() => abrirEdicaoEtapa(etapa)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="funis-acao-btn funis-acao-perigo"
                      title="Excluir etapa"
                      onClick={() => {
                        setErroExclusao(null);
                        setExcluirAlvo({ tipo: 'etapa', item: etapa });
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {funilModal !== undefined && (
        <FunilFormModal
          key={funilModal?.funil_id ?? 'novo-funil'}
          funil={funilModal}
          onFechar={() => setFunilModal(undefined)}
          onSalvar={(dados) =>
            funilModal ? salvarFunil(funilModal, dados) : criarNovoFunil(dados)
          }
        />
      )}

      {etapaModal !== undefined && (
        <EtapaFormModal
          key={etapaModal?.etapa_id ?? 'nova-etapa'}
          etapa={etapaModal}
          onFechar={() => setEtapaModal(undefined)}
          onSalvar={(dados) =>
            etapaModal ? salvarEtapa(etapaModal, dados) : criarNovaEtapa(dados)
          }
        />
      )}

      <Modal
        aberto={!!excluirAlvo}
        titulo={excluirAlvo?.tipo === 'funil' ? 'Excluir funil' : 'Excluir etapa'}
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
              className="filter-btn funis-excluir-confirmar"
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
          Tem certeza que deseja excluir{' '}
          <strong>{excluirAlvo?.item?.nome}</strong>? Esta ação não pode ser
          desfeita.
        </p>
        {erroExclusao && <div className="funis-form-erro-api">{erroExclusao}</div>}
      </Modal>
    </div>
  );
}
