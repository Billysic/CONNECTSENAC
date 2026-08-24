// frontend/js/painel.js - Portal do Candidato / Modelo

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
} catch (e) {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

if (payloadToken) {
    const nomeEl = document.getElementById('nav-user-name');
    if (nomeEl) nomeEl.textContent = payloadToken.email.split('@')[0];
}

document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

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

// Global State
let todosCursos = [];
let cursoSelecionadoAtual = null;
let horarioSelecionadoId = null;
let notaFeedbackAtual = 5;
let categoriaFiltroAtual = 'todas';

// ==========================================
// NAVEGAÇÃO ENTRE ABAS DO CANDIDATO
// ==========================================
function setTab(tabName) {
    const tabs = ['vitrine', 'meus-agendamentos', 'como-funciona'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        const view = document.getElementById(`subview-${t}`);
        if (t === tabName) {
            if (btn) {
                btn.className = 'px-4 py-2 rounded-xl text-sm font-bold transition-all bg-senac-blue text-white shadow-sm flex items-center gap-2';
            }
            if (view) view.classList.remove('hidden');
        } else {
            if (btn) {
                btn.className = 'px-4 py-2 rounded-xl text-sm font-semibold transition-all text-slate-600 hover:bg-slate-100 flex items-center gap-2';
            }
            if (view) view.classList.add('hidden');
        }
    });

    if (tabName === 'meus-agendamentos') {
        carregarMeusAgendamentos();
    }
    if (window.lucide) lucide.createIcons();
}

// ==========================================
// 1. CARREGAR VITRINE DE CURSOS
// ==========================================
async function carregarCursos() {
    const divCursos = document.getElementById('listaCursos');
    try {
        const response = await fetch(`${API_URL}/cursos/ativos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        todosCursos = await response.json();
        renderizarCursos(todosCursos);
    } catch (error) {
        divCursos.innerHTML = '<div class="col-span-full text-center py-12 text-red-500 font-semibold">Erro ao carregar os cursos. Tente recarregar a página.</div>';
    }
}

function filtrarCategoria(cat) {
    categoriaFiltroAtual = cat;
    document.querySelectorAll('.filter-cat-btn').forEach(b => {
        if (b.dataset.cat === cat) {
            b.className = 'filter-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white transition-all whitespace-nowrap';
        } else {
            b.className = 'filter-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all whitespace-nowrap';
        }
    });
    filtrarCursos();
}

function filtrarCursos() {
    const busca = (document.getElementById('filter-search-input').value || '').toLowerCase();
    
    const filtrados = todosCursos.filter(curso => {
        const matchBusca = (curso.nome || '').toLowerCase().includes(busca) ||
                           (curso.descricao || '').toLowerCase().includes(busca) ||
                           (curso.usuarios ? curso.usuarios.nome.toLowerCase().includes(busca) : false);
        
        const matchCat = categoriaFiltroAtual === 'todas' || 
                         (curso.nome && curso.nome.toLowerCase().includes(categoriaFiltroAtual.toLowerCase())) ||
                         (curso.descricao && curso.descricao.toLowerCase().includes(categoriaFiltroAtual.toLowerCase()));
        
        return matchBusca && matchCat;
    });

    renderizarCursos(filtrados);
}

function renderizarCursos(lista) {
    const divCursos = document.getElementById('listaCursos');
    divCursos.innerHTML = '';

    if (!lista || lista.length === 0) {
        divCursos.innerHTML = `
            <div class="col-span-full text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <i data-lucide="search-x" class="w-7 h-7"></i>
                </div>
                <h3 class="text-base font-bold text-slate-800">Nenhum procedimento encontrado</h3>
                <p class="text-xs text-slate-500">Tente buscar por outros termos ou limpar os filtros de categoria.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    lista.forEach(curso => {
        const profNome = curso.usuarios ? curso.usuarios.nome : 'Docente Especialista';
        const local = curso.localizacao || 'Laboratório de Práticas';
        const imagem = curso.foto_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80';

        const card = document.createElement('div');
        card.className = 'bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm card-hover-effect flex flex-col cursor-pointer';
        card.onclick = () => abrirModalDetalhes(curso);

        card.innerHTML = `
            <div class="relative h-48 w-full overflow-hidden bg-slate-100">
                <img src="${imagem}" alt="${curso.nome}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                <span class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-sm">
                    100% Gratuito
                </span>
                <span class="absolute bottom-3 left-3 text-xs font-bold text-white flex items-center gap-1">
                    <i data-lucide="map-pin" class="w-3.5 h-3.5 text-senac-orange"></i> ${local}
                </span>
            </div>
            
            <div class="p-5 flex flex-col flex-grow justify-between space-y-4">
                <div>
                    <h3 class="font-extrabold text-base text-slate-900 line-clamp-1">${curso.nome}</h3>
                    <p class="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">${curso.descricao || 'Atendimento prático supervisionado por alunos do Senac.'}</p>
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div class="text-[11px] text-slate-500 font-medium">
                        👨‍🏫 Prof. <strong class="text-slate-700">${profNome}</strong>
                    </div>
                    <button class="px-3 py-1.5 rounded-xl bg-senac-blue-light text-senac-blue hover:bg-senac-blue hover:text-white font-bold text-xs transition-all flex items-center gap-1">
                        <span>Ver Vagas</span>
                        <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
        `;

        divCursos.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}

// ==========================================
// 2. MODAL DE DETALHES & HORÁRIOS
// ==========================================
async function abrirModalDetalhes(curso) {
    cursoSelecionadoAtual = curso;
    horarioSelecionadoId = null;

    document.getElementById('detalheCursoNome').textContent = curso.nome;
    document.getElementById('detalheCursoProf').textContent = curso.usuarios ? curso.usuarios.nome : 'Docente Senac';
    document.getElementById('detalheCursoLocal').textContent = 'SENAC';
    document.getElementById('detalheCursoSala').textContent = curso.localizacao || 'Laboratório Senac';
    document.getElementById('detalheCursoDescricao').textContent = curso.descricao || 'Sem descrição cadastrada.';
    document.getElementById('detalheCursoImagem').src = curso.foto_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80';

    const blocoRestricoes = document.getElementById('blocoRestricoes');
    if (curso.restricoes && curso.restricoes.trim() !== '') {
        blocoRestricoes.classList.remove('hidden');
        document.getElementById('detalheCursoRestricoes').textContent = curso.restricoes;
    } else {
        blocoRestricoes.classList.add('hidden');
    }

    // Carregar Horários Disponíveis
    carregarDisponibilidades(curso.id);

    // Carregar Avaliações
    carregarAvaliacoesCurso(curso.id);

    document.getElementById('modalDetalhesCurso').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function fecharModalDetalhes() {
    document.getElementById('modalDetalhesCurso').classList.add('hidden');
}

async function carregarDisponibilidades(cursoId) {
    const listEl = document.getElementById('listaHorariosDisponiveis');
    listEl.innerHTML = '<div class="text-xs text-slate-400 py-3">Carregando horários com vagas livres...</div>';

    try {
        const response = await fetch(`${API_URL}/disponibilidades/curso/${cursoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const disponibilidades = await response.json();

        listEl.innerHTML = '';

        if (!disponibilidades || disponibilidades.length === 0) {
            listEl.innerHTML = '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-medium">Nenhum horário aberto com vagas para este curso no momento.</div>';
            return;
        }

        disponibilidades.forEach((disp, idx) => {
            const dataObj = new Date(disp.data_hora);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
            const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const vagasLivres = disp.vagas_totais - disp.vagas_ocupadas;

            const radioWrapper = document.createElement('label');
            radioWrapper.className = `flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${idx === 0 ? 'border-senac-blue bg-blue-50/40 ring-1 ring-senac-blue' : 'border-slate-200 hover:border-slate-300'}`;
            
            if (idx === 0) horarioSelecionadoId = disp.id;

            radioWrapper.innerHTML = `
                <div class="flex items-center gap-3">
                    <input type="radio" name="horario_opcao" value="${disp.id}" ${idx === 0 ? 'checked' : ''} onchange="selecionarHorario('${disp.id}', this)" class="text-senac-blue focus:ring-senac-blue">
                    <div>
                        <span class="text-xs font-bold text-slate-800 uppercase tracking-wide block">${dataFormatada} às ${horaFormatada}</span>
                        <span class="text-[11px] text-slate-500 font-medium">Atendimento presencial</span>
                    </div>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${vagasLivres <= 2 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                    ${vagasLivres} vaga${vagasLivres > 1 ? 's' : ''}
                </span>
            `;

            listEl.appendChild(radioWrapper);
        });

    } catch (e) {
        listEl.innerHTML = '<div class="text-xs text-red-500 py-2">Erro ao carregar horários.</div>';
    }
}

function selecionarHorario(dispId, radioInput) {
    horarioSelecionadoId = dispId;
    document.querySelectorAll('#listaHorariosDisponiveis label').forEach(l => {
        l.className = 'flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer';
    });
    radioInput.closest('label').className = 'flex items-center justify-between p-3 rounded-2xl border border-senac-blue bg-blue-50/40 ring-1 ring-senac-blue transition-all cursor-pointer';
}

async function carregarAvaliacoesCurso(cursoId) {
    const listEl = document.getElementById('detalheCursoAvaliacoes');
    listEl.innerHTML = '<div class="text-xs text-slate-400 py-2">Carregando avaliações...</div>';

    try {
        const response = await fetch(`${API_URL}/feedbacks/curso/${cursoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const feedbacks = await response.json();

        listEl.innerHTML = '';

        if (!feedbacks || feedbacks.length === 0) {
            listEl.innerHTML = '<div class="text-xs text-slate-400">Ainda não há avaliações para este curso. Seja o primeiro a participar e avaliar!</div>';
            return;
        }

        feedbacks.forEach(f => {
            const estrelas = '★'.repeat(f.nota) + '☆'.repeat(5 - f.nota);
            const dataF = new Date(f.created_at).toLocaleDateString('pt-BR');
            const item = document.createElement('div');
            item.className = 'p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1';
            item.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-700">${f.nome_avaliador || 'Modelo Voluntário'}</span>
                    <span class="text-amber-500 font-bold">${estrelas}</span>
                </div>
                <p class="text-slate-600 text-[11px] leading-relaxed">${f.comentario || 'Sem comentário adicional.'}</p>
                <div class="text-[10px] text-slate-400 text-right">${dataF}</div>
            `;
            listEl.appendChild(item);
        });

    } catch (e) {
        listEl.innerHTML = '<div class="text-xs text-slate-400">Não foi possível carregar as avaliações.</div>';
    }
}

// ==========================================
// 3. CONFIRMAR AGENDAMENTO (COM CONFETTI)
// ==========================================
async function confirmarAgendamento() {
    if (!horarioSelecionadoId) {
        showToast('Por favor, selecione um horário disponível.', 'error');
        return;
    }

    const checkTermos = document.getElementById('check-lgpd-termos');
    if (!checkTermos || !checkTermos.checked) {
        showToast('Você deve aceitar os termos do programa voluntário.', 'error');
        return;
    }

    const btn = document.getElementById('btnConfirmarAgendamento');
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin mr-2">⏳</span> Confirmando agendamento...`;

    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ disponibilidade_id: horarioSelecionadoId })
        });

        const data = await response.json();

        if (response.ok) {
            fecharModalDetalhes();
            
            // Efeito Confetti
            if (window.confetti) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }

            showToast('Agendamento realizado com sucesso! 🎉', 'success');
            
            // Redireciona suavemente para Meus Agendamentos
            setTimeout(() => {
                setTab('meus-agendamentos');
            }, 800);
        } else {
            showToast(data.erro || 'Falha ao agendar horário.', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão ao realizar agendamento.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Confirmar Meu Agendamento`;
        if (window.lucide) lucide.createIcons();
    }
}

// ==========================================
// 4. MEUS AGENDAMENTOS & CANCELAMENTO
// ==========================================
async function carregarMeusAgendamentos() {
    const listEl = document.getElementById('listaMeusAgendamentos');
    listEl.innerHTML = '<div class="text-center py-12 text-slate-400">Carregando seus agendamentos...</div>';

    try {
        const response = await fetch(`${API_URL}/agendamentos/meus`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const agendamentos = await response.json();

        const badgeCount = document.getElementById('badge-my-appointments-count');
        if (badgeCount) badgeCount.textContent = agendamentos.length || 0;

        listEl.innerHTML = '';

        if (!agendamentos || agendamentos.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                    <div class="w-14 h-14 rounded-2xl bg-blue-50 text-senac-blue flex items-center justify-center mx-auto">
                        <i data-lucide="calendar-plus" class="w-7 h-7"></i>
                    </div>
                    <h3 class="text-base font-bold text-slate-800">Você ainda não possui agendamentos</h3>
                    <p class="text-xs text-slate-500">Explore a vitrine de procedimentos e garanta sua vaga gratuita em uma aula prática!</p>
                    <button onclick="setTab('vitrine')" class="mt-2 px-4 py-2.5 rounded-xl bg-senac-blue text-white text-xs font-bold hover:bg-senac-blue-dark transition-all">
                        Explorar Vitrine
                    </button>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        agendamentos.forEach(ag => {
            const dataCurso = ag.disponibilidades ? new Date(ag.disponibilidades.data_hora) : new Date();
            const dataFormatada = dataCurso.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            const horaFormatada = dataCurso.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const cursoNome = ag.disponibilidades && ag.disponibilidades.cursos ? ag.disponibilidades.cursos.nome : 'Curso Senac';
            const fotoUrl = ag.disponibilidades && ag.disponibilidades.cursos && ag.disponibilidades.cursos.foto_url 
                ? ag.disponibilidades.cursos.foto_url 
                : 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80';

            // Status Badge
            let statusBadge = '';
            let acoesHTML = '';

            if (ag.status === 'agendado') {
                statusBadge = '<span class="badge-status badge-agendado">Confirmado</span>';
                
                // Validação de 2h
                const agora = new Date();
                const diffHoras = (dataCurso - agora) / (1000 * 60 * 60);

                if (diffHoras >= 2) {
                    acoesHTML = `
                        <button onclick="cancelarAgendamento('${ag.id}', '${cursoNome}')" class="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all flex items-center gap-1.5">
                            <i data-lucide="x-circle" class="w-3.5 h-3.5"></i>
                            <span>Cancelar Vaga</span>
                        </button>
                    `;
                } else {
                    acoesHTML = `
                        <span class="text-[11px] font-semibold text-slate-400" title="Cancelamento indisponível com menos de 2h de antecedência">
                            🔒 Prazo de cancelamento encerrado
                        </span>
                    `;
                }
            } else if (ag.status === 'concluido') {
                statusBadge = '<span class="badge-status badge-concluido">Concluído</span>';
                acoesHTML = `
                    <button onclick="abrirModalFeedback('${ag.id}', '${cursoNome}')" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm">
                        <i data-lucide="star" class="w-3.5 h-3.5"></i>
                        <span>Avaliar Atendimento</span>
                    </button>
                `;
            } else {
                statusBadge = '<span class="badge-status badge-cancelado">Cancelado</span>';
                acoesHTML = '<span class="text-xs text-slate-400 font-medium">Vaga liberada</span>';
            }

            const item = document.createElement('div');
            item.className = 'bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card-hover-effect';
            item.innerHTML = `
                <div class="flex items-center gap-4">
                    <img src="${fotoUrl}" alt="${cursoNome}" class="w-16 h-16 rounded-2xl object-cover border border-slate-100 flex-shrink-0">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <h4 class="font-extrabold text-base text-slate-900">${cursoNome}</h4>
                            ${statusBadge}
                        </div>
                        <p class="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                            <i data-lucide="calendar" class="w-3.5 h-3.5 text-senac-blue"></i>
                            <span>${dataFormatada} às ${horaFormatada}</span>
                        </p>
                    </div>
                </div>

                <div class="w-full sm:w-auto flex items-center justify-end">
                    ${acoesHTML}
                </div>
            `;

            listEl.appendChild(item);
        });

        if (window.lucide) lucide.createIcons();

    } catch (e) {
        listEl.innerHTML = '<div class="text-center py-8 text-red-500 text-xs">Erro ao carregar agendamentos.</div>';
    }
}

async function cancelarAgendamento(id, nomeCurso) {
    if (!confirm(`Deseja realmente cancelar seu agendamento para "${nomeCurso}"? A vaga será liberada para outro modelo.`)) return;

    try {
        const response = await fetch(`${API_URL}/agendamentos/${id}/cancelar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Agendamento cancelado com sucesso.', 'success');
            carregarMeusAgendamentos();
        } else {
            showToast(data.erro || 'Não foi possível cancelar o agendamento.', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão ao cancelar agendamento.', 'error');
    }
}

// ==========================================
// 5. AVALIAÇÃO / FEEDBACK (5 ESTRELAS)
// ==========================================
function abrirModalFeedback(agendamentoId, nomeCurso) {
    document.getElementById('feedbackAgendamentoId').value = agendamentoId;
    document.getElementById('feedbackComentario').value = '';
    setStarRating(5);

    document.getElementById('modalFeedback').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function fecharModalFeedback() {
    document.getElementById('modalFeedback').classList.add('hidden');
}

function setStarRating(nota) {
    notaFeedbackAtual = nota;
    const labels = {
        1: 'Péssimo (1 estrela)',
        2: 'Regular (2 estrelas)',
        3: 'Bom (3 estrelas)',
        4: 'Muito Bom (4 estrelas)',
        5: 'Excelente (5 estrelas)'
    };

    document.getElementById('star-label').textContent = labels[nota] || `${nota} estrelas`;
    
    document.querySelectorAll('#star-rating-container i').forEach(star => {
        const val = parseInt(star.getAttribute('data-val'));
        if (val <= nota) {
            star.className = 'w-8 h-8 cursor-pointer fill-current text-amber-400 active';
        } else {
            star.className = 'w-8 h-8 cursor-pointer text-slate-300';
        }
    });
}

async function enviarFeedback() {
    const agendamentoId = document.getElementById('feedbackAgendamentoId').value;
    const comentario = document.getElementById('feedbackComentario').value.trim();

    try {
        const response = await fetch(`${API_URL}/feedbacks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                agendamento_id: agendamentoId,
                nota: notaFeedbackAtual,
                comentario: comentario
            })
        });

        const data = await response.json();

        if (response.ok) {
            fecharModalFeedback();
            showToast('Obrigado pela sua avaliação! ⭐', 'success');
            carregarMeusAgendamentos();
        } else {
            showToast(data.erro || 'Erro ao enviar avaliação.', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão ao enviar avaliação.', 'error');
    }
}

// Inicialização
carregarCursos();