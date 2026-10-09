import { useCallback, useEffect, useMemo, useState } from 'react';
import * as usuariosService from '../../services/usuarios';
import * as cargosService from '../../services/cargos';

export const TAMANHO_PAGINA = 20;

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [temProxima, setTemProxima] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [q, setQ] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [chaveDados, setChaveDados] = useState(null);
  const [falha, setFalha] = useState(null);

  const chave = `${pagina}|${q}|${recarga}`;

  const erro = falha && falha.chave === chave ? falha.mensagem : null;
  const carregando = !erro && chaveDados !== chave;

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const [respostaUsuarios, respostaCargos] = await Promise.all([
          usuariosService.listarUsuarios({
            pagina,
            tamanho: TAMANHO_PAGINA + 1,
            q,
          }),
          cargosService.listarCargos({ pagina: 1, tamanho: 100 }),
        ]);
        const itens = respostaUsuarios?.dados ?? [];

        if (cancelado) return;

        if (itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }

        setUsuarios(itens.slice(0, TAMANHO_PAGINA));
        setTemProxima(itens.length > TAMANHO_PAGINA);
        setCargos(respostaCargos?.dados ?? []);
        setChaveDados(chave);
        setFalha(null);
      } catch (e) {
        if (cancelado) return;
        setFalha({ chave, mensagem: e.message || 'Erro ao carregar os usuários.' });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [pagina, q, recarga, chave]);

  const cargoMapa = useMemo(
    () => Object.fromEntries(cargos.map((cargo) => [cargo.id, cargo])),
    [cargos]
  );

  const recarregar = useCallback(() => setRecarga((valor) => valor + 1), []);

  const aplicarBusca = useCallback((busca) => {
    setQ(String(busca ?? '').trim());
    setPagina(1);
  }, []);

  const irParaAnterior = useCallback(() => setPagina((valor) => Math.max(1, valor - 1)), []);
  const irParaProxima = useCallback(() => setPagina((valor) => valor + 1), []);

  const criar = useCallback(
    async (dados) => {
      await usuariosService.criarUsuario(dados);
      setPagina(1);
      recarregar();
    },
    [recarregar]
  );

  const atualizar = useCallback(
    async (id, dados) => {
      await usuariosService.atualizarUsuario(id, dados);
      recarregar();
    },
    [recarregar]
  );

  const excluir = useCallback(
    async (id) => {
      await usuariosService.removerUsuario(id);
      recarregar();
    },
    [recarregar]
  );

  const trocarSenha = useCallback(
    async (id, novaSenha) => {
      await usuariosService.trocarSenha(id, novaSenha);
      recarregar();
    },
    [recarregar]
  );

  const ativar = useCallback(
    async (id) => {
      await usuariosService.ativarUsuario(id);
      recarregar();
    },
    [recarregar]
  );

  const desativar = useCallback(
    async (id) => {
      await usuariosService.desativarUsuario(id);
      recarregar();
    },
    [recarregar]
  );

  return {
    usuarios,
    cargos,
    cargoMapa,
    temProxima,
    pagina,
    q,
    carregando,
    erro,
    chaveDados,
    recarregar,
    aplicarBusca,
    irParaAnterior,
    irParaProxima,
    criar,
    atualizar,
    excluir,
    trocarSenha,
    ativar,
    desativar,
  };
}
