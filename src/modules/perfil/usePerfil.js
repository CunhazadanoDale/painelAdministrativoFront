import { useCallback, useEffect, useMemo, useState } from 'react';
import * as sessaoService from '../../services/sessao';
import * as cargosService from '../../services/cargos';
import { useAutenticacao } from '../../app/autenticacao/useAutenticacao';

export function usePerfil() {
  const { encerrarComAviso } = useAutenticacao();
  const [usuario, setUsuario] = useState(null);
  const [cargos, setCargos] = useState([]);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = String(recarga);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const [respostaSessao, respostaCargos] = await Promise.all([
          sessaoService.obterSessao(),
          cargosService.listarCargos({ pagina: 1, tamanho: 100 }),
        ]);
        if (cancelado) return;
        setUsuario(respostaSessao?.dados ?? null);
        setCargos(respostaCargos?.dados ?? []);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (cancelado) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar o perfil.' });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [chave]);

  const cargoMapa = useMemo(
    () => Object.fromEntries(cargos.map((cargo) => [cargo.id, cargo])),
    [cargos]
  );

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const trocarSenha = useCallback(
    async (novaSenha, senhaAtual) => {
      await sessaoService.trocarSenhaPropria(senhaAtual, novaSenha);
      encerrarComAviso('Senha alterada. Entre novamente com a nova senha.');
    },
    [encerrarComAviso]
  );

  return {
    usuario,
    cargoMapa,
    carregando,
    erro,
    recarregar,
    trocarSenha,
  };
}
