const formatoMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatoData = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const PADRAO_MILHAR = /^[1-9]\d{0,2}(\.\d{3})+$/;

const formatoDataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatarMoeda(centavos) {
  const valor = Number(centavos);
  if (!Number.isFinite(valor)) return '—';
  return formatoMoeda.format(valor / 100);
}

export function formatarData(iso) {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return formatoData.format(data);
}

export function formatarDataHora(iso) {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return formatoDataHora.format(data);
}

export function formatarTamanho(bytes) {
  const valor = Number(bytes);
  if (!Number.isFinite(valor) || valor < 0) return '—';
  if (valor < 1024) return `${valor} B`;
  if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} kB`;
  return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
}

export function paraCentavos(texto) {
  const limpo = String(texto ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .trim();
  if (!limpo) return NaN;
  let normalizado = limpo;
  if (limpo.includes(',')) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.');
  } else if (PADRAO_MILHAR.test(limpo)) {
    normalizado = limpo.replace(/\./g, '');
  }
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return NaN;
  return Math.round(numero * 100);
}

export function centavosParaTexto(centavos) {
  const valor = Number(centavos);
  if (!Number.isFinite(valor)) return '';
  return (valor / 100).toFixed(2).replace('.', ',');
}
