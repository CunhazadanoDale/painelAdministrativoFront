import { useCallback, useEffect, useState } from 'react';
import * as empresasService from '../../services/empresas';

export function useAcessoEmpresas(usuarioId) {
  const [dados, setDados] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [falha, setFalha] = useState(null);

  const chave = `${usuarioId}|${recarga}`;

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const atuais = dados && dados.chave === chave ? dados : null;
  const carregando = !erro && !atuais;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const [empresas, resposta] = await Promise.all([
          empresasService.listarTodasEmpresas({ sinal: controle.signal }),
          empresasService.obterEmpresasDoUsuario(usuarioId, { sinal: controle.signal }),
        ]);
        if (controle.signal.aborted) return;
        const vinculos = resposta?.dados ?? {};
        setDados({
          chave,
          empresas: empresas ?? [],
          acessoTodas: !!vinculos.acesso_todas,
          empresaIds: vinculos.empresa_ids ?? [],
        });
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar as empresas do usuário.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave, usuarioId]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const salvar = useCallback(
    (acessoTodas, empresaIds) =>
      empresasService.definirEmpresasDoUsuario(usuarioId, {
        acesso_todas: acessoTodas,
        empresa_ids: empresaIds,
      }),
    [usuarioId]
  );

  return {
    empresas: atuais?.empresas ?? [],
    acessoTodas: atuais?.acessoTodas ?? false,
    empresaIds: atuais?.empresaIds ?? [],
    chaveDados: atuais?.chave ?? null,
    carregando,
    erro,
    recarregar,
    salvar,
  };
}
