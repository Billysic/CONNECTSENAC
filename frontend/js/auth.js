// frontend/js/auth.js - Modern Auth Handler

const FALLBACK_BASE_URL = 'http://localhost:3000/api/usuarios';
const API_URL = window.location.protocol === 'file:' ? FALLBACK_BASE_URL : `${window.location.origin}/api/usuarios`;

// Toast Notification Utility
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

// 1. Lógica de Login
const formLogin = document.getElementById('formLogin');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;
        const msgErro = document.getElementById('mensagemErro');
        const btnSubmit = document.getElementById('btnSubmitLogin');

        if (msgErro) msgErro.classList.add('hidden');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<span class="animate-spin mr-2">⏳</span> Validando...`;
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                showToast('Login realizado com sucesso!', 'success');

                const perfil = data.utilizador.perfil;
                setTimeout(() => {
                    if (perfil === 'admin' || perfil === 'coordenador') {
                        window.location.href = 'admin.html';
                    } else if (perfil === 'profissional') {
                        window.location.href = 'profissional.html';
                    } else {
                        window.location.href = 'painel.html';
                    }
                }, 800);
            } else {
                if (msgErro) {
                    msgErro.textContent = data.erro || 'Falha no login. Verifique suas credenciais.';
                    msgErro.classList.remove('hidden');
                }
                showToast(data.erro || 'Erro ao autenticar.', 'error');
            }
        } catch (error) {
            if (msgErro) {
                msgErro.textContent = 'Erro de conexão com o servidor.';
                msgErro.classList.remove('hidden');
            }
            showToast('Erro de conexão.', 'error');
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<span>Entrar na Plataforma</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
                if (window.lucide) lucide.createIcons();
            }
        }
    });
}

// 2. Lógica de Cadastro
const formCadastro = document.getElementById('formCadastro');
if (formCadastro) {
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefone = document.getElementById('telefone').value.trim();
        const senha = document.getElementById('senha').value;
        const confirmar_senha = document.getElementById('confirmar_senha').value;
        const consentimento_termos = document.getElementById('termoUso').checked ? 1 : 0;
        const consentimento_imagem = document.getElementById('termoImagem').checked ? 1 : 0;
        const msgDiv = document.getElementById('mensagemCadastro');

        if (senha !== confirmar_senha) {
            if (msgDiv) {
                msgDiv.innerHTML = `<div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">As palavras-passe não coincidem.</div>`;
            }
            return;
        }

        try {
            const response = await fetch(`${API_URL}/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome, email, telefone, senha, confirmar_senha, consentimento_termos, consentimento_imagem
                })
            });

            const data = await response.json();

            if (response.ok) {
                if (msgDiv) {
                    msgDiv.innerHTML = `<div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">Conta criada com sucesso! Redirecionando...</div>`;
                }
                showToast('Conta criada com sucesso!', 'success');
                setTimeout(() => window.location.href = 'index.html', 1800);
            } else {
                if (msgDiv) {
                    msgDiv.innerHTML = `<div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">${data.erro}</div>`;
                }
                showToast(data.erro || 'Erro ao realizar cadastro.', 'error');
            }
        } catch (error) {
            if (msgDiv) {
                msgDiv.innerHTML = `<div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">Erro de conexão com o servidor.</div>`;
            }
        }
    });
}

// 3. Lógica de Solicitar Recuperação de Senha
const formEsqueci = document.getElementById('formEsqueci');
if (formEsqueci) {
    formEsqueci.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgRecuperacao');
        const email = document.getElementById('emailRecuperacao').value.trim();

        if (msgDiv) msgDiv.innerHTML = '<div class="p-3 rounded-xl bg-blue-50 text-blue-700 font-semibold">A processar...</div>';

        try {
            const response = await fetch(`${API_URL}/esqueci-senha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (msgDiv) {
                msgDiv.innerHTML = `<div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">${data.mensagem}</div>`;
            }
            showToast('Instruções enviadas para seu e-mail.', 'success');
        } catch (error) {
            if (msgDiv) {
                msgDiv.innerHTML = '<div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">Erro de conexão.</div>';
            }
        }
    });
}

// 4. Lógica de Redefinir Senha
const formRedefinir = document.getElementById('formRedefinir');
if (formRedefinir) {
    formRedefinir.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('msgRedefinir');
        const nova_senha = document.getElementById('novaSenha').value;
        const confirmar_senha = document.getElementById('confirmarNovaSenha').value;

        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
            if (msgDiv) msgDiv.innerHTML = '<div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">Link de recuperação inválido (Token ausente).</div>';
            return;
        }

        if (nova_senha !== confirmar_senha) {
            if (msgDiv) msgDiv.innerHTML = '<div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">As palavras-passe não coincidem.</div>';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/redefinir-senha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, nova_senha, confirmar_senha })
            });

            const data = await response.json();

            if (response.ok) {
                if (msgDiv) {
                    msgDiv.innerHTML = `<div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">${data.mensagem} Redirecionando...</div>`;
                }
                showToast('Palavra-passe alterada com sucesso!', 'success');
                setTimeout(() => window.location.href = 'index.html', 2500);
            } else {
                if (msgDiv) {
                    msgDiv.innerHTML = `<div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">${data.erro}</div>`;
                }
            }
        } catch (error) {
            if (msgDiv) {
                msgDiv.innerHTML = '<div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">Erro de conexão.</div>';
            }
        }
    });
}