/**
 * Configuração central da API do Frontend
 * Permite alternar facilmente entre ambiente local e produção na Vercel
 */
const CONFIG = {
  // URL pública oficial da API hospedada na Vercel
 PROD_API_URL: 'https://setor-prova.vercel.app/api',

  // URL para testes em ambiente local
  get LOCAL_API_URL() {
    const port = window.location.port || '3000';
    return `http://localhost:${port}/api`;
  },

  // Se houver uma URL configurada no localStorage, use-a.
  // Caso contrário, usa a API da Vercel ou localhost.
  get API_URL() {
    const customUrl = localStorage.getItem('SETOR_PROVAS_API_URL');
    if (customUrl) return customUrl.replace(/\/$/, '');

    // Se estiver rodando pelo servidor local (porta 3000 ou 5000)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const port = window.location.port;
      if (port === '3000' || port === '5000') {
        return `http://localhost:${port}/api`;
      }
    }

    // Por padrão (produção na Vercel ou quando aberto sem servidor):
    return this.PROD_API_URL;
  },

  setApiUrl(newUrl) {
    if (newUrl) {
      localStorage.setItem('SETOR_PROVAS_API_URL', newUrl.replace(/\/$/, ''));
    } else {
      localStorage.removeItem('SETOR_PROVAS_API_URL');
    }
  },

  usarVercel() {
    this.setApiUrl(this.PROD_API_URL);
  },

  usarLocal() {
    this.setApiUrl(this.LOCAL_API_URL);
  }
};

window.CONFIG = CONFIG;
