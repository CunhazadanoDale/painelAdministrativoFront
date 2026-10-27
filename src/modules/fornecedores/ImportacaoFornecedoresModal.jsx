import React from 'react';
import { ImportacaoCsvModal } from '../../app/components/ImportacaoCsvModal';
import * as fornecedoresService from '../../services/fornecedores';

const CABECALHO =
  'pais;documento;identificacao_estrangeira;nome;nome_fantasia;moeda_padrao;uf;cidade;contato_nome;email;telefone;observacoes';

export function ImportacaoFornecedoresModal({ onFechar, onImportado }) {
  return (
    <ImportacaoCsvModal
      titulo="Importar fornecedores"
      cabecalho={CABECALHO}
      ajuda="País vazio vale BR. No Brasil o documento (CPF ou CNPJ) é obrigatório; fora dele, use a identificação estrangeira. Moeda vazia vale BRL. Nada é sobrescrito: documento ou identificação já cadastrados rejeitam a linha."
      rotuloChave="Documento ou nome"
      importar={fornecedoresService.importarFornecedores}
      baixarModelo={fornecedoresService.baixarModeloImportacao}
      onFechar={onFechar}
      onImportado={onImportado}
    />
  );
}
