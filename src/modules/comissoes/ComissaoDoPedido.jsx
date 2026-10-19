import React, { useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { erroDoPercentual, formatarPercentual, paraPontosBase, pontosBaseParaTexto } from '../clientes/clientesUtils';
import { useComissaoDoPedido } from './useComissaoDoPedido';
import { AlertCircle } from 'lucide-react';
import './Comissoes.css';

function origemDoPercentual(comissao) {
  if (!comissao.definido) return 'Padrão do representante pelo modelo do pedido; é gravado na primeira apuração.';
  return comissao.origem === 'manual' ? 'Definido pelo comercial' : 'Padrão do representante, gravado na apuração';
}

function PercentualModal({ comissao, onConfirmar, onFechar, onRecarregar }) {
  const [texto, setTexto] = useState(pontosBaseParaTexto(comissao.percentual_bp));

  return (
    <AcaoModal
      titulo="Comissão do pedido"
      rotuloConfirmar="Salvar"
      validar={() => erroDoPercentual(texto)}
      onConfirmar={() => onConfirmar(paraPontosBase(texto))}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="comissoes-texto">
        Vale para todas as entregas do pedido e só pode mudar até a primeira saída. Depois disso, diferenças viram
        ajuste de comissão.
      </p>
      <div className="comissoes-form-campo">
        <label className="filter-label" htmlFor="comissao-pedido-percentual">
          Percentual (%) *
        </label>
        <input
          id="comissao-pedido-percentual"
          className="filter-input"
          type="text"
          inputMode="decimal"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
        />
      </div>
    </AcaoModal>
  );
}

export function ComissaoDoPedido({ pedido, comercial, geracao }) {
  const { comissao, carregando, erro, recarregar, definir } = useComissaoDoPedido(pedido.id, geracao);
  const [alterando, setAlterando] = useState(false);

  if (erro) {
    return (
      <div className="leads-erro">
        <AlertCircle size={16} />
        <span>{erro}</span>
        <button type="button" onClick={recarregar}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (carregando && !comissao) return <div className="comissoes-secundario">Carregando comissão…</div>;
  if (!comissao) return null;

  const saiu = (pedido.itens ?? []).some((item) => (item.quantidade_entregue ?? 0) > 0);
  const podeAlterar = comercial && pedido.status !== 'cancelado' && !saiu;

  return (
    <div className="comissoes-pedido">
      <div className="comissoes-pedido-valor">
        <strong>{formatarPercentual(comissao.percentual_bp)}</strong>
        <span className="comissoes-secundario">{origemDoPercentual(comissao)}</span>
      </div>
      {podeAlterar ? (
        <button
          type="button"
          className="filter-btn filter-btn-secondary"
          style={{ flex: 'none', width: 'auto', padding: '4px 12px' }}
          onClick={() => setAlterando(true)}
        >
          Alterar percentual
        </button>
      ) : (
        saiu && (
          <span className="comissoes-secundario">
            O percentual não muda depois da primeira saída; diferenças viram ajuste de comissão.
          </span>
        )
      )}
      {alterando && (
        <PercentualModal
          comissao={comissao}
          onConfirmar={definir}
          onFechar={() => setAlterando(false)}
          onRecarregar={recarregar}
        />
      )}
    </div>
  );
}
