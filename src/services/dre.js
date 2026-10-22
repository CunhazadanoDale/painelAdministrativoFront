import { montarConsulta, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/dre';

export function obterResumoDre({ de = '', ate = '', empresa = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/resumo${montarConsulta({ de, ate, empresa })}`, { sinal });
}

export function obterFaturamento({ de = '', ate = '', empresa = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/faturamento${montarConsulta({ de, ate, empresa })}`, { sinal });
}

export function obterRelatorioSemanal({ semana = '', empresa = '', sinal } = {}) {
  return requisitar(`${CAMINHO}/relatorio-semanal${montarConsulta({ semana, empresa })}`, { sinal });
}
