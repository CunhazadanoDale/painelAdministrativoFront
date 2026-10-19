import React, { useCallback, useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import * as pedidosService from '../../services/pedidos';
import * as produtosService from '../../services/produtos';
import { statusDoPedido } from '../pedidos/pedidosUtils';
import { descricaoDaEntrega, numeroDaNota } from './notasUtils';

const buscarProdutos = (texto, sinal) =>
  produtosService
    .listarProdutos({ busca: texto, ativo: 'true', tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const opcaoDeProduto = (produto) => ({
  valor: produto.id,
  rotulo: produto.codigo ? `${produto.nome} (${produto.codigo})` : produto.nome,
});

export function LigarProdutoModal({ item, onConfirmar, onFechar, onRecarregar }) {
  const [produto, setProduto] = useState(null);

  return (
    <AcaoModal
      titulo={`Ligar o item ${item.numero_item} a um produto`}
      rotuloConfirmar="Ligar"
      validar={() => (produto ? null : 'Escolha o produto.')}
      onConfirmar={() => onConfirmar(item.numero_item, produto.id)}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
      largura="560px"
    >
      <p className="notas-texto">
        Item da nota: <strong>{item.codigo}</strong> — {item.descricao}. O código do item no XML não bateu com nenhum
        produto; escolha o produto do cadastro que corresponde a ele.
      </p>
      <div className="notas-form-campo">
        <label className="filter-label" htmlFor="ligar-produto">
          Produto *
        </label>
        <BuscaRemota
          id="ligar-produto"
          nomeBusca="produto do item"
          valor={produto?.id ?? ''}
          rotuloAtual={produto ? opcaoDeProduto(produto).rotulo : ''}
          buscar={buscarProdutos}
          opcaoDe={opcaoDeProduto}
          onEscolher={setProduto}
          placeholderBusca="Nome ou código"
        />
      </div>
    </AcaoModal>
  );
}

function textoDoResultado(resultado) {
  const quantos = (lista) => lista?.length ?? 0;
  return `Títulos sincronizados: ${quantos(resultado?.gerados)} gerado(s), ${quantos(resultado?.ja_existentes)} já existente(s), ${quantos(resultado?.cancelados)} cancelado(s), ${quantos(resultado?.marcados)} marcado(s).`;
}

export function SincronizarTitulosModal({ nota, onConfirmar, onConcluido, onFechar, onRecarregar }) {
  const cancelada = nota.status === 'cancelada';

  return (
    <AcaoModal
      titulo={`Sincronizar os títulos da NF-e ${numeroDaNota(nota)}`}
      rotuloConfirmar="Sincronizar"
      onConfirmar={async () => onConcluido(textoDoResultado(await onConfirmar()))}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
    >
      <p className="notas-texto">
        {cancelada
          ? 'Cancela no contas a receber os títulos das duplicatas ainda sem movimento; os antecipados ou recebidos ficam marcados para o financeiro resolver.'
          : 'Gera no contas a receber os títulos das duplicatas que ainda não existem. Pode ser feito quantas vezes for preciso.'}
      </p>
    </AcaoModal>
  );
}

const STATUS_VINCULAVEIS = ['confirmado', 'parcialmente_entregue', 'entregue'];

const opcaoDePedido = (pedido) => ({
  valor: pedido.id,
  rotulo: `Pedido ${pedido.numero} · ${statusDoPedido(pedido.status).rotulo}`,
});

const opcaoDeEntrega = (entrega) => ({ valor: entrega.id, rotulo: descricaoDaEntrega(entrega) });

export function VinculoNotaModal({ nota, onConfirmar, onFechar, onRecarregar }) {
  const [pedidoId, setPedidoId] = useState(nota.pedido_id ?? '');
  const [entregaId, setEntregaId] = useState(nota.entrega_id ?? '');
  const { empresa_id: empresa, cliente_id: cliente } = nota;

  const carregarPedidos = useCallback(
    (sinal) =>
      pedidosService
        .listarPedidos({ empresa, cliente, tamanho: 100, sinal })
        .then((resposta) => (resposta?.dados ?? []).filter((pedido) => STATUS_VINCULAVEIS.includes(pedido.status))),
    [empresa, cliente]
  );
  const carregarEntregas = useCallback(
    (sinal) =>
      pedidosService
        .listarEntregasDoPedido(pedidoId, { sinal })
        .then((resposta) => (resposta?.dados ?? []).filter((entrega) => entrega.status !== 'cancelada')),
    [pedidoId]
  );

  const alterarPedido = useCallback((valor) => {
    setPedidoId(valor);
    setEntregaId('');
  }, []);

  return (
    <AcaoModal
      titulo={`Vínculo da NF-e ${numeroDaNota(nota)}`}
      rotuloConfirmar="Salvar vínculo"
      onConfirmar={() => onConfirmar({ pedido_id: pedidoId || null, entrega_id: (pedidoId && entregaId) || null })}
      onFechar={onFechar}
      onRecarregar={onRecarregar}
      largura="560px"
    >
      <p className="notas-texto">
        Pedidos confirmados, em entrega ou entregues da mesma empresa e do mesmo cliente da nota. A entrega é opcional e
        só pode ter uma nota autorizada. Deixe sem pedido para desfazer o vínculo.
      </p>
      <div className="notas-form-campo">
        <label className="filter-label" htmlFor="vinculo-pedido">
          Pedido
        </label>
        <SeletorRemoto
          id="vinculo-pedido"
          className="filter-select"
          valor={pedidoId}
          onAlterar={alterarPedido}
          carregar={carregarPedidos}
          opcaoDe={opcaoDePedido}
          placeholder="Sem pedido"
          textoVazio="Nenhum pedido em aberto deste cliente na empresa"
          textoErro="Erro ao carregar os pedidos."
          selecionarUnica={false}
        />
      </div>
      <div className="notas-form-campo">
        <label className="filter-label" htmlFor="vinculo-entrega">
          Entrega
        </label>
        {pedidoId ? (
          <SeletorRemoto
            id="vinculo-entrega"
            className="filter-select"
            valor={entregaId}
            onAlterar={setEntregaId}
            carregar={carregarEntregas}
            opcaoDe={opcaoDeEntrega}
            placeholder="Sem entrega"
            textoVazio="O pedido não tem entregas"
            textoErro="Erro ao carregar as entregas."
            selecionarUnica={false}
          />
        ) : (
          <select id="vinculo-entrega" className="filter-select" value="" disabled>
            <option value="">Escolha o pedido primeiro</option>
          </select>
        )}
      </div>
    </AcaoModal>
  );
}
