import { requisitar } from '../lib/api';

const CAMINHO = '/api/v1/usuarios/autenticar';

export function autenticar(email, senha) {
  return requisitar(CAMINHO, { metodo: 'POST', corpo: { email, senha } });
}
