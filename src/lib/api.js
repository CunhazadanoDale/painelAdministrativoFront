// Cliente HTTP compartilhado.
// Conhece o envelope da API Go: sucesso -> { dados }, erro -> { erro: { codigo, mensagem } }.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
  }
}

/**
 * Monta a query string ignorando valores vazios.
 * @param {Record<string, string|number|boolean|undefined|null>} params
 */
export function montarConsulta(params = {}) {
  const consulta = new URLSearchParams();
  Object.entries(params).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null) return;
    if (typeof valor === 'string' && valor.trim() === '') return;
    consulta.set(chave, String(valor));
  });
  const texto = consulta.toString();
  return texto ? `?${texto}` : '';
}

/**
 * Executa uma requisição e devolve o envelope { dados, pagina, ... } já decodificado.
 * Lança ErroApi com a mensagem vinda do backend quando a resposta não é 2xx.
 */
export async function requisitar(caminho, { metodo = 'GET', corpo, sinal } = {}) {
  let resposta;
  try {
    resposta = await fetch(`${BASE_URL}${caminho}`, {
      method: metodo,
      headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: sinal,
    });
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    throw new ErroApi(0, 'Não foi possível conectar ao servidor. Verifique se a API está em execução.');
  }

  if (resposta.status === 204) return null;

  const texto = await resposta.text();
  let dados = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      // resposta sem JSON válido; segue com dados = null
    }
  }

  if (!resposta.ok) {
    const mensagem = (dados && dados.erro && dados.erro.mensagem) || `Falha na requisição (status ${resposta.status})`;
    throw new ErroApi(resposta.status, mensagem);
  }

  return dados;
}
