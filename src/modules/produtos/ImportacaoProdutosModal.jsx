import React from 'react';
import { ImportacaoCsvModal } from '../../app/components/ImportacaoCsvModal';
import * as produtosService from '../../services/produtos';

const CABECALHO =
  'nome;codigo;categoria;unidade_medida;preco;preco_promocional;estoque_minimo;peso_kg;descricao;destaque';

export function ImportacaoProdutosModal({ onFechar, onImportado }) {
  return (
    <ImportacaoCsvModal
      titulo="Importar produtos"
      cabecalho={CABECALHO}
      ajuda="Categoria pelo nome da subcategoria (precisa existir), preço em reais como o Excel grava (1.234,56), peso com vírgula e destaque com sim ou nao. Só cadastra: o saldo entra por movimentação. Nada é sobrescrito: nome ou código já cadastrado rejeita a linha."
      rotuloChave="Nome"
      importar={produtosService.importarProdutos}
      baixarModelo={produtosService.baixarModeloImportacao}
      onFechar={onFechar}
      onImportado={onImportado}
    />
  );
}
