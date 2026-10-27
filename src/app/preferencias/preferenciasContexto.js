import { createContext } from 'react';
import { PREFERENCIAS_PADRAO } from './armazenamento';

export const PreferenciasContexto = createContext({
  preferencias: PREFERENCIAS_PADRAO,
  alterar: () => {},
});
