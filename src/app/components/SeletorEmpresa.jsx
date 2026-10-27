import React, { useCallback } from 'react';
import * as empresasService from '../../services/empresas';
import { usePreferencias } from '../preferencias/usePreferencias';
import { SeletorRemoto } from './SeletorRemoto';

const opcaoDeEmpresa = (empresa) => ({ valor: empresa.id, rotulo: empresa.nome_fantasia });

export function SeletorEmpresa({ apenasAtivas = true, selecionarUnica = true, ...props }) {
  const { preferencias } = usePreferencias();
  const carregar = useCallback(
    (sinal) => empresasService.listarTodasEmpresas({ ativas: apenasAtivas ? true : '', sinal }),
    [apenasAtivas]
  );

  return (
    <SeletorRemoto
      {...props}
      carregar={carregar}
      opcaoDe={opcaoDeEmpresa}
      selecionarUnica={selecionarUnica}
      preferido={selecionarUnica ? preferencias.empresaPadrao : ''}
      textoVazio="Nenhuma empresa no seu acesso"
      textoErro="Erro ao carregar as empresas."
    />
  );
}
