import { useContext } from 'react';
import { AutenticacaoContexto } from './autenticacaoContexto';

export function useAutenticacao() {
  return useContext(AutenticacaoContexto);
}
