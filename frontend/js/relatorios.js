/**
 * Lógica da Tela de Relatórios e Auditoria
 */
document.addEventListener('DOMContentLoaded', () => {
  carregarRelatorios();
  carregarAtividadesGerais();

  const form = document.getElementById('form-filtro-relatorio');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      carregarRelatorios();
    });
  }
});

async function carregarRelatorios() {
  const params = {
    trimestre: document.getElementById('rel-trimestre').value,
    divisao: document.getElementById('rel-divisao').value,
    turma: document.getElementById('rel-turma').value.trim(),
    disciplina: document.getElementById('rel-disciplina').value.trim()
  };

  try {
    const res = await API.get('/relatorios/provas', params);
    if (!res || !res.success) throw new Error(res.message);

    renderizarTrimestres(res.dados.porTrimestre, res.totalGeral);
    renderizarDivisoes(res.dados.porDivisao, res.totalGeral);
    renderizarStatus(res.dados.porStatus, res.totalGeral);
    renderizarTurmas(res.dados.porTurma);
    renderizarDisciplinas(res.dados.porDisciplina);
  } catch (err) {
    showToast(err.message || 'Erro ao carregar relatórios.', 'error');
  }
}

function renderizarTrimestres(dados, total) {
  const container = document.getElementById('chart-trimestre');
  if (!container) return;

  const trimestresPadrao = ['1º', '2º', '3º'];
  const mapDados = {};
  (dados || []).forEach((d) => (mapDados[d._id] = d.total));

  container.innerHTML = trimestresPadrao
    .map((t) => {
      const qtd = mapDados[t] || 0;
      const pct = total > 0 ? Math.round((qtd / total) * 100) : 0;
      return `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom:0.25rem;">
            <span>${t} Trimestre</span>
            <span>${qtd} prova(s) (${pct}%)</span>
          </div>
          <div style="background:var(--bg-muted); height:8px; border-radius:var(--radius-full); overflow:hidden;">
            <div style="background:var(--primary); height:100%; width:${pct}%; border-radius:var(--radius-full);"></div>
          </div>
        </div>`;
    })
    .join('');
}

function renderizarDivisoes(dados, total) {
  const container = document.getElementById('chart-divisao');
  if (!container) return;

  const divisoesPadrao = ['AG', 'AD'];
  const mapDados = {};
  (dados || []).forEach((d) => (mapDados[d._id] = d.total));

  const cores = { AG: '#4f46e5', AD: '#0d9488' };
  const descricoes = { AG: 'AG (Avaliação Geral)', AD: 'AD (Avaliação Diagnóstica)' };

  container.innerHTML = divisoesPadrao
    .map((div) => {
      const qtd = mapDados[div] || 0;
      const pct = total > 0 ? Math.round((qtd / total) * 100) : 0;
      return `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom:0.25rem;">
            <span>${descricoes[div]}</span>
            <span>${qtd} prova(s) (${pct}%)</span>
          </div>
          <div style="background:var(--bg-muted); height:8px; border-radius:var(--radius-full); overflow:hidden;">
            <div style="background:${cores[div]}; height:100%; width:${pct}%; border-radius:var(--radius-full);"></div>
          </div>
        </div>`;
    })
    .join('');
}

function renderizarStatus(dados, total) {
  const container = document.getElementById('chart-status');
  if (!container) return;

  if (!dados || dados.length === 0) {
    container.innerHTML = `<span style="font-size:0.85rem; color:var(--text-muted);">Nenhum dado encontrado.</span>`;
    return;
  }

  container.innerHTML = dados
    .map((s) => {
      const statusClass = 'status-' + s._id.toLowerCase().replace(/\s+/g, '-');
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.85rem;">
          <span class="status-badge ${statusClass}">
            <span class="status-dot"></span>
            ${s._id}
          </span>
          <strong style="color:var(--text-main);">${s.total} prova(s)</strong>
        </div>`;
    })
    .join('');
}

function renderizarTurmas(turmas) {
  const tbody = document.getElementById('tbody-rel-turmas');
  if (!tbody) return;

  if (!turmas || turmas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-muted); padding:1rem;">Nenhum registro.</td></tr>`;
    return;
  }

  tbody.innerHTML = turmas
    .map((t) => `
      <tr>
        <td><strong>${t._id}</strong></td>
        <td style="text-align:right; font-weight:700; color:var(--primary);">${t.total}</td>
      </tr>`)
    .join('');
}

function renderizarDisciplinas(disciplinas) {
  const tbody = document.getElementById('tbody-rel-disciplinas');
  if (!tbody) return;

  if (!disciplinas || disciplinas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-muted); padding:1rem;">Nenhum registro.</td></tr>`;
    return;
  }

  tbody.innerHTML = disciplinas
    .map((d) => `
      <tr>
        <td><strong>${d._id}</strong></td>
        <td style="text-align:right; font-weight:700; color:var(--primary);">${d.total}</td>
      </tr>`)
    .join('');
}

async function carregarAtividadesGerais() {
  const tbody = document.getElementById('tbody-atividades-gerais');
  if (!tbody) return;

  try {
    const res = await API.get('/atividades', { limit: 50 });
    const atividades = res.atividades || [];

    if (atividades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Nenhuma atividade registrada no sistema.</td></tr>`;
      return;
    }

    tbody.innerHTML = atividades
      .map((a) => {
        const dataHora = new Date(a.createdAt).toLocaleString('pt-BR');
        const userNome = a.usuario ? `${a.usuario.nome} (${Auth.getLabelPerfil(a.usuario.perfil)})` : 'Sistema';
        const provaLink = a.prova
          ? `<a href="detalhes-prova.html?id=${a.prova._id}" style="font-weight:600; font-family:monospace;">${a.prova.codigo || a.prova.titulo}</a>`
          : '-';

        return `
          <tr>
            <td style="font-size:0.8rem; color:var(--text-muted); white-space:nowrap;">${dataHora}</td>
            <td style="font-weight:600;">${userNome}</td>
            <td><code style="background:var(--bg-muted); padding:0.15rem 0.45rem; border-radius:var(--radius-sm); font-size:0.75rem;">${a.acao}</code></td>
            <td>${provaLink}</td>
            <td style="font-size:0.85rem; color:var(--text-secondary);">${a.descricao}</td>
          </tr>`;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:1rem;">Erro ao carregar auditoria: ${err.message}</td></tr>`;
  }
}

window.carregarRelatorios = carregarRelatorios;
window.carregarAtividadesGerais = carregarAtividadesGerais;
