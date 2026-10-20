/**
 * Lógica de Gerenciamento de Usuários (Apenas Administrador)
 */
let listaUsuariosCache = [];

document.addEventListener('DOMContentLoaded', () => {
  const usuario = Auth.getUsuarioLogado();
  if (!usuario || usuario.perfil !== 'admin') {
    showToast('Acesso restrito ao perfil de Administrador.', 'error');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1200);
    return;
  }

  carregarUsuarios();
  setupModaisUsuarios();
});

async function carregarUsuarios() {
  const tbody = document.getElementById('tbody-usuarios');
  tbody.innerHTML = `
    <tr>
      <td colspan="7" style="text-align: center; padding: 2rem;">
        <div class="loading-spinner"></div>
        <span style="color: var(--text-muted);">Carregando usuários...</span>
      </td>
    </tr>`;

  try {
    const params = {
      busca: document.getElementById('busca-usuario').value.trim(),
      perfil: document.getElementById('filtro-perfil-usuario').value,
      status: document.getElementById('filtro-status-usuario').value
    };

    const res = await API.get('/usuarios', params);
    if (!res || !res.success) {
      throw new Error(res.message || 'Falha ao buscar usuários.');
    }

    listaUsuariosCache = res.usuarios || [];
    renderizarTabelaUsuarios(listaUsuariosCache);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:1.5rem;">${err.message}</td></tr>`;
    showToast(err.message, 'error');
  }
}

function renderizarTabelaUsuarios(usuarios) {
  const tbody = document.getElementById('tbody-usuarios');
  document.getElementById('total-usuarios').textContent = usuarios.length;

  if (usuarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">Nenhum usuário encontrado com os filtros selecionados.</td></tr>`;
    return;
  }

  tbody.innerHTML = usuarios
    .map((u) => {
      const disciplinasStr = u.disciplinas && u.disciplinas.length > 0 ? u.disciplinas.join(', ') : '-';
      const dataCriacao = new Date(u.createdAt).toLocaleDateString('pt-BR');
      const situacaoBadge = u.ativo
        ? `<span class="status-badge" style="background:var(--success-light); color:var(--success-text); border:1px solid var(--success-border);">Ativo</span>`
        : `<span class="status-badge" style="background:var(--danger-light); color:var(--danger-text); border:1px solid var(--danger-border);">Inativo</span>`;

      return `
        <tr>
          <td><strong style="color:var(--text-main);">${u.nome}</strong></td>
          <td>${u.email}</td>
          <td><span class="user-role-badge badge-${u.perfil}">${Auth.getLabelPerfil(u.perfil)}</span></td>
          <td style="max-width:200px; font-size:0.82rem; color:var(--text-secondary);">${disciplinasStr}</td>
          <td>${situacaoBadge}</td>
          <td>${dataCriacao}</td>
          <td style="text-align:right;">
            <div style="display:inline-flex; gap:0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="abrirModalEditarUsuario('${u._id}')">
                Editar
              </button>
              <button class="btn btn-sm ${u.ativo ? 'btn-danger' : 'btn-success'}" onclick="alternarStatusUsuario('${u._id}', ${u.ativo})">
                ${u.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </td>
        </tr>`;
    })
    .join('');
}

function setupModaisUsuarios() {
  // Submit Novo Usuário
  const formNovo = document.getElementById('form-novo-usuario');
  if (formNovo) {
    formNovo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-submit-novo-usuario');
      btn.disabled = true;

      try {
        const payload = {
          nome: document.getElementById('novo-nome').value.trim(),
          email: document.getElementById('novo-email').value.trim(),
          senha: document.getElementById('novo-senha').value,
          perfil: document.getElementById('novo-perfil').value,
          disciplinas: document.getElementById('novo-disciplinas').value
        };

        await API.post('/usuarios', payload);
        showToast('Usuário cadastrado com sucesso!', 'success');
        fecharModalNovoUsuario();
        formNovo.reset();
        carregarUsuarios();
      } catch (err) {
        showToast(err.message || 'Erro ao cadastrar usuário.', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  // Submit Editar Usuário
  const formEdit = document.getElementById('form-editar-usuario');
  if (formEdit) {
    formEdit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-submit-edit-usuario');
      btn.disabled = true;

      try {
        const id = document.getElementById('edit-id').value;
        const payload = {
          nome: document.getElementById('edit-nome').value.trim(),
          email: document.getElementById('edit-email').value.trim(),
          perfil: document.getElementById('edit-perfil').value,
          disciplinas: document.getElementById('edit-disciplinas').value
        };

        const novaSenha = document.getElementById('edit-nova-senha').value;
        if (novaSenha && novaSenha.trim().length >= 6) {
          payload.novaSenha = novaSenha.trim();
        }

        await API.patch(`/usuarios/${id}`, payload);
        showToast('Usuário atualizado com sucesso!', 'success');
        fecharModalEditarUsuario();
        carregarUsuarios();
      } catch (err) {
        showToast(err.message || 'Erro ao atualizar usuário.', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }
}

function abrirModalNovoUsuario() {
  const modal = document.getElementById('modal-novo-usuario');
  if (modal) modal.classList.add('active');
}

function fecharModalNovoUsuario() {
  const modal = document.getElementById('modal-novo-usuario');
  if (modal) modal.classList.remove('active');
}

function abrirModalEditarUsuario(id) {
  const usuario = listaUsuariosCache.find((u) => u._id === id);
  if (!usuario) return;

  document.getElementById('edit-id').value = usuario._id;
  document.getElementById('edit-nome').value = usuario.nome;
  document.getElementById('edit-email').value = usuario.email;
  document.getElementById('edit-perfil').value = usuario.perfil;
  document.getElementById('edit-disciplinas').value = usuario.disciplinas ? usuario.disciplinas.join(', ') : '';
  document.getElementById('edit-nova-senha').value = '';

  const modal = document.getElementById('modal-editar-usuario');
  if (modal) modal.classList.add('active');
}

function fecharModalEditarUsuario() {
  const modal = document.getElementById('modal-editar-usuario');
  if (modal) modal.classList.remove('active');
}

async function alternarStatusUsuario(id, statusAtual) {
  const acao = statusAtual ? 'desativar' : 'ativar';
  if (!confirm(`Deseja realmente ${acao} este usuário?`)) return;

  try {
    await API.patch(`/usuarios/${id}/status`, {});
    showToast(`Usuário ${acao === 'ativar' ? 'ativado' : 'desativado'} com sucesso!`, 'success');
    carregarUsuarios();
  } catch (err) {
    showToast(err.message || 'Erro ao alterar status.', 'error');
  }
}

window.abrirModalNovoUsuario = abrirModalNovoUsuario;
window.fecharModalNovoUsuario = fecharModalNovoUsuario;
window.abrirModalEditarUsuario = abrirModalEditarUsuario;
window.fecharModalEditarUsuario = fecharModalEditarUsuario;
window.alternarStatusUsuario = alternarStatusUsuario;
window.carregarUsuarios = carregarUsuarios;
