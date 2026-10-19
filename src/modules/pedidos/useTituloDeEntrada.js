import { useCallback, useEffect, useState } from 'react';
import * as titulosService from '../../services/titulosReceber';

export function useTituloDeEntrada(pedidoId, ativo, geracao) {
  const [titulo, setTitulo] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([pedidoId, ativo, geracao, recarga]);
  const erro = ativo && falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = ativo && !erro && chaveDados !== chave;

  useEffect(() => {
    if (!ativo) return undefined;
    const controle = new AbortController();
    titulosService
      .listarTitulos({ origem: 'pedido', origem_id: pedidoId, tamanho: 1, sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setTitulo(resposta?.dados?.[0] ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao consultar o título de entrada.' });
      });
    return () => controle.abort();
  }, [chave, pedidoId, ativo]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { titulo: ativo ? titulo : null, carregando, erro, recarregar };
}
