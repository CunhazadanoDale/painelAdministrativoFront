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

export const TIPOS_CLIENTE = [
  { valor: 'construtora', rotulo: 'Construtora' },
  { valor: 'loja', rotulo: 'Loja' },
  { valor: 'pf', rotulo: 'Pessoa física' },
  { valor: 'outro', rotulo: 'Outro' },
];

export function rotuloTipoCliente(tipo) {
  return TIPOS_CLIENTE.find((item) => item.valor === tipo)?.rotulo ?? tipo ?? '—';
}

export function erroDoTipoComDocumento(tipo, documento) {
  const cpf = String(documento ?? '').length === 11;
  return (tipo === 'pf') === cpf ? null : 'CPF só com o tipo pessoa física, e pessoa física só com CPF.';
}

export { erroDoCnpj, normalizarCnpj } from '../empresas/empresasUtils';

export function normalizarCep(texto) {
  return String(texto ?? '').replace(/\D/g, '');
}

export function erroDoCep(texto) {
  const cep = normalizarCep(texto);
  return !cep || cep.length === 8 ? null : 'O CEP tem 8 dígitos.';
}

export function formatarCep(cep) {
  const digitos = normalizarCep(cep);
  return digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

export function enderecoDaObra(obra) {
  const numero = obra.numero ? `, ${obra.numero}` : '';
  const bairro = obra.bairro ? ` — ${obra.bairro}` : '';
  return `${obra.logradouro}${numero}${bairro}`;
}

export const CABECALHO_IMPORTACAO =
  'documento;nome;nome_fantasia;tipo;grupo;uf;cidade;email_nf;telefone;representante_documento;exige_numero_pedido_na_nf;proibe_antecipacao;observacoes';
