/**
 * Lógica do Dashboard de Controle
 */
let filtroTrimestre = '';
let filtroDivisao = '';

document.addEventListener('DOMContentLoaded', () => {
  // Carrega dados iniciais do Dashboard
  carregarDashboard();

  // Configuração dos botões de filtro rápido
  setupFiltrosRapidos();

  // Modal de Nova Prova
  setupModalNovaProva();
});

async function carregarDashboard() {
  try {
    const params = {};
    if (filtroTrimestre) params.trimestre = filtroTrimestre;
    if (filtroDivisao) params.divisao = filtroDivisao;

    const data = await API.get('/dashboard', params);
    if (!data || !data.success) {
      showToast('Falha ao carregar dados do dashboard.', 'error');
      return;
    }

    renderizarCards(data.cards);
    renderizarBannerPendencias(data.cards);
    renderizarProvasRecentes(data.provasRecentes);
  } catch (err) {
    showToast(err.message || 'Erro de conexão com o servidor.', 'error');
    const tbody = document.getElementById('tbody-provas-recentes');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--danger); padding: 2rem;">
            Erro ao carregar dados da API: ${err.message}
          </td>
        </tr>`;
    }
  }
}

function renderizarCards(cards) {
  if (!cards) return;

  document.getElementById('stat-total').textContent = cards.total || 0;
  document.getElementById('stat-conferencia').textContent = cards.aguardandoConferencia || 0;
  document.getElementById('stat-correcao').textContent = cards.emCorrecaoTotal || 0;
  document.getElementById('stat-validacao').textContent = cards.aguardandoValidacaoProf || 0;
  document.getElementById('stat-aprovacao-final').textContent = cards.aguardandoAprovacaoFinal || 0;
  document.getElementById('stat-impressao').textContent = cards.aprovadasImpressao || 0;
  document.getElementById('stat-atrasadas').textContent = cards.atrasadas || 0;
}

function renderizarBannerPendencias(cards) {
  const banner = document.getElementById('dashboard-banner');
  const bannerTitulo = document.getElementById('banner-titulo');
  const bannerTexto = document.getElementById('banner-texto');
  const bannerBtn = document.getElementById('banner-btn');
  const usuario = Auth.getUsuarioLogado();

  if (!banner || !usuario) return;

  let temAlerta = false;

  if (usuario.perfil === 'professor' && cards.aguardandoValidacaoProf > 0) {
    temAlerta = true;
    bannerTitulo.textContent = 'Validação de Conteúdo Necessária';
    bannerTexto.textContent = `Você possui ${cards.aguardandoValidacaoProf} prova(s) com novas versões prontas aguardando sua validação de conteúdo.`;
    bannerBtn.href = 'provas.html?status=Aguardando validação do professor';
  } else if (['setor_provas', 'admin'].includes(usuario.perfil) && cards.aguardandoConferencia > 0) {
    temAlerta = true;
    bannerTitulo.textContent = 'Fila de Conferência com Pendências';
    bannerTexto.textContent = `Existem ${cards.aguardandoConferencia} prova(s) aguardando conferência inicial ou revisão de digitação no setor.`;
    bannerBtn.href = 'provas.html?status=Aguardando conferência';
  } else if (['aprovador', 'admin'].includes(usuario.perfil) && cards.aguardandoAprovacaoFinal > 0) {
    temAlerta = true;
    bannerTitulo.textContent = 'Provas Aguardando Aprovação Final';
    bannerTexto.textContent = `Há ${cards.aguardandoAprovacaoFinal} avaliação(ões) com todas as etapas concluídas prontas para liberação de impressão.`;
    bannerBtn.href = 'provas.html?status=Aguardando aprovação final';
  } else if (cards.atrasadas > 0) {
    temAlerta = true;
    bannerTitulo.textContent = 'Atenção aos Prazos';
    bannerTexto.textContent = `Atenção: há ${cards.atrasadas} prova(s) com o prazo de entrega expirado.`;
    bannerBtn.href = 'provas.html?prazo=atrasadas';
  }

  if (temAlerta) {
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

function renderizarProvasRecentes(provas) {
  const tbody = document.getElementById('tbody-provas-recentes');
  if (!tbody) return;

  if (!provas || provas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            <h4 class="empty-state-title">Nenhuma prova encontrada</h4>
            <p class="empty-state-desc">Não há avaliações cadastradas correspondentes ao filtro selecionado.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = provas
    .map((p) => {
      const dataPrazo = p.prazoEntrega
        ? new Date(p.prazoEntrega).toLocaleDateString('pt-BR')
        : '-';
      const profNome = p.professor ? p.professor.nome : 'Não informado';
      const statusClass = 'status-' + p.status.toLowerCase().replace(/\s+/g, '-');
      const divisaoClass = p.divisao === 'AG' ? 'badge-divisao-ag' : 'badge-divisao-ad';

      return `
        <tr>
          <td><strong style="color: var(--primary); font-family: monospace;">${p.codigo || '-'}</strong></td>
          <td>
            <a href="detalhes-prova.html?id=${p._id}" style="font-weight: 600; color: var(--text-main);">
              ${p.titulo}
            </a>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Versão atual: V${p.versaoAtual || 1}</div>
          </td>
          <td>${profNome}</td>
          <td>
            <strong>${p.turma}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${p.disciplina}</div>
          </td>
          <td>
            <span class="badge-trimestre">${p.trimestre} Tri</span>
            <span class="badge-divisao ${divisaoClass}">${p.divisao}</span>
          </td>
          <td>${dataPrazo}</td>
          <td>
            <span class="status-badge ${statusClass}">
              <span class="status-dot"></span>
              ${p.status}
            </span>
          </td>
          <td style="text-align: right;">
            <a href="detalhes-prova.html?id=${p._id}" class="btn btn-secondary btn-sm">
              Visualizar
            </a>
          </td>
        </tr>`;
    })
    .join('');
}

function setupFiltrosRapidos() {
  const btnsTrimestre = document.querySelectorAll('.filter-trimestre-btn');
  btnsTrimestre.forEach((btn) => {
    btn.addEventListener('click', () => {
      btnsTrimestre.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filtroTrimestre = btn.dataset.trimestre;
      carregarDashboard();
    });
  });

  const btnsDivisao = document.querySelectorAll('.filter-divisao-btn');
  btnsDivisao.forEach((btn) => {
    btn.addEventListener('click', () => {
      btnsDivisao.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filtroDivisao = btn.dataset.divisao;
      carregarDashboard();
    });
  });
}

function setupModalNovaProva() {
  const btnMenu = document.getElementById('btn-menu-nova-prova');
  if (btnMenu) {
    btnMenu.addEventListener('click', (e) => {
      e.preventDefault();
      abrirModalNovaProva();
    });
  }

  const form = document.getElementById('form-nova-prova');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSalvar = document.getElementById('btn-salvar-prova');
      btnSalvar.disabled = true;
      btnSalvar.innerHTML = '<span>Enviando arquivo e cadastrando...</span>';

      try {
        const formData = new FormData();
        formData.append('titulo', document.getElementById('prova-titulo').value.trim());
        formData.append('disciplina', document.getElementById('prova-disciplina').value.trim());
        formData.append('turma', document.getElementById('prova-turma').value.trim());
        formData.append('trimestre', document.getElementById('prova-trimestre').value);
        formData.append('divisao', document.getElementById('prova-divisao').value);
        formData.append('dataAplicacao', document.getElementById('prova-data-aplicacao').value);
        formData.append('prazoEntrega', document.getElementById('prova-prazo-entrega').value);
        formData.append('observacoes', document.getElementById('prova-observacoes').value.trim());

        const selectProf = document.getElementById('prova-professor-id');
        if (selectProf && selectProf.value) {
          formData.append('professorId', selectProf.value);
        }

        const inputFile = document.getElementById('prova-arquivo');
        if (inputFile.files.length > 0) {
          formData.append('arquivo', inputFile.files[0]);
        }

        const res = await API.post('/provas', formData, true);
        showToast('Prova cadastrada com sucesso com a versão V1!', 'success');
        fecharModalNovaProva();
        form.reset();
        carregarDashboard();
      } catch (err) {
        showToast(err.message || 'Erro ao cadastrar prova.', 'error');
      } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = '<span>Cadastrar e Enviar Arquivo</span>';
      }
    });
  }
}

async function abrirModalNovaProva() {
  const modal = document.getElementById('modal-nova-prova');
  if (!modal) return;
  modal.classList.add('active');

  const usuario = Auth.getUsuarioLogado();
  const grpSelectProf = document.getElementById('grp-select-professor');

  // Se for admin ou setor de provas, carrega lista de professores para seleção
  if (usuario && ['admin', 'setor_provas'].includes(usuario.perfil)) {
    if (grpSelectProf) {
      grpSelectProf.style.display = 'flex';
      try {
        const res = await API.get('/usuarios/professores');
        const select = document.getElementById('prova-professor-id');
        select.innerHTML = '<option value="">Selecione o professor responsável...</option>' +
          res.professores.map((p) => `<option value="${p._id}">${p.nome} (${p.email})</option>`).join('');
      } catch (e) {
        console.error('Erro ao carregar lista de professores:', e);
      }
    }
  } else if (grpSelectProf) {
    grpSelectProf.style.display = 'none';
  }
}

function fecharModalNovaProva() {
  const modal = document.getElementById('modal-nova-prova');
  if (modal) modal.classList.remove('active');
}

window.abrirModalNovaProva = abrirModalNovaProva;
window.fecharModalNovaProva = fecharModalNovaProva;
