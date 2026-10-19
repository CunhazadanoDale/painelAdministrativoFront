import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/tabela-precos';

export function lancarPreco({ produto_id, modelo, preco_centavos, vigente_de, observacao = null }) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: { produto_id, modelo, preco_centavos, vigente_de, observacao } });
}

export function listarHistoricoPrecos({ pagina = 1, tamanho = 20, produto = '', modelo = '', sinal } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho, produto, modelo })}`, { sinal });
}

export function listarPrecosVigentes({
  pagina = 1,
  tamanho = 20,
  modelo,
  data = '',
  produto = '',
  busca = '',
  sinal,
} = {}) {
  return requisitar(`${CAMINHO}/vigentes${montarConsulta({ pagina, tamanho, modelo, data, produto, busca })}`, {
    sinal,
  });
}

export function excluirPreco(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}
