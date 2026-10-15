import React from 'react';
import './ErrorBoundary.css';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
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
                style={{ flex: 'none', width: 'auto', padding: '8px 16px' }}
                onClick={() => window.location.reload()}
              >
                Recarregar página
              </button>
              <button
                type="button"
                className="filter-btn filter-btn-secondary"
                style={{ flex: 'none', width: 'auto', padding: '8px 16px' }}
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
