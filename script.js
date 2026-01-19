/**
 * ========================================
 * SISTEMA DE GESTÃO DE CLIENTES E TAREFAS
 * ========================================
 * Desenvolvido para gerenciar cards de clientes com tarefas associadas
 * Utiliza LocalStorage para persistência de dados
 * Bootstrap 5.3.3 para interface responsiva
 */

// ========================================
// CONSTANTES E VARIÁVEIS GLOBAIS
// ========================================

const CLIENTS_ARRAY_KEY = 'allClientCards';

const EMPTY_CLIENT_DATA = {
    'data-inicio': '',
    'codigo': '',
    'nome-cliente': '',
    'nome-contato': '',
    'email': '',
    'telefone-01': '',
    'plano-acao': '',
    tarefas: []
};

let clients = [];
let currentClientCode = null;

// Instâncias dos Modais do Bootstrap
let clientDataModalInstance;
let summaryModalInstance;
let tasksModalInstance;
let messageModalInstance;
let globalTasksModalInstance;

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    clientDataModalInstance = new bootstrap.Modal(document.getElementById('client-data-modal'));
    summaryModalInstance = new bootstrap.Modal(document.getElementById('summary-modal'));
    tasksModalInstance = new bootstrap.Modal(document.getElementById('tasks-modal'));
    messageModalInstance = new bootstrap.Modal(document.getElementById('message-modal'));
    globalTasksModalInstance = new bootstrap.Modal(document.getElementById('global-tasks-modal'));

    loadAllClients();
    setupEventListeners();
    showClientListSidebar();
    updateOverdueAlert();
    updateGlobalStats();
    initTheme();
    initCharacterCounter();
});

// ========================================
// FUNÇÕES UTILITÁRIAS
// ========================================

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function getCurrentTimeString() {
    const now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

function formatDateToBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function closeModal(modalId) {
    const instance = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (instance) instance.hide();
}

/**
 * Fecha todos os modais abertos antes de abrir um novo
 */
function hideAllModals() {
    const modals = ['client-data-modal', 'summary-modal', 'tasks-modal', 'global-tasks-modal', 'message-modal'];
    modals.forEach(id => {
        const el = document.getElementById(id);
        const instance = bootstrap.Modal.getInstance(el);
        if (instance) instance.hide();
    });
}

function isTaskOverdue(tarefa) {
    if (tarefa.concluida || !tarefa.due_date) return false;
    const today = getTodayDateString();
    const now = getCurrentTimeString();
    if (tarefa.due_date < today) return true;
    if (tarefa.due_date === today && tarefa.hora_tarefa && now > tarefa.hora_tarefa) return true;
    return false;
}

function showMessage(title, body, type = 'info', confirmCallback = null) {
    const modalTitle = document.getElementById('messageModalLabel');
    const modalBody = document.getElementById('message-modal-text');
    const modalFooter = document.querySelector('#message-modal .modal-footer');
    
    modalTitle.textContent = title;
    modalBody.textContent = body;
    
    const modalContent = document.querySelector('#message-modal .modal-content');
    modalContent.className = 'modal-content';
    if (type === 'danger') modalContent.classList.add('border-danger');
    else if (type === 'success') modalContent.classList.add('border-success');
    else if (type === 'warning') modalContent.classList.add('border-warning');
    
    modalFooter.innerHTML = '';
    if (confirmCallback) {
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.setAttribute('data-bs-dismiss', 'modal');
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirmar';
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.onclick = () => { confirmCallback(); messageModalInstance.hide(); };
        modalFooter.appendChild(cancelBtn);
        modalFooter.appendChild(confirmBtn);
    } else {
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'OK';
        closeBtn.className = 'btn btn-secondary';
        closeBtn.setAttribute('data-bs-dismiss', 'modal');
        modalFooter.appendChild(closeBtn);
    }
    messageModalInstance.show();
}

// ========================================
// PERSISTÊNCIA E SIDEBAR
// ========================================

function loadAllClients() {
    const stored = localStorage.getItem(CLIENTS_ARRAY_KEY);
    clients = stored ? JSON.parse(stored) : [];
}

function saveAllClients() {
    localStorage.setItem(CLIENTS_ARRAY_KEY, JSON.stringify(clients));
    showClientListSidebar();
    updateOverdueAlert();
    updateGlobalStats();
    if (currentClientCode) {
        const client = clients.find(c => c.codigo === currentClientCode);
        if (client) updateCountdown(client['data-inicio']);
    }
}

function showClientListSidebar() {
    const listOutput = document.getElementById('client-list-output');
    listOutput.innerHTML = '';
    if (clients.length === 0) {
        listOutput.innerHTML = '<p class="alert alert-info small">Nenhum cliente cadastrado.</p>';
        return;
    }
    const sorted = [...clients].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
    sorted.forEach(client => {
        const div = document.createElement('div');
        div.className = 'client-list-item';
        div.innerHTML = `<div onclick="loadClientDataByCode('${client.codigo}')"><strong>${client.codigo}</strong> - ${client['nome-cliente']}</div>`;
        listOutput.appendChild(div);
    });
}

// ========================================
// FUNÇÕES DE GERENCIAMENTO DE CLIENTES
// ========================================

function loadClientDataByCode(code) {
    const client = clients.find(c => c.codigo === code);
    if (client) loadClientData(client);
}

function loadClientData(client) {
    currentClientCode = client.codigo;
    document.getElementById('current-client-info').textContent = `Cliente Carregado: ${client.codigo} - ${client['nome-cliente']}`;
    document.getElementById('prazo-container').classList.remove('d-none');
    const form = document.getElementById('client-data-form');
    form.querySelectorAll('input').forEach(el => { if (client[el.id] !== undefined) el.value = client[el.id]; });
    document.getElementById('plano-acao').value = client['plano-acao'] || '';
    updateCountdown(client['data-inicio']);
    document.getElementById('prazo-container').scrollIntoView({ behavior: 'smooth' });
}

function clearFormData(isNew = false) {
    currentClientCode = null;
    document.getElementById('client-data-form').reset();
    document.getElementById('search-input').value = '';
    document.getElementById('plano-acao').value = '';
    document.getElementById('current-client-info').textContent = isNew ? 'Pronto para novo cadastro.' : 'Nenhum cliente carregado.';
    document.getElementById('prazo-container').classList.add('d-none');
    hideFixedTasks();
}

function saveOrUpdateClient() {
    const code = document.getElementById('codigo').value.trim();
    const name = document.getElementById('nome-cliente').value.trim();
    const dataInicio = document.getElementById('data-inicio').value;
    if (!code || !name) { showMessage("Erro", "Código e Nome são obrigatórios.", 'danger'); return false; }
    if (!dataInicio) { showMessage("Erro", "Data de Início é obrigatória.", 'danger'); return false; }
    let idx = clients.findIndex(c => c.codigo === code);
    let data = idx !== -1 ? { ...clients[idx] } : { ...EMPTY_CLIENT_DATA, tarefas: [] };
    document.querySelectorAll('#client-data-form input').forEach(el => { if (el.id) data[el.id] = el.value; });
    data['plano-acao'] = document.getElementById('plano-acao').value;
    if (idx !== -1) clients[idx] = data; else clients.push(data);
    saveAllClients();
    loadClientData(data);
    showMessage("Sucesso", "Dados salvos com sucesso!", "success");
    clientDataModalInstance.hide();
    return true;
}

function deleteCurrentClient() {
    if (!currentClientCode) return;
    const action = () => {
        clients = clients.filter(c => c.codigo !== currentClientCode);
        saveAllClients();
        clearFormData();
        clientDataModalInstance.hide();
        showMessage("Excluído", "Cliente e suas tarefas removidos com sucesso.", "success");
    };
    showMessage("Confirmação", "Deseja excluir permanentemente este cliente e todas as suas tarefas?", "danger", action);
}

// ========================================
// FUNÇÕES DE GERENCIAMENTO DE TAREFAS
// ========================================

function saveTarefa() {
    const desc = document.getElementById('nova-tarefa-input').value.trim();
    const due = document.getElementById('tarefa-due-date-input').value;
    const time = document.getElementById('hora-tarefa-input').value;
    const cDate = document.getElementById('tarefa-create-date').value;
    const cTime = document.getElementById('tarefa-create-time').value;
    const editIdx = document.getElementById('edit-task-index').value;
    const targetCode = document.getElementById('edit-task-client-code').value || currentClientCode;
    if (!desc) { showMessage("Erro", "Descrição é obrigatória.", "danger"); return; }
    if (!due) { showMessage("Erro", "Data de vencimento é obrigatória.", "danger"); return; }
    const client = clients.find(c => c.codigo === targetCode);
    if (!client) { showMessage("Erro", "Cliente não encontrado.", "danger"); return; }
    const taskData = { descricao: desc, concluida: false, due_date: due, hora_tarefa: time, created_date: cDate, created_time: cTime };
    if (editIdx !== "") { taskData.concluida = client.tarefas[editIdx].concluida; client.tarefas[editIdx] = taskData; }
    else { client.tarefas.push(taskData); }
    saveAllClients();
    tasksModalInstance.hide();
    const container = document.getElementById('fixed-tasks-container');
    if (!container.classList.contains('d-none')) {
        const currentFilter = document.getElementById('fixed-tasks-title').getAttribute('data-current-filter');
        showFixedGlobalTasks(currentFilter);
    }
    showMessage("Sucesso", "Tarefa salva com sucesso!", "success");
}

function editTaskInline(clientCode, taskIndex) {
    const client = clients.find(c => c.codigo === clientCode);
    if (!client || !client.tarefas[taskIndex]) return;
    const t = client.tarefas[taskIndex];
    hideAllModals();
    document.getElementById('tasksModalLabel').innerHTML = '<i class="bi bi-pencil-square"></i> Editar Tarefa';
    document.getElementById('nova-tarefa-input').value = t.descricao;
    document.getElementById('tarefa-due-date-input').value = t.due_date;
    document.getElementById('hora-tarefa-input').value = t.hora_tarefa || '';
    document.getElementById('tarefa-create-date').value = t.created_date;
    document.getElementById('tarefa-create-time').value = t.created_time;
    document.getElementById('edit-task-index').value = taskIndex;
    document.getElementById('edit-task-client-code').value = clientCode;
    tasksModalInstance.show();
}

function showFixedGlobalTasks(filterType) {
    globalTasksModalInstance.hide();
    const container = document.getElementById('fixed-tasks-container');
    const output = document.getElementById('fixed-tasks-output');
    const titleEl = document.getElementById('fixed-tasks-title');
    output.innerHTML = '';
    const today = getTodayDateString();
    let tasksToShow = [];
    clients.forEach(c => {
        c.tarefas.forEach((t, i) => {
            const task = { ...t, index: i, clientCode: c.codigo, clientName: c['nome-cliente'] };
            if (filterType === 'report') {
                if (t.concluida && t.due_date === today) tasksToShow.push(task);
            } else if (!t.concluida) {
                if (filterType === 'overdue' && isTaskOverdue(t)) tasksToShow.push(task);
                else if (filterType === 'today' && t.due_date === today && !isTaskOverdue(t)) tasksToShow.push(task);
                else if (filterType === 'future' && t.due_date > today) tasksToShow.push(task);
            }
        });
    });
    const titles = { 'report': '<i class="bi bi-file-earmark-check"></i> Relatório Diário (Concluídas Hoje)', 'today': '<i class="bi bi-bell"></i> Tarefas de Hoje', 'overdue': '<i class="bi bi-exclamation-triangle"></i> Tarefas Atrasadas', 'future': '<i class="bi bi-calendar-event"></i> Tarefas Futuras' };
    titleEl.innerHTML = titles[filterType] || 'Tarefas';
    titleEl.setAttribute('data-current-filter', filterType);
    if (tasksToShow.length === 0) { output.innerHTML = '<div class="alert alert-info">Nenhuma tarefa encontrada para este filtro.</div>'; }
    else {
        tasksToShow.sort((a, b) => { if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date); return (a.hora_tarefa || '').localeCompare(b.hora_tarefa || ''); });
        tasksToShow.forEach(t => {
            const div = document.createElement('div');
            const statusClass = t.concluida ? 'completed-task' : (isTaskOverdue(t) ? 'overdue-task' : 'bg-body-tertiary');
            div.className = `p-3 mb-2 border rounded task-card ${statusClass}`;
            div.innerHTML = `<div class="d-flex justify-content-between align-items-start mb-2"><span class="badge text-dark bg-warning">${t.clientCode} - ${t.clientName}</span><button class="btn btn-sm btn-outline-primary" onclick="editTaskInline('${t.clientCode}', ${t.index})"><i class="bi bi-pencil"></i> Editar</button></div><div class="d-flex justify-content-between align-items-center mb-2"><div class="flex-grow-1">${t.descricao}</div><div class="small fw-bold ms-2">${formatDateToBR(t.due_date)} ${t.hora_tarefa || ''}</div></div>${!t.concluida ? `<button class="btn btn-sm btn-success mt-2" onclick="concludeTaskInline('${t.clientCode}', ${t.index}, '${filterType}')"><i class="bi bi-check-circle"></i> Concluir</button>` : ''}`;
            output.appendChild(div);
        });
    }
    container.classList.remove('d-none');
    container.scrollIntoView({ behavior: 'smooth' });
}

function hideFixedTasks() { document.getElementById('fixed-tasks-container').classList.add('d-none'); }

function concludeTaskInline(code, idx, filterType) {
    const client = clients.find(c => c.codigo === code);
    const action = () => { client.tarefas[idx].concluida = true; saveAllClients(); showFixedGlobalTasks(filterType); showMessage("Sucesso", "Tarefa concluída!", "success"); };
    showMessage("Confirmação", "Marcar esta tarefa como concluída?", "info", action);
}

function showGlobalTasks(filterType, specificDate = null, specificClientCode = null) {
    const output = document.getElementById('global-tasks-output');
    const title = document.getElementById('globalTasksModalLabel');
    output.innerHTML = '';
    const today = getTodayDateString();
    let tasksToShow = [];
    const clientsToSearch = specificClientCode ? clients.filter(c => c.codigo === specificClientCode) : clients;
    
    clientsToSearch.forEach(c => {
        c.tarefas.forEach((t, i) => {
            const task = { ...t, index: i, clientCode: c.codigo, clientName: c['nome-cliente'] };
            
            // Filtro por data específica (Busca por Data)
            if (specificDate && !filterType) {
                if (t.due_date === specificDate) tasksToShow.push(task);
                return;
            }

            // Filtros das Estatísticas
            if (filterType === 'all') {
                if (!specificDate || t.due_date === specificDate) tasksToShow.push(task);
            } else if (filterType === 'completed') {
                if (t.concluida && (!specificDate || t.due_date === specificDate)) tasksToShow.push(task);
            } else if (filterType === 'pending') {
                if (!t.concluida && t.due_date <= today && (!specificDate || t.due_date === specificDate)) tasksToShow.push(task);
            } else if (filterType === 'future') {
                if (!t.concluida && t.due_date > today && (!specificDate || t.due_date === specificDate)) tasksToShow.push(task);
            }
            // Filtros Globais (Report, Today, Overdue)
            else if (filterType === 'report' && t.due_date === today && t.concluida) tasksToShow.push(task);
            else if (!t.concluida) {
                if (filterType === 'overdue' && isTaskOverdue(t)) tasksToShow.push(task);
                else if (filterType === 'today' && t.due_date === today && !isTaskOverdue(t)) tasksToShow.push(task);
                else if (filterType === 'future_global' && t.due_date > today) tasksToShow.push(task);
            }
        });
    });

    const filterTitles = { 'all': 'Todas as Tarefas', 'completed': 'Tarefas Concluídas', 'pending': 'Tarefas Pendentes', 'future': 'Tarefas Futuras' };
    title.innerHTML = specificDate 
        ? `<i class="bi bi-calendar-range"></i> ${filterTitles[filterType] || 'Tarefas'} em ${formatDateToBR(specificDate)}` 
        : `<i class="bi bi-filter"></i> ${filterTitles[filterType] || 'Filtro: ' + filterType}`;
    
    if (tasksToShow.length === 0) output.innerHTML = '<div class="alert alert-info">Nenhuma tarefa encontrada.</div>';
    else {
        tasksToShow.sort((a, b) => { if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date); return (a.hora_tarefa || '').localeCompare(b.hora_tarefa || ''); });
        tasksToShow.forEach(t => {
            const div = document.createElement('div');
            const statusClass = t.concluida ? 'completed-task' : (isTaskOverdue(t) ? 'overdue-task' : 'bg-body-tertiary');
            div.className = `p-3 mb-2 border rounded ${statusClass}`;
            div.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2"><span class="badge text-dark bg-warning">${t.clientCode} - ${t.clientName}</span><button class="btn btn-sm btn-outline-primary" onclick="editTaskInline('${t.clientCode}', ${t.index})"><i class="bi bi-pencil"></i> Editar</button></div><div class="d-flex justify-content-between mb-2"><div class="flex-grow-1">${t.descricao}</div><div class="small ms-2">${formatDateToBR(t.due_date)} ${t.hora_tarefa || ''}</div></div>${!t.concluida ? `<button class="btn btn-sm btn-success mt-2" onclick="concludeTask('${t.clientCode}', ${t.index})"><i class="bi bi-check-circle"></i> Concluir</button>` : ''}`;
            output.appendChild(div);
        });
    }
    hideAllModals();
    globalTasksModalInstance.show();
}

function concludeTask(code, idx) {
    const client = clients.find(c => c.codigo === code);
    const action = () => { client.tarefas[idx].concluida = true; saveAllClients(); globalTasksModalInstance.hide(); showMessage("Sucesso", "Tarefa concluída!", "success"); };
    showMessage("Confirmação", "Marcar esta tarefa como concluída?", "info", action);
}

// ========================================
// CONTADORES E ESTATÍSTICAS
// ========================================

function updateCountdown(dataStr) {
    const span = document.querySelector('#countdown-message span');
    const overdueEl = document.getElementById('count-overdue');
    const todayEl = document.getElementById('count-today');
    const futureEl = document.getElementById('count-future');
    if (!dataStr) return;
    const target = new Date(dataStr);
    target.setDate(target.getDate() + 30);
    const diff = Math.ceil((target - new Date().setHours(0, 0, 0, 0)) / 86400000);
    span.textContent = diff >= 0 ? `${diff} dias restantes.` : `Atrasado em ${Math.abs(diff)} dias.`;
    span.className = diff < 5 ? 'text-danger fw-bold' : 'text-success fw-bold';
    const client = clients.find(c => c.codigo === currentClientCode);
    if (!client) return;
    const tasks = client.tarefas || [];
    const tStr = getTodayDateString();
    overdueEl.textContent = tasks.filter(t => !t.concluida && isTaskOverdue(t)).length;
    todayEl.textContent = tasks.filter(t => !t.concluida && t.due_date === tStr && !isTaskOverdue(t)).length;
    futureEl.textContent = tasks.filter(t => !t.concluida && t.due_date > tStr).length;
}

function updateOverdueAlert() {
    let count = 0;
    clients.forEach(c => { count += c.tarefas.filter(t => !t.concluida && isTaskOverdue(t)).length; });
    const badge = document.getElementById('overdue-count');
    if (badge) badge.textContent = count;
}

function updateGlobalStats(filterDate = null) {
    let total = 0, completed = 0, pending = 0, future = 0;
    const today = getTodayDateString();
    clients.forEach(c => {
        c.tarefas.forEach(t => {
            if (filterDate && t.due_date !== filterDate) return;
            total++;
            if (t.concluida) completed++;
            else { if (t.due_date > today) future++; else pending++; }
        });
    });
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-future').textContent = future;
}

function toggleStatsSection() {
    const container = document.getElementById('stats-container');
    container.classList.toggle('d-none');
    if (!container.classList.contains('d-none')) {
        updateGlobalStats();
        container.scrollIntoView({ behavior: 'smooth' });
    }
}

// ========================================
// TEMA E UI
// ========================================

function initTheme() {
    const getStoredTheme = () => localStorage.getItem('theme');
    const setStoredTheme = theme => localStorage.setItem('theme', theme);
    const getPreferredTheme = () => { const storedTheme = getStoredTheme(); if (storedTheme) return storedTheme; return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; };
    const setTheme = theme => { if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) { document.documentElement.setAttribute('data-bs-theme', 'dark'); } else { document.documentElement.setAttribute('data-bs-theme', theme); } };
    setTheme(getPreferredTheme());
    document.querySelectorAll('[data-bs-theme-value]').forEach(toggle => { toggle.addEventListener('click', () => { const theme = toggle.getAttribute('data-bs-theme-value'); setStoredTheme(theme); setTheme(theme); }); });
}

function initCharacterCounter() {
    const textarea = document.getElementById('plano-acao');
    const counter = document.getElementById('plano-acao-counter');
    if (textarea && counter) { textarea.addEventListener('input', () => { const remaining = 2000 - textarea.value.length; counter.textContent = remaining; if (remaining < 100) counter.classList.add('text-danger'); else counter.classList.remove('text-danger'); }); }
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    document.getElementById('search-btn-direct').onclick = () => {
        const query = document.getElementById('search-input').value.trim();
        if (!query) { showMessage("Atenção", "Digite o código ou o nome do cliente desejado", "info"); return; }
        const found = clients.find(c => c.codigo === query || c['nome-cliente'].toLowerCase().includes(query.toLowerCase()));
        if (found) loadClientData(found); else showMessage("Não encontrado", "Cliente não existe. Deseja cadastrar?", "warning", () => { clearFormData(true); hideAllModals(); clientDataModalInstance.show(); });
    };
    document.getElementById('search-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('search-btn-direct').click(); });
    const counters = document.querySelectorAll('#client-task-counters .col-md-4');
    if (counters.length > 0) { counters[0].onclick = () => { if (currentClientCode) showGlobalTasks('overdue', null, currentClientCode); }; counters[1].onclick = () => { if (currentClientCode) showGlobalTasks('today', null, currentClientCode); }; counters[2].onclick = () => { if (currentClientCode) showGlobalTasks('future', null, currentClientCode); }; }
    document.getElementById('btn-resumo-status').onclick = () => { if (currentClientCode) { hideAllModals(); summaryModalInstance.show(); } };
    document.getElementById('btn-tarefa-status').onclick = () => {
        if (currentClientCode) {
            document.getElementById('edit-task-index').value = "";
            document.getElementById('edit-task-client-code').value = "";
            document.getElementById('tasksModalLabel').innerHTML = '<i class="bi bi-list-task"></i> Cadastrar Nova Tarefa';
            document.getElementById('nova-tarefa-input').value = '';
            document.getElementById('tarefa-due-date-input').value = '';
            document.getElementById('hora-tarefa-input').value = '';
            document.getElementById('tarefa-create-date').value = getTodayDateString();
            document.getElementById('tarefa-create-time').value = getCurrentTimeString();
            hideAllModals();
            tasksModalInstance.show();
        }
    };
    document.getElementById('btn-edit-status').onclick = () => { if (currentClientCode) { hideAllModals(); clientDataModalInstance.show(); } };
    document.getElementById('reset-client-btn').onclick = () => clearFormData();
    document.getElementById('new-client-btn').onclick = () => { clearFormData(true); hideAllModals(); clientDataModalInstance.show(); };
    document.getElementById('modal1-back-btn').onclick = () => clientDataModalInstance.hide();
    document.getElementById('modal1-save-btn').onclick = () => saveOrUpdateClient();
    document.getElementById('modal1-delete-btn').onclick = () => deleteCurrentClient();
    document.getElementById('modal2-save-btn').onclick = () => { if (saveOrUpdateClient()) summaryModalInstance.hide(); };
    document.getElementById('modal3-save-btn').onclick = () => saveTarefa();
    document.getElementById('show-report-btn').onclick = () => showFixedGlobalTasks('report');
    document.getElementById('show-today-tasks-btn').onclick = () => showFixedGlobalTasks('today');
    document.getElementById('show-overdue-tasks-btn').onclick = () => showFixedGlobalTasks('overdue');
    document.getElementById('show-future-tasks-btn').onclick = () => showFixedGlobalTasks('future');
    document.getElementById('toggle-stats-btn').onclick = () => toggleStatsSection();
    document.getElementById('search-date-btn').onclick = () => { const d = document.getElementById('search-date-input').value; if (d) showGlobalTasks(null, d); else showMessage("Atenção", "Selecione uma data para buscar tarefas.", "info"); };
    document.getElementById('btn-filter-stats').onclick = () => { const date = document.getElementById('stats-date-input').value; if (date) updateGlobalStats(date); else showMessage("Atenção", "Selecione uma data para filtrar as estatísticas.", "info"); };
    document.getElementById('btn-reset-stats').onclick = () => { document.getElementById('stats-date-input').value = ''; updateGlobalStats(); };
}