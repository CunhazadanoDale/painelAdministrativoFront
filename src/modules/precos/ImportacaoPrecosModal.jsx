import React from 'react';
import { ImportacaoCsvModal } from '../../app/components/ImportacaoCsvModal';
import * as precosService from '../../services/tabelaPrecos';

const CABECALHO = 'codigo;modelo;preco;vigente_de;observacao';

export function ImportacaoPrecosModal({ onFechar, onImportado }) {
  return (
    <ImportacaoCsvModal
      titulo="Importar preços"
      cabecalho={CABECALHO}
      ajuda="Cada linha lança uma vigência: produto pelo código, modelo pronta_entrega ou importacao, preço em reais (139,90) e início em DD/MM/AAAA. Reajuste em massa é um arquivo com a nova data de início. Nada é sobrescrito: mesmo produto, modelo e início já lançado rejeita a linha."
      rotuloChave="Código"
      importar={precosService.importarTabelaPrecos}
      baixarModelo={precosService.baixarModeloImportacao}
      onFechar={onFechar}
      onImportado={onImportado}
    />
  );
}
