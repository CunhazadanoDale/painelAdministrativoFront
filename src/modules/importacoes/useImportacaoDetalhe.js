import { useCallback, useEffect, useState } from 'react';
import * as importacoesService from '../../services/importacoes';

export function useImportacaoDetalhe(id) {
  const [importacao, setImportacao] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([id, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    importacoesService
      .obterImportacao(id, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setImportacao(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar a importação.' });
      });
    return () => controle.abort();
  }, [chave, id]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const versao = importacao?.versao;

  const executar = useCallback(
    async (acao) => {
      await acao();
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    (dados) => executar(() => importacoesService.atualizarImportacao(id, dados)),
    [executar, id]
  );
  const embarcar = useCallback(
    (dados) => executar(() => importacoesService.embarcarImportacao(id, { ...dados, versao })),
    [executar, id, versao]
  );
  const desembaracar = useCallback(
    (dados) => executar(() => importacoesService.desembaracarImportacao(id, { ...dados, versao })),
    [executar, id, versao]
  );
  const cancelar = useCallback(
    (motivo) => executar(() => importacoesService.cancelarImportacao(id, { versao, motivo })),
    [executar, id, versao]
  );

  const incluirParcela = useCallback(
    (dados) => executar(() => importacoesService.incluirParcela(id, { ...dados, versao })),
    [executar, id, versao]
  );
  const atualizarParcela = useCallback(
    (parcelaId, dados) => executar(() => importacoesService.atualizarParcela(id, parcelaId, { ...dados, versao })),
    [executar, id, versao]
  );
  const removerParcela = useCallback(
    (parcelaId) => executar(() => importacoesService.removerParcela(id, parcelaId, versao)),
    [executar, id, versao]
  );
  const fecharCambio = useCallback(
    (parcelaId, dados) => executar(() => importacoesService.fecharCambio(id, parcelaId, { ...dados, versao })),
    [executar, id, versao]
  );
  const reabrirParcela = useCallback(
    (parcelaId) => executar(() => importacoesService.reabrirParcela(id, parcelaId, versao)),
    [executar, id, versao]
  );
  const lancarCusto = useCallback(
    (dados) => executar(() => importacoesService.lancarCusto(id, { ...dados, versao })),
    [executar, id, versao]
  );
  const cancelarCusto = useCallback(
    (custoId) => executar(() => importacoesService.cancelarCusto(id, custoId, versao)),
    [executar, id, versao]
  );

  return {
    importacao,
    incluirParcela,
    atualizarParcela,
    removerParcela,
    fecharCambio,
    reabrirParcela,
    lancarCusto,
    cancelarCusto,
    carregando,
    erro,
    geracao: recarga,
    recarregar,
    executar,
    atualizar,
    embarcar,
    desembaracar,
    cancelar,
  };
}
