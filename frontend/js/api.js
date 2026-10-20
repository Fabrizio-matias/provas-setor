/**
 * Camada de Comunicação HTTP com a API REST
 */
const API = {
  getToken() {
    return localStorage.getItem('token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },

  getUsuario() {
    const userStr = localStorage.getItem('usuario');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  },

  setUsuario(usuario) {
    if (usuario) {
      localStorage.setItem('usuario', JSON.stringify(usuario));
    } else {
      localStorage.removeItem('usuario');
    }
  },

  async request(endpoint, options = {}) {
    const baseUrl = CONFIG.API_URL;
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const headers = options.headers || {};
    const token = this.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!options.isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      // Tratamento de sessão expirada / não autenticado
      if (response.status === 401) {
        if (!window.location.pathname.endsWith('login.html')) {
          this.setToken(null);
          this.setUsuario(null);
          window.location.href = 'login.html?expired=1';
          return;
        }
      }

      // Se for download binário (ex: stream de arquivo)
      if (options.responseType === 'blob') {
        if (!response.ok) {
          const errorJson = await response.json().catch(() => ({}));
          throw new Error(errorJson.message || `Erro no download (${response.status})`);
        }
        return await response.blob();
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || `Erro na requisição: ${response.status}`);
        error.data = data;
        error.status = response.status;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`Erro na chamada API (${endpoint}):`, err);
      throw err;
    }
  },

  get(endpoint, params = {}) {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(fullEndpoint, { method: 'GET' });
  },

  post(endpoint, data = {}, isFormData = false) {
    return this.request(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
      isFormData
    });
  },

  patch(endpoint, data = {}, isFormData = false) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: isFormData ? data : JSON.stringify(data),
      isFormData
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  async downloadArquivoImpressao(provaId, nomeArquivo = 'prova-aprovada.pdf') {
    const blob = await this.request(`/provas/${provaId}/arquivo-impressao`, {
      method: 'GET',
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
};

/**
 * Sistema de Notificações Toast Moderno
 */
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    error: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
    warning: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
    info: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">${message}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

window.API = API;
window.showToast = showToast;
