import React, { useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import * as produtosService from '../../services/produtos';
import { numeroDaNota } from './notasUtils';

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
