import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AutenticacaoProvider } from './app/autenticacao/AutenticacaoProvider';

function Observador() {
  const localizacao = useLocation();
  return (
    <>
      <span data-testid="caminho">{localizacao.pathname}</span>
      <span data-testid="caminho-completo">{`${localizacao.pathname}${localizacao.search}`}</span>
    </>
  );
}

function renderizar(caminho) {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <AutenticacaoProvider>
        <Observador />
        <App />
      </AutenticacaoProvider>
    </MemoryRouter>
  );
}

function gravarSessao(administrador) {
  localStorage.setItem(
    'mia.sessao',
    JSON.stringify({
      token: 'token-de-teste',
      expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      administrador,
      usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
    })
  );
}

function gravarSessaoFinanceiro() {
  localStorage.setItem(
    'mia.sessao',
    JSON.stringify({
      token: 'token-de-teste',
      expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      administrador: false,
      financeiro: true,
      usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
    })
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ dados: [] }),
    }))
  );
});

describe('roteamento do App', () => {
  it('mostra o login para visitante desautenticado', async () => {
    renderizar('/usuarios');

    expect(await screen.findByRole('heading', { name: 'Entrar no painel' })).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/login');
    expect(screen.queryByText('Novo Usuário')).toBeNull();
  });

  it('redireciona usuário comum que acessa rota administrativa', async () => {
    gravarSessao(false);

    renderizar('/usuarios');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/'));
    expect(screen.queryByRole('heading', { name: 'Entrar no painel' })).toBeNull();
    expect(screen.queryByText('Novo Usuário')).toBeNull();
  });

  it('libera rota administrativa para administrador', async () => {
    gravarSessao(true);

    renderizar('/usuarios');

    expect(await screen.findByText('Novo Usuário')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/usuarios');
  });

  it('redireciona usuário comum que acessa /empresas', async () => {
    gravarSessao(false);

    renderizar('/empresas');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    expect(screen.queryByText('Nova Empresa')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Empresas' })).toBeNull();
  });

  it('libera /empresas e a entrada na sidebar para administrador', async () => {
    gravarSessao(true);

    renderizar('/empresas');

    expect(await screen.findByText('Nova Empresa')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/empresas');
    expect(screen.getByRole('link', { name: 'Empresas' })).toHaveAttribute('href', '/empresas');
  });

  it('libera /fornecedores e a entrada na sidebar para qualquer autenticado, só para leitura', async () => {
    gravarSessao(false);

    renderizar('/fornecedores');

    expect(await screen.findByText('Nenhum fornecedor cadastrado.')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/fornecedores');
    expect(screen.getByRole('link', { name: 'Fornecedores' })).toHaveAttribute('href', '/fornecedores');
    expect(screen.queryByText('Novo Fornecedor')).toBeNull();
  });

  it('mostra o cadastro de fornecedor para o financeiro', async () => {
    localStorage.setItem(
      'mia.sessao',
      JSON.stringify({
        token: 'token-de-teste',
        expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        administrador: false,
        financeiro: true,
        usuario: { usuario_id: 1, nome: 'Pessoa Teste', email: 'teste@exemplo.com' },
      })
    );

    renderizar('/fornecedores');

    expect(await screen.findByText('Novo Fornecedor')).toBeInTheDocument();
  });

  it('redireciona quem não é financeiro que acessa /contas-bancarias e esconde a entrada', async () => {
    gravarSessao(false);

    renderizar('/contas-bancarias');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/$/));
    expect(screen.queryByText('Nova Conta')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Contas Bancárias' })).toBeNull();
  });

  it('libera /contas-bancarias e a entrada na sidebar para o financeiro', async () => {
    gravarSessaoFinanceiro();

    renderizar('/contas-bancarias');

    expect(await screen.findByText('Nova Conta')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/contas-bancarias');
    expect(screen.getByRole('link', { name: 'Contas Bancárias' })).toHaveAttribute('href', '/contas-bancarias');
  });

  it('libera /contas-bancarias para o administrador', async () => {
    gravarSessao(true);

    renderizar('/contas-bancarias');

    expect(await screen.findByText('Nova Conta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contas Bancárias' })).toBeInTheDocument();
  });

  it('libera /plano-de-contas e a entrada na sidebar para qualquer autenticado, só para leitura', async () => {
    gravarSessao(false);

    renderizar('/plano-de-contas');

    expect(await screen.findByText('Nenhuma categoria no plano de contas.')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/plano-de-contas');
    expect(screen.getByRole('link', { name: 'Plano de Contas' })).toHaveAttribute('href', '/plano-de-contas');
    expect(screen.queryByText('Nova Categoria')).toBeNull();
  });

  it('mostra o cadastro do plano de contas para o financeiro', async () => {
    gravarSessaoFinanceiro();

    renderizar('/plano-de-contas');

    expect(await screen.findByText('Nova Categoria')).toBeInTheDocument();
  });

  it('libera /locais-estoque e a entrada na sidebar para qualquer autenticado, só para consulta', async () => {
    gravarSessao(false);

    renderizar('/locais-estoque');

    expect(await screen.findByText('Nenhum local de estoque nas empresas do seu acesso.')).toBeInTheDocument();
    expect(screen.getByTestId('caminho')).toHaveTextContent('/locais-estoque');
    expect(screen.getByRole('link', { name: 'Locais de Estoque' })).toHaveAttribute('href', '/locais-estoque');
    expect(screen.queryByText('Novo Local')).toBeNull();
  });

  it('mostra o cadastro de locais para o administrador', async () => {
    gravarSessao(true);

    renderizar('/locais-estoque');

    expect(await screen.findByText('Novo Local')).toBeInTheDocument();
  });

  it('redireciona /pagamentos para /solicitacoes', async () => {
    gravarSessao(false);

    renderizar('/pagamentos');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/solicitacoes'));
    expect(await screen.findByText('Nova Solicitação')).toBeInTheDocument();
  });

  it('depois do login volta para o link de origem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify(
            String(url).includes('/usuarios/autenticar')
              ? {
                  dados: {
                    token: 'token-novo',
                    expira_em: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                    administrador: false,
                    usuario: { usuario_id: 1, nome: 'Pessoa Teste' },
                  },
                }
              : { dados: [] }
          ),
      }))
    );

    renderizar('/solicitacoes?escopo=minhas');
    expect(await screen.findByRole('heading', { name: 'Entrar no painel' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'pessoa@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(screen.getByTestId('caminho-completo')).toHaveTextContent('/solicitacoes?escopo=minhas')
    );
  });

  it('sem link de origem o login leva para a raiz', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify(
            String(url).includes('/usuarios/autenticar')
              ? { dados: { token: 'token-novo', usuario: { usuario_id: 1, nome: 'Pessoa Teste' } } }
              : { dados: [] }
          ),
      }))
    );

    renderizar('/login');
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'pessoa@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(screen.getByTestId('caminho-completo')).toHaveTextContent(/^\/$/));
  });

  it('leva qualquer rota desconhecida para a raiz', async () => {
    gravarSessao(true);

    renderizar('/rota-que-nao-existe');

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/'));
  });
});
