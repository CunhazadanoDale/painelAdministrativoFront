import React from 'react';
import { ImportacaoCsvModal } from '../../app/components/ImportacaoCsvModal';
import * as clientesService from '../../services/clientes';
import { CABECALHO_IMPORTACAO } from './clientesUtils';

function documentoDe(item) {
  return item.documento;
}

export function ImportacaoClientesModal({ onFechar, onImportado }) {
  return (
    <ImportacaoCsvModal
      titulo="Importar clientes"
      cabecalho={CABECALHO_IMPORTACAO}
      ajuda="Grupo pelo nome (criado se não existir), representante pelo CPF ou CNPJ e as regras com sim ou nao. Nada é sobrescrito: documento já cadastrado rejeita a linha. Simule antes para ver o que seria rejeitado."
      rotuloChave="Documento"
      chaveDe={documentoDe}
      importar={clientesService.importarClientes}
      baixarModelo={clientesService.baixarModeloImportacao}
      onFechar={onFechar}
      onImportado={onImportado}
    />
  );
}
