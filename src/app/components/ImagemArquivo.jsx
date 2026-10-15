import React, { useEffect, useState } from 'react';
import { obterArquivoBlob } from '../../services/arquivos';

export function ImagemArquivo({ arquivoId, alt, className }) {
  const [estado, setEstado] = useState({ arquivoId: null, url: null, erro: null });

  useEffect(() => {
    const controle = new AbortController();
    let url = null;

    obterArquivoBlob(arquivoId, { sinal: controle.signal })
      .then((blob) => {
        if (controle.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setEstado({ arquivoId, url, erro: null });
      })
      .catch((e) => {
        if (controle.signal.aborted) return;
        setEstado({ arquivoId, url: null, erro: e.message || 'Erro ao carregar a imagem.' });
      });

    return () => {
      controle.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [arquivoId]);

  const atual = estado.arquivoId === arquivoId ? estado : { url: null, erro: null };

  if (atual.erro) {
    return (
      <span role="img" aria-label={alt} title={atual.erro} className={className}>
        Imagem indisponível
      </span>
    );
  }

  if (!atual.url) return null;

  return <img src={atual.url} alt={alt} className={className} />;
}
