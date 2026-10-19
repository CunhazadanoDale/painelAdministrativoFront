import { useCallback, useEffect, useState } from 'react';
import * as titulosService from '../../services/titulosReceber';

export function useRecebimentos(tituloId, geracao) {
  const [recebimentos, setRecebimentos] = useState([]);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([tituloId, geracao, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    titulosService
      .listarRecebimentos(tituloId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setRecebimentos([...(resposta?.dados ?? [])].sort((a, b) => b.recebido_em.localeCompare(a.recebido_em)));
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os recebimentos.' });
      });
    return () => controle.abort();
  }, [chave, tituloId]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { recebimentos, carregando, erro, recarregar };
}
