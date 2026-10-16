export const NATUREZAS = [
  { valor: 'receita', rotulo: 'Receita' },
  { valor: 'despesa', rotulo: 'Despesa' },
  { valor: 'transferencia', rotulo: 'Transferência' },
];

export const LINHAS_DRE = [
  { valor: 'receita_operacional', rotulo: 'Receita operacional', naturezas: ['receita'] },
  { valor: 'deducao_venda', rotulo: 'Dedução da venda', naturezas: ['despesa'] },
  { valor: 'compra_mercadoria', rotulo: 'Compra de mercadoria', naturezas: ['despesa'] },
  { valor: 'despesa_variavel', rotulo: 'Despesa variável', naturezas: ['despesa'] },
  { valor: 'despesa_fixa', rotulo: 'Despesa fixa', naturezas: ['despesa'] },
  { valor: 'resultado_financeiro', rotulo: 'Resultado financeiro', naturezas: ['receita', 'despesa'] },
  { valor: 'fora_dre', rotulo: 'Fora da DRE', naturezas: ['receita', 'despesa'] },
  { valor: 'entre_contas', rotulo: 'Entre contas', naturezas: ['transferencia'] },
];

export const LIMITES = { nome: 120, codigo: 20 };

const ORDEM_MAXIMA = 2147483647;

export function rotuloDaNatureza(natureza) {
  return NATUREZAS.find((item) => item.valor === natureza)?.rotulo ?? natureza;
}

export function rotuloDaLinha(linha) {
  return LINHAS_DRE.find((item) => item.valor === linha)?.rotulo ?? linha;
}

export function linhasDaNatureza(natureza) {
  return LINHAS_DRE.filter((linha) => linha.naturezas.includes(natureza));
}

export function erroDoCodigo(texto) {
  const codigo = String(texto ?? '').trim();
  if (!codigo) return null;
  if (codigo.length > LIMITES.codigo) return `O código tem no máximo ${LIMITES.codigo} caracteres.`;
  return /^[0-9]+(\.[0-9]+)*$/.test(codigo) ? null : 'Use números separados por ponto, como 4.1.03.';
}

export function lerOrdem(texto) {
  const ordem = String(texto ?? '').trim();
  if (!ordem) return 0;
  if (!/^[0-9]+$/.test(ordem)) return null;
  const numero = Number(ordem);
  return numero <= ORDEM_MAXIMA ? numero : null;
}
