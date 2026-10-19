import { useCallback, useEffect, useState } from 'react';
import * as contasAPagarService from '../../services/contasAPagar';

const FILTROS_INICIAIS = { de: '', ate: '', empresa: '' };

export function useResumoContasAPagar() {
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [resumo, setResumo] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([filtros, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    contasAPagarService
      .obterResumoContasAPagar({ ...filtros, sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setResumo(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o resumo.' });
      });
    return () => controle.abort();
  }, [chave, filtros]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const filtrar = useCallback((mudancas) => setFiltros((atual) => ({ ...atual, ...mudancas })), []);

  return { resumo, filtros, carregando, erro, recarregar, filtrar };
}
