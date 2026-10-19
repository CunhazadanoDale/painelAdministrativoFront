import { useCallback, useEffect, useState } from 'react';
import * as precosService from '../../services/tabelaPrecos';

export function useHistoricoPrecos(produtoId, modelo) {
  const [itens, setItens] = useState([]);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([produtoId, modelo, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    precosService
      .listarHistoricoPrecos({ produto: produtoId, modelo, tamanho: 100, sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setItens(resposta?.dados ?? []);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o histórico de preços.' });
      });
    return () => controle.abort();
  }, [chave, produtoId, modelo]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { itens, carregando, erro, recarregar };
}
