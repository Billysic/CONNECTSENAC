// frontend/js/profissional.js - Portal do Professor / Docente

const FALLBACK_BASE_URL = 'http://localhost:3000/api';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api`;
const token = localStorage.getItem('token');

// 1. Verificação de Autenticação e Guarda de Rota (RBAC Frontend)
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

    if (payloadToken.perfil === 'admin' || payloadToken.perfil === 'coordenador') {
        window.location.href = 'admin.html';
    } else if (payloadToken.perfil !== 'profissional') {
        window.location.href = 'painel.html';
    }
} catch (e) {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

if (payloadToken) {
    const nomeEl = document.getElementById('nomeProf');
    if (nomeEl) nomeEl.textContent = payloadToken.email.split('@')[0];
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

// 2. Carregar Turmas e Agendamentos do Professor
async function carregarMinhasTurmas() {
    const accordion = document.getElementById('accordionTurmas');
    try {
        const response = await fetch(`${API_URL}/profissional/minhas-turmas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }

        const cursos = await response.json();
        accordion.innerHTML = '';

        if (!Array.isArray(cursos) || cursos.length === 0) {
            accordion.innerHTML = `
                <div class="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                    <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <i data-lucide="info" class="w-7 h-7"></i>
                    </div>
                    <h3 class="text-base font-bold text-slate-800">Nenhuma turma ativa vinculada</h3>
                    <p class="text-xs text-slate-500">Solicite à coordenação a abertura de cursos e horários vinculados ao seu perfil docente.</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        cursos.forEach((curso) => {
            let horariosHTML = '';

            if (Array.isArray(curso.disponibilidades)) {
                curso.disponibilidades.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

                curso.disponibilidades.forEach(disp => {
                    const dataObj = new Date(disp.data_hora);
                    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
                    const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const agendamentos = Array.isArray(disp.agendamentos) ? disp.agendamentos : [];
                    const agendamentosAtivos = agendamentos.filter(a => a.status !== 'cancelado');

                    let tabelaModelos = '';
                    if (agendamentosAtivos.length === 0) {
                        tabelaModelos = `<div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-400 font-medium text-center">Nenhum modelo voluntário agendado para este horário ainda.</div>`;
                    } else {
                        const linhas = agendamentosAtivos.map(ag => {
                            let acoesHTML = '';
                            if (ag.status === 'agendado') {
                                acoesHTML = `
                                    <div class="flex items-center gap-2">
                                        <button onclick="concluirServico('${ag.id}')" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1" aria-label="Confirmar presença">
                                            <i data-lucide="check" class="w-3.5 h-3.5"></i>
                                            <span>Presente</span>
                                        </button>
                                        <button onclick="cancelarAluno('${ag.id}', '${escapeHTML(ag.usuarios ? ag.usuarios.nome : 'Modelo')}')" class="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all flex items-center gap-1" aria-label="Marcar falta">
                                            <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                            <span>Falta</span>
                                        </button>
                                    </div>
                                `;
                            } else if (ag.status === 'concluido') {
                                acoesHTML = `<span class="badge-status badge-concluido">Atendimento Concluído</span>`;
                            } else {
                                acoesHTML = `<span class="badge-status badge-cancelado">Cancelado</span>`;
                            }

                            const telLimpo = ag.usuarios && ag.usuarios.telefone ? ag.usuarios.telefone.replace(/\D/g, '') : '';
                            const msgProf = encodeURIComponent(`Olá, ${ag.usuarios ? ag.usuarios.nome : 'Modelo'}! Aqui é o(a) Prof. ${payloadToken.email.split('@')[0]} do curso de ${curso.nome} do SENAC.`);
                            const linkZap = telLimpo
                                ? `<a href="https://wa.me/55${telLimpo}?text=${msgProf}" target="_blank" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs transition-colors" aria-label="Contatar modelo no WhatsApp">
                                     <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WhatsApp
                                   </a>`
                                : `<span class="text-slate-400 text-xs">Sem telefone</span>`;

                            return `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="px-5 py-3.5">
                                    <div class="font-bold text-slate-800 text-xs">${escapeHTML(ag.usuarios ? ag.usuarios.nome : 'N/D')}</div>
                                </td>
                                <td class="px-5 py-3.5 text-xs text-slate-500">${escapeHTML(ag.usuarios ? ag.usuarios.email : 'N/D')}</td>
                                <td class="px-5 py-3.5">${linkZap}</td>                                    
                                <td class="px-5 py-3.5 text-right">${acoesHTML}</td>
                            </tr>
                            `;
                        }).join('');

                        tabelaModelos = `
                            <div class="overflow-x-auto rounded-2xl border border-slate-200">
                                <table class="w-full text-left text-xs">
                                    <thead class="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                                        <tr>
                                            <th class="px-5 py-3">Modelo Voluntário</th>
                                            <th class="px-5 py-3">E-mail</th>
                                            <th class="px-5 py-3">Contato Rápido</th>
                                            <th class="px-5 py-3 text-right">Frequência / Status</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 bg-white">${linhas}</tbody>
                                </table>
                            </div>`;
                    }

                    horariosHTML += `
                        <div class="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-xl bg-blue-50 text-senac-blue flex items-center justify-center">
                                        <i data-lucide="calendar" class="w-4 h-4"></i>
                                    </div>
                                    <div>
                                        <span class="font-extrabold text-sm text-slate-900 capitalize">${dataFormatada}</span>
                                        <span class="text-xs text-slate-500 block font-medium">Horário: ${horaFormatada}</span>
                                    </div>
                                </div>
                                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                    Ocupação: ${disp.vagas_ocupadas} / ${disp.vagas_totais} vagas
                                </span>
                            </div>
                            ${tabelaModelos}
                        </div>
                    `;
                });
            }

            const cursoCard = document.createElement('div');
            cursoCard.className = 'bg-slate-100/60 p-6 rounded-3xl border border-slate-200 space-y-4';
            cursoCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-senac-blue text-white flex items-center justify-center font-black">
                            <i data-lucide="book-open" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="font-extrabold text-base text-slate-900">${escapeHTML(curso.nome)}</h3>
                            <p class="text-xs text-slate-500 font-medium">📍 ${escapeHTML(curso.localizacao || 'Laboratório Senac')}</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    ${horariosHTML || '<div class="p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">Sem horários abertos para este curso.</div>'}
                </div>
            `;

            accordion.appendChild(cursoCard);
        });

        if (window.lucide) lucide.createIcons();

    } catch (error) {
        accordion.innerHTML = '<div class="p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-semibold text-center">Erro ao carregar a pauta de presenças.</div>';
    }
}

// 3. Confirmar Presença (Concluir Serviço)
async function concluirServico(agendamentoId) {
    if (!confirm("O modelo compareceu e o serviço foi realizado com sucesso?")) return;

    try {
        const response = await fetch(`${API_URL}/profissional/agendamentos/${agendamentoId}/concluir`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showToast('Presença confirmada! O modelo já pode avaliar o atendimento.', 'success');
            carregarMinhasTurmas();
        } else {
            const data = await response.json();
            showToast(data.erro || 'Erro ao confirmar presença.', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão com o servidor.', 'error');
    }
}

// 4. Cancelar Aluno / Falta
async function cancelarAluno(agendamentoId, nome) {
    if (!confirm(`Deseja marcar falta / cancelar o agendamento de ${nome}? A vaga será reaberta no sistema.`)) return;

    try {
        const response = await fetch(`${API_URL}/profissional/agendamentos/${agendamentoId}/cancelar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showToast('Inscrição cancelada. Vaga liberada.', 'success');
            carregarMinhasTurmas();
        } else {
            const data = await response.json();
            showToast(data.erro || 'Erro ao cancelar inscrição.', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão com o servidor.', 'error');
    }
}

// Inicialização
carregarMinhasTurmas();
