import { useContext } from 'react';
import { PreferenciasContexto } from './preferenciasContexto';

export function usePreferencias() {
  return useContext(PreferenciasContexto);
}
