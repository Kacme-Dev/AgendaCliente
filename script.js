// Chave para armazenar o array de todos os clientes no LocalStorage
const CLIENTS_ARRAY_KEY = 'allClientCards';

let clients = []; 
let currentClientId = null; 
let clientTarefas = []; 

document.addEventListener('DOMContentLoaded', () => {
    loadAllClients(); 
    setupEventListeners();
    clearFormData(); 
});

// --- Utilidade ---

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isTaskOverdue(tarefa) {
    if (tarefa.concluida || !tarefa.due_date) {
        return false;
    }
    return tarefa.due_date < getTodayDateString(); 
}

// --- Persistência de Dados ---

function loadAllClients() {
    clients = JSON.parse(localStorage.getItem(CLIENTS_ARRAY_KEY) || '[]');
}

function saveAllClients() {
    localStorage.setItem(CLIENTS_ARRAY_KEY, JSON.stringify(clients));
}

// --- Cliente CRUD: Busca (READ) ---

function searchClient(query) {
    const q = query.toLowerCase().trim();
    if (!q) return null;

    let foundClient = clients.find(client => client.codigo.toLowerCase() === q);
    if (foundClient) {
        return foundClient;
    }
    
    foundClient = clients.find(client => 
        client['nome-cliente'].toLowerCase().includes(q)
    );

    return foundClient;
}

function loadClientData(client) {
    currentClientId = client.codigo;
    document.getElementById('current-client-id').value = client.codigo;
    document.getElementById('current-client-info').textContent = `Cliente Carregado: ${client.codigo} - ${client['nome-cliente']}`;
    
    const form = document.getElementById('client-form');
    form.querySelectorAll('input, textarea').forEach(element => {
        const key = element.id;
        if (client[key] !== undefined) { 
            element.value = client[key];
        } else {
            element.value = '';
        }
    });

    document.querySelectorAll('input[name="plano"]').forEach(checkbox => {
        checkbox.checked = client.planos && client.planos.includes(checkbox.value);
    });

    loadTarefas(client.tarefas || []); 

    updateCountdown(client['data-inicio']);
}

/** Limpa a tela e o estado atual (Botões Limpar/Novo Cliente) */
function clearFormData() {
    currentClientId = null;
    clientTarefas = []; 

    document.getElementById('current-client-id').value = '';
    document.getElementById('current-client-info').textContent = 'Pronto para Novo Cadastro. Preencha o Código.';

    const form = document.getElementById('client-form');
    form.reset(); 
    
    document.getElementById('search-input').value = '';

    renderTarefas(); 
    updateCountdown(''); 
}


// --- Salvar/Atualizar Dados ---

function saveOrUpdateClient() {
    const clientData = {};
    const form = document.getElementById('client-form');
    const codigo = document.getElementById('codigo').value.trim();
    const nomeCliente = document.getElementById('nome-cliente').value.trim();
    
    if (!codigo || !nomeCliente) {
        alert("Os campos 'Código' e 'Nome Cliente' são obrigatórios.");
        return false;
    }
    
    form.querySelectorAll('input, textarea').forEach(element => {
         const key = element.id;
        if (element.type !== 'checkbox' && key) {
            clientData[key] = element.value;
        }
    });

    clientData.planos = Array.from(document.querySelectorAll('input[name="plano"]:checked')).map(cb => cb.value);
    clientData.tarefas = clientTarefas; 
    
    let existingIndex = clients.findIndex(client => client.codigo === codigo);

    if (existingIndex !== -1) {
        clients[existingIndex] = { ...clients[existingIndex], ...clientData };
        alert(`Cliente ${codigo} - ${nomeCliente} atualizado com sucesso!`);
    } else {
        if (clients.some(client => client.codigo === codigo)) {
             alert(`Erro: O código '${codigo}' já está em uso por outro cliente.`);
             return false;
        }
        
        clients.push(clientData);
        alert(`Novo cliente ${codigo} - ${nomeCliente} cadastrado com sucesso!`);
    }
    
    saveAllClients();
    
    currentClientId = codigo; 
    loadClientData(clientData); 
    
    return true;
}

function deleteCurrentClient() {
    if (!currentClientId) {
        alert("Nenhum cliente carregado para exclusão.");
        return;
    }

    const client = clients.find(c => c.codigo === currentClientId);
    if (!client) return;

    const confirmation = confirm(`Tem certeza que deseja EXCLUIR o cadastro do cliente: ${client['nome-cliente']} (${currentClientId})? \n\n Esta ação não pode ser desfeita.`);

    if (confirmation) {
        const indexToDelete = clients.findIndex(c => c.codigo === currentClientId);
        
        if (indexToDelete !== -1) {
            clients.splice(indexToDelete, 1);
            saveAllClients();
            clearFormData();
            alert(`Cliente ${currentClientId} excluído com sucesso!`);
        }
    } 
}


// --- Gerenciamento de Ações/Tarefas ---

function loadTarefas(tarefasArray) {
    clientTarefas = tarefasArray;
    renderTarefas();
}

function saveTarefas() {
    if (currentClientId) {
        let client = clients.find(c => c.codigo === currentClientId);
        if (client) {
            client.tarefas = clientTarefas;
            saveAllClients();
        }
    }
}

function renderTarefas() {
    const listContainer = document.getElementById('tarefas-list');
    listContainer.innerHTML = ''; 

    clientTarefas.forEach((tarefa, index) => {
        const itemDiv = document.createElement('div');
        
        let statusClass = '';
        if (tarefa.concluida) {
            statusClass = 'completed-task';
        } else if (isTaskOverdue(tarefa)) {
            statusClass = 'overdue-task';
        }
        itemDiv.className = statusClass;
        
        const timeText = tarefa.hora_tarefa ? ` às ${tarefa.hora_tarefa}` : ''; 
        const prazoText = tarefa.due_date ? 
            `<span style="font-weight: normal; margin-left: 10px;">Prazo: ${new Date(tarefa.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}${timeText}</span>` : '';

        let statusDisplay = '';
        if (tarefa.concluida) {
            statusDisplay = ' (CONCLUÍDO/ARQUIVADO)';
        } else if (isTaskOverdue(tarefa)) {
            statusDisplay = ' (!!! EM ATRASO)';
        } else {
            statusDisplay = ' (A FAZER)';
        }


        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = tarefa.concluida;
        checkbox.addEventListener('change', () => {
            toggleTarefa(index);
            saveTarefas(); 
        });

        const label = document.createElement('span');
        label.innerHTML = `${tarefa.descricao} <strong style="font-size: 0.9em;">${statusDisplay}</strong> ${prazoText}`;
        label.className = 'task-label';

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X';
        deleteBtn.className = 'delete-task-btn';
        deleteBtn.addEventListener('click', () => {
            deleteTarefa(index);
            saveTarefas(); 
        });

        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(label);
        itemDiv.appendChild(deleteBtn);
        listContainer.appendChild(itemDiv);
    });
}

function addTarefa() {
    const input = document.getElementById('nova-tarefa');
    const timeInput = document.getElementById('hora-tarefa'); 
    const dateInput = document.getElementById('tarefa-due-date');
    const descricao = input.value.trim();
    const dueDate = dateInput.value; 
    const dueTime = timeInput.value; 

    if (!currentClientId) {
        alert("Você deve carregar ou cadastrar um cliente antes de adicionar tarefas.");
        return;
    }

    if (descricao) {
        clientTarefas.push({ 
            descricao, 
            concluida: false,
            due_date: dueDate,
            hora_tarefa: dueTime 
        });
        input.value = '';
        timeInput.value = ''; 
        dateInput.value = ''; 
        saveTarefas(); 
        renderTarefas();
    }
}

function toggleTarefa(index) {
    if (clientTarefas[index]) {
        clientTarefas[index].concluida = !clientTarefas[index].concluida;
    }
    renderTarefas();
}

function deleteTarefa(index) {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
        clientTarefas.splice(index, 1);
        renderTarefas(); 
    }
}

// --- Lógica de Lembretes Diários ---

function showDailyReminders() {
    const today = getTodayDateString();
    const remindersList = document.getElementById('reminders-list-output');
    remindersList.innerHTML = '';
    let hasReminders = false;

    clients.forEach(client => {
        if (client.tarefas && client.tarefas.length > 0) {
            const pendingOrOverdueTasks = client.tarefas.filter(t => 
                !t.concluida && (t.due_date === today || isTaskOverdue(t))
            );

            if (pendingOrOverdueTasks.length > 0) {
                hasReminders = true;
                const clientDiv = document.createElement('div');
                clientDiv.innerHTML = `
                    <strong>Cliente: ${client.codigo} - ${client['nome-cliente']}</strong>
                    <ul>
                        ${pendingOrOverdueTasks.map(t => {
                            const status = isTaskOverdue(t) ? ' (EM ATRASO)' : ' (HOJE)';
                            const prazo = t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Sem Prazo';
                            const hora = t.hora_tarefa ? ` às ${t.hora_tarefa}` : ''; 
                            return `<li>${t.descricao} <span style="color: #dc3545;">${status}</span> - Prazo: ${prazo}${hora}</li>`;
                        }).join('')}
                    </ul>
                `;
                remindersList.appendChild(clientDiv);
            }
        }
    });

    if (!hasReminders) {
        remindersList.innerHTML = '<p style="color: #888;">Nenhuma ação de trabalho pendente com prazo para hoje ou em atraso.</p>';
    }

    document.getElementById('reminder-modal').style.display = 'block';
}

// --- Contador Regressivo (Item 6) ---

function updateCountdown(dataInicioStr) {
    const countdownMessage = document.getElementById('countdown-message').querySelector('span');

    if (!dataInicioStr) {
        countdownMessage.textContent = "Data de Início não informada.";
        document.getElementById('data-inicio').value = ''; 
        return;
    }

    const dataInicio = new Date(dataInicioStr);
    
    const prazoTotalDias = 30; 
    const dataAlvo = new Date(dataInicio.getTime());
    dataAlvo.setDate(dataAlvo.getDate() + prazoTotalDias);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); 
    dataAlvo.setHours(0, 0, 0, 0);

    const diffTime = dataAlvo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays > 0) {
        countdownMessage.textContent = `${diffDays} dias restantes para o prazo final (${new Date(dataAlvo).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}).`;
    } else if (diffDays === 0) {
        countdownMessage.textContent = "Prazo final é hoje! (0 dias restantes).";
    } else {
        countdownMessage.textContent = `Prazo EXCEDIDO em ${Math.abs(diffDays)} dias.`;
    }
}

// --- Lógica do Modal de Lista e Resumo de Tarefas ---

function showClientListModal() {
    const modal = document.getElementById('client-list-modal');
    const listOutput = document.getElementById('client-list-output');
    listOutput.innerHTML = ''; 

    if (clients.length === 0) {
        listOutput.innerHTML = '<p>Nenhum cliente cadastrado ainda.</p>';
    } else {
        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';

        clients.forEach(client => {
            const li = document.createElement('li');
            li.className = 'client-list-item';
            li.dataset.clientId = client.codigo;
            li.textContent = `${client.codigo} - ${client['nome-cliente']}`;
            
            li.addEventListener('click', () => showTaskSummary(client.codigo));
            
            ul.appendChild(li);
        });
        listOutput.appendChild(ul);
    }
    modal.style.display = 'block';
}

/** Exibe o modal de resumo de TODAS as tarefas (Atrasadas, A Fazer e Concluídas). */
function showTaskSummary(codigo) {
    const client = clients.find(c => c.codigo === codigo);
    if (!client) return;

    const summaryModal = document.getElementById('task-summary-modal');
    const summaryOutput = document.getElementById('summary-tasks-output');
    const summaryTitle = document.getElementById('summary-client-name');
    const loadButton = document.getElementById('load-for-edit-btn');

    summaryTitle.textContent = `Tarefas de ${client['nome-cliente']} (${client.codigo})`;
    summaryOutput.innerHTML = '';
    
    // Configura o botão "Carregar para Edição"
    loadButton.onclick = () => {
        loadClientData(client); // Carrega os dados no formulário
        summaryModal.style.display = 'none'; // Fecha o modal
    };
    
    const allTasks = client.tarefas || [];
    
    // 1. FILTRAGEM
    const overdueTasks = allTasks.filter(t => isTaskOverdue(t));
    const pendingTasks = allTasks.filter(t => !t.concluida && !isTaskOverdue(t));
    const completedTasks = allTasks.filter(t => t.concluida);

    // 2. MONTAGEM DO CONTEÚDO HTML
    let htmlContent = '';
    
    // A. ATRASADAS
    if (overdueTasks.length > 0) {
        htmlContent += `<h3>❌ ATRASADAS (${overdueTasks.length})</h3>`;
        htmlContent += `<ul style="color: #dc3545; list-style-type: none;">`;
        overdueTasks.forEach(t => {
            const prazo = t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Sem Prazo';
            htmlContent += `<li style="margin-bottom: 5px;">• ${t.descricao} (Prazo: ${prazo})</li>`;
        });
        htmlContent += `</ul>`;
    }

    // B. A FAZER (PENDENTES)
    if (pendingTasks.length > 0) {
        htmlContent += `<h3>⚠️ A FAZER (${pendingTasks.length})</h3>`;
        htmlContent += `<ul style="list-style-type: none;">`;
        pendingTasks.forEach(t => {
            const prazo = t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Sem Prazo';
            const hora = t.hora_tarefa ? ` às ${t.hora_tarefa}` : '';
            htmlContent += `<li style="margin-bottom: 5px;">• ${t.descricao} (Prazo: ${prazo}${hora})</li>`;
        });
        htmlContent += `</ul>`;
    }
    
    // C. CONCLUÍDAS
    if (completedTasks.length > 0) {
        htmlContent += `<h3>✅ CONCLUÍDAS/ARQUIVADAS (${completedTasks.length})</h3>`;
        htmlContent += `<ul style="color: #28a745; opacity: 0.8; list-style-type: none;">`;
        completedTasks.forEach(t => {
            const prazo = t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'S/P';
            htmlContent += `<li style="margin-bottom: 5px;">• ${t.descricao} (Prazo Original: ${prazo})</li>`;
        });
        htmlContent += `</ul>`;
    }
    
    if (allTasks.length === 0) {
        htmlContent = '<p>Nenhuma tarefa cadastrada para este cliente.</p>';
    }

    summaryOutput.innerHTML = htmlContent;

    summaryModal.style.display = 'block';
    document.getElementById('client-list-modal').style.display = 'none'; // Fecha a lista
}


// --- Configuração de Eventos ---

function setupModalListeners() {
    // Vincular fechamento do X com os IDs corretos
    document.querySelector('#reminder-modal .close-btn').onclick = function() {
        document.getElementById('reminder-modal').style.display = 'none';
    }
    document.getElementById('list-close-btn').onclick = function() {
        document.getElementById('client-list-modal').style.display = 'none';
    }
    document.getElementById('summary-close-btn').onclick = function() {
        document.getElementById('task-summary-modal').style.display = 'none';
    }
    
    // Fechamento genérico ao clicar fora
    window.onclick = function(event) {
        if (event.target == document.getElementById('reminder-modal')) {
            document.getElementById('reminder-modal').style.display = 'none';
        }
        if (event.target == document.getElementById('client-list-modal')) {
            document.getElementById('client-list-modal').style.display = 'none';
        }
        if (event.target == document.getElementById('task-summary-modal')) {
            document.getElementById('task-summary-modal').style.display = 'none';
        }
    }
}

/** NOVO: Lógica da Busca Direta */
function handleDirectSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value;
    const foundClient = searchClient(query);

    if (foundClient) {
        loadClientData(foundClient);
        document.getElementById('codigo').value = foundClient.codigo;
        searchInput.value = ''; 
    } else {
        alert(`Cliente não encontrado para a busca: "${query}". Limpando formulário para novo cadastro.`);
        clearFormData();
    }
}


function setupEventListeners() {
    setupModalListeners();
    
    // 1. Salvar dados (Botão Salvar Dados)
    document.getElementById('client-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveOrUpdateClient();
    });

    // 2. Buscar Cliente (Botão Buscar/Lista)
    document.getElementById('search-btn-list').addEventListener('click', showClientListModal); 

    // 3. NOVO EVENTO: Botão Buscar Cliente (Busca Direta)
    document.getElementById('search-btn-direct').addEventListener('click', handleDirectSearch);

    // 4. Busca Rápida por Input (ENTER no campo)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleDirectSearch(); 
            }
        });
    }

    // 5. Botões de Ação Principal (Novo Cliente, Limpar, Excluir)
    document.getElementById('new-client-btn').addEventListener('click', clearFormData);
    document.getElementById('reset-client-btn').addEventListener('click', clearFormData);
    document.getElementById('delete-btn').addEventListener('click', deleteCurrentClient);

    // 6. Botões de Navegação do Modal de Lista de Clientes
    document.getElementById('clear-list-selection-btn').addEventListener('click', () => {
        document.getElementById('client-list-modal').style.display = 'none';
        clearFormData(); 
    });
    
    document.getElementById('back-to-main-btn').addEventListener('click', () => {
        document.getElementById('client-list-modal').style.display = 'none';
    });
    
    // 7. Botão Sair do Modal de Resumo de Tarefas
    document.getElementById('exit-task-summary-btn').addEventListener('click', () => {
        document.getElementById('task-summary-modal').style.display = 'none';
        showClientListModal(); 
    });

    // 8. Ações/Tarefas (Adicionar)
    document.getElementById('add-tarefa-btn').addEventListener('click', addTarefa);

    document.getElementById('nova-tarefa').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTarefa();
        }
    });
    
    // 9. Mostrar Lembretes Diários
    document.getElementById('show-reminders-btn').addEventListener('click', showDailyReminders);
}