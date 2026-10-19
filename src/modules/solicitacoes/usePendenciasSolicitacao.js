import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as solicitacoesService from '../../services/solicitacoes';

function textoDoContador(contadores) {
  const partes = [];
  if (contadores.aprovacao) partes.push(`${contadores.aprovacao} para aprovar`);
  if (contadores.financeiro) partes.push(`${contadores.financeiro} para pagar`);
  if (contadores.vencidas) partes.push(`${contadores.vencidas} vencidas`);
  return partes.join(' · ');
}

export function usePendenciasSolicitacao() {
  const { pathname } = useLocation();
  const [contador, setContador] = useState(null);

  useEffect(() => {
    const controle = new AbortController();
    solicitacoesService
      .obterPendencias({ sinal: controle.signal })
      .then((resposta) => {
        if (controle.signal.aborted) return;
        const dados = resposta?.dados;
        if (!dados || Array.isArray(dados)) {
          setContador(null);
          return;
        }
        const total = (Number(dados.aprovacao) || 0) + (Number(dados.financeiro) || 0);
        setContador(total > 0 ? { total, titulo: textoDoContador(dados) } : null);
      })
      .catch(() => {
        if (!controle.signal.aborted) setContador(null);
      });
    return () => controle.abort();
  }, [pathname]);

  return contador;
}
