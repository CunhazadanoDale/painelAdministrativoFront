export const TIPOS_CONTA = [
  { valor: 'corrente', rotulo: 'Corrente' },
  { valor: 'poupanca', rotulo: 'Poupança' },
  { valor: 'pagamento', rotulo: 'Pagamento' },
  { valor: 'aplicacao', rotulo: 'Aplicação' },
];

export const LIMITE_APELIDO = 60;

export function rotuloDoTipo(tipo) {
  return TIPOS_CONTA.find((item) => item.valor === tipo)?.rotulo ?? tipo;
}

export function rotuloDoBanco(banco) {
  return `${banco.nome} (${banco.codigo})`;
}

export function normalizarNumero(texto) {
  return String(texto ?? '').replace(/[.\s]/g, '');
}

export function normalizarDigito(texto) {
  return String(texto ?? '').trim().toUpperCase();
}

function erroDeNumero(texto, rotulo, maximo) {
  const numero = normalizarNumero(texto);
  if (!numero) return `Informe ${rotulo.toLowerCase()}.`;
  if (!new RegExp(`^[0-9]{1,${maximo}}$`).test(numero)) return `${rotulo} tem de 1 a ${maximo} dígitos.`;
  if (/^0+$/.test(numero)) return `${rotulo} não pode ser só zeros.`;
  return null;
}

export function erroDaAgencia(texto) {
  return erroDeNumero(texto, 'A agência', 5);
}

export function erroDaConta(texto) {
  return erroDeNumero(texto, 'A conta', 20);
}

export function erroDoDigitoDaAgencia(texto) {
  const digito = normalizarDigito(texto);
  return !digito || /^[0-9XP]$/.test(digito) ? null : 'O dígito da agência é um número, X ou P.';
}

export function erroDoDigitoDaConta(texto) {
  const digito = normalizarDigito(texto);
  return !digito || /^[0-9XP]{1,2}$/.test(digito)
    ? null
    : 'O dígito da conta tem 1 ou 2 caracteres: números, X ou P.';
}
