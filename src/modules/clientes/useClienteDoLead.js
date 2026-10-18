import { useCallback, useEffect, useState } from 'react';
import * as clientesService from '../../services/clientes';

export function useClienteDoLead(leadId) {
  const [recarga, setRecarga] = useState(0);
  const [estado, setEstado] = useState({ chave: null, cliente: null, erro: null });

  const chave = JSON.stringify([leadId, recarga]);

  useEffect(() => {
    const controle = new AbortController();

    clientesService
      .listarClientes({ lead: leadId, tamanho: 1, sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setEstado({ chave, cliente: (resposta?.dados ?? [])[0] ?? null, erro: null });
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setEstado({ chave, cliente: null, erro: e.message || 'Erro ao procurar o cliente do lead.' });
      });

    return () => controle.abort();
  }, [chave, leadId]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const atual = estado.chave === chave;

  return {
    cliente: atual ? estado.cliente : null,
    erro: atual ? estado.erro : null,
    carregando: !atual,
    recarregar,
  };
}
