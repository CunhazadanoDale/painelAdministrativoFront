import { useCallback, useEffect, useState } from 'react';
import * as titulosService from '../../services/titulosReceber';

export function useTituloDetalhe(id) {
  const [titulo, setTitulo] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([id, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    titulosService
      .obterTitulo(id, { sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setTitulo(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o título.' });
      });
    return () => controle.abort();
  }, [chave, id]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const versao = titulo?.versao;

  const executar = useCallback(
    async (acao) => {
      await acao();
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback((dados) => executar(() => titulosService.atualizarTitulo(id, dados)), [executar, id]);
  const prorrogar = useCallback(
    ({ vencimento, motivo }) => executar(() => titulosService.prorrogarTitulo(id, { vencimento, motivo, versao })),
    [executar, id, versao]
  );
  const enviarAoBanco = useCallback(
    (contaBancariaId) =>
      executar(() => titulosService.enviarAoBanco(id, { conta_bancaria_id: contaBancariaId, versao })),
    [executar, id, versao]
  );
  const retirarDoBanco = useCallback(
    () => executar(() => titulosService.retirarDoBanco(id, versao)),
    [executar, id, versao]
  );
  const registrarBoleto = useCallback(
    ({ canal, enviado_em }) =>
      executar(() => titulosService.registrarBoletoEnviado(id, { canal, enviado_em, versao })),
    [executar, id, versao]
  );
  const cancelar = useCallback(
    (motivo) => executar(() => titulosService.cancelarTitulo(id, { motivo, versao })),
    [executar, id, versao]
  );

  return {
    titulo,
    carregando,
    erro,
    geracao: recarga,
    recarregar,
    atualizar,
    prorrogar,
    enviarAoBanco,
    retirarDoBanco,
    registrarBoleto,
    cancelar,
  };
}
