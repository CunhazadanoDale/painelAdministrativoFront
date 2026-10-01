// Helpers de apresentação e filtro do módulo de Leads.

const SEM_ACENTO = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Formata ISO -> dd/mm/aaaa. */
export function formatarData(iso) {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR');
}

/**
 * Cor do badge para uma etapa: reconhece nomes comuns do funil
 * (novo, contatado, negociação, perdido...) e, se não reconhecer,
 * alterna as cores pela ordem da etapa.
 */
export function corDaEtapa(etapa) {
  if (!etapa) return 'neutral';
  const nome = SEM_ACENTO(etapa.nome);

  if (nome.includes('perdid') || nome.includes('cancel')) return 'danger';
  if (nome.includes('negocia') || nome.includes('proposta') || nome.includes('fechad') || nome.includes('ganho')) {
    return 'success';
  }
  if (nome.includes('contat') || nome.includes('qualific') || nome.includes('enviad')) return 'warning';
  if (nome.includes('novo') || nome.includes('receb')) return 'info';

  const cores = ['info', 'warning', 'success', 'danger', 'neutral'];
  const ordem = Number(etapa.ordem) || 1;
  return cores[(ordem - 1) % cores.length];
}

/** Busca textual em cliente (usada quando o filtro é por etapa). */
export function filtrarLeadsPorTexto(leads, q) {
  const termo = SEM_ACENTO(q).trim();
  if (!termo) return leads;
  return leads.filter((lead) =>
    SEM_ACENTO(lead.nome).includes(termo) ||
    SEM_ACENTO(lead.email).includes(termo) ||
    String(lead.telefone ?? '').includes(termo)
  );
}
