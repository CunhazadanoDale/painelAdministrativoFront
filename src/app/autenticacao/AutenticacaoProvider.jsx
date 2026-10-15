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
  const [aprovacao, setAprovacao] = useState(false);
  const [aviso, setAviso] = useState(null);

  definirToken(sessao ? sessao.token : null);

  useEffect(() => {
    if (!sessao || !sessao.token) return undefined;

    const controle = new AbortController();

    (async () => {
      let permitido = false;
      try {
        await solicitacoesService.listarSolicitacoes({
          pagina: 1,
          tamanho: 1,
          escopo: 'aprovacao',
          sinal: controle.signal,
        });
        permitido = true;
      } catch {
        permitido = false;
      }
      if (!controle.signal.aborted) setAprovacao(permitido);
    })();

    return () => {
      controle.abort();
    };
  }, [sessao]);

  const limpar = useCallback(() => {
    gravarSessao(null);
    definirToken(null);
    setAprovacao(false);
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

  const haviaSessao = !!sessao;

  useEffect(() => {
    const aoMudarArmazenamento = (evento) => {
      if (evento.key !== null && evento.key !== CHAVE_SESSAO) return;
      const novaSessao = carregarSessao();
      definirToken(novaSessao ? novaSessao.token : null);
      setAprovacao(false);
      setAviso(!novaSessao && haviaSessao ? 'A sessão foi encerrada em outra aba.' : null);
      setSessao(novaSessao);
    };
    window.addEventListener('storage', aoMudarArmazenamento);
    return () => window.removeEventListener('storage', aoMudarArmazenamento);
  }, [haviaSessao]);

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
      financeiro: !!dados.financeiro,
      usuario: dados.usuario,
    };
    gravarSessao(novaSessao);
    setAprovacao(false);
    setAviso(null);
    setSessao(novaSessao);
    return novaSessao;
  }, []);

  const valor = useMemo(() => {
    const financeiro = !!(sessao && (sessao.financeiro || sessao.administrador));
    return {
      sessao,
      usuario: sessao ? sessao.usuario : null,
      autenticado: !!sessao,
      administrador: !!(sessao && sessao.administrador),
      comercial: !!(sessao && (sessao.comercial || sessao.administrador)),
      financeiro,
      permissoes: sessao ? { aprovacao, financeiro } : SEM_PERMISSAO,
      aviso,
      entrar,
      encerrar,
      encerrarComAviso,
      sair,
    };
  }, [sessao, aprovacao, aviso, entrar, encerrar, encerrarComAviso, sair]);

  return (
    <AutenticacaoContexto.Provider value={valor}>{children}</AutenticacaoContexto.Provider>
  );
}
