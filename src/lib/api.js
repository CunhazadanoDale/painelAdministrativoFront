const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

let tokenAtual = null;
const ouvintesSessao = [];

export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
  }
}

export function definirToken(token) {
  tokenAtual = token || null;
}

export function obterToken() {
  return tokenAtual;
}

export function obterUrlBase() {
  return BASE_URL;
}

export function aoFalharSessao(ouvinte) {
  ouvintesSessao.push(ouvinte);
  return () => {
    const indice = ouvintesSessao.indexOf(ouvinte);
    if (indice >= 0) ouvintesSessao.splice(indice, 1);
  };
}

function comunicarFalhaSessao() {
  ouvintesSessao.forEach((ouvinte) => ouvinte());
}

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

export async function requisitar(caminho, { metodo = 'GET', corpo, sinal } = {}) {
  const formulario = corpo instanceof FormData;
  const cabecalhos = {};
  if (corpo && !formulario) cabecalhos['Content-Type'] = 'application/json';
  if (tokenAtual) cabecalhos.Authorization = `Bearer ${tokenAtual}`;

  let resposta;
  try {
    resposta = await fetch(`${BASE_URL}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo ? (formulario ? corpo : JSON.stringify(corpo)) : undefined,
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
      dados = null;
    }
  }

  if (!resposta.ok) {
    if (resposta.status === 401) comunicarFalhaSessao();
    const mensagem = (dados && dados.erro && dados.erro.mensagem) || `Falha na requisição (status ${resposta.status})`;
    throw new ErroApi(resposta.status, mensagem);
  }

  // Resposta 200 com corpo que não é JSON: acontece quando a API não está no
  // endereço esperado (VITE_API_BASE_URL errado ou proxy ausente em produção) e
  // quem atende é o fallback do SPA, que devolve o index.html com status 200.
  // Devolver null aqui faz a tela mostrar "nenhum registro" mesmo havendo dados,
  // então o problema precisa virar erro explícito.
  if (dados === null && texto.trim() !== '') {
    throw new ErroApi(
      resposta.status,
      'A API não devolveu JSON. Confirme se VITE_API_BASE_URL aponta para a API Go e se ela está em execução.'
    );
  }

  return dados;
}
