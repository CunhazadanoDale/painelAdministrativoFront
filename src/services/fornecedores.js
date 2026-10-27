import { montarConsulta, requisitar } from '../lib/api';
import { baixarDoCaminho } from './arquivos';

const CAMINHO = '/api/v1/fornecedores';

export function listarFornecedores({
  pagina = 1,
  tamanho = 20,
  busca = '',
  pais = '',
  moeda = '',
  ativo = '',
  sinal,
} = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, busca, pais, moeda, ativo })}`, {
    sinal,
  });
}

export function obterFornecedor(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function criarFornecedor(dados) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: dados });
}

export function atualizarFornecedor(id, dados) {
  const { pais: _pais, documento: _documento, ...corpo } = dados;
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'PUT', corpo });
}

export function ativarFornecedor(id, versao) {
  return requisitar(`${CAMINHO}/${id}/ativar`, { metodo: 'PATCH', corpo: { versao } });
}

export function desativarFornecedor(id, versao) {
  return requisitar(`${CAMINHO}/${id}/desativar`, { metodo: 'PATCH', corpo: { versao } });
}

export function removerFornecedor(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}

export function importarFornecedores(arquivo, { simular = false } = {}) {
  return requisitar(`${CAMINHO}/importacao${montarConsulta({ simular: simular ? 'true' : 'false' })}`, {
    metodo: 'POST',
    corpo: arquivo,
    tipoConteudo: 'text/csv',
  });
}

export function baixarModeloImportacao() {
  return baixarDoCaminho(`${CAMINHO}/importacao/modelo`, 'modelo-fornecedores.csv');
}
