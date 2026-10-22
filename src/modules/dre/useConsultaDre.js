import { useCallback, useEffect, useState } from 'react';

export function useConsultaDre(obter, parametros, mensagemDeErro) {
  const [dados, setDados] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chaveParametros = JSON.stringify(parametros);
  const chave = JSON.stringify([chaveParametros, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    obter({ ...JSON.parse(chaveParametros), sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setDados(resposta?.dados ?? null);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || mensagemDeErro });
      });
    return () => controle.abort();
  }, [chave, chaveParametros, obter, mensagemDeErro]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { dados, carregando, erro, recarregar };
}
