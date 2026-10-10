import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { aoFalharSessao, definirToken } from '../../lib/api';
import * as autenticacaoService from '../../services/autenticacao';
import * as sessaoService from '../../services/sessao';
import * as solicitacoesService from '../../services/solicitacoes';
import { AutenticacaoContexto } from './autenticacaoContexto';

const CHAVE_SESSAO = 'mia.sessao';

const SEM_PERMISSAO = { aprovacao: false, financeiro: false };

function carregarSessao() {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    if (!bruto) return null;
    const sessao = JSON.parse(bruto);
    if (!sessao || !sessao.token || !sessao.usuario) return null;
    if (sessao.expira_em && new Date(sessao.expira_em).getTime() <= Date.now()) {
      localStorage.removeItem(CHAVE_SESSAO);
      return null;
    }
    return sessao;
  } catch {
    return null;
  }
}

function gravarSessao(sessao) {
  try {
    if (sessao) {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    } else {
      localStorage.removeItem(CHAVE_SESSAO);
    }
  } catch {
    localStorage.removeItem(CHAVE_SESSAO);
  }
}

export function AutenticacaoProvider({ children }) {
  const [sessao, setSessao] = useState(carregarSessao);
  const [permissoes, setPermissoes] = useState(SEM_PERMISSAO);
  const [aviso, setAviso] = useState(null);

  definirToken(sessao ? sessao.token : null);

  useEffect(() => {
    if (!sessao || !sessao.token) return undefined;

    let cancelado = false;

    (async () => {
      const resultado = { aprovacao: false, financeiro: false };
      await Promise.all(
        ['aprovacao', 'financeiro'].map(async (escopo) => {
          try {
            await solicitacoesService.listarSolicitacoes({ pagina: 1, tamanho: 1, escopo });
            resultado[escopo] = true;
          } catch (e) {
            resultado[escopo] = !e || e.status !== 403;
          }
        })
      );
      if (!cancelado) setPermissoes(resultado);
    })();

    return () => {
      cancelado = true;
    };
  }, [sessao]);

  const limpar = useCallback(() => {
    gravarSessao(null);
    definirToken(null);
    setPermissoes(SEM_PERMISSAO);
    setSessao(null);
  }, []);

  const encerrar = useCallback(() => {
    setAviso(null);
    limpar();
  }, [limpar]);

  const encerrarComAviso = useCallback(
    (mensagem) => {
      setAviso(mensagem);
      limpar();
    },
    [limpar]
  );

  const sair = useCallback(async () => {
    await sessaoService.encerrarSessao().catch(() => null);
    encerrar();
  }, [encerrar]);

  useEffect(() => aoFalharSessao(encerrar), [encerrar]);

  const entrar = useCallback(async (email, senha) => {
    const resposta = await autenticacaoService.autenticar(email, senha);
    const dados = resposta ? resposta.dados : null;
    if (!dados || !dados.token) {
      throw new Error('Resposta de autenticação inválida.');
    }
    const novaSessao = {
      token: dados.token,
      expira_em: dados.expira_em,
      administrador: !!dados.administrador,
      comercial: !!dados.comercial,
      usuario: dados.usuario,
    };
    gravarSessao(novaSessao);
    setPermissoes(SEM_PERMISSAO);
    setAviso(null);
    setSessao(novaSessao);
    return novaSessao;
  }, []);

  const valor = useMemo(
    () => ({
      sessao,
      usuario: sessao ? sessao.usuario : null,
      autenticado: !!sessao,
      administrador: !!(sessao && sessao.administrador),
      comercial: !!(sessao && (sessao.comercial || sessao.administrador)),
      permissoes: sessao ? permissoes : SEM_PERMISSAO,
      aviso,
      entrar,
      encerrar,
      encerrarComAviso,
      sair,
    }),
    [sessao, permissoes, aviso, entrar, encerrar, encerrarComAviso, sair]
  );

  return (
    <AutenticacaoContexto.Provider value={valor}>{children}</AutenticacaoContexto.Provider>
  );
}
