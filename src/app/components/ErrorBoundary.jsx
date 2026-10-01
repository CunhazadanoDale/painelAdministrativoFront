import React from 'react';
import './ErrorBoundary.css';

/**
 * Error boundary global: intercepta exceções de renderização da árvore e
 * mostra um fallback amigável em vez de deixar a tela branca (React não
 * tem boundary funcional — precisa ser classe).
 *
 * Para limpar o erro ao navegar, use `<ErrorBoundary key={rota}>`:
 * a remontagem recria o estado (sem setState fora do render).
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    // Mantém o detalhe no console para depuração.
    console.error('Erro não tratado na UI:', erro, info);
  }

  render() {
    const { erro } = this.state;

    if (erro) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary-cartao">
            <h1>Algo deu errado nesta tela</h1>
            <p>
              Ocorreu um erro inesperado. Você pode tentar recarregar a página
              ou voltar para o início.
            </p>
            <pre className="error-boundary-detalhe">
              {String(erro?.message || erro)}
            </pre>
            <div className="error-boundary-acoes">
              <button
                type="button"
                className="filter-btn filter-btn-primary"
                style={{ width: 'auto', padding: '8px 16px' }}
                onClick={() => window.location.reload()}
              >
                Recarregar página
              </button>
              <button
                type="button"
                className="filter-btn filter-btn-secondary"
                style={{ width: 'auto', padding: '8px 16px' }}
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                Ir para o início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
