import { useCallback, useEffect, useMemo, useState } from 'react';
import * as gruposService from '../../services/clienteGrupos';
import * as representantesService from '../../services/representantes';

export function useCadastrosCliente(comercial) {
  const [grupos, setGrupos] = useState(null);
  const [representantes, setRepresentantes] = useState(null);

  useEffect(() => {
    const controle = new AbortController();

    gruposService
      .listarTodosGrupos({ sinal: controle.signal })
      .then((itens) => setGrupos(itens || []))
      .catch((e) => {
        if (!(e && e.name === 'AbortError')) setGrupos([]);
      });

    if (comercial) {
      representantesService
        .listarTodosRepresentantes({ sinal: controle.signal })
        .then((itens) => setRepresentantes(itens || []))
        .catch((e) => {
          if (!(e && e.name === 'AbortError')) setRepresentantes([]);
        });
    }

    return () => controle.abort();
  }, [comercial]);

  const gruposPorId = useMemo(
    () => Object.fromEntries((grupos || []).map((grupo) => [grupo.id, grupo])),
    [grupos]
  );
  const representantesPorId = useMemo(
    () => Object.fromEntries((representantes || []).map((representante) => [representante.id, representante])),
    [representantes]
  );

  const nomeGrupo = useCallback((id) => (id && gruposPorId[id]?.nome) || '—', [gruposPorId]);

  const nomeRepresentante = useCallback(
    (id) => {
      if (!id) return '—';
      if (!comercial) return 'Com representante';
      return representantesPorId[id]?.nome || '—';
    },
    [comercial, representantesPorId]
  );

  return { grupos, representantes, nomeGrupo, nomeRepresentante };
}
