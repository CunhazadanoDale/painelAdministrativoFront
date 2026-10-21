import { useCallback, useEffect, useState } from 'react';
import * as dividasService from '../../services/dividas';

export function useDividaDetalhe(id) {
  const [divida, setDivida] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([id, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    dividasService
      .obterDivida(id, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setDivida(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar a dívida.' });
      });
    return () => controle.abort();
  }, [chave, id]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const versao = divida?.versao;

  const executar = useCallback(
    async (acao) => {
      await acao();
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback((dados) => executar(() => dividasService.atualizarDivida(id, dados)), [executar, id]);
  const atualizarParcela = useCallback(
    (parcelaId, dados) => executar(() => dividasService.atualizarParcelaDivida(id, parcelaId, { ...dados, versao })),
    [executar, id, versao]
  );
  const reabrirParcela = useCallback(
    (parcelaId) => executar(() => dividasService.reabrirParcelaDivida(id, parcelaId, versao)),
    [executar, id, versao]
  );
  const cancelar = useCallback(
    (motivo) => executar(() => dividasService.cancelarDivida(id, { versao, motivo })),
    [executar, id, versao]
  );
  const renegociar = useCallback((dados) => dividasService.renegociarDivida(id, dados), [id]);

  return {
    divida,
    carregando,
    erro,
    geracao: recarga,
    recarregar,
    atualizar,
    atualizarParcela,
    reabrirParcela,
    cancelar,
    renegociar,
  };
}
