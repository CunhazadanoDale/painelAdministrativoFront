import React, { useCallback } from 'react';
import * as locaisService from '../../services/locais';
import { SeletorRemoto } from './SeletorRemoto';

export function SeletorLocal({ empresaId = '', apenasAtivos = true, nomeEmpresa, ...props }) {
  const carregar = useCallback(
    (sinal) =>
      locaisService.listarTodosLocais({ empresa: empresaId, ativos: apenasAtivos ? true : '', sinal }),
    [empresaId, apenasAtivos]
  );

  const opcaoDe = useCallback(
    (local) => ({
      valor: local.id,
      rotulo: nomeEmpresa ? `${local.nome} · ${nomeEmpresa(local.empresa_id)}` : local.nome,
    }),
    [nomeEmpresa]
  );

  return (
    <SeletorRemoto
      {...props}
      carregar={carregar}
      opcaoDe={opcaoDe}
      textoVazio="Nenhum local de estoque disponível"
      textoErro="Erro ao carregar os locais de estoque."
    />
  );
}
