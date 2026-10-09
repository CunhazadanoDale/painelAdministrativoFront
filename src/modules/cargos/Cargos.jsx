import React, { useState } from 'react';
import { DataGrid } from '../../app/components/DataGrid';
import { StatusBadge } from '../../app/components/StatusBadge';
import { Modal } from '../../app/components/Modal';
import { CargoFormModal } from './CargoFormModal';
import { useCargos } from './useCargos';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import './Cargos.css';

export default function Cargos() {
  const {
    cargos,
    pagina,
    temProxima,
    carregando,
    erro,
    recarregar,
    irParaAnterior,
    irParaProxima,
    criar,
    atualizar,
    excluir,
  } = useCargos();

  const [cargoModal, setCargoModal] = useState(undefined);
  const [cargoParaExcluir, setCargoParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);

  const abrirNovoCargo = () => setCargoModal(null);
  const abrirEdicaoCargo = (cargo) => setCargoModal(cargo);

  const confirmarExclusao = async () => {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await excluir(cargoParaExcluir.id);
      setCargoParaExcluir(null);
    } catch (e) {
      setErroExclusao(e.message || 'Erro ao excluir o cargo.');
    } finally {
      setExcluindo(false);
    }
  };

  const colunas = [
    { label: 'Nome', field: 'nome', width: '18%' },
    {
      label: 'Descrição',
      field: 'descricao',
      width: '34%',
      render: (valor) => <span className="cargos-descricao">{valor || '—'}</span>,
    },
    {
      label: 'Perfis',
      field: 'administrador',
      width: '16%',
      render: (administrador, cargo) => {
        const perfis = [];
        if (administrador) {
          perfis.push(<StatusBadge key="administrador" status="info" label="Administrador" />);
        }
        if (cargo.financeiro) {
          perfis.push(<StatusBadge key="financeiro" status="warning" label="Financeiro" />);
        }
        if (perfis.length === 0) return '—';
        return <span className="cargos-perfis">{perfis}</span>;
      },
    },
    {
      label: 'Situação',
      field: 'ativo',
      width: '12%',
      render: (ativo) =>
        ativo ? (
          <StatusBadge status="success" label="Ativo" />
        ) : (
          <StatusBadge status="danger" label="Inativo" />
        ),
    },
    {
      label: 'Ações',
      field: 'id',
      width: '80px',
      render: (id, cargo) => (
        <div className="leads-acoes">
          <button
            type="button"
            className="leads-acao-btn"
            title="Editar cargo"
            onClick={() => abrirEdicaoCargo(cargo)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="leads-acao-btn leads-acao-perigo"
            title="Excluir cargo"
            onClick={() => {
              setErroExclusao(null);
              setCargoParaExcluir(cargo);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="cargos-container">
      <div className="cargos-toolbar">
        <div className="cargos-toolbar-titulo">Cargos</div>
        <button
          type="button"
          className="filter-btn filter-btn-primary"
          style={{ width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={abrirNovoCargo}
        >
          <Plus size={16} /> Novo Cargo
        </button>
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

      <div className="cargos-conteudo">
        {carregando ? (
          <div className="cargos-status">Carregando cargos…</div>
        ) : cargos.length > 0 ? (
          <>
            <DataGrid key={pagina} columns={colunas} data={cargos} selectable={false} />
            {(temProxima || pagina > 1) && (
              <div className="cargos-paginacao">
                <button
                  type="button"
                  className="filter-btn filter-btn-secondary"
                  style={{ flex: 'none', padding: '4px 10px' }}
                  onClick={irParaAnterior}
                  disabled={pagina <= 1}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="cargos-paginacao-texto">Página {pagina}</span>
                <button
                  type="button"
                  className="filter-btn filter-btn-secondary"
                  style={{ flex: 'none', padding: '4px 10px' }}
                  onClick={irParaProxima}
                  disabled={!temProxima}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        ) : erro ? null : (
          <div className="cargos-vazio">Nenhum cargo cadastrado.</div>
        )}
      </div>

      {cargoModal !== undefined && (
        <CargoFormModal
          key={cargoModal?.id ?? 'novo-cargo'}
          cargo={cargoModal}
          onFechar={() => setCargoModal(undefined)}
          onSalvar={(dados) => (cargoModal ? atualizar(cargoModal.id, dados) : criar(dados))}
        />
      )}

      <Modal
        aberto={!!cargoParaExcluir}
        titulo="Excluir cargo"
        onFechar={excluindo ? () => {} : () => setCargoParaExcluir(null)}
        largura="420px"
        rodape={
          <>
            <button
              type="button"
              className="filter-btn filter-btn-secondary"
              style={{ flex: 'none', padding: '8px 16px' }}
              onClick={() => setCargoParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="filter-btn cargos-excluir-confirmar"
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
          Tem certeza que deseja excluir o cargo{' '}
          <strong>{cargoParaExcluir?.nome}</strong>? Esta ação não pode ser desfeita.
        </p>
        {erroExclusao && <div className="cargos-form-erro-api">{erroExclusao}</div>}
      </Modal>
    </div>
  );
}
