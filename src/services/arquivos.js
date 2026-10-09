import { ErroApi, montarConsulta, obterToken, obterUrlBase, requisitar } from '../lib/api';

const CAMINHO = '/api/v1/arquivos';

export function listarArquivos({ pagina = 1, tamanho = 20 } = {}) {
  return requisitar(`${CAMINHO}${montarConsulta({ pagina, tamanho })}`);
}

export function enviarArquivo(arquivo, { aoProgresso } = {}) {
  return new Promise((resolve, reject) => {
    const formulario = new FormData();
    formulario.append('arquivo', arquivo);

    const requisicao = new XMLHttpRequest();
    requisicao.open('POST', `${obterUrlBase()}${CAMINHO}`);
    const token = obterToken();
    if (token) requisicao.setRequestHeader('Authorization', `Bearer ${token}`);

    requisicao.upload.onprogress = (evento) => {
      if (evento.lengthComputable && aoProgresso) {
        aoProgresso(Math.round((evento.loaded / evento.total) * 100));
      }
    };

    requisicao.onload = () => {
      let dados = null;
      if (requisicao.responseText) {
        try {
          dados = JSON.parse(requisicao.responseText);
        } catch {
          dados = null;
        }
      }
      if (requisicao.status >= 200 && requisicao.status < 300) {
        resolve(dados ? dados.dados : null);
        return;
      }
      const mensagem =
        (dados && dados.erro && dados.erro.mensagem) ||
        `Falha no envio do arquivo (status ${requisicao.status})`;
      reject(new ErroApi(requisicao.status, mensagem));
    };

    requisicao.onerror = () => {
      reject(new ErroApi(0, 'Não foi possível conectar ao servidor. Verifique se a API está em execução.'));
    };

    requisicao.send(formulario);
  });
}

export function removerArquivo(id) {
  return requisitar(`${CAMINHO}/${id}`, { metodo: 'DELETE' });
}

export async function baixarArquivo(id, nome) {
  const token = obterToken();
  const resposta = await fetch(`${obterUrlBase()}${CAMINHO}/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!resposta.ok) {
    let dados = null;
    try {
      dados = await resposta.json();
    } catch {
      dados = null;
    }
    const mensagem =
      (dados && dados.erro && dados.erro.mensagem) ||
      `Falha no download (status ${resposta.status})`;
    throw new ErroApi(resposta.status, mensagem);
  }

  const blob = await resposta.blob();
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = nome || 'arquivo';
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  URL.revokeObjectURL(url);
}
