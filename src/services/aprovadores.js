import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/aprovadores';

export function listarAprovadores({ pagina = 1, tamanho = 20 } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho })}`);
}

export function designarAprovador(usuarioId) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: { usuario_id: usuarioId } });
}

export function removerAprovador(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}
