import { useCallback, useEffect, useState } from 'react';
import * as titulosService from '../../services/titulosReceber';

export function useTituloHistorico(tituloId, geracao) {
  const [eventos, setEventos] = useState([]);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([tituloId, geracao, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    titulosService
      .listarHistoricoTitulo(tituloId, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setEventos([...(resposta?.dados ?? [])].reverse());
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o histórico.' });
      });
    return () => controle.abort();
  }, [chave, tituloId]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { eventos, carregando, erro, recarregar };
}
