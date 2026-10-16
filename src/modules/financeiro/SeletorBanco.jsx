import React from 'react';
import { SeletorRemoto } from '../../app/components/SeletorRemoto';
import * as contasService from '../../services/contasBancarias';
import { rotuloDoBanco } from './contasBancariasUtils';

const carregarBancos = (sinal) => contasService.listarBancos({ sinal }).then((resposta) => resposta?.dados ?? []);

const opcaoDeBanco = (banco) => ({ valor: banco.codigo, rotulo: rotuloDoBanco(banco) });

export function SeletorBanco(props) {
  return (
    <SeletorRemoto
      selecionarUnica={false}
      {...props}
      carregar={carregarBancos}
      opcaoDe={opcaoDeBanco}
      textoVazio="Nenhum banco no catálogo"
      textoErro="Erro ao carregar os bancos."
    />
  );
}
