import { useCallback, useEffect, useMemo, useState } from 'react';
import * as aprovadoresService from '../../services/aprovadores';
import * as usuariosService from '../../services/usuarios';

export function useAprovadores() {
  const [aprovadores, setAprovadores] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = String(recarga);

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    const controle = new AbortController();

    (async () => {
      try {
        const [listaAprovadores, listaUsuarios] = await Promise.all([
          aprovadoresService.listarTodosAprovadores({ sinal: controle.signal }),
          usuariosService.listarTodosUsuarios({ sinal: controle.signal }),
        ]);
        if (controle.signal.aborted) return;
        setAprovadores(listaAprovadores);
        setUsuarios(listaUsuarios);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (controle.signal.aborted) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os aprovadores.' });
      }
    })();

    return () => {
      controle.abort();
    };
  }, [chave]);

  const usuariosPorId = useMemo(
    () => Object.fromEntries(usuarios.map((usuario) => [usuario.id, usuario])),
    [usuarios]
  );

  const usuariosDisponiveis = useMemo(() => {
    const designados = new Set(aprovadores.map((aprovador) => String(aprovador.usuario_id)));
    return usuarios.filter(
      (usuario) => usuario.ativo !== false && !designados.has(String(usuario.id))
    );
  }, [usuarios, aprovadores]);

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const designar = useCallback(
    async (usuarioId) => {
      await aprovadoresService.designarAprovador(usuarioId);
      recarregar();
    },
    [recarregar]
  );

  const remover = useCallback(
    async (aprovadorId) => {
      await aprovadoresService.removerAprovador(aprovadorId);
      recarregar();
    },
    [recarregar]
  );

  return {
    aprovadores,
    usuarios,
    usuariosPorId,
    usuariosDisponiveis,
    carregando,
    erro,
    recarregar,
    designar,
    remover,
  };
}
