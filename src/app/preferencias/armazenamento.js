const PREFIXO = 'mia.preferencias.';
const CHAVE_TEMA = 'mia.tema';

export const TEMAS = ['sistema', 'claro', 'escuro'];

export const PREFERENCIAS_PADRAO = { tema: 'sistema', telaInicial: '/', empresaPadrao: '' };

function textoOuPadrao(valor, padrao) {
  return typeof valor === 'string' ? valor : padrao;
}

function normalizar(bruto) {
  const dados = bruto && typeof bruto === 'object' ? bruto : {};
  return {
    tema: TEMAS.includes(dados.tema) ? dados.tema : PREFERENCIAS_PADRAO.tema,
    telaInicial: textoOuPadrao(dados.telaInicial, PREFERENCIAS_PADRAO.telaInicial),
    empresaPadrao: textoOuPadrao(dados.empresaPadrao, PREFERENCIAS_PADRAO.empresaPadrao),
  };
}

export function carregarPreferencias(usuarioId) {
  if (!usuarioId) return PREFERENCIAS_PADRAO;
  try {
    const bruto = localStorage.getItem(PREFIXO + usuarioId);
    return bruto ? normalizar(JSON.parse(bruto)) : PREFERENCIAS_PADRAO;
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}

export function gravarPreferencias(usuarioId, preferencias) {
  if (!usuarioId) return;
  try {
    localStorage.setItem(PREFIXO + usuarioId, JSON.stringify(preferencias));
  } catch {
    return;
  }
}

export function carregarTemaDoAparelho() {
  try {
    const tema = localStorage.getItem(CHAVE_TEMA);
    return TEMAS.includes(tema) ? tema : PREFERENCIAS_PADRAO.tema;
  } catch {
    return PREFERENCIAS_PADRAO.tema;
  }
}

export function gravarTemaDoAparelho(tema) {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    return;
  }
}
