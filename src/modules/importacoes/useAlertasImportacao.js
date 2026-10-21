import { useCallback, useEffect, useState } from 'react';
import * as importacoesService from '../../services/importacoes';

const VAZIO = { folga_dias: null, prazo_em_risco: [], sem_previsao: [], sem_importacao: [] };

export function useAlertasImportacao(empresa, folga) {
  const [alertas, setAlertas] = useState(VAZIO);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([empresa, folga, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    importacoesService
      .obterAlertasImportacao({ empresa, folga, sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setAlertas({ ...VAZIO, ...(resposta?.dados ?? {}) });
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os alertas.' });
      });
    return () => controle.abort();
  }, [chave, empresa, folga]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { alertas, carregando, erro, recarregar };
}
