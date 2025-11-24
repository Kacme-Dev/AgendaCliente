// Chave para armazenar o array de todos os clientes no LocalStorage
const CLIENTS_ARRAY_KEY = 'allClientCards'; // Define a chave constante usada para salvar/carregar dados no LocalStorage

let clients = []; // Inicializa um array para armazenar todos os objetos de cliente carregados (estado global)
let currentClientId = null; // Variável para rastrear o ID do cliente atualmente carregado no formulário
let clientTarefas = []; // Array que armazena a lista de tarefas do cliente atualmente carregado

// Instâncias dos Modais do Bootstrap (necessário para manipulação)
let reminderModalInstance; // Variável que armazenará a instância do modal de Lembretes/Relatórios
let clientListModalInstance; // Variável que armazenará a instância do modal de Lista de Clientes
let taskSummaryModalInstance; // Variável que armazenará a instância do modal de Resumo de Tarefas
let taskEditModalInstance; // Variável que armazenará a instância do Modal de Edição Rápida de Tarefa

// Executado quando a página carrega completamente
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa as instâncias dos Modais do Bootstrap (para controle via JS)
    reminderModalInstance = new bootstrap.Modal(document.getElementById('reminder-modal')); // Cria a instância do modal de lembretes
    clientListModalInstance = new bootstrap.Modal(document.getElementById('client-list-modal')); // Cria a instância do modal de lista de clientes
    taskSummaryModalInstance = new bootstrap.Modal(document.getElementById('task-summary-modal')); // Cria a instância do modal de resumo de tarefas
    taskEditModalInstance = new bootstrap.Modal(document.getElementById('task-edit-modal')); // Cria a instância do modal de edição rápida

    loadAllClients(); // 2. Chama a função para carregar todos os dados dos clientes do LocalStorage
    setupEventListeners(); // 3. Chama a função para configurar todos os listeners de eventos (cliques, submits, etc.)
    clearFormData(); // 4. Chama a função para limpar o formulário e resetar o estado inicial da tela
    requestNotificationPermission(); // 5. Chama a função para solicitar permissão de notificações nativas
});

// --- Utilidade ---

// Retorna a data de hoje no formato 'YYYY-MM-DD'
function getTodayDateString() {
    const now = new Date(); // Cria um novo objeto Date com a data e hora atuais
    const year = now.getFullYear(); // Obtém o ano (AAAA)
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Obtém o mês (0-11), adiciona 1 e formata para 2 dígitos (MM)
    const day = String(now.getDate()).padStart(2, '0'); // Obtém o dia e formata para 2 dígitos (DD)
    return `${year}-${month}-${day}`; // Retorna a string no formato AAAA-MM-DD
}

// Retorna a hora atual no formato 'HH:MM'
function getCurrentTimeString() {
    const now = new Date(); // Cria um novo objeto Date com a data e hora atuais
    const hours = String(now.getHours()).padStart(2, '0'); // Obtém a hora e formata para 2 dígitos (HH)
    const minutes = String(now.getMinutes()).padStart(2, '0'); // Obtém os minutos e formata para 2 dígitos (MM)
    return `${hours}:${minutes}`; // Retorna a string no formato HH:MM
}

/**
 * @function isTaskOverdue
 * Verifica se uma tarefa está em atraso (Overdue), considerando data E hora.
 * * Nova lógica:
 * 1. Tarefas concluídas nunca estão em atraso.
 * 2. Tarefas com data anterior a hoje estão sempre em atraso (independente da hora).
 * 3. Tarefas para hoje estão em atraso SE a hora atual > hora_tarefa.
 */
function isTaskOverdue(tarefa) {
    if (tarefa.concluida || !tarefa.due_date) {
        return false; // Retorna falso se a tarefa estiver concluída ou não tiver prazo definido
    }

    const todayDate = getTodayDateString(); // Obtém a data de hoje formatada
    const taskDate = tarefa.due_date; // Obtém a data de vencimento da tarefa
    const taskTime = tarefa.hora_tarefa; // Obtém a hora de vencimento da tarefa
    const currentTime = getCurrentTimeString(); // Obtém a hora atual formatada

    // 1. Lógica para dias anteriores (ATRASADA, ignorando a hora)
    if (taskDate < todayDate) {
        return true; // Se a data da tarefa for anterior à data de hoje, está atrasada
    }

    // 2. Lógica para o dia de hoje
    if (taskDate === todayDate) {
        // Se for hoje e não tem hora estipulada, não está em atraso (ainda é HOJE)
        if (!taskTime) {
            return false;
        }
        // Se for hoje e a hora atual já passou da hora da tarefa
        if (currentTime > taskTime) {
            return true; // Está atrasada se o tempo atual for maior que o tempo de vencimento
        }
    }
    
    return false; // Retorna falso se a tarefa for para o futuro ou o horário de hoje ainda não passou
}

// --- Persistência de Dados ---

// Carrega o array de clientes do LocalStorage
function loadAllClients() {
    // Tenta obter o JSON do LocalStorage, ou usa um array vazio se não houver nada
    clients = JSON.parse(localStorage.getItem(CLIENTS_ARRAY_KEY) || '[]');
}

// Salva o array de clientes no LocalStorage
function saveAllClients() {
    // Converte o array 'clients' para string JSON e salva no LocalStorage
    localStorage.setItem(CLIENTS_ARRAY_KEY, JSON.stringify(clients));
}

// --- Cliente CRUD: Busca (READ) ---

// Busca um cliente por código exato ou nome parcial
function searchClient(query) {
    const q = query.toLowerCase().trim(); // Normaliza a string de busca (minúsculas e sem espaços extras)
    if (!q) return null; // Retorna nulo se a busca estiver vazia

    // Busca por código exato
    let foundClient = clients.find(client => client.codigo.toLowerCase() === q);
    if (foundClient) {
        return foundClient; // Retorna o cliente se o código exato for encontrado
    }
    
    // Se não encontrou por código, busca por nome parcial
    foundClient = clients.find(client => 
        client['nome-cliente'].toLowerCase().includes(q) // Verifica se o nome do cliente inclui a string de busca
    );

    return foundClient; // Retorna o cliente encontrado por nome parcial (ou null se nada for encontrado)
}

// Carrega os dados de um cliente no formulário principal
function loadClientData(client) {
    currentClientId = client.codigo; // Define o ID do cliente atualmente carregado
    document.getElementById('current-client-id').value = client.codigo; // Preenche o campo oculto com o código
    document.getElementById('current-client-info').textContent = `Cliente Carregado: ${client.codigo} - ${client['nome-cliente']}`; // Atualiza a mensagem de status
    
    const form = document.getElementById('client-form'); // Obtém o formulário principal
    // Preenche todos os campos do formulário
    form.querySelectorAll('input, textarea').forEach(element => {
        const key = element.id; // Usa o ID do elemento como chave no objeto cliente
        if (client[key] !== undefined) { 
            element.value = client[key]; // Preenche o valor se a chave existir no objeto cliente
        } else {
            element.value = ''; // Limpa o campo se a chave não existir
        }
    });

    loadTarefas(client.tarefas || []); // Carrega a lista de tarefas do cliente (usa array vazio se não houver tarefas)

    updateCountdown(client['data-inicio']); // Atualiza o contador regressivo com a data de início do cliente
}

/** Limpa a tela e o estado atual (Botões Limpar/Novo Cliente) */
function clearFormData() {
    currentClientId = null; // Reseta o ID do cliente atual
    clientTarefas = []; // Limpa a lista de tarefas do estado atual

    document.getElementById('current-client-id').value = ''; // Limpa o campo oculto
    document.getElementById('current-client-info').textContent = 'Pronto para Novo Cadastro. Preencha o Código.'; // Reseta a mensagem de status

    const form = document.getElementById('client-form'); // Obtém o formulário
    form.reset(); // Limpa todos os campos do formulário (reset nativo)
    
    document.getElementById('search-input').value = ''; // Limpa o campo de busca

    renderTarefas(); // Limpa a lista de tarefas na tela (renderizando um array vazio)
    updateCountdown(''); // Reseta o contador regressivo (passa string vazia)
}


// --- Salvar/Atualizar Dados ---

// Salva ou atualiza os dados do cliente no array e LocalStorage
function saveOrUpdateClient() {
    const clientData = {}; // Objeto que armazenará os dados do formulário
    const form = document.getElementById('client-form');
    const codigo = document.getElementById('codigo').value.trim(); // Obtém o código (chave)
    const nomeCliente = document.getElementById('nome-cliente').value.trim(); // Obtém o nome
    
    if (!codigo || !nomeCliente) {
        alert("Os campos 'Código' e 'Nome Cliente' são obrigatórios."); // Validação de campos obrigatórios
        return false;
    }
    
    // Coleta todos os dados do formulário
    form.querySelectorAll('input, textarea').forEach(element => {
         const key = element.id;
        if (element.type !== 'checkbox' && key) { // Ignora checkboxes e elementos sem ID
            clientData[key] = element.value; // Coleta o valor
        }
    });

    // Salva as tarefas ativas no objeto do cliente
    clientData.tarefas = clientTarefas; 
    
    let existingIndex = clients.findIndex(client => client.codigo === codigo); // Busca o índice se o cliente já existe

    if (existingIndex !== -1) {
        // Atualiza cliente existente: mantém dados antigos e sobrescreve com os novos do formulário
        clients[existingIndex] = { ...clients[existingIndex], ...clientData };
        alert(`Cliente ${codigo} - ${nomeCliente} atualizado com sucesso!`);
    } else {
        // Verifica se o código é duplicado (apenas para novos cadastros)
        if (clients.some(client => client.codigo === codigo)) {
             alert(`Erro: O código '${codigo}' já está em uso por outro cliente.`);
             return false;
        }
        
        // Cadastra novo cliente
        clients.push(clientData);
        alert(`Novo cliente ${codigo} - ${nomeCliente} cadastrado com sucesso!`);
    }
    
    saveAllClients(); // Persiste o array atualizado no LocalStorage
    
    currentClientId = codigo; // Atualiza o ID do cliente atual (se for novo ou atualizado)
    loadClientData(clientData); // Recarrega os dados na tela para garantir consistência
    
    return true;
}

// Exclui o cliente atualmente carregado
function deleteCurrentClient() {
    if (!currentClientId) {
        alert("Nenhum cliente carregado para exclusão.");
        return;
    }

    const client = clients.find(c => c.codigo === currentClientId); // Busca o objeto cliente
    if (!client) return; // Sai se não encontrar (segurança)

    const confirmation = confirm(`Tem certeza que deseja EXCLUIR o cadastro do cliente: ${client['nome-cliente']} (${currentClientId})? \n\n Esta ação não pode ser desfeita.`); // Confirmação do usuário

    if (confirmation) {
        const indexToDelete = clients.findIndex(c => c.codigo === currentClientId);
        
        if (indexToDelete !== -1) {
            clients.splice(indexToDelete, 1); // Remove 1 elemento do array no índice encontrado
            saveAllClients(); // Salva o array atualizado
            clearFormData(); // Limpa a tela após a exclusão
            alert(`Cliente ${currentClientId} excluído com sucesso!`);
        }
    } 
}


// --- Gerenciamento de Ações/Tarefas ---

// Carrega as tarefas na variável de estado e renderiza
function loadTarefas(tarefasArray) {
    clientTarefas = tarefasArray; // Atualiza o array de tarefas no estado atual
    renderTarefas(); // Chama a função para desenhar a lista na tela
}

// Salva o array de tarefas na lista do cliente atualmente carregado
function saveTarefas() {
    if (currentClientId) { // Verifica se há um cliente carregado
        let client = clients.find(c => c.codigo === currentClientId);
        if (client) {
            client.tarefas = clientTarefas; // Atualiza a propriedade 'tarefas' do objeto cliente
            saveAllClients(); // Persiste no LocalStorage
        }
    }
}

// Renderiza a lista de tarefas na seção 3
function renderTarefas() {
    const listContainer = document.getElementById('tarefas-list'); // Contêiner onde as tarefas serão exibidas
    listContainer.innerHTML = ''; // Limpa o conteúdo anterior

    clientTarefas.forEach((tarefa, index) => { // Itera sobre cada tarefa
        const itemDiv = document.createElement('div'); // Cria o contêiner DIV para cada item de tarefa
        // Usa classes do Bootstrap para flex e alinhamento
        itemDiv.className = 'd-flex align-items-center justify-content-between mb-1 p-2 border rounded'; 
        
        let statusClass = '';
        if (tarefa.concluida) {
            statusClass = 'completed-task'; // Classe CSS para tarefa concluída
        } else if (isTaskOverdue(tarefa)) {
            statusClass = 'overdue-task'; // Classe CSS para tarefa atrasada
        }
        // Aplica a classe CSS para atraso/conclusão
        itemDiv.classList.add(statusClass);
        
        const timeText = tarefa.hora_tarefa ? ` às ${tarefa.hora_tarefa}` : ''; // Formata a hora se existir
        const prazoText = tarefa.due_date ? 
            `<span class="fw-normal ms-2 text-muted">Prazo: ${new Date(tarefa.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}${timeText}</span>` : ''; // Formata o texto do prazo

        let statusDisplay = '';
        let statusColor = '';
        if (tarefa.concluida) {
            statusDisplay = '(CONCLUÍDO/ARQUIVADO)';
            statusColor = 'text-success';
        } else if (isTaskOverdue(tarefa)) {
            // Se atrasada, usa a mensagem e cor de atraso
            statusDisplay = '(!!! ATRASADA)'; 
            statusColor = 'text-danger';
        } else {
            statusDisplay = '(A FAZER)';
            statusColor = 'text-warning';
        }

        // Checkbox para marcar como concluída (usando form-check do Bootstrap)
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'form-check';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';
        checkbox.checked = tarefa.concluida;
        checkbox.addEventListener('change', () => { // Adiciona listener para marcar/desmarcar
            toggleTarefa(index); // Alterna o status no array
            saveTarefas(); // Salva no LocalStorage
        });
        checkboxContainer.appendChild(checkbox);

        // Label/descrição da tarefa - A mensagem ATRASADA é injetada aqui
        const label = document.createElement('span');
        label.innerHTML = `${tarefa.descricao} <strong class="${statusColor} small">${statusDisplay}</strong> ${prazoText}`; // Constrói o HTML do label
        label.className = 'task-label me-auto'; // Ocupa espaço central
        
        // Botão para excluir a tarefa
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X';
        deleteBtn.className = 'delete-task-btn ms-2'; // Classe customizada para o círculo vermelho
        deleteBtn.addEventListener('click', () => { // Adiciona listener para exclusão
            deleteTarefa(index);
            saveTarefas(); 
        });

        itemDiv.appendChild(checkboxContainer); // Adiciona checkbox
        itemDiv.appendChild(label); // Adiciona label/descrição
        itemDiv.appendChild(deleteBtn); // Adiciona botão de exclusão
        listContainer.appendChild(itemDiv); // Adiciona o item completo ao contêiner
    });
}

// Adiciona uma nova tarefa à lista
function addTarefa() {
    const input = document.getElementById('nova-tarefa'); // Input de descrição
    const timeInput = document.getElementById('hora-tarefa'); // Input de hora
    const dateInput = document.getElementById('tarefa-due-date'); // Input de data
    const descricao = input.value.trim();
    const dueDate = dateInput.value; 
    const dueTime = timeInput.value; 

    if (!currentClientId) {
        alert("Você deve carregar ou cadastrar um cliente antes de adicionar tarefas."); // Validação se o cliente está carregado
        return;
    }

    if (descricao) { // Verifica se a descrição não está vazia
        clientTarefas.push({ // Adiciona a nova tarefa ao array
            descricao, 
            concluida: false,
            due_date: dueDate,
            hora_tarefa: dueTime,
            last_notified: null // Inicializa o campo de controle de notificação
        });
        input.value = ''; // Limpa a descrição
        timeInput.value = ''; // Limpa a hora
        dateInput.value = ''; // Limpa a data
        saveTarefas(); // Salva as tarefas no LocalStorage
        renderTarefas(); // Atualiza a lista na tela
    }
}

// Alterna o status de conclusão de uma tarefa
function toggleTarefa(index) {
    if (clientTarefas[index]) {
        clientTarefas[index].concluida = !clientTarefas[index].concluida; // Inverte o valor booleano
    }
    renderTarefas(); // Recarrega para aplicar o estilo de riscado/concluído
}

// Exclui uma tarefa da lista
function deleteTarefa(index) {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) { // Pede confirmação
        clientTarefas.splice(index, 1); // Remove a tarefa pelo índice
        renderTarefas(); // Atualiza a lista na tela
    }
}

// --- Lógica de Notificações Agendadas ---

// Solicita permissão do usuário para mostrar notificações nativas
function requestNotificationPermission() {
    if (!("Notification" in window)) { // Verifica se a API de Notificação é suportada
        console.log("Este navegador não suporta notificações.");
        return;
    }
    // A notificação nativa do sistema é o recurso que 'se sobrepõe aos aplicativos'
    Notification.requestPermission(); // Solicita a permissão do usuário
}

// Verifica tarefas com horário e data de hoje para disparar notificação
function checkScheduledTasks() {
    if (Notification.permission !== "granted") { // Verifica se a permissão foi concedida
        return; 
    }

    const todayDate = getTodayDateString(); // Obtém a data de hoje
    const currentTime = getCurrentTimeString(); // Obtém o minuto atual
    
    clients.forEach(client => { // Itera sobre todos os clientes
        client.tarefas.forEach(task => { // Itera sobre todas as tarefas de cada cliente
            // Verifica se: não está concluída, é para hoje, o horário coincide com o minuto atual
            if (!task.concluida && task.due_date === todayDate && task.hora_tarefa === currentTime) {
                // Previne notificações duplicadas no mesmo minuto
                if (task.last_notified !== currentTime) { 
                    task.last_notified = currentTime; // Marca a hora da última notificação
                    
                    // Dispara a notificação nativa do sistema (o pop-up sobreposto)
                    new Notification(`⏰ Lembrete de Ação Agendada para Agora!`, {
                        body: `Cliente ${client.codigo}: ${task.descricao}`, // Conteúdo da notificação
                        // icon: 'notification-icon.png' // Ícone opcional
                    });
                    
                    // Salva a marcação no cliente para evitar repetição (até a próxima recarga)
                    saveAllClients(); 
                }
            }
        });
    });
}

// Define um intervalo para checar as tarefas a cada 60 segundos (1 minuto)
setInterval(checkScheduledTasks, 60000); // Executa a verificação a cada 60000 milissegundos (1 minuto)

// --- Lógica de Lembretes Diários (Filtrando Concluídas) ---

/**
 * @function showDailyReminders
 * Mostra o modal de lembretes (tarefas pendentes para hoje ou em atraso).
 * Utiliza a lógica atualizada de isTaskOverdue para definir o status.
 */
function showDailyReminders() {
    const today = getTodayDateString(); // Obtém a data de hoje
    const remindersList = document.getElementById('reminders-list-output'); // Contêiner do modal
    remindersList.innerHTML = ''; // Limpa o conteúdo anterior
    let hasReminders = false; // Flag para verificar se há lembretes

    // Configura o título do modal
    document.getElementById('reminderModalLabel').textContent = 'Lembretes de Ações Pendentes para Hoje';

    clients.forEach(client => { // Itera sobre todos os clientes
        if (client.tarefas && client.tarefas.length > 0) {
            // Filtra APENAS tarefas NÃO CONCLUÍDAS que estão para HOJE ou em dias anteriores (em atraso)
            const pendingOrOverdueTasks = client.tarefas.filter(t => 
                // Considera o dia de hoje OU dias anteriores
                !t.concluida && (t.due_date === today || t.due_date < today)
            );

            if (pendingOrOverdueTasks.length > 0) { // Se houver tarefas pendentes/atrasadas para o dia
                hasReminders = true;
                const clientDiv = document.createElement('div');
                clientDiv.className = 'alert alert-warning p-3'; // Usa classe de alerta do Bootstrap
                clientDiv.innerHTML = `
                    <p class="fw-bold mb-1">Cliente: ${client.codigo} - ${client['nome-cliente']}</p>
                    <ul class="list-unstyled mb-0">
                        ${pendingOrOverdueTasks.map(t => { // Mapeia as tarefas pendentes/atrasadas
                            // Aplica a lógica de atraso atualizada (considerando hora para o dia atual)
                            const isOverdue = isTaskOverdue(t);
                            const status = isOverdue ? ' (!!! ATRASADA)' : ' (HOJE)'; // Define a mensagem de status
                            const statusColor = isOverdue ? 'text-danger' : 'text-primary'; // Define a cor do status
                            const prazo = t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Sem Prazo';
                            const hora = t.hora_tarefa ? ` às ${t.hora_tarefa}` : ''; 
                            // Renderiza o item da lista
                            return `<li>${t.descricao} <span class="${statusColor} small">${status}</span> - Prazo: ${prazo}${hora}</li>`;
                        }).join('')}
                    </ul>
                `;
                remindersList.appendChild(clientDiv);
            }
        }
    });

    if (!hasReminders) {
        remindersList.innerHTML = '<div class="alert alert-success">Nenhuma ação de trabalho pendente com prazo para hoje ou em atraso.</div>'; // Mensagem se não houver lembretes
    }

    // Exibe o modal usando a instância do Bootstrap
    reminderModalInstance.show();
}

// --- Contador Regressivo (Prazo de 30 dias) ---

// Atualiza a mensagem do contador regressivo na seção 4
function updateCountdown(dataInicioStr) {
    const countdownMessage = document.getElementById('countdown-message').querySelector('span'); // Span onde a mensagem é exibida
    const inputDataInicio = document.getElementById('data-inicio');

    if (!dataInicioStr) {
        countdownMessage.textContent = "Data de Início não informada."; // Mensagem padrão
        inputDataInicio.value = ''; 
        countdownMessage.classList.remove('text-danger', 'text-warning', 'text-success'); // Remove classes de cor
        return;
    }

    const dataInicio = new Date(dataInicioStr);
    
    const prazoTotalDias = 30; 
    const dataAlvo = new Date(dataInicio.getTime());
    dataAlvo.setDate(dataAlvo.getDate() + prazoTotalDias); // Calcula a data final (data de conclusão)

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera a hora de hoje para comparação apenas de data
    dataAlvo.setHours(0, 0, 0, 0); // Zera a hora da data alvo

    const diffTime = dataAlvo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Calcula a diferença de dias (arredonda para cima)

    countdownMessage.classList.remove('text-danger', 'text-warning', 'text-success'); // Reseta classes de cor

    // Mensagem explícita do Prazo de Conclusão
    const prazoConclusao = new Date(dataAlvo).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

    if (diffDays > 5) {
        countdownMessage.textContent = `${diffDays} dias restantes. Prazo final de conclusão: ${prazoConclusao}.`;
        countdownMessage.classList.add('text-success'); // Cor verde para prazo tranquilo
    } else if (diffDays > 0) {
        countdownMessage.textContent = `ATENÇÃO: ${diffDays} dias restantes. Prazo final de conclusão: ${prazoConclusao}.`;
        countdownMessage.classList.add('text-warning'); // Cor amarela para atenção
    } else if (diffDays === 0) {
        countdownMessage.textContent = `PRAZO FINAL HOJE! Prazo de conclusão: ${prazoConclusao}.`;
        countdownMessage.classList.add('text-danger'); // Cor vermelha para prazo final
    } else {
        // Implementação da mensagem ATRASADA
        countdownMessage.textContent = `!!! ATRASADO !!! Prazo EXCEDIDO em ${Math.abs(diffDays)} dias. Data de conclusão era: ${prazoConclusao}.`;
        countdownMessage.classList.add('text-danger'); // Cor vermelha para atraso
    }
}

// --- Lógica do Modal de Lista e Resumo de Tarefas ---

// Exibe o modal com a lista de todos os clientes cadastrados
function showClientListModal() {
    const listOutput = document.getElementById('client-list-output');
    listOutput.innerHTML = ''; 

    if (clients.length === 0) {
        listOutput.innerHTML = '<p class="alert alert-info">Nenhum cliente cadastrado ainda.</p>';
    } else {
        const ul = document.createElement('ul');
        ul.className = 'list-group'; // Usa classe de lista do Bootstrap

        clients.forEach(client => {
            const li = document.createElement('li');
            li.className = 'client-list-item list-group-item'; // Estilo de item de lista clicável
            li.dataset.clientId = client.codigo;
            li.textContent = `${client.codigo} - ${client['nome-cliente']}`;
            
            // Ao clicar, chama o resumo de tarefas para o cliente
            li.addEventListener('click', () => showTaskSummary(client.codigo));
            
            ul.appendChild(li);
        });
        listOutput.appendChild(ul);
    }
    // Exibe o modal usando a instância do Bootstrap
    clientListModalInstance.show();
}

/** * Exibe o modal de resumo de TODAS as tarefas.
 * O botão "Carregar para Edição" agora abre o novo modal de edição rápida.
 */
function showTaskSummary(codigo) {
    const client = clients.find(c => c.codigo === codigo);
    if (!client) return;

    const summaryOutput = document.getElementById('summary-tasks-output');
    const summaryTitle = document.getElementById('summary-client-name');
    const loadButton = document.getElementById('load-for-edit-btn');
    
    // Oculta/Remove o botão de Salvar Edição In-line 
    let saveSummaryBtn = document.getElementById('save-summary-tasks-btn');
    if (saveSummaryBtn) {
        saveSummaryBtn.remove();
    }
    
    // Configura o botão para carregar o cliente no formulário principal (comportamento padrão)
    loadButton.textContent = 'Carregar Cliente (Formulário Principal)'; 
    loadButton.classList.remove('btn-primary'); 
    loadButton.classList.add('btn-success');   
    loadButton.onclick = () => {
        loadClientData(client); // Carrega os dados no formulário principal
        taskSummaryModalInstance.hide(); // Fecha o modal
    };
    
    summaryTitle.textContent = `Tarefas de ${client['nome-cliente']} (${client.codigo})`;
    summaryOutput.innerHTML = '';
    
    const allTasks = client.tarefas || [];
    
    if (allTasks.length > 0) {
        summaryOutput.innerHTML = `<h3>Lista Completa de Tarefas (${allTasks.length})</h3>`;
        
        allTasks.forEach((t, index) => {
            const isCompleted = t.concluida;
            const isOverdue = isTaskOverdue(t) && !isCompleted;
            
            let statusText = '';
            let statusBadge = '';
            if (isCompleted) {
                statusText = 'CONCLUÍDO';
                statusBadge = 'bg-success';
            } else if (isOverdue) {
                // Se atrasada, usa o texto e cor de atraso
                statusText = 'ATRASADO'; 
                statusBadge = 'bg-danger';
            } else {
                statusText = 'A FAZER';
                statusBadge = 'bg-warning text-dark';
            }
            
            const itemDiv = document.createElement('div');
            // Aplica a classe CSS para visualização de atraso/conclusão
            itemDiv.className = `d-flex justify-content-between align-items-center p-3 mb-2 border rounded ${isCompleted ? 'completed-task' : (isOverdue ? 'overdue-task' : '')}`;
            itemDiv.innerHTML = `
                <div>
                    <span class="badge ${statusBadge} me-2">${statusText}</span>
                    <strong class="me-3">${t.descricao}</strong>
                    <span class="small text-muted">Prazo: ${t.due_date || 'S/P'} ${t.hora_tarefa ? `às ${t.hora_tarefa}` : ''}</span>
                </div>
                <div>
                    <button type="button" class="btn btn-primary btn-sm edit-task-btn" 
                            data-client-code="${client.codigo}" data-task-index="${index}">
                        Editar
                    </button>
                </div>
            `;
            
            // Adiciona o listener para o novo botão de Edição
            itemDiv.querySelector('.edit-task-btn').addEventListener('click', (e) => {
                const clientCode = e.currentTarget.dataset.clientCode;
                const taskIndex = parseInt(e.currentTarget.dataset.taskIndex);
                openTaskEditModal(clientCode, taskIndex); // Abre o modal de edição rápida
            });
            
            summaryOutput.appendChild(itemDiv);
        });
    } else {
        summaryOutput.innerHTML = '<p class="alert alert-info">Nenhuma tarefa cadastrada para este cliente.</p>';
    }

    // Exibe o modal de resumo
    taskSummaryModalInstance.show();
    clientListModalInstance.hide(); // Fecha o modal da lista
}

/** NOVO: Abre o modal de edição rápida de uma tarefa específica */
function openTaskEditModal(clientCode, taskIndex) {
    const client = clients.find(c => c.codigo === clientCode);
    if (!client || !client.tarefas || !client.tarefas[taskIndex]) {
        alert("Erro ao carregar a tarefa para edição.");
        return;
    }
    const task = client.tarefas[taskIndex];
    
    // Preenche os campos ocultos com as chaves para salvar
    document.getElementById('edit-client-code').value = clientCode; // Código do cliente
    document.getElementById('edit-task-index').value = taskIndex; // Índice da tarefa no array
    
    // Preenche os campos do formulário de edição
    document.getElementById('edit-descricao').value = task.descricao;
    document.getElementById('edit-due-date').value = task.due_date || '';
    document.getElementById('edit-hora-tarefa').value = task.hora_tarefa || '';
    document.getElementById('edit-concluida').checked = task.concluida;
    
    // Exibe o novo modal de edição
    taskEditModalInstance.show();
}

/** NOVO: Salva as alterações feitas no modal de edição rápida */
function saveEditedTask() {
    const clientCode = document.getElementById('edit-client-code').value;
    const taskIndex = parseInt(document.getElementById('edit-task-index').value);
    
    const clientIndex = clients.findIndex(c => c.codigo === clientCode);
    
    if (clientIndex === -1 || isNaN(taskIndex) || !clients[clientIndex].tarefas[taskIndex]) {
        alert("Erro: Cliente ou Tarefa não encontrados.");
        return;
    }
    
    const taskToUpdate = clients[clientIndex].tarefas[taskIndex];
    
    // Coleta os novos valores do formulário de edição
    const newDescription = document.getElementById('edit-descricao').value.trim();
    const newDueDate = document.getElementById('edit-due-date').value;
    const newDueTime = document.getElementById('edit-hora-tarefa').value;
    const newConcluida = document.getElementById('edit-concluida').checked;
    
    if (!newDescription) {
        alert("A descrição da tarefa não pode estar vazia.");
        return;
    }
    
    // Atualiza o objeto da tarefa
    taskToUpdate.descricao = newDescription;
    taskToUpdate.due_date = newDueDate;
    taskToUpdate.hora_tarefa = newDueTime;
    taskToUpdate.concluida = newConcluida;
    
    saveAllClients(); // Salva no LocalStorage
    alert("Tarefa atualizada com sucesso!");
    
    taskEditModalInstance.hide(); // Fecha o modal de edição
    showTaskSummary(clientCode); // Recarrega o resumo para refletir o status atualizado
    
    // Se a tarefa editada é do cliente atualmente carregado, atualiza o checklist na tela principal
    if (currentClientId === clientCode) {
        loadTarefas(clients[clientIndex].tarefas);
    }
}


// --- Lógica de Relatórios Diários ---

// Gera e exibe um relatório de todas as tarefas (A fazer, Concluídas, Atrasadas) de todos os clientes
function showDailyTaskReport() {
    const listOutput = document.getElementById('reminders-list-output');
    listOutput.innerHTML = '';
    
    // Configura o título do modal
    document.getElementById('reminderModalLabel').textContent = '📊 Relatório Diário de Tarefas (Todos os Clientes)';
    
    let htmlContent = '';
    let totalTasks = 0;
    let totalCompleted = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    clients.forEach(client => {
        const allTasks = client.tarefas || [];
        if (allTasks.length > 0) {
            totalTasks += allTasks.length;
            
            const completed = allTasks.filter(t => t.concluida);
            // Pendente (Futura) = Não concluída E não em atraso
            const pending = allTasks.filter(t => !t.concluida && !isTaskOverdue(t));
            // Em Atraso = Não concluída E em atraso
            const overdue = allTasks.filter(t => !t.concluida && isTaskOverdue(t));
            
            totalCompleted += completed.length;
            totalPending += pending.length;
            totalOverdue += overdue.length;
            
            // Renderiza as tarefas agrupadas por cliente e status
            if (allTasks.length > 0) {
                htmlContent += `
                    <div class="card mb-3 p-3">
                        <p class="fw-bold mb-1">Cliente: ${client.codigo} - ${client['nome-cliente']} 
                        <span class="small text-muted">(Total: ${allTasks.length})</span></p>
                        <ul class="list-unstyled mb-0 small">
                            ${overdue.map(t => `<li class="text-danger">❌ [ATRASADA] ${t.descricao} (Prazo: ${t.due_date || 'S/P'})</li>`).join('')}
                            ${pending.map(t => `<li class="text-warning text-dark">⚠️ [A FAZER] ${t.descricao} (Prazo: ${t.due_date || 'S/P'})</li>`).join('')}
                            ${completed.map(t => `<li class="text-success text-decoration-line-through">✅ [CONCLUÍDA] ${t.descricao}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
        }
    });

    if (totalTasks === 0) {
        listOutput.innerHTML = '<p class="alert alert-info">Nenhuma tarefa cadastrada em nenhum cliente.</p>';
    } else {
        // Exibe o resumo geral no topo do relatório
        const summaryHeader = `
            <div class="alert alert-light p-3 mb-3 border">
                <p class="fw-bold mb-1">RESUMO GERAL:</p>
                <p class="mb-0">Total de Tarefas: ${totalTasks} | 
                Concluídas: <strong class="text-success">${totalCompleted}</strong> | 
                Pendentes (Futuras): <strong class="text-warning text-dark">${totalPending}</strong> |
                Em Atraso: <strong class="text-danger">${totalOverdue}</strong></p>
            </div>
        `;
        listOutput.innerHTML = summaryHeader + htmlContent;
    }

    // Exibe o modal usando a instância do Bootstrap
    reminderModalInstance.show();
}


// --- Configuração de Eventos ---

/** Lógica da Busca Direta por Código ou Nome no campo de busca */
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


// Configura todos os ouvintes de eventos da página
function setupEventListeners() {
    // 1. Salvar dados (Botão Salvar Dados)
    document.getElementById('client-form').addEventListener('submit', (e) => {
        e.preventDefault(); // Previne o comportamento padrão de submissão do formulário
        saveOrUpdateClient(); // Chama a função de salvar/atualizar
    });

    // 2. Buscar Cliente (Botão Buscar/Lista)
    document.getElementById('search-btn-list').addEventListener('click', showClientListModal); // Abre o modal de lista de clientes

    // 3. Botão Buscar Cliente (Busca Direta)
    document.getElementById('search-btn-direct').addEventListener('click', handleDirectSearch); // Executa a busca direta

    // 4. Busca Rápida por Input (ENTER no campo)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { // Detecta a tecla Enter
                e.preventDefault();
                handleDirectSearch(); // Executa a busca
            }
        });
    }

    // 5. Botões de Ação Principal (Novo Cliente, Limpar, Excluir)
    document.getElementById('new-client-btn').addEventListener('click', clearFormData); // Novo Cliente (limpa formulário)
    document.getElementById('reset-client-btn').addEventListener('click', clearFormData); // Limpar (limpa formulário)
    document.getElementById('delete-btn').addEventListener('click', deleteCurrentClient); // Excluir Cliente

    // 6. Botões de Navegação do Modal de Lista de Clientes
    document.getElementById('clear-list-selection-btn').addEventListener('click', () => {
        clientListModalInstance.hide(); // Oculta o modal da lista
        clearFormData(); // Limpa o formulário principal
    });
    
    // 7. Botão Sair do Modal de Resumo de Tarefas (Volta para a lista)
    document.getElementById('exit-task-summary-btn').addEventListener('click', () => {
        taskSummaryModalInstance.hide(); // Oculta o modal de resumo
        showClientListModal(); // Volta para a lista de clientes
    });
    
    // 8. Botão Salvar do NOVO Modal de Edição Rápida
    document.getElementById('save-edited-task-btn').addEventListener('click', saveEditedTask); // Salva a tarefa editada no modal

    // 9. Ações/Tarefas (Adicionar)
    document.getElementById('add-tarefa-btn').addEventListener('click', addTarefa); // Adiciona tarefa ao clicar no botão

    document.getElementById('nova-tarefa').addEventListener('keypress', (e) => { // Atalho para adicionar tarefa pelo Enter
        if (e.key === 'Enter') {
            e.preventDefault();
            addTarefa();
        }
    });
    
    // 10. Mostrar Lembretes Diários
    document.getElementById('show-reminders-btn').addEventListener('click', showDailyReminders); // Mostra lembretes diários
    
    // 11. Botão Relatório Diário de Tarefas (Seção 3)
    const reportBtn = document.getElementById('relatorio-tarefas-btn');
    if (reportBtn) {
        reportBtn.addEventListener('click', showDailyTaskReport); // Mostra o relatório consolidado
    }
}