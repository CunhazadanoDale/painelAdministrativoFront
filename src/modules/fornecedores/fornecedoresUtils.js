export { UFS } from '../empresas/empresasUtils';

export const MOEDAS = ['BRL', 'USD', 'EUR', 'CNY'];

export const LIMITES = {
  identificacao_estrangeira: 40,
  nome: 200,
  nome_fantasia: 120,
  cidade: 120,
  contato_nome: 160,
  email: 255,
  telefone: 40,
  observacoes: 2000,
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarPais(texto) {
  return String(texto ?? '').trim().toUpperCase();
}

export function erroDoPais(texto) {
  return /^[A-Z]{2}$/.test(normalizarPais(texto))
    ? null
    : 'Use o código de duas letras do país (BR, CN, US…).';
}

export function normalizarDocumento(texto) {
  return String(texto ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

export function erroDoDocumento(texto) {
  const documento = normalizarDocumento(texto);
  if (!documento) return 'Informe o CPF ou CNPJ.';
  if (documento.length === 11) return /^[0-9]{11}$/.test(documento) ? null : 'O CPF tem só dígitos.';
  if (documento.length === 14)
    return /^[0-9A-Z]{12}[0-9]{2}$/.test(documento) ? null : 'O CNPJ termina em dois dígitos.';
  return 'O CPF tem 11 dígitos e o CNPJ, 14 caracteres.';
}

export function erroDoEmail(texto) {
  const email = String(texto ?? '').trim();
  return !email || EMAIL.test(email) ? null : 'Informe um e-mail válido.';
}

export function identificacaoDe(fornecedor) {
  return (
    fornecedor.documento_formatado || fornecedor.documento || fornecedor.identificacao_estrangeira || '—'
  );
}
