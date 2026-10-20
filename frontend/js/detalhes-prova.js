/**
 * Lógica Completa dos Detalhes da Prova, Fluxo de Estados e Bloqueio de Impressão
 */
let provaAtual = null;
let versoesAtuais = [];

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const provaId = urlParams.get('id');

  if (!provaId) {
    showToast('Identificador da prova não informado.', 'error');
    setTimeout(() => {
      window.location.href = 'provas.html';
    }, 1500);
    return;
  }

  carregarDetalhesProva(provaId);
  setupModalNovaVersao();
});

async function carregarDetalhesProva(id) {
  try {
    const res = await API.get(`/provas/${id}`);
    if (!res || !res.success) {
      throw new Error(res.message || 'Falha ao carregar prova.');
    }

    provaAtual = res.prova;
    renderizarCabecalhoEMetadados(provaAtual);
    atualizarEsteiraWorkflow(provaAtual.status);
    atualizarBotaoImpressao(provaAtual);
    renderizarBarraAcoes(provaAtual);

    // Carrega versões e auditoria em paralelo
    await Promise.all([
      carregarVersoes(id),
      carregarAuditoria(id)
    ]);
  } catch (err) {
    showToast(err.message || 'Erro ao carregar detalhes da avaliação.', 'error');
  }
}

function renderizarCabecalhoEMetadados(prova) {
  document.getElementById('detalhe-codigo').textContent = prova.codigo || 'PRV-XXXX';
  document.getElementById('detalhe-titulo').textContent = prova.titulo;
  document.getElementById('detalhe-trimestre').textContent = `${prova.trimestre} Tri`;
  document.getElementById('detalhe-divisao').textContent = `Divisão ${prova.divisao}`;
  document.getElementById('detalhe-divisao').className = `badge-divisao badge-divisao-${prova.divisao.toLowerCase()}`;

  const statusEl = document.getElementById('detalhe-status');
  statusEl.textContent = prova.status;
  statusEl.className = `status-badge status-${prova.status.toLowerCase().replace(/\s+/g, '-')}`;

  const profNome = prova.professor ? prova.professor.nome : 'Não informado';
  document.getElementById('detalhe-subtitulo').textContent = `Professor(a): ${profNome} | Turma: ${prova.turma} | Disciplina: ${prova.disciplina}`;

  // Metadados
  document.getElementById('info-professor').textContent = profNome;
  document.getElementById('info-disciplina').textContent = prova.disciplina;
  document.getElementById('info-turma').textContent = prova.turma;
  document.getElementById('info-trimestre').textContent = `${prova.trimestre} Trimestre`;
  document.getElementById('info-divisao').textContent = `Divisão ${prova.divisao} (${prova.divisao === 'AG' ? 'Avaliação Geral' : 'Avaliação Diagnóstica'})`;
  document.getElementById('info-data-aplicacao').textContent = prova.dataAplicacao
    ? new Date(prova.dataAplicacao).toLocaleDateString('pt-BR')
    : '-';
  document.getElementById('info-prazo').textContent = prova.prazoEntrega
    ? new Date(prova.prazoEntrega).toLocaleDateString('pt-BR')
    : '-';
  document.getElementById('info-versao-atual').textContent = `V${prova.versaoAtual || 1}`;

  document.getElementById('info-observacoes').textContent =
    prova.observacoes || 'Nenhuma observação ou orientação cadastrada.';

  // Status de aprovação para impressão
  const boxAprovacao = document.getElementById('box-status-aprovacao');
  if (prova.aprovadoParaImpressao && prova.idVersaoAprovada) {
    const aprovadorNome = prova.aprovadoPor ? prova.aprovadoPor.nome : 'Responsável do Setor';
    const dataAprov = prova.dataAprovacao ? new Date(prova.dataAprovacao).toLocaleString('pt-BR') : '';
    boxAprovacao.innerHTML = `
      <div style="background:var(--success-light); border:1px solid var(--success-border); border-radius:var(--radius-md); padding:1rem; color:var(--success-text);">
        <div style="font-weight:700; display:flex; align-items:center; gap:0.4rem; margin-bottom:0.35rem;">
          <svg style="width:18px; height:18px;" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          LIBERADA PARA IMPRESSÃO
        </div>
        <div style="font-size:0.85rem;">
          <strong>Versão Autorizada:</strong> V${prova.versaoAtual}<br>
          <strong>Aprovada por:</strong> ${aprovadorNome}<br>
          <strong>Data/Hora:</strong> ${dataAprov}
        </div>
      </div>`;
  } else {
    boxAprovacao.innerHTML = `
      <div style="background:var(--bg-muted); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem; color:var(--text-muted);">
        <div style="font-weight:700; display:flex; align-items:center; gap:0.4rem; margin-bottom:0.35rem; color:var(--text-main);">
          <svg style="width:18px; height:18px;" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
          IMPRESSÃO BLOQUEADA
        </div>
        <div style="font-size:0.82rem;">
          Esta prova ainda não possui autorização final do responsável do setor de provas. Nenhuma impressão pode ser realizada.
        </div>
      </div>`;
  }
}

function atualizarEsteiraWorkflow(status) {
  const steps = [
    { id: 'step-enviada', statuses: ['Enviada', 'Aguardando conferência', 'Em conferência', 'Aguardando correção', 'Aguardando validação do professor', 'Ajustes solicitados', 'Aguardando aprovação final', 'Aprovada para impressão', 'Concluída'] },
    { id: 'step-conferencia', statuses: ['Em conferência', 'Aguardando correção', 'Aguardando validação do professor', 'Ajustes solicitados', 'Aguardando aprovação final', 'Aprovada para impressão', 'Concluída'] },
    { id: 'step-validacao', statuses: ['Aguardando validação do professor', 'Ajustes solicitados', 'Aguardando aprovação final', 'Aprovada para impressão', 'Concluída'] },
    { id: 'step-aprovacao', statuses: ['Aguardando aprovação final', 'Aprovada para impressão', 'Concluída'] },
    { id: 'step-impressao', statuses: ['Aprovada para impressão', 'Concluída'] }
  ];

  steps.forEach((s) => {
    const el = document.getElementById(s.id);
    if (!el) return;
    el.classList.remove('completed', 'active');

    if (s.statuses.includes(status)) {
      if (status === 'Aprovada para impressão' || status === 'Concluída') {
        el.classList.add('completed');
      } else {
        const isCurrent =
          (s.id === 'step-enviada' && (status === 'Enviada' || status === 'Aguardando conferência')) ||
          (s.id === 'step-conferencia' && (status === 'Em conferência' || status === 'Aguardando correção')) ||
          (s.id === 'step-validacao' && (status === 'Aguardando validação do professor' || status === 'Ajustes solicitados')) ||
          (s.id === 'step-aprovacao' && status === 'Aguardando aprovação final');

        if (isCurrent) {
          el.classList.add('active');
        } else {
          el.classList.add('completed');
        }
      }
    }
  });
}

// REGRA CRÍTICA: BLOQUEIO DE IMPRESSÃO
function atualizarBotaoImpressao(prova) {
  const btn = document.getElementById('btn-imprimir-prova');
  const lbl = document.getElementById('lbl-btn-impressao');
  const icon = document.getElementById('icon-print-lock');
  const aviso = document.getElementById('detalhe-aviso-impressao');

  if (prova.aprovadoParaImpressao && prova.idVersaoAprovada) {
    btn.disabled = false;
    lbl.textContent = `Baixar p/ Impressão (V${prova.versaoAtual})`;
    icon.innerHTML = `<path fill-rule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clip-rule="evenodd"/>`;
    aviso.textContent = 'Versão autorizada para tiragem gráfica. Download liberado.';
    aviso.style.color = 'var(--success-text)';

    btn.onclick = () => {
      API.downloadArquivoImpressao(
        prova._id,
        `Prova_${prova.codigo || 'aprovada'}_V${prova.versaoAtual}.pdf`
      );
    };
  } else {
    btn.disabled = true;
    lbl.textContent = 'Impressão Bloqueada';
    icon.innerHTML = `<path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>`;
    aviso.textContent = 'Aguardando aprovação final do Setor de Provas para liberação.';
    aviso.style.color = 'var(--text-muted)';
    btn.onclick = null;
  }
}

function renderizarBarraAcoes(prova) {
  const toolbar = document.getElementById('toolbar-acoes');
  const usuario = Auth.getUsuarioLogado();
  if (!toolbar || !usuario) return;

  const ehAdmin = usuario.perfil === 'admin';
  const ehSetor = usuario.perfil === 'setor_provas' || ehAdmin;
  const ehAprovador = usuario.perfil === 'aprovador' || ehAdmin;
  const ehProfessorDono =
    usuario.perfil === 'professor' &&
    prova.professor &&
    prova.professor._id.toString() === usuario.id.toString();

  const status = prova.status;
  const botoes = [];

  // Ações do Setor de Provas
  if (ehSetor && (status === 'Enviada' || status === 'Aguardando conferência')) {
    botoes.push(`
      <button class="btn btn-primary btn-sm" onclick="executarAcao('/provas/${prova._id}/iniciar-conferencia', 'Conferência iniciada!')">
        ▶️ Iniciar Conferência
      </button>`);
  }

  if (ehSetor && status === 'Em conferência') {
    botoes.push(`
      <button class="btn btn-secondary btn-sm" onclick="solicitarCorrecaoPrompt('${prova._id}')">
        ⚠️ Solicitar Correção
      </button>
      <button class="btn btn-primary btn-sm" onclick="abrirModalNovaVersao()">
        📤 Enviar Nova Versão Corrigida
      </button>
      <button class="btn btn-success btn-sm" onclick="abrirModalAprovacaoFinal()">
        ✅ Aprovar para Impressão (Sem alteração de conteúdo)
      </button>`);
  }

  // Ação de Validação do Professor
  if ((ehProfessorDono || ehAdmin) && status === 'Aguardando validação do professor') {
    botoes.push(`
      <button class="btn btn-success btn-sm" onclick="abrirModalValidarProfessor()">
        ✍️ Validar Versão Corrigida
      </button>`);
  }

  // Ação de Envio de Nova Versão pelo Professor (caso ajustes tenham sido solicitados)
  if ((ehProfessorDono || ehAdmin) && status === 'Ajustes solicitados') {
    botoes.push(`
      <button class="btn btn-primary btn-sm" onclick="abrirModalNovaVersao()">
        📤 Enviar Nova Versão Ajustada
      </button>`);
  }

  // Ação de Aprovação Final pelo Aprovador ou Setor
  if ((ehAprovador || ehSetor) && status === 'Aguardando aprovação final') {
    botoes.push(`
      <button class="btn btn-success btn-sm" onclick="abrirModalAprovacaoFinal()">
        🏆 Realizar Aprovação Final e Liberar Impressão
      </button>`);
  }

  // Ação de Conclusão da Prova
  if ((ehSetor || ehAprovador) && status === 'Aprovada para impressão') {
    botoes.push(`
      <button class="btn btn-secondary btn-sm" onclick="executarAcao('/provas/${prova._id}/concluir', 'Prova concluída com sucesso!')">
        🏁 Marcar como Concluída
      </button>`);
  }

  // Botão comum para envio de versão caso necessário
  if ((ehSetor || ehProfessorDono || ehAdmin) && status !== 'Concluída') {
    botoes.push(`
      <button class="btn btn-secondary btn-sm" onclick="abrirModalNovaVersao()">
        + Nova Versão
      </button>`);
  }

  if (botoes.length === 0) {
    toolbar.innerHTML = `<span style="font-size:0.85rem; color:var(--text-muted);">Nenhuma ação pendente para o seu perfil no status atual (${status}).</span>`;
  } else {
    toolbar.innerHTML = botoes.join('');
  }
}

async function carregarVersoes(provaId) {
  const tbody = document.getElementById('tbody-versoes');
  try {
    const res = await API.get(`/provas/${provaId}/versoes`);
    versoesAtuais = res.versoes || [];

    if (versoesAtuais.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Nenhuma versão encontrada.</td></tr>`;
      return;
    }

    tbody.innerHTML = versoesAtuais
      .map((v) => {
        const usuarioEnvio = v.usuarioEnvio ? `${v.usuarioEnvio.nome} (${Auth.getLabelPerfil(v.usuarioEnvio.perfil)})` : 'Sistema';
        const dataEnvio = new Date(v.createdAt).toLocaleString('pt-BR');
        const tamanhoKb = v.arquivo && v.arquivo.tamanho ? `${Math.round(v.arquivo.tamanho / 1024)} KB` : '-';
        const alterouConteudo = v.houveAlteracaoConteudo
          ? `<span style="color:var(--danger); font-weight:700;">Sim</span>`
          : `<span style="color:var(--text-muted);">Não</span>`;

        // Badge Validação Professor
        let badgValProf = `<span class="status-badge" style="background:#f1f5f9; color:#475569;">Não Necessário</span>`;
        if (v.validacaoProfessor.status === 'Pendente') {
          badgValProf = `<span class="status-badge" style="background:var(--warning-light); color:var(--warning-text); border:1px solid var(--warning-border);">Pendente</span>`;
        } else if (v.validacaoProfessor.status === 'Aprovado') {
          badgValProf = `<span class="status-badge" style="background:var(--success-light); color:var(--success-text); border:1px solid var(--success-border);">Aprovado</span>`;
        } else if (v.validacaoProfessor.status === 'Ajustes Solicitados') {
          badgValProf = `<span class="status-badge" style="background:var(--danger-light); color:var(--danger-text); border:1px solid var(--danger-border);">Ajustes Solicitados</span>`;
        }

        // Badge Aprovação Final
        let badgAprovFinal = `<span class="status-badge" style="background:#f1f5f9; color:#475569;">Pendente</span>`;
        if (v.aprovacaoFinal.status === 'Aprovado') {
          badgAprovFinal = `<span class="status-badge" style="background:var(--success-light); color:var(--success-text); border:1px solid var(--success-border); font-weight:700;">Aprovado</span>`;
        }

        // Link para download do arquivo da versão
        const downloadUrl = v.arquivo && v.arquivo.url ? v.arquivo.url : '#';

        return `
          <tr>
            <td><strong style="color:var(--primary); font-family:monospace; font-size:1rem;">${v.rotuloVersao || 'V' + v.numeroVersao}</strong></td>
            <td>
              <div style="font-weight:600; color:var(--text-main);">${v.arquivo ? v.arquivo.nomeOriginal : 'arquivo'}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${tamanhoKb}</div>
            </td>
            <td>${usuarioEnvio}</td>
            <td>${dataEnvio}</td>
            <td style="max-width:240px; font-size:0.85rem;">
              ${v.descricaoAlteracoes || '-'}
              ${v.observacoesFuncionario ? `<br><small style="color:var(--primary);">Obs: ${v.observacoesFuncionario}</small>` : ''}
              ${v.validacaoProfessor.observacoes ? `<br><small style="color:var(--text-secondary);">Docente: ${v.validacaoProfessor.observacoes}</small>` : ''}
            </td>
            <td style="text-align:center;">${alterouConteudo}</td>
            <td>${badgValProf}</td>
            <td>${badgAprovFinal}</td>
            <td style="text-align:right;">
              <a href="${downloadUrl}" target="_blank" class="btn btn-secondary btn-sm" download>
                Baixar
              </a>
            </td>
          </tr>`;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--danger); padding:1rem;">Erro ao listar versões: ${err.message}</td></tr>`;
  }
}

async function carregarAuditoria(provaId) {
  const tbody = document.getElementById('tbody-auditoria-prova');
  try {
    const res = await API.get('/atividades', { provaId, limit: 30 });
    const atividades = res.atividades || [];

    if (atividades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--text-muted);">Nenhuma atividade registrada ainda.</td></tr>`;
      return;
    }

    tbody.innerHTML = atividades
      .map((a) => {
        const dataFormatada = new Date(a.createdAt).toLocaleString('pt-BR');
        const userNome = a.usuario ? `${a.usuario.nome} (${Auth.getLabelPerfil(a.usuario.perfil)})` : 'Sistema';
        return `
          <tr>
            <td style="white-space:nowrap; font-size:0.8rem; color:var(--text-muted);">${dataFormatada}</td>
            <td style="font-weight:600;">${userNome}</td>
            <td><code style="background:var(--bg-muted); padding:0.15rem 0.4rem; border-radius:var(--radius-sm); font-size:0.75rem;">${a.acao}</code></td>
            <td style="font-size:0.85rem;">${a.descricao}</td>
          </tr>`;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--danger); padding:1rem;">Erro ao carregar auditoria.</td></tr>`;
  }
}

// Execuções genéricas de workflow
async function executarAcao(endpoint, sucessoMsg) {
  try {
    await API.post(endpoint, {});
    showToast(sucessoMsg, 'success');
    carregarDetalhesProva(provaAtual._id);
  } catch (err) {
    showToast(err.message || 'Erro ao executar ação.', 'error');
  }
}

async function solicitarCorrecaoPrompt(provaId) {
  const obs = prompt('Informe os motivos e observações para a solicitação de correção:');
  if (obs !== null) {
    try {
      await API.post(`/provas/${provaId}/solicitar-correcao`, { observacoes: obs });
      showToast('Status alterado para Aguardando Correção.', 'info');
      carregarDetalhesProva(provaId);
    } catch (err) {
      showToast(err.message || 'Erro ao solicitar correção.', 'error');
    }
  }
}

// Modal Enviar Nova Versão
function setupModalNovaVersao() {
  const form = document.getElementById('form-nova-versao');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-enviar-versao-submit');
      btn.disabled = true;
      btn.innerHTML = '<span>Enviando nova versão...</span>';

      try {
        const formData = new FormData();
        const inputFile = document.getElementById('versao-arquivo');
        if (!inputFile.files.length) {
          throw new Error('Por favor, selecione um arquivo.');
        }

        formData.append('arquivo', inputFile.files[0]);
        formData.append('descricaoAlteracoes', document.getElementById('versao-descricao').value.trim());
        formData.append('observacoesFuncionario', document.getElementById('versao-observacoes').value.trim());

        const checkAlterou = document.getElementById('versao-alterou-conteudo');
        if (checkAlterou && checkAlterou.checked) {
          formData.append('houveAlteracaoConteudo', 'true');
        } else {
          formData.append('houveAlteracaoConteudo', 'false');
        }

        await API.post(`/provas/${provaAtual._id}/versoes`, formData, true);
        showToast('Nova versão enviada com sucesso! Autorizações anteriores foram reiniciadas.', 'success');
        fecharModalNovaVersao();
        form.reset();
        carregarDetalhesProva(provaAtual._id);
      } catch (err) {
        showToast(err.message || 'Erro ao enviar nova versão.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Enviar Versão</span>';
      }
    });
  }
}

function abrirModalNovaVersao() {
  const modal = document.getElementById('modal-nova-versao');
  if (modal) modal.classList.add('active');
}

function fecharModalNovaVersao() {
  const modal = document.getElementById('modal-nova-versao');
  if (modal) modal.classList.remove('active');
}

// Modal Validação Professor
function abrirModalValidarProfessor() {
  const modal = document.getElementById('modal-validar-professor');
  if (modal) modal.classList.add('active');
}

function fecharModalValidarProfessor() {
  const modal = document.getElementById('modal-validar-professor');
  if (modal) modal.classList.remove('active');
}

async function confirmarValidacaoProfessor(acao) {
  const observacoes = document.getElementById('prof-validacao-observacoes').value.trim();
  try {
    await API.post(`/provas/${provaAtual._id}/validar-professor`, { acao, observacoes });
    if (acao === 'aprovar') {
      showToast('Conteúdo validado com sucesso! A prova segue para aprovação final do setor.', 'success');
    } else {
      showToast('Solicitação de novos ajustes registrada.', 'warning');
    }
    fecharModalValidarProfessor();
    carregarDetalhesProva(provaAtual._id);
  } catch (err) {
    showToast(err.message || 'Erro ao processar validação.', 'error');
  }
}

// Modal Aprovação Final
function abrirModalAprovacaoFinal() {
  const modal = document.getElementById('modal-aprovacao-final');
  if (modal) modal.classList.add('active');
}

function fecharModalAprovacaoFinal() {
  const modal = document.getElementById('modal-aprovacao-final');
  if (modal) modal.classList.remove('active');
}

async function confirmarAprovacaoFinal() {
  const observacoes = document.getElementById('aprovacao-final-observacoes').value.trim();
  const btn = document.getElementById('btn-confirmar-aprovacao-final');
  btn.disabled = true;

  try {
    await API.post(`/provas/${provaAtual._id}/aprovar-final`, { observacoes });
    showToast('Prova aprovada com sucesso! O download para impressão está liberado.', 'success');
    fecharModalAprovacaoFinal();
    carregarDetalhesProva(provaAtual._id);
  } catch (err) {
    showToast(err.message || 'Erro ao aprovar prova.', 'error');
  } finally {
    btn.disabled = false;
  }
}

window.abrirModalNovaVersao = abrirModalNovaVersao;
window.fecharModalNovaVersao = fecharModalNovaVersao;
window.abrirModalValidarProfessor = abrirModalValidarProfessor;
window.fecharModalValidarProfessor = fecharModalValidarProfessor;
window.confirmarValidacaoProfessor = confirmarValidacaoProfessor;
window.abrirModalAprovacaoFinal = abrirModalAprovacaoFinal;
window.fecharModalAprovacaoFinal = fecharModalAprovacaoFinal;
window.confirmarAprovacaoFinal = confirmarAprovacaoFinal;
window.executarAcao = executarAcao;
window.solicitarCorrecaoPrompt = solicitarCorrecaoPrompt;
