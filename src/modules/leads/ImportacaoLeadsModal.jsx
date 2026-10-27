import React, { useMemo, useState } from 'react';
import { ImportacaoCsvModal } from '../../app/components/ImportacaoCsvModal';
import * as leadsService from '../../services/leads';

const CABECALHO = 'nome;email;telefone;origem';

export function ImportacaoLeadsModal({ funis, etapas, onFechar, onImportado }) {
  const [etapaId, setEtapaId] = useState('');

  const opcoes = useMemo(() => {
    const nomeDoFunil = Object.fromEntries(funis.map((funil) => [funil.funil_id, funil.nome]));
    return etapas
      .filter((etapa) => etapa.ativo !== false)
      .map((etapa) => ({
        id: etapa.etapa_id,
        rotulo: nomeDoFunil[etapa.funil_id] ? `${nomeDoFunil[etapa.funil_id]} — ${etapa.nome}` : etapa.nome,
      }));
  }, [funis, etapas]);

  const importar = (arquivo, { simular }) => leadsService.importarLeads(arquivo, { etapaId, simular });

  return (
    <ImportacaoCsvModal
      titulo="Importar leads"
      cabecalho={CABECALHO}
      ajuda="Todos os leads do arquivo entram na etapa escolhida. Nada é sobrescrito: e-mail ou telefone de um lead ativo, ou repetido no arquivo, rejeita a linha. Simule antes para ver o que seria rejeitado."
      rotuloChave="Nome"
      importar={importar}
      baixarModelo={leadsService.baixarModeloImportacao}
      podeEnviar={etapaId !== ''}
      avisoSemEnvio="Escolha a etapa dos leads."
      onFechar={onFechar}
      onImportado={onImportado}
    >
      <div className="importacao-csv-campo">
        <label className="filter-label" htmlFor="importacao-etapa">
          Etapa *
        </label>
        <select
          id="importacao-etapa"
          className="filter-select"
          value={etapaId}
          onChange={(evento) => setEtapaId(evento.target.value)}
        >
          <option value="">Selecione…</option>
          {opcoes.map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      </div>
    </ImportacaoCsvModal>
  );
}
