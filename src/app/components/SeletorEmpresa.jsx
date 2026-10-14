import React, { useCallback } from 'react';
import * as empresasService from '../../services/empresas';
import { SeletorRemoto } from './SeletorRemoto';

const opcaoDeEmpresa = (empresa) => ({ valor: empresa.id, rotulo: empresa.nome_fantasia });

export function SeletorEmpresa({ apenasAtivas = true, ...props }) {
  const carregar = useCallback(
    (sinal) => empresasService.listarTodasEmpresas({ ativas: apenasAtivas ? true : '', sinal }),
    [apenasAtivas]
  );

  return (
    <SeletorRemoto
      {...props}
      carregar={carregar}
      opcaoDe={opcaoDeEmpresa}
      textoVazio="Nenhuma empresa no seu acesso"
      textoErro="Erro ao carregar as empresas."
    />
  );
}
