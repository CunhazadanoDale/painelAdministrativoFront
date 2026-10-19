import React, { useState } from 'react';
import { AcaoModal } from '../../app/components/AcaoModal';
import { BuscaRemota } from '../../app/components/BuscaRemota';
import * as fornecedoresService from '../../services/fornecedores';
import * as representantesService from '../../services/representantes';

const buscarFornecedores = (texto, sinal) =>
  fornecedoresService
    .listarFornecedores({ busca: texto, ativo: 'true', tamanho: 20, sinal })
    .then((resposta) => resposta?.dados ?? []);

const opcaoDeFornecedor = (fornecedor) => ({ valor: fornecedor.id, rotulo: fornecedor.nome });

export function FornecedorDoRepresentanteModal({ representante, nomeAtual, onSalvo, onFechar }) {
  const [fornecedor, setFornecedor] = useState(
    representante.fornecedor_id ? { id: representante.fornecedor_id, nome: nomeAtual } : null
  );

  const salvar = async () => {
    await representantesService.definirFornecedorDoRepresentante(representante.id, fornecedor?.id ?? null);
    onSalvo();
  };

  return (
    <AcaoModal
      titulo={`Fornecedor das comissões de ${representante.nome}`}
      rotuloConfirmar="Salvar"
      onConfirmar={salvar}
      onFechar={onFechar}
      onRecarregar={onSalvo}
      largura="520px"
    >
      <p className="clientes-form-ajuda">
        O fechamento mensal das comissões gera a conta a pagar em nome deste fornecedor. Sem fornecedor, o representante
        fica de fora do fechamento.
      </p>
      <div className="clientes-form-campo">
        <label className="filter-label" htmlFor="representante-fornecedor">
          Fornecedor
        </label>
        <BuscaRemota
          id="representante-fornecedor"
          nomeBusca="fornecedor do representante"
          valor={fornecedor?.id ?? ''}
          rotuloAtual={fornecedor?.nome ?? ''}
          buscar={buscarFornecedores}
          opcaoDe={opcaoDeFornecedor}
          onEscolher={setFornecedor}
          placeholderBusca="Nome ou documento"
        />
      </div>
    </AcaoModal>
  );
}
