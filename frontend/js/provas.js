/**
 * Lógica da Listagem e Gestão de Provas
 */
let paginaAtual = 1;
const limitePorPagina = 12;

document.addEventListener('DOMContentLoaded', () => {
  // Lê parâmetros da URL caso venha de um atalho do Dashboard
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('status')) {
    document.getElementById('filtro-status').value = urlParams.get('status');
  }
  if (urlParams.get('prazo')) {
    document.getElementById('filtro-prazo').value = urlParams.get('prazo');
  }
  if (urlParams.get('trimestre')) {
    document.getElementById('filtro-trimestre').value = urlParams.get('trimestre');
  }
  if (urlParams.get('divisao')) {
    document.getElementById('filtro-divisao').value = urlParams.get('divisao');
  }

  // Carrega listagem de provas
  carregarProvas();

  // Configurações dos filtros
  const formFiltros = document.getElementById('form-filtros');
  if (formFiltros) {
    formFiltros.addEventListener('submit', (e) => {
      e.preventDefault();
      paginaAtual = 1;
      carregarProvas();
    });
  }

  const btnLimpar = document.getElementById('btn-limpar-filtros');
  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      document.getElementById('filtro-busca').value = '';
      document.getElementById('filtro-trimestre').value = '';
      document.getElementById('filtro-divisao').value = '';
      document.getElementById('filtro-turma').value = '';
      document.getElementById('filtro-status').value = '';
      document.getElementById('filtro-prazo').value = '';
      paginaAtual = 1;
      carregarProvas();
    });
  }

  // Paginação
  document.getElementById('btn-pag-anterior').addEventListener('click', () => {
    if (paginaAtual > 1) {
      paginaAtual--;
      carregarProvas();
    }
  });

  document.getElementById('btn-pag-proxima').addEventListener('click', () => {
    paginaAtual++;
    carregarProvas();
  });

  // Modal Nova Prova
  setupModalNovaProva();
});

async function carregarProvas() {
  const tbody = document.getElementById('tbody-provas');
  tbody.innerHTML = `
    <tr>
      <td colspan="10" style="text-align: center; padding: 2.5rem;">
        <div class="loading-spinner"></div>
        <span style="color: var(--text-muted); font-size: 0.85rem;">Buscando registros no banco de dados...</span>
      </td>
    </tr>`;

  try {
    const params = {
      page: paginaAtual,
      limit: limitePorPagina,
      busca: document.getElementById('filtro-busca').value.trim(),
      trimestre: document.getElementById('filtro-trimestre').value,
      divisao: document.getElementById('filtro-divisao').value,
      turma: document.getElementById('filtro-turma').value.trim(),
      status: document.getElementById('filtro-status').value,
      prazo: document.getElementById('filtro-prazo').value
    };

    const res = await API.get('/provas', params);

    if (!res || !res.success) {
      throw new Error(res.message || 'Erro ao carregar provas.');
    }

    renderizarTabela(res.dados, res.total, res.pagina, res.totalPaginas);
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; color: var(--danger); padding: 2rem;">
          Erro ao carregar provas: ${err.message}
        </td>
      </tr>`;
    showToast(err.message, 'error');
  }
}

function renderizarTabela(provas, total, pagina, totalPaginas) {
  const tbody = document.getElementById('tbody-provas');
  document.getElementById('total-registros').textContent = total || 0;
  document.getElementById('lbl-pagina-atual').textContent = pagina || 1;
  document.getElementById('lbl-total-paginas').textContent = totalPaginas || 1;

  document.getElementById('btn-pag-anterior').disabled = pagina <= 1;
  document.getElementById('btn-pag-proxima').disabled = pagina >= totalPaginas;

  if (!provas || provas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            <h4 class="empty-state-title">Nenhuma avaliação encontrada</h4>
            <p class="empty-state-desc">Ajuste os filtros de pesquisa ou cadastre uma nova avaliação.</p>
            <button class="btn btn-primary btn-sm" onclick="abrirModalNovaProva()">Cadastrar Nova Prova</button>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = provas
    .map((p) => {
      const dataAplicacao = p.dataAplicacao
        ? new Date(p.dataAplicacao).toLocaleDateString('pt-BR')
        : '-';
      const dataPrazo = p.prazoEntrega
        ? new Date(p.prazoEntrega).toLocaleDateString('pt-BR')
        : '-';
      const profNome = p.professor ? p.professor.nome : 'Não informado';
      const statusClass = 'status-' + p.status.toLowerCase().replace(/\s+/g, '-');
      const divisaoClass = p.divisao === 'AG' ? 'badge-divisao-ag' : 'badge-divisao-ad';

      // Selo de Bloqueio/Liberação de Impressão
      const seloImpressao = p.aprovadoParaImpressao
        ? `<span title="Liberada para impressão" style="display:inline-flex; align-items:center; gap:0.25rem; color:var(--success); font-weight:700; font-size:0.75rem;">
             <svg style="width:14px; height:14px;" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
             Liberada
           </span>`
        : `<span title="Impressão bloqueada até aprovação final" style="display:inline-flex; align-items:center; gap:0.25rem; color:var(--text-muted); font-size:0.75rem;">
             <svg style="width:14px; height:14px;" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
             Bloqueada
           </span>`;

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
          <td>${dataAplicacao}</td>
          <td>${dataPrazo}</td>
          <td>
            <span class="status-badge ${statusClass}">
              <span class="status-dot"></span>
              ${p.status}
            </span>
          </td>
          <td>${seloImpressao}</td>
          <td style="text-align: right;">
            <a href="detalhes-prova.html?id=${p._id}" class="btn btn-secondary btn-sm">
              Detalhes
            </a>
          </td>
        </tr>`;
    })
    .join('');
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

        await API.post('/provas', formData, true);
        showToast('Prova cadastrada com sucesso com a versão V1!', 'success');
        fecharModalNovaProva();
        form.reset();
        paginaAtual = 1;
        carregarProvas();
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
