import React, { useCallback, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useAutenticacao } from '../autenticacao/useAutenticacao';
import {
  carregarPreferencias,
  carregarTemaDoAparelho,
  gravarPreferencias,
  gravarTemaDoAparelho,
} from './armazenamento';
import { PreferenciasContexto } from './preferenciasContexto';

const CONSULTA_ESCURO = '(prefers-color-scheme: dark)';

function consultaDoSistema() {
  return typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA_ESCURO) : null;
}

function sistemaEscuro() {
  const consulta = consultaDoSistema();
  return !!(consulta && consulta.matches);
}

function assinarSistema(aoMudar) {
  const consulta = consultaDoSistema();
  if (!consulta) return () => {};
  consulta.addEventListener('change', aoMudar);
  return () => consulta.removeEventListener('change', aoMudar);
}

function semSistema() {
  return false;
}

export function PreferenciasProvider({ children }) {
  const autenticacao = useAutenticacao();
  const usuarioId = autenticacao && autenticacao.usuario ? autenticacao.usuario.id : null;
  const [estado, setEstado] = useState(() => ({ dono: usuarioId, valores: carregarPreferencias(usuarioId) }));
  const [tema, setTema] = useState(carregarTemaDoAparelho);
  const escuroNoSistema = useSyncExternalStore(assinarSistema, sistemaEscuro, semSistema);

  let valores = estado.valores;
  if (estado.dono !== usuarioId) {
    valores = carregarPreferencias(usuarioId);
    setEstado({ dono: usuarioId, valores });
  }

  const temaAplicado = tema === 'sistema' ? (escuroNoSistema ? 'escuro' : 'claro') : tema;

  useLayoutEffect(() => {
    document.documentElement.dataset.tema = temaAplicado;
  }, [temaAplicado]);

  const alterar = useCallback(
    (campo, valor) => {
      if (campo === 'tema') {
        gravarTemaDoAparelho(valor);
        setTema(valor);
        return;
      }
      const novos = { ...valores, [campo]: valor };
      gravarPreferencias(usuarioId, novos);
      setEstado({ dono: usuarioId, valores: novos });
    },
    [valores, usuarioId]
  );

  const valor = useMemo(
    () => ({ preferencias: { ...valores, tema }, temaAplicado, alterar }),
    [valores, tema, temaAplicado, alterar]
  );

  return <PreferenciasContexto.Provider value={valor}>{children}</PreferenciasContexto.Provider>;
}
