import { useCallback, useEffect, useState } from 'react';
import * as caixaService from '../../services/caixa';

export function useProjecaoCaixa(filtrosIniciais) {
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [projecao, setProjecao] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([filtros, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    caixaService
      .obterProjecao({ ...filtros, sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setProjecao(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar a projeção.' });
      });
    return () => controle.abort();
  }, [chave, filtros]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const filtrar = useCallback((mudancas) => setFiltros((atual) => ({ ...atual, ...mudancas })), []);

  return { projecao, filtros, carregando, erro, recarregar, filtrar };
}
