export { erroDoDocumento, erroDoEmail, normalizarDocumento } from '../fornecedores/fornecedoresUtils';
export { UFS } from '../empresas/empresasUtils';

const PONTOS_BASE_MAXIMO = 10000;

const formatoPercentual = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatarPercentual(pontosBase) {
  return `${formatoPercentual.format((Number(pontosBase) || 0) / 100)}%`;
}

export function pontosBaseParaTexto(pontosBase) {
  return formatoPercentual.format((Number(pontosBase) || 0) / 100);
}

export function paraPontosBase(texto) {
  const valor = String(texto ?? '').trim().replace(',', '.');
  if (!valor) return 0;
  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(valor)) return null;
  const pontosBase = Math.round(Number(valor) * 100);
  return pontosBase <= PONTOS_BASE_MAXIMO ? pontosBase : null;
}

export function erroDoPercentual(texto) {
  return paraPontosBase(texto) === null ? 'Informe um percentual de 0 a 100, com até duas casas.' : null;
}
