import { montarConsulta, requisitar } from '../lib/api';

export function obterResumoContasAPagar({ de = '', ate = '', empresa = '', sinal } = {}) {
  return requisitar(`/api/v1/contas-a-pagar/resumo${montarConsulta({ de, ate, empresa })}`, { sinal });
}
