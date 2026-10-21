import { useCallback, useEffect, useState } from 'react';
import * as importacoesService from '../../services/importacoes';
import * as pedidosService from '../../services/pedidos';

export function usePedidosDaImportacao(empresaId, geracao) {
  const [dados, setDados] = useState({ pendencias: [], semImportacao: [] });
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([empresaId, geracao, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    Promise.all([
      pedidosService.listarTodasPendencias({ empresa: empresaId, sinal: controle.signal }),
      importacoesService.obterAlertasImportacao({ empresa: empresaId, sinal: controle.signal }),
    ])
      .then(([pendencias, alertas]) => {
        if (controle.signal.aborted) return;
        setDados({ pendencias: pendencias ?? [], semImportacao: alertas?.dados?.sem_importacao ?? [] });
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os pedidos de importação.' });
      });
    return () => controle.abort();
  }, [chave, empresaId]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { ...dados, carregando, erro, recarregar };
}
