// frontend/js/admin.js - Central Administrativa & Coordenação

const FALLBACK_BASE_URL = 'http://localhost:3000/api';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api`;

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'index.html';
}

let payloadToken = null;
try {
    payloadToken = JSON.parse(atob(token.split('.')[1]));
    if (payloadToken.exp && payloadToken.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    }

    if (payloadToken.perfil === 'profissional') {
        window.location.href = 'profissional.html';
    } else if (payloadToken.perfil !== 'admin' && payloadToken.perfil !== 'coordenador') {
        window.location.href = 'painel.html';
    }
} catch (e) {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

if (payloadToken) {
    const nomeEl = document.getElementById('userNome');
    const perfilEl = document.getElementById('userPerfil');
    if (nomeEl) nomeEl.textContent = payloadToken.email.split('@')[0];
    if (perfilEl) perfilEl.textContent = (payloadToken.perfil || '').toUpperCase();

    // Se o usuário for coordenador, ocultar o botão de cadastrar novos colaboradores
    if (payloadToken.perfil === 'coordenador') {
        const btnColab = document.getElementById('btnOpenNewColab');
        if (btnColab) btnColab.style.display = 'none';
    }
}

document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

// Função global de escape para mitigar injeção de HTML/Scripts (XSS)
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Toast Helper
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast animate-fade-in bg-white border border-slate-200 shadow-xl';
    
    let icon = 'info';
    let iconClass = 'text-blue-600 bg-blue-50';
    if (type === 'success') { icon = 'check-circle'; iconClass = 'text-emerald-600 bg-emerald-50'; }
    if (type === 'error') { icon = 'alert-circle'; iconClass = 'text-red-600 bg-red-50'; }

    toast.innerHTML = `
        <div class="w-8 h-8 rounded-lg ${iconClass} flex items-center justify-center flex-shrink-0">
            <i data-lucide="${icon}" class="w-4 h-4"></i>
        </div>
        <div class="flex-grow text-xs font-semibold text-slate-800 pt-1.5">${message}</div>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Global Variables
let baseUtilizadores = [];
let baseCursosAdmin = [];

// ==========================================
// NAVEGAÇÃO DE ABAS ADMIN
// ==========================================
function setAdminTab(tabName) {
    const tabs = ['usuarios', 'cursos', 'horarios', 'pautas'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-admin-${t}`);
        const view = document.getElementById(`subview-admin-${t}`);
        if (t === tabName) {
            if (btn) {
                btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all bg-slate-900 text-white shadow-sm flex items-center gap-1.5 whitespace-nowrap';
            }
            if (view) view.classList.remove('hidden');
        } else {
            if (btn) {
                btn.className = 'px-4 py-2 rounded-xl text-xs font-semibold transition-all text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap';
            }
            if (view) view.classList.add('hidden');
        }
    });

    if (tabName === 'usuarios') carregarUtilizadores();
    if (tabName === 'cursos') carregarCursosAdmin();
    if (tabName === 'horarios') carregarCursosDropdownGrade();
    if (tabName === 'pautas') carregarPautasGlobais();
    if (window.lucide) lucide.createIcons();
}

// ==========================================
// 1. CARREGAR MÉTRICAS DO DASHBOARD
// ==========================================
async function carregarMetricas() {
    try {
        const response = await fetch(`${API_URL}/dashboard/metricas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('metricUsuarios').textContent = data.totalUsuarios || 0;
            document.getElementById('metricAgendados').textContent = data.agendamentos.agendados || 0;
            document.getElementById('metricConcluidos').textContent = data.agendamentos.concluidos || 0;
            document.getElementById('metricCancelamento').textContent = data.taxaCancelamento || '0%';
        }
    } catch (e) {
        console.error("Erro ao carregar métricas.");
    }
}

// ==========================================
// 2. GESTÃO DE USUÁRIOS & RBAC
// ==========================================
async function carregarUtilizadores() {
    const tbody = document.getElementById('tabelaUsuariosBody');
    tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Carregando usuários...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/admin/usuarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        baseUtilizadores = await response.json();
        renderizarTabelaUsuarios(baseUtilizadores);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-red-500 font-semibold">Erro ao carregar usuários.</td></tr>';
    }
}

function filtrarTabelaUsuarios() {
    const busca = (document.getElementById('adminUserSearch').value || '').toLowerCase();
    const filtrados = baseUtilizadores.filter(u => 
        (u.nome || '').toLowerCase().includes(busca) ||
        (u.email || '').toLowerCase().includes(busca) ||
        (u.perfil || '').toLowerCase().includes(busca)
    );
    renderizarTabelaUsuarios(filtrados);
}

function renderizarTabelaUsuarios(lista) {
    const tbody = document.getElementById('tabelaUsuariosBody');
    tbody.innerHTML = '';

    if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>';
        return;
    }

    lista.forEach(user => {
        const isRootAdmin = payloadToken.perfil === 'admin';
        
        // Status Badge
        const statusBadge = user.is_bloqueado
            ? '<span class="badge-status badge-cancelado">Bloqueado</span>'
            : '<span class="badge-status badge-concluido">Ativo</span>';

        // WhatsApp Link
        const telLimpo = (user.telefone || '').replace(/\D/g, '');
        const msgZap = encodeURIComponent(`Olá, ${user.nome}! Aqui é a Coordenação do Connect Senac.`);
        const linkZap = telLimpo 
            ? `<a href="https://wa.me/55${telLimpo}?text=${msgZap}" target="_blank" class="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium">
                 <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> ${user.telefone}
               </a>`
            : `<span class="text-slate-400 text-xs">Sem telefone</span>`;

        // Seletor RBAC
        let seletorPerfil = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800">${user.perfil}</span>`;
        if (isRootAdmin) {
            seletorPerfil = `
                <select onchange="alterarPerfil('${user.id}', this.value)" class="p-1 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50 focus:ring-2 focus:ring-slate-900">
                    <option value="candidato" ${user.perfil === 'candidato' ? 'selected' : ''}>Candidato</option>
                    <option value="profissional" ${user.perfil === 'profissional' ? 'selected' : ''}>Docente</option>
                    <option value="coordenador" ${user.perfil === 'coordenador' ? 'selected' : ''}>Coordenador</option>
                    <option value="admin" ${user.perfil === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            `;
        }

        // Botões de Ação
        let btnBloqueio = '';
        if (isRootAdmin) {
            btnBloqueio = `
                <button onclick="toggleBloqueio('${user.id}', ${user.is_bloqueado})" class="p-1.5 rounded-lg border ${user.is_bloqueado ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-amber-200 text-amber-600 hover:bg-amber-50'} transition-all" title="${user.is_bloqueado ? 'Desbloquear' : 'Bloquear'}">
                    <i data-lucide="${user.is_bloqueado ? 'unlock' : 'lock'}" class="w-3.5 h-3.5"></i>
                </button>
            `;
        }

        const btnExcluir = `
            <button onclick="excluirUsuario('${user.id}', '${user.nome}')" class="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all" title="Excluir Conta">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
        `;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/50 transition-colors';
        tr.innerHTML = `
            <td class="px-6 py-4 font-bold text-slate-800">${escapeHTML(user.nome)}</td>
            <td class="px-6 py-4 text-slate-500">${escapeHTML(user.email)}</td>
            <td class="px-6 py-4">${linkZap}</td>
            <td class="px-6 py-4">${seletorPerfil}</td>
            <td class="px-6 py-4">${statusBadge}</td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                    ${btnBloqueio}
                    ${btnExcluir}
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();
}

async function alterarPerfil(userId, novoPerfil) {
    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${userId}/perfil`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ perfil: novoPerfil })
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Cargo atualizado com sucesso!', 'success');
            carregarUtilizadores();
        } else {
            showToast(data.erro || 'Erro ao alterar cargo.', 'error');
            carregarUtilizadores();
        }
    } catch (e) {
        showToast('Erro de conexão.', 'error');
    }
}

async function toggleBloqueio(userId, statusAtual) {
    const acao = statusAtual ? 'desbloquear' : 'bloquear';
    if (!confirm(`Tem certeza que deseja ${acao} este usuário?`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${userId}/bloquear`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_bloqueado: !statusAtual })
        });

        const data = await response.json();
        if (response.ok) {
            showToast(`Usuário ${acao === 'bloquear' ? 'bloqueado' : 'desbloqueado'} com sucesso!`, 'success');
            carregarUtilizadores();
        } else {
            showToast(data.erro || 'Erro ao alterar status.', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão.', 'error');
    }
}

async function excluirUsuario(userId, nome) {
    if (!confirm(`ATENÇÃO: Deseja realmente excluir permanentemente a conta de "${nome}"?`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/usuarios/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Usuário excluído com sucesso.', 'success');
            carregarUtilizadores();
            carregarMetricas();
        } else {
            showToast(data.erro || 'Erro ao excluir usuário.', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão.', 'error');
    }
}

// ==========================================
// 3. GESTÃO DE CURSOS (CATÁLOGO ADMIN)
// ==========================================
async function carregarCursosAdmin() {
    const tbody = document.getElementById('tabelaCursosBody');
    tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Carregando catálogo...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/cursos/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        baseCursosAdmin = await response.json();

        tbody.innerHTML = '';

        if (!baseCursosAdmin || baseCursosAdmin.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Nenhum curso cadastrado ainda.</td></tr>';
            return;
        }

        baseCursosAdmin.forEach(curso => {
            const statusBadge = curso.status === 'ativo' 
                ? '<span class="badge-status badge-concluido">Ativo na Vitrine</span>'
                : '<span class="badge-status badge-cancelado">Arquivado</span>';

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50/50 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-800 text-xs">${escapeHTML(curso.nome)}</div>
                    <div class="text-[11px] text-slate-400 line-clamp-1">${escapeHTML(curso.descricao || '')}</div>
                </td>
                <td class="px-6 py-4 text-slate-600">${escapeHTML(curso.usuarios ? curso.usuarios.nome : 'Docente Senac')}</td>
                <td class="px-6 py-4 text-slate-500">${escapeHTML(curso.localizacao || 'Laboratório Senac')}</td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4 text-right">
                    ${curso.status === 'ativo' ? `
                        <button onclick="arquivarCurso('${curso.id}', '${escapeHTML(curso.nome)}')" class="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold transition-all" aria-label="Arquivar curso ${escapeHTML(curso.nome)}">
                            Arquivar
                        </button>
                    ` : '<span class="text-slate-400 text-xs">Sem ações</span>'}
                </td>
            `;

            tbody.appendChild(tr);
        });

        if (window.lucide) lucide.createIcons();

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-red-500 text-xs">Erro ao carregar cursos.</td></tr>';
    }
}

async function arquivarCurso(cursoId, nome) {
    if (!confirm(`Deseja arquivar e remover o curso "${nome}" da vitrine dos modelos?`)) return;

    try {
        const response = await fetch(`${API_URL}/cursos/${cursoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showToast('Curso arquivado com sucesso!', 'success');
            carregarCursosAdmin();
            carregarMetricas();
        } else {
            showToast('Erro ao arquivar curso.', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão.', 'error');
    }
}

// Modal Novo Curso
function abrirModalNovoCurso() {
    carregarProfissionaisDropdown();
    document.getElementById('modalNovoCurso').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function fecharModalNovoCurso() {
    document.getElementById('modalNovoCurso').classList.add('hidden');
}

async function carregarProfissionaisDropdown() {
    const select = document.getElementById('cursoProfissionalId');
    try {
        const response = await fetch(`${API_URL}/admin/profissionais`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profs = await response.json();

        select.innerHTML = '<option value="">Selecione o docente...</option>';
        if (Array.isArray(profs)) {
            profs.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
            });
        }
    } catch (e) {
        select.innerHTML = '<option value="">Erro ao carregar professores</option>';
    }
}

async function criarCurso(e) {
    e.preventDefault();

    const nome = document.getElementById('cursoNome').value.trim();
    const profissional_id = document.getElementById('cursoProfissionalId').value;
    const localizacao = document.getElementById('cursoLocalizacao').value.trim();
    const descricao = document.getElementById('cursoDescricao').value.trim();
    const restricoes = document.getElementById('cursoRestricoes').value.trim();
    const foto_url = document.getElementById('cursoFotoUrl').value.trim();

    try {
        const response = await fetch(`${API_URL}/cursos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nome, profissional_id, localizacao, descricao, restricoes, foto_url })
        });

        const data = await response.json();

        if (response.ok) {
            fecharModalNovoCurso();
            showToast('Novo curso publicado com sucesso!', 'success');
            carregarCursosAdmin();
            carregarMetricas();
            document.getElementById('formNovoCurso').reset();
        } else {
            showToast(data.erro || 'Erro ao criar curso.', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão.', 'error');
    }
}

// ==========================================
// 4. GRADE DE HORÁRIOS & VAGAS
// ==========================================
async function carregarCursosDropdownGrade() {
    const select = document.getElementById('gradeCursoId');
    try {
        const response = await fetch(`${API_URL}/cursos/ativos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        select.innerHTML = '<option value="">Selecione o curso...</option>';
        if (Array.isArray(cursos)) {
            cursos.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
            });
        }
    } catch (e) {
        select.innerHTML = '<option value="">Erro ao carregar cursos</option>';
    }
}

async function criarGradeHorario(e) {
    e.preventDefault();

    const curso_id = document.getElementById('gradeCursoId').value;
    const data_hora = document.getElementById('gradeDataHora').value;
    const vagas_totais = parseInt(document.getElementById('gradeVagas').value, 10);

    try {
        const response = await fetch(`${API_URL}/disponibilidades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ curso_id, data_hora: new Date(data_hora).toISOString(), vagas_totais })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Horário e vagas disponibilizados com sucesso!', 'success');
            document.getElementById('formNovaGrade').reset();
        } else {
            showToast(data.erro || 'Erro ao abrir horário.', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão.', 'error');
    }
}

// ==========================================
// 5. PAUTAS GLOBAIS
// ==========================================
async function carregarPautasGlobais() {
    const container = document.getElementById('listaPautasGlobais');
    container.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs">Carregando pautas globais...</div>';

    try {
        const response = await fetch(`${API_URL}/admin/pautas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cursos = await response.json();

        container.innerHTML = '';

        if (!Array.isArray(cursos) || cursos.length === 0) {
            container.innerHTML = '<div class="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-400 text-center">Nenhum atendimento registrado no momento.</div>';
            return;
        }

        cursos.forEach(curso => {
            let aulasHTML = '';

            if (Array.isArray(curso.disponibilidades)) {
                curso.disponibilidades.forEach(disp => {
                    const dataObj = new Date(disp.data_hora);
                    const dataF = dataObj.toLocaleDateString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    const agendados = Array.isArray(disp.agendamentos) ? disp.agendamentos.filter(a => a.status !== 'cancelado') : [];

                    const inscritosHTML = agendados.map(a => `
                        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <span class="font-bold text-slate-800">${escapeHTML(a.usuarios ? a.usuarios.nome : 'Modelo')}</span>
                            <span class="text-slate-500 font-medium">${escapeHTML(a.usuarios ? a.usuarios.telefone : '')}</span>
                            <span class="badge-status ${a.status === 'concluido' ? 'badge-concluido' : 'badge-agendado'}">${escapeHTML(a.status)}</span>
                        </div>
                    `).join('');

                    aulasHTML += `
                        <div class="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                            <div class="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                                <span class="font-bold text-slate-900">📅 Aula: ${dataF}</span>
                                <span class="text-slate-500 font-semibold">Ocupação: ${disp.vagas_ocupadas} / ${disp.vagas_totais}</span>
                            </div>
                            <div class="space-y-1.5 pt-1">
                                ${inscritosHTML || '<div class="text-slate-400 text-xs">Sem inscritos</div>'}
                            </div>
                        </div>
                    `;
                });
            }

            const card = document.createElement('div');
            card.className = 'p-5 bg-slate-50 rounded-3xl border border-slate-200 space-y-3';
            card.innerHTML = `
                <div class="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <i data-lucide="book-open" class="w-4 h-4 text-senac-blue"></i>
                    <span>${escapeHTML(curso.nome)}</span>
                </div>
                <div class="space-y-2">
                    ${aulasHTML || '<div class="text-slate-400 text-xs">Sem horários</div>'}
                </div>
            `;

            container.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();

    } catch (e) {
        container.innerHTML = '<div class="p-4 text-red-500 text-xs">Erro ao carregar pautas.</div>';
    }
}

// ==========================================
// 6. CADASTRO DE COLABORADOR
// ==========================================
function abrirModalColaborador() {
    document.getElementById('modalNovoColaborador').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function fecharModalColaborador() {
    document.getElementById('modalNovoColaborador').classList.add('hidden');
}

async function criarColaborador(e) {
    e.preventDefault();

    const nome = document.getElementById('colabNome').value.trim();
    const email = document.getElementById('colabEmail').value.trim();
    const telefone = document.getElementById('colabTelefone').value.trim();
    const perfil = document.getElementById('colabPerfil').value;
    const senha = document.getElementById('colabSenha').value;

    try {
        const response = await fetch(`${API_URL}/admin/colaboradores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nome, email, telefone, perfil, senha })
        });

        const data = await response.json();

        if (response.ok) {
            fecharModalColaborador();
            showToast(`Colaborador (${perfil}) criado com sucesso!`, 'success');
            carregarUtilizadores();
            carregarMetricas();
            document.getElementById('formNovoColab').reset();
        } else {
            showToast(data.erro || 'Erro ao criar colaborador.', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão.', 'error');
    }
}

// Inicialização
carregarMetricas();
carregarUtilizadores();