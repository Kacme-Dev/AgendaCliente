// Chave para armazenar o array de todos os clientes no LocalStorage
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

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa instâncias
    clientDataModalInstance = new bootstrap.Modal(document.getElementById('client-data-modal'));
    summaryModalInstance = new bootstrap.Modal(document.getElementById('summary-modal'));
    tasksModalInstance = new bootstrap.Modal(document.getElementById('tasks-modal'));
    messageModalInstance = new bootstrap.Modal(document.getElementById('message-modal'));
    globalTasksModalInstance = new bootstrap.Modal(document.getElementById('global-tasks-modal'));

    loadAllClients();
    setupEventListeners();
    showClientListSidebar();
    updateOverdueAlert();
});

// --- Utilidades ---

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function getCurrentTimeString() {
    const now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

// Função para formatar data de YYYY-MM-DD para DD/MM/YYYY
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

function isTaskOverdue(tarefa) {
    if (tarefa.concluida || !tarefa.due_date) return false;
    const today = getTodayDateString();
    const now = getCurrentTimeString();
    if (tarefa.due_date < today) return true;
    if (tarefa.due_date === today && now > (tarefa.hora_tarefa || '23:59')) return true;
    return false;
}

function showMessage(title, body, type = 'info', confirmCallback = null) {
    const modalTitle = document.getElementById('messageModalLabel');
    const modalBody = document.getElementById('messageModalBody');
    const modalFooter = document.getElementById('messageModalFooter');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = `<div class="alert alert-${type}">${body}</div>`;
    modalFooter.innerHTML = '';
    
    if (confirmCallback) {
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Sim';
        confirmBtn.className = 'btn btn-cobmais-success';
        confirmBtn.onclick = () => { confirmCallback(); messageModalInstance.hide(); };
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Não';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.setAttribute('data-bs-dismiss', 'modal');
        modalFooter.appendChild(cancelBtn);
        modalFooter.appendChild(confirmBtn);
    } else {
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Fechar';
        closeBtn.className = 'btn btn-secondary';
        closeBtn.setAttribute('data-bs-dismiss', 'modal');
        modalFooter.appendChild(closeBtn);
    }
    messageModalInstance.show();
}

// --- Persistência e Sidebar ---

function loadAllClients() {
    clients = JSON.parse(localStorage.getItem(CLIENTS_ARRAY_KEY) || '[]');
}

function saveAllClients() {
    localStorage.setItem(CLIENTS_ARRAY_KEY, JSON.stringify(clients));
    showClientListSidebar();
    updateOverdueAlert();
    // Se houver um cliente carregado, atualiza o contador dele
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
    const sorted = [...clients].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true}));
    sorted.forEach(client => {
        const div = document.createElement('div');
        div.className = 'client-list-item';
        div.innerHTML = `
            <div class="cursor-pointer" onclick="loadClientDataByCode('${client.codigo}')">
                <strong>${client.codigo}</strong> - ${client['nome-cliente']}
            </div>
        `;
        listOutput.appendChild(div);
    });
}

// --- Funções de Dados ---

function loadClientDataByCode(code) {
    const client = clients.find(c => c.codigo === code);
    if (client) loadClientData(client);
}

function loadClientData(client) {
    currentClientCode = client.codigo;
    document.getElementById('current-client-info').textContent = `Cliente Carregado: ${client.codigo} - ${client['nome-cliente']}`;
    document.getElementById('prazo-container').classList.remove('d-none');
    
    const form = document.getElementById('client-data-form');
    form.querySelectorAll('input').forEach(el => {
        if (client[el.id] !== undefined) el.value = client[el.id];
    });
    
    document.getElementById('plano-acao').value = client['plano-acao'] || '';
    document.getElementById('modal3-add-btn').disabled = false;
    updateCountdown(client['data-inicio']);
}

function clearFormData(isNew = false) {
    currentClientCode = null;
    document.getElementById('client-data-form').reset();
    document.getElementById('search-input').value = '';
    document.getElementById('plano-acao').value = '';
    document.getElementById('current-client-info').textContent = isNew ? 'Pronto para novo cadastro.' : 'Nenhum cliente carregado.';
    document.getElementById('prazo-container').classList.add('d-none');
}

function saveOrUpdateClient() {
    const code = document.getElementById('codigo').value.trim();
    const name = document.getElementById('nome-cliente').value.trim();
    if (!code || !name) return showMessage("Erro", "Código e Nome são obrigatórios.", 'danger');
    
    let idx = clients.findIndex(c => c.codigo === code);
    let data = idx !== -1 ? {...clients[idx]} : {...EMPTY_CLIENT_DATA, tarefas: []};
    
    document.querySelectorAll('#client-data-form input').forEach(el => { if(el.id) data[el.id] = el.value; });
    data['plano-acao'] = document.getElementById('plano-acao').value;
    
    if (idx !== -1) clients[idx] = data;
    else clients.push(data);
    
    saveAllClients();
    loadClientData(data);
    showMessage("Sucesso", "Dados salvos com sucesso!", "success");
    clientDataModalInstance.hide();
    return true;
}

// IMPLEMENTAÇÃO: Excluir cliente por completo
function deleteCurrentClient() {
    if (!currentClientCode) return;
    
    const action = () => {
        clients = clients.filter(c => c.codigo !== currentClientCode);
        saveAllClients();
        clearFormData();
        clientDataModalInstance.hide();
        showMessage("Excluído", "Cliente removido com sucesso.", "success");
    };

    showMessage("Confirmação", "Tem certeza que deseja excluir permanentemente este cliente e todas as suas tarefas?", "danger", action);
}

// --- Tarefas ---

function addTarefa() {
    const desc = document.getElementById('nova-tarefa-input').value.trim();
    const due = document.getElementById('tarefa-due-date-input').value;
    const time = document.getElementById('hora-tarefa-input').value;
    const cDate = document.getElementById('tarefa-create-date').value;
    const cTime = document.getElementById('tarefa-create-time').value;

    if (!desc) return showMessage("Erro", "Descrição é obrigatória.", "danger");

    const client = clients.find(c => c.codigo === currentClientCode);
    if (client) {
        client.tarefas.push({
            descricao: desc, concluida: false, due_date: due, hora_tarefa: time,
            created_date: cDate, created_time: cTime
        });
        saveAllClients();
        document.getElementById('nova-tarefa-input').value = '';
        tasksModalInstance.hide();
        showMessage("Sucesso", "Tarefa adicionada!", "success");
    }
}

// IMPLEMENTAÇÃO: Mostrar tarefas abaixo do container de busca (fixo)
function showFixedGlobalTasks(filterType) {
    const container = document.getElementById('fixed-tasks-container');
    const output = document.getElementById('fixed-tasks-output');
    const title = document.getElementById('fixed-tasks-title');
    
    output.innerHTML = '';
    const today = getTodayDateString();
    let tasksToShow = [];

    clients.forEach(c => {
        c.tarefas.forEach((t, i) => {
            const task = {...t, index: i, clientCode: c.codigo, clientName: c['nome-cliente']};
            if (filterType === 'report' && t.due_date === today) tasksToShow.push(task);
            else if (!t.concluida) {
                if (filterType === 'overdue' && isTaskOverdue(t)) tasksToShow.push(task);
                else if (filterType === 'today' && t.due_date === today && !isTaskOverdue(t)) tasksToShow.push(task);
                else if (filterType === 'future' && t.due_date > today) tasksToShow.push(task);
            }
        });
    });

    // Mapeamento de nomes amigáveis para o título
    const titles = { 'report': 'Relatório Diário', 'today': 'Tarefas de Hoje', 'overdue': 'Tarefas Atrasadas', 'future': 'Tarefas Futuras' };
    title.textContent = titles[filterType] || 'Tarefas';

    if (tasksToShow.length === 0) {
        output.innerHTML = '<div class="alert alert-info">Nenhuma tarefa encontrada para este filtro.</div>';
    } else {
        tasksToShow.forEach(t => {
            const div = document.createElement('div');
            div.className = `p-3 mb-2 border rounded ${t.concluida ? 'completed-task' : (isTaskOverdue(t) ? 'overdue-task' : 'bg-white')}`;
            div.innerHTML = `
                <div class="mb-2">
                    <span style="background-color: #FFFF00; font-weight: bold; padding: 2px 5px; border-radius: 3px;">
                        ${t.clientCode} - ${t.clientName}
                    </span>
                </div>
                <div class="d-flex justify-content-between">
                    <div>${t.descricao}</div>
                    <div class="small">${formatDateToBR(t.due_date)} ${t.hora_tarefa || ''}</div>
                </div>
                ${!t.concluida ? `<button class="btn btn-sm btn-success mt-2" onclick="concludeTaskInline('${t.clientCode}', ${t.index}, '${filterType}')">Concluir</button>` : ''}
            `;
            output.appendChild(div);
        });
    }

    container.classList.remove('d-none');
    // Scroll suave até o container
    container.scrollIntoView({ behavior: 'smooth' });
}

function hideFixedTasks() {
    document.getElementById('fixed-tasks-container').classList.add('d-none');
}

// Função de conclusão específica para a lista inline para atualizar a visão
function concludeTaskInline(code, idx, filterType) {
    const client = clients.find(c => c.codigo === code);
    const action = () => {
        client.tarefas[idx].concluida = true;
        saveAllClients();
        showFixedGlobalTasks(filterType); // Atualiza a lista fixa
        showMessage("Sucesso", "Tarefa concluída!", "success");
    };
    showMessage("Confirmação", "Deseja marcar como concluída?", "info", action);
}

// Mantido para busca por data e cliques nos cards (Filtro específico do cliente via Modal)
function showGlobalTasks(filterType, specificDate = null, specificClientCode = null) {
    const output = document.getElementById('global-tasks-output');
    const title = document.getElementById('globalTasksModalLabel');
    output.innerHTML = '';
    const today = getTodayDateString();
    let tasksToShow = [];

    const clientsToSearch = specificClientCode 
        ? clients.filter(c => c.codigo === specificClientCode) 
        : clients;

    clientsToSearch.forEach(c => {
        c.tarefas.forEach((t, i) => {
            const task = {...t, index: i, clientCode: c.codigo, clientName: c['nome-cliente']};
            if (specificDate) { if (t.due_date === specificDate) tasksToShow.push(task); }
            else if (filterType === 'report' && t.due_date === today) tasksToShow.push(task);
            else if (!t.concluida) {
                if (filterType === 'overdue' && isTaskOverdue(t)) tasksToShow.push(task);
                else if (filterType === 'today' && t.due_date === today && !isTaskOverdue(t)) tasksToShow.push(task);
                else if (filterType === 'future' && t.due_date > today) tasksToShow.push(task);
            }
        });
    });

    title.textContent = specificDate ? `Tarefas em ${formatDateToBR(specificDate)}` : `Filtro: ${filterType}`;
    if (tasksToShow.length === 0) output.innerHTML = '<div class="alert alert-info">Nenhuma tarefa encontrada.</div>';
    else {
        tasksToShow.forEach(t => {
            const div = document.createElement('div');
            div.className = `p-3 mb-2 border rounded ${t.concluida ? 'completed-task' : (isTaskOverdue(t) ? 'overdue-task' : 'bg-white')}`;
            div.innerHTML = `
                <div class="mb-2">
                    <span style="background-color: #FFFF00; font-weight: bold; padding: 2px 5px; border-radius: 3px;">
                        ${t.clientCode} - ${t.clientName}
                    </span>
                </div>
                <div class="d-flex justify-content-between">
                    <div>${t.descricao}</div>
                    <div class="small">${formatDateToBR(t.due_date)} ${t.hora_tarefa || ''}</div>
                </div>
                ${!t.concluida ? `<button class="btn btn-sm btn-success mt-2" onclick="concludeTask('${t.clientCode}', ${t.index})">Concluir</button>` : ''}
            `;
            output.appendChild(div);
        });
    }
    globalTasksModalInstance.show();
}

function concludeTask(code, idx) {
    const client = clients.find(c => c.codigo === code);
    const action = () => {
        client.tarefas[idx].concluida = true;
        saveAllClients();
        globalTasksModalInstance.hide();
        showMessage("Sucesso", "Tarefa concluída!", "success");
    };
    showMessage("Confirmação", "Deseja marcar como concluída?", "info", action);
}

// --- UI Contadores ---

function updateCountdown(dataStr) {
    const span = document.querySelector('#countdown-message span');
    const overdueEl = document.getElementById('count-overdue');
    const todayEl = document.getElementById('count-today');
    const futureEl = document.getElementById('count-future');

    if (!dataStr) return;
    const target = new Date(dataStr);
    target.setDate(target.getDate() + 30);
    const diff = Math.ceil((target - new Date().setHours(0,0,0,0)) / 86400000);

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
    clients.forEach(c => count += c.tarefas.filter(t => !t.concluida && isTaskOverdue(t)).length);
    const badge = document.getElementById('overdue-count');
    if(badge) badge.textContent = count;
}

// --- Event Listeners ---

function setupEventListeners() {
    // Validação do botão de busca direta
    document.getElementById('search-btn-direct').onclick = () => {
        const query = document.getElementById('search-input').value.trim();
        if (!query) return showMessage("Atenção", "Digite o código ou o nome do cliente desejado", "info");

        const found = clients.find(c => c.codigo === query || c['nome-cliente'].toLowerCase().includes(query.toLowerCase()));
        if (found) loadClientData(found);
        else {
            showMessage("Não encontrado", "Cliente não existe. Deseja cadastrar?", "warning", () => {
                clearFormData(true);
                clientDataModalInstance.show();
            });
        }
    };

    // Cliques nos cards de contagem (Filtro específico do cliente)
    const counters = document.querySelectorAll('#client-task-counters .col-md-4 > div');
    if(counters.length > 0) {
        counters[0].onclick = () => { if(currentClientCode) showGlobalTasks('overdue', null, currentClientCode); };
        counters[1].onclick = () => { if(currentClientCode) showGlobalTasks('today', null, currentClientCode); };
        counters[2].onclick = () => { if(currentClientCode) showGlobalTasks('future', null, currentClientCode); };
    }

    document.getElementById('btn-resumo-status').onclick = () => { if(currentClientCode) summaryModalInstance.show(); };
    
    document.getElementById('btn-tarefa-status').onclick = () => {
        if(currentClientCode) {
            document.getElementById('tarefa-due-date-input').value = '';
            document.getElementById('hora-tarefa-input').value = '';
            tasksModalInstance.show();
        }
    };

    document.getElementById('btn-edit-status').onclick = () => { if(currentClientCode) clientDataModalInstance.show(); };

    document.getElementById('reset-client-btn').onclick = () => clearFormData();
    document.getElementById('new-client-btn').onclick = () => { clearFormData(true); clientDataModalInstance.show(); };
    document.getElementById('modal1-back-btn').onclick = () => { clientDataModalInstance.hide(); };
    document.getElementById('modal1-save-btn').onclick = () => saveOrUpdateClient();
    document.getElementById('modal1-delete-btn').onclick = () => deleteCurrentClient(); // Implementado
    document.getElementById('modal2-save-btn').onclick = () => { if(saveOrUpdateClient()) summaryModalInstance.hide(); };
    document.getElementById('modal3-add-btn').onclick = () => addTarefa();

    // IMPLEMENTAÇÃO: Botões de Relatório Global (Exibição fixa)
    document.getElementById('show-report-btn').onclick = () => showFixedGlobalTasks('report');
    document.getElementById('show-today-tasks-btn').onclick = () => showFixedGlobalTasks('today');
    document.getElementById('show-overdue-tasks-btn').onclick = () => showFixedGlobalTasks('overdue');
    document.getElementById('show-future-tasks-btn').onclick = () => showFixedGlobalTasks('future');

    document.getElementById('search-date-btn').onclick = () => {
        const d = document.getElementById('search-date-input').value;
        if (d) showGlobalTasks(null, d);
    };

    document.getElementById('tasks-modal').addEventListener('show.bs.modal', () => {
        document.getElementById('tarefa-create-date').value = getTodayDateString();
        document.getElementById('tarefa-create-time').value = getCurrentTimeString();
    });
}