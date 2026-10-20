import { useCallback, useEffect, useState } from 'react';
import * as caixaService from '../../services/caixa';

export function useSaldosCaixa() {
  const [empresa, setEmpresa] = useState('');
  const [saldos, setSaldos] = useState([]);
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = JSON.stringify([empresa, recarga]);
  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();
    caixaService
      .listarSaldos({ empresa, sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        setSaldos(resposta?.dados ?? []);
        setChaveDados(chave);
        setFalha(null);
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os saldos.' });
      });
    return () => controle.abort();
  }, [chave, empresa]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const filtrar = useCallback((valor) => setEmpresa(valor), []);

  return { saldos, empresa, carregando, erro, recarregar, filtrar };
}
