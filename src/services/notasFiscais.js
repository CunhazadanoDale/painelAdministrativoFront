import { montarConsulta, requisitar } from '../lib/api';
import { baixarDoCaminho, enviarArquivo } from './arquivos';

const CAMINHO = '/api/v1/notas-fiscais';
const TIPO_XML = 'application/xml';

export function listarNotas({
  pagina = 1,
  tamanho = 20,
  empresa = '',
  cliente = '',
  pedido = '',
  natureza = '',
  status = '',
  entreEmpresas = '',
  semPedido = false,
  emitida_de = '',
  emitida_ate = '',
  numero = '',
  chave = '',
  sinal,
} = {}) {
  const consulta = montarConsulta({
    pagina,
    tamanho,
    empresa,
    cliente,
    pedido,
    natureza,
    status,
    entre_empresas: entreEmpresas,
    sem_pedido: semPedido ? 'true' : '',
    emitida_de,
    emitida_ate,
    numero,
    chave,
  });
  return requisitar(`${CAMINHO}${consulta}`, { sinal });
}

export function obterNota(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}`, { sinal });
}

export function enviarXml(arquivo, opcoes) {
  const comTipo = arquivo.type ? arquivo : new File([arquivo], arquivo.name, { type: TIPO_XML });
  return enviarArquivo(comTipo, opcoes);
}

export function importarNota({ arquivo_id, pedido_id = null, entrega_id = null }) {
  return requisitar(`${CAMINHO}/importacao`, { metodo: 'POST', corpo: { arquivo_id, pedido_id, entrega_id } });
}

export function atualizarVinculoNota(id, { versao, pedido_id, entrega_id }) {
  return requisitar(`${CAMINHO}/${id}/vinculo`, { metodo: 'PUT', corpo: { versao, pedido_id, entrega_id } });
}

export function ligarItemAoProduto(id, numeroItem, { versao, produto_id }) {
  return requisitar(`${CAMINHO}/${id}/itens/${numeroItem}/produto`, { metodo: 'PUT', corpo: { versao, produto_id } });
}

export function importarEventoNota(arquivoId) {
  return requisitar(`${CAMINHO}/eventos`, { metodo: 'POST', corpo: { arquivo_id: arquivoId } });
}

export function listarEventosNota(id, { sinal } = {}) {
  return requisitar(`${CAMINHO}/${id}/eventos`, { sinal });
}

export function sincronizarTitulosNota(id) {
  return requisitar(`${CAMINHO}/${id}/titulos`, { metodo: 'POST' });
}

export function listarItensSemProduto({ pagina = 1, tamanho = 20, empresa = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/itens-sem-produto${montarConsulta({ pagina, tamanho, empresa })}`, { sinal });
}

export function listarEntregasSemNota({ pagina = 1, tamanho = 20, empresa = '', cliente = '', sinal } = {}) {
  return requisitar(`/api/v1/entregas/sem-nota-fiscal${montarConsulta({ pagina, tamanho, empresa, cliente })}`, {
    sinal,
  });
}

export function baixarXmlNota(id, nome) {
  return baixarDoCaminho(`${CAMINHO}/${id}/xml`, nome);
}
