import React, { useState } from 'react';
import { AvisoConflito } from '../../app/components/AvisoConflito';
import { Modal } from '../../app/components/Modal';
import { StatusBadge } from '../../app/components/StatusBadge';
import { useNomesLocais } from '../../app/estoque/useNomesLocais';
import { ehConflitoDeConcorrencia } from '../../lib/api';
import { formatarDataHora } from '../../lib/formatar';
import { ReservaModal } from './ReservaModal';
import { useReservasProduto } from './useReservasProduto';
import { AlertCircle, ChevronLeft, ChevronRight, PackageCheck, Plus, Undo2 } from 'lucide-react';
import '../../app/components/DataGrid.css';
import './Produtos.css';

const STATUS = {
  ativa: { rotulo: 'Ativa', cor: 'warning' },
  baixada: { rotulo: 'Baixada', cor: 'success' },
  liberada: { rotulo: 'Liberada', cor: 'neutral' },
};

const VAZIO_POR_STATUS = {
  ativa: 'Nenhuma reserva ativa.',
  baixada: 'Nenhuma reserva baixada.',
  liberada: 'Nenhuma reserva liberada.',
  '': 'Nenhuma reserva registrada.',
};

function rotuloOrigem(origem) {
  return origem === 'manual' ? 'Manual' : 'Pedido';
}

function EncerrarReservaModal({ acao, reserva, nomeLocal, onFechar, onConfirmar, onRecarregar }) {
  const baixa = acao === 'baixar';
  const [documento, setDocumento] = useState('');
  const [erro, setErro] = useState(null);
  const [conflito, setConflito] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    setSalvando(true);
    setErro(null);
    setConflito(null);
    try {
      await onConfirmar(documento.trim());
      onFechar();
    } catch (e) {
      if (ehConflitoDeConcorrencia(e)) setConflito(e.message);
      else setErro(e.message || 'Erro ao encerrar a reserva.');
    } finally {
      setSalvando(false);
    }
  };

  const recarregar = () => {
    onFechar();
    onRecarregar();
  };

  return (
    <Modal
      aberto
      titulo={baixa ? 'Baixar reserva' : 'Liberar reserva'}
      onFechar={salvando ? () => {} : onFechar}
      largura="440px"
      rodape={
        <>
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={onFechar}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', padding: '8px 16px' }}
            onClick={confirmar}
            disabled={salvando}
          >
            {salvando ? 'Gravando…' : baixa ? 'Baixar' : 'Liberar'}
          </button>
        </>
      }
    >
      <div className="produtos-form">
        {erro && (
          <div className="produtos-form-erro-api" role="alert">
            {erro}
          </div>
        )}
        {conflito && <AvisoConflito mensagem={conflito} onRecarregar={recarregar} />}
        <p className="produtos-movimento-produto">
          {baixa
            ? `Registra a saída de ${reserva.quantidade} em ${nomeLocal(reserva.local_id)} e encerra a reserva.`
            : `Devolve ${reserva.quantidade} ao disponível de ${nomeLocal(reserva.local_id)} sem tirar do estoque.`}
        </p>
        {baixa && (
          <div className="produtos-form-campo">
            <label className="filter-label" htmlFor="baixa-documento">
              Documento de referência
            </label>
            <input
              id="baixa-documento"
              className="filter-input"
              type="text"
              placeholder="Nº da nota ou do romaneio"
              value={documento}
              onChange={(evento) => setDocumento(evento.target.value)}
              disabled={salvando}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ReservasProduto({ produto, geracao, administrador, onReservar, onLiberar, onBaixar, onRecarregar }) {
  const nomeLocal = useNomesLocais();
  const {
    reservas,
    pagina,
    status,
    temProxima,
    carregando,
    erro,
    recarregar,
    irParaAnterior,
    irParaProxima,
    filtrarStatus,
  } = useReservasProduto(produto.id, geracao);

  const [novaAberta, setNovaAberta] = useState(false);
  const [encerramento, setEncerramento] = useState(null);

  const confirmarEncerramento = (documento) => {
    const { acao, reserva } = encerramento;
    if (acao === 'liberar') return onLiberar(reserva);
    const dados = {
      tipo: 'saida',
      local_id: reserva.local_id,
      quantidade: reserva.quantidade,
      reserva_id: reserva.id,
      observacao: reserva.observacao || '',
    };
    if (documento) dados.documento_ref = documento;
    return onBaixar(dados);
  };

  return (
    <div className="produtos-reservas">
      <div className="produtos-movimentos-filtro">
        <label className="filter-label" htmlFor="produto-reservas-status">
          Status das reservas
        </label>
        <select
          id="produto-reservas-status"
          className="filter-input"
          value={status}
          onChange={(evento) => filtrarStatus(evento.target.value)}
        >
          <option value="ativa">Ativas</option>
          <option value="baixada">Baixadas</option>
          <option value="liberada">Liberadas</option>
          <option value="">Todas</option>
        </select>
        {administrador && (
          <button
            type="button"
            className="filter-btn filter-btn-primary"
            style={{ flex: 'none', width: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setNovaAberta(true)}
          >
            <Plus size={14} /> Nova reserva
          </button>
        )}
      </div>

      {erro ? (
        <div className="leads-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      ) : carregando ? (
        <div className="produtos-imagens-vazio">Carregando reservas…</div>
      ) : reservas.length === 0 ? (
        <div className="produtos-imagens-vazio">{VAZIO_POR_STATUS[status]}</div>
      ) : (
        <div className="datagrid-container">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Data</th>
                <th>Local</th>
                <th>Quantidade</th>
                <th>Origem</th>
                <th>Status</th>
                <th>Observação</th>
                {administrador && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {reservas.map((reserva) => {
                const situacao = STATUS[reserva.status] ?? { rotulo: reserva.status, cor: 'neutral' };
                const ativa = reserva.status === 'ativa';
                const manual = reserva.origem === 'manual';
                return (
                  <tr key={reserva.id}>
                    <td>{formatarDataHora(reserva.criado_em)}</td>
                    <td>{nomeLocal(reserva.local_id)}</td>
                    <td>{reserva.quantidade}</td>
                    <td>{rotuloOrigem(reserva.origem)}</td>
                    <td>
                      <StatusBadge status={situacao.cor} label={situacao.rotulo} />
                    </td>
                    <td>
                      <span className="produtos-observacao-celula">{reserva.observacao || '—'}</span>
                    </td>
                    {administrador && (
                      <td>
                        {ativa && manual && (
                          <div className="leads-acoes">
                            <button
                              type="button"
                              className="leads-acao-btn"
                              title="Baixar reserva"
                              aria-label="Baixar reserva"
                              onClick={() => setEncerramento({ acao: 'baixar', reserva })}
                            >
                              <PackageCheck size={14} />
                            </button>
                            <button
                              type="button"
                              className="leads-acao-btn"
                              title="Liberar reserva"
                              aria-label="Liberar reserva"
                              onClick={() => setEncerramento({ acao: 'liberar', reserva })}
                            >
                              <Undo2 size={14} />
                            </button>
                          </div>
                        )}
                        {ativa && !manual && <span className="produtos-saldo-ajuda">Pelo pedido</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!erro && (temProxima || pagina > 1) && (
        <div className="produtos-paginacao produtos-movimentos-paginacao">
          <button
            type="button"
            className="filter-btn filter-btn-secondary"
            style={{ flex: 'none', padding: '4px 10px' }}
            title="Página anterior das reservas"
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
            title="Próxima página das reservas"
            onClick={irParaProxima}
            disabled={!temProxima}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {novaAberta && <ReservaModal produto={produto} onFechar={() => setNovaAberta(false)} onSalvar={onReservar} />}

      {encerramento && (
        <EncerrarReservaModal
          key={`${encerramento.acao}-${encerramento.reserva.id}`}
          acao={encerramento.acao}
          reserva={encerramento.reserva}
          nomeLocal={nomeLocal}
          onFechar={() => setEncerramento(null)}
          onConfirmar={confirmarEncerramento}
          onRecarregar={onRecarregar}
        />
      )}
    </div>
  );
}
