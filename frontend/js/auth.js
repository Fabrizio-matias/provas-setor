/**
 * Gerenciador de Autenticação e Controle de Sessão no Frontend
 */
const Auth = {
  getUsuarioLogado() {
    return API.getUsuario();
  },

  estaAutenticado() {
    return !!API.getToken() && !!this.getUsuarioLogado();
  },

  temPerfil(...perfisPermitidos) {
    const usuario = this.getUsuarioLogado();
    if (!usuario) return false;
    if (usuario.perfil === 'admin') return true; // Administrador tem acesso geral
    return perfisPermitidos.includes(usuario.perfil);
  },

  verificarAcesso() {
    const paginaAtual = window.location.pathname;
    const ehPaginaLogin = paginaAtual.endsWith('login.html') || paginaAtual.endsWith('/') && !paginaAtual.includes('.html');

    if (!this.estaAutenticado()) {
      if (!ehPaginaLogin && !paginaAtual.endsWith('index.html')) {
        window.location.href = 'login.html';
        return false;
      }
    } else {
      // Se estiver logado e tentar abrir o login ou raiz, redireciona ao dashboard
      if (paginaAtual.endsWith('login.html') || paginaAtual.endsWith('index.html') || paginaAtual.endsWith('/')) {
        window.location.href = 'dashboard.html';
        return false;
      }
    }
    return true;
  },

  async login(email, senha) {
    const data = await API.post('/auth/login', { email, senha });
    API.setToken(data.token);
    API.setUsuario(data.usuario);
    return data;
  },

  async logout() {
    try {
      await API.post('/auth/logout', {});
    } catch (e) {
      // continua mesmo com erro
    } finally {
      API.setToken(null);
      API.setUsuario(null);
      window.location.href = 'login.html';
    }
  },

  // Tradução amigável dos perfis
  getLabelPerfil(perfil) {
    const labels = {
      admin: 'Administrador',
      professor: 'Professor',
      setor_provas: 'Setor de Provas',
      aprovador: 'Aprovador Final',
      coordenacao: 'Coordenação'
    };
    return labels[perfil] || perfil;
  },

  // Inicializa componentes comuns em todas as páginas autenticadas
  renderHeaderSidebar() {
    const usuario = this.getUsuarioLogado();
    if (!usuario) return;

    // Atualiza nome e perfil no topo
    const nomeEl = document.getElementById('user-nome');
    const perfilEl = document.getElementById('user-perfil');
    const avatarEl = document.getElementById('user-avatar-initials');

    if (nomeEl) nomeEl.textContent = usuario.nome;
    if (perfilEl) {
      perfilEl.textContent = this.getLabelPerfil(usuario.perfil);
      perfilEl.className = `user-role-badge badge-${usuario.perfil}`;
    }
    if (avatarEl) {
      const initials = usuario.nome
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      avatarEl.textContent = initials || 'U';
    }

    // Configura visibilidade de itens de menu específicos
    const adminOnlyItems = document.querySelectorAll('.admin-only');
    adminOnlyItems.forEach((item) => {
      if (usuario.perfil === 'admin') {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });

    const setorOnlyItems = document.querySelectorAll('.setor-only');
    setorOnlyItems.forEach((item) => {
      if (['admin', 'setor_provas', 'aprovador'].includes(usuario.perfil)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });

    // Botão de Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }

    // Mobile sidebar toggle
    const toggleSidebar = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    if (toggleSidebar && sidebar) {
      toggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-open');
      });
    }
  }
};

window.Auth = Auth;

// Executa verificação de autenticação imediatamente ao carregar script
document.addEventListener('DOMContentLoaded', () => {
  if (Auth.verificarAcesso()) {
    Auth.renderHeaderSidebar();
  }
});
