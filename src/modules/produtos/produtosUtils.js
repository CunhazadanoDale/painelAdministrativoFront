export const UNIDADES_MEDIDA = [
  { valor: 'un', rotulo: 'Unidade (un)' },
  { valor: 'm', rotulo: 'Metro (m)' },
  { valor: 'm2', rotulo: 'Metro quadrado (m²)' },
  { valor: 'm3', rotulo: 'Metro cúbico (m³)' },
  { valor: 'kg', rotulo: 'Quilograma (kg)' },
  { valor: 't', rotulo: 'Tonelada (t)' },
  { valor: 'cx', rotulo: 'Caixa (cx)' },
  { valor: 'sc', rotulo: 'Saco (sc)' },
  { valor: 'pct', rotulo: 'Pacote (pct)' },
  { valor: 'lt', rotulo: 'Litro (lt)' },
];

export const TIPOS_MOVIMENTO = [
  { valor: 'entrada', rotulo: 'Entrada' },
  { valor: 'saida', rotulo: 'Saída' },
  { valor: 'ajuste', rotulo: 'Ajuste' },
  { valor: 'perda', rotulo: 'Perda' },
  { valor: 'devolucao', rotulo: 'Devolução' },
  { valor: 'implantacao', rotulo: 'Implantação' },
];

const ROTULOS_SO_DO_HISTORICO = { transferencia: 'Transferência' };

export function rotuloUnidade(valor) {
  const unidade = UNIDADES_MEDIDA.find((item) => item.valor === valor);
  return unidade ? unidade.rotulo : valor || '—';
}

export function rotuloTipoMovimento(valor) {
  const tipo = TIPOS_MOVIMENTO.find((item) => item.valor === valor);
  if (tipo) return tipo.rotulo;
  return ROTULOS_SO_DO_HISTORICO[valor] || valor || '—';
}

export function aceitaQuantidadeNegativa(tipo) {
  return tipo === 'ajuste';
}

export function consomeSaldo(tipo, quantidade) {
  if (tipo === 'saida' || tipo === 'perda') return true;
  return tipo === 'ajuste' && quantidade < 0;
}

export function custoNoMovimento(tipo, quantidade) {
  if (tipo === 'entrada') return 'obrigatorio';
  if (consomeSaldo(tipo, quantidade)) return 'proibido';
  if (tipo === 'ajuste' && !(quantidade > 0)) return 'proibido';
  return 'opcional';
}

export const LIMITE_ARQUIVO = 10 * 1024 * 1024;

export function imagemPermitida(arquivo) {
  return (
    ['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type) &&
    arquivo.size <= LIMITE_ARQUIVO
  );
}

export function ehPesoValido(texto) {
  const limpo = String(texto ?? '').trim().replace(/\./g, '').replace(',', '.');
  if (!limpo) return { valido: true, valor: null };
  const numero = Number(limpo);
  if (!Number.isFinite(numero) || numero < 0) return { valido: false, valor: null };
  return { valido: true, valor: numero };
}

export function ehEstoqueMinimoValido(texto) {
  const limpo = String(texto ?? '').trim();
  if (!limpo) return { valido: true, valor: null };
  const numero = Number(limpo);
  if (!Number.isInteger(numero) || numero < 0) return { valido: false, valor: null };
  return { valido: true, valor: numero };
}
