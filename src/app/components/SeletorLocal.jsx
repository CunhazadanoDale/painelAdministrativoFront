import React, { useCallback } from 'react';
import * as locaisService from '../../services/locais';
import { SeletorRemoto } from './SeletorRemoto';

const opcaoDeLocal = (local) => ({ valor: local.id, rotulo: local.nome });

export function SeletorLocal({ empresaId = '', apenasAtivos = true, ...props }) {
  const carregar = useCallback(
    (sinal) =>
      locaisService.listarTodosLocais({ empresa: empresaId, ativos: apenasAtivos ? true : '', sinal }),
    [empresaId, apenasAtivos]
  );

  return (
    <SeletorRemoto
      {...props}
      carregar={carregar}
      opcaoDe={opcaoDeLocal}
      textoVazio="Nenhum local de estoque disponível"
      textoErro="Erro ao carregar os locais de estoque."
    />
  );
}
