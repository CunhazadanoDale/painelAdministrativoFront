export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

export const REGIMES = [
  { valor: 'simples', rotulo: 'Simples Nacional' },
  { valor: 'presumido', rotulo: 'Lucro presumido' },
  { valor: 'real', rotulo: 'Lucro real' },
];

export const LIMITE_RAZAO_SOCIAL = 200;
export const LIMITE_NOME_FANTASIA = 120;

export function rotuloDoRegime(valor) {
  return REGIMES.find((regime) => regime.valor === valor)?.rotulo ?? valor ?? '—';
}

export function normalizarCnpj(texto) {
  return String(texto ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

export function erroDoCnpj(texto) {
  const cnpj = normalizarCnpj(texto);
  if (!cnpj) return 'Informe o CNPJ.';
  if (cnpj.length !== 14) return 'O CNPJ tem 14 caracteres.';
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return 'O CNPJ termina em dois dígitos.';
  return null;
}
