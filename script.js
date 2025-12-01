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
        
        let clients = []; // Array que armazena todos os objetos de cliente
        let currentClientCode = null; // Código do cliente atualmente carregado no modal
        
        // Instâncias dos Modais do Bootstrap
        let clientDataModalInstance;
        let summaryModalInstance;
        let tasksModalInstance;
        let clientTaskViewModalInstance;
        let taskEditModalInstance;
        let messageModalInstance;
        let globalTasksModalInstance;

        // Executado quando a página carrega completamente
        document.addEventListener('DOMContentLoaded', () => {
            // 1. Inicializa as instâncias dos Modais
            clientDataModalInstance = new bootstrap.Modal(document.getElementById('client-data-modal'));
            summaryModalInstance = new bootstrap.Modal(document.getElementById('summary-modal'));
            tasksModalInstance = new bootstrap.Modal(document.getElementById('tasks-modal'));
            clientTaskViewModalInstance = new bootstrap.Modal(document.getElementById('client-task-view-modal'));
            taskEditModalInstance = new bootstrap.Modal(document.getElementById('task-edit-modal'));
            messageModalInstance = new bootstrap.Modal(document.getElementById('message-modal'));
            globalTasksModalInstance = new bootstrap.Modal(document.getElementById('global-tasks-modal'));

            loadAllClients(); // 2. Carrega todos os dados
            setupEventListeners(); // 3. Configura todos os listeners
            showClientListSidebar(); // 4. Carrega a lista no modal fixo
            updateOverdueAlert(); // 5. Atualiza o alerta de tarefas atrasadas no botão
            updateCountdown(''); // Esconde a seção 4 inicialmente
            requestNotificationPermission(); // 6. Solicita permissão de notificação
        });
        
        // --- Utilidades ---
        
        /** Fecha o modal atualmente aberto (usado para navegação) */
        function closeModal(modalId) {
            const modalElement = document.getElementById(modalId);
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
        
        /** Abre um modal (usado para navegação) */
        function openModal(modalId) {
            // Fecha qualquer modal que esteja aberto
            [clientDataModalInstance, summaryModalInstance, tasksModalInstance, clientTaskViewModalInstance, taskEditModalInstance].forEach(instance => {
                if (instance) instance.hide();
            });
            
            // Abre o modal solicitado
            const modalElement = document.getElementById(modalId);
            const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
            modalInstance.show();
        }

        // Retorna a data de hoje no formato 'YYYY-MM-DD'
        function getTodayDateString() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // Retorna a hora atual no formato 'HH:MM'
        function getCurrentTimeString() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        }

        /** Exibe uma mensagem em um modal customizado (substitui alert/confirm) */
        function showMessage(title, body, type = 'info', confirmCallback = null) {
            const modalElement = document.getElementById('message-modal');
            const modalTitle = document.getElementById('messageModalLabel');
            const modalBody = document.getElementById('messageModalBody');
            const modalFooter = document.getElementById('messageModalFooter');
            
            modalTitle.textContent = title;
            modalBody.innerHTML = `<div class="alert alert-${type}">${body}</div>`;
            modalFooter.innerHTML = ''; // Limpa botões
            
            if (confirmCallback) {
                // Se houver callback, é uma pergunta de confirmação/ação
                const confirmBtn = document.createElement('button');
                confirmBtn.textContent = 'Sim';
                confirmBtn.className = 'btn btn-cobmais-success';
                confirmBtn.onclick = () => {
                    messageModalInstance.hide();
                    confirmCallback();
                };
                
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Não';
                cancelBtn.className = 'btn btn-secondary';
                cancelBtn.setAttribute('data-bs-dismiss', 'modal');

                modalFooter.appendChild(cancelBtn);
                modalFooter.appendChild(confirmBtn);

            } else {
                // Se não houver callback, é apenas uma notificação
                const closeBtn = document.createElement('button');
                closeBtn.textContent = 'Fechar';
                closeBtn.className = 'btn btn-secondary';
                closeBtn.setAttribute('data-bs-dismiss', 'modal');
                modalFooter.appendChild(closeBtn);
            }

            messageModalInstance.show();
        }

        /**
         * Verifica se uma tarefa está em atraso, considerando data E hora.
         */
        function isTaskOverdue(tarefa) {
            if (tarefa.concluida || !tarefa.due_date) {
                return false;
            }

            const todayDate = getTodayDateString();
            const taskDate = tarefa.due_date;
            const taskTime = tarefa.hora_tarefa || '23:59'; // Assume fim do dia se não houver hora
            const currentTime = getCurrentTimeString();

            // 1. Lógica para dias anteriores (ATRASADA)
            if (taskDate < todayDate) {
                return true;
            }

            // 2. Lógica para o dia de hoje (com hora)
            if (taskDate === todayDate) {
                if (currentTime > taskTime) {
                    return true;
                }
            }
            
            return false;
        }

        // --- Persistência de Dados ---

        function loadAllClients() {
            clients = JSON.parse(localStorage.getItem(CLIENTS_ARRAY_KEY) || '[]');
        }

        function saveAllClients() {
            localStorage.setItem(CLIENTS_ARRAY_KEY, JSON.stringify(clients));
            showClientListSidebar(); // Atualiza a lista lateral imediatamente
            updateOverdueAlert(); // Atualiza o badge de atrasadas
        }

        // --- Cliente CRUD: Busca e Carregamento ---

        // Busca um cliente por código exato ou nome parcial
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

        // Carrega os dados de um cliente no Modal 1 (Dados do Cliente)
        function loadClientData(client) {
            currentClientCode = client.codigo;
            
            document.getElementById('current-client-info').textContent = `Cliente Carregado: ${client.codigo} - ${client['nome-cliente']}`;
            document.getElementById('prazo-container').classList.remove('d-none'); // Mostra a seção 4
            
            const form = document.getElementById('client-data-form');
            form.querySelectorAll('input, textarea').forEach(element => {
                const key = element.id;
                // Busca o valor no objeto cliente ou no objeto de resumo, ou usa vazio
                const value = client[key] !== undefined ? client[key] : EMPTY_CLIENT_DATA[key];
                element.value = value;
            });
            
            // Carrega o Resumo (Modal 2)
            document.getElementById('plano-acao').value = client['plano-acao'] || '';
            
            // Habilita/Desabilita botões do Modal 3
            document.getElementById('modal3-add-btn').disabled = false;
            document.getElementById('task-modal-warning').classList.add('d-none');
            
            updateCountdown(client['data-inicio']); // Atualiza o contador regressivo
        }

        /** Limpa a tela e o estado atual (Usado por Limpar/Novo Cliente/Voltar/Excluir) */
        function clearFormData(isNew = false) {
            currentClientCode = null;
            document.getElementById('current-client-info').textContent = isNew ? 'Novo Cadastro pronto. Preencha o Código.' : 'Nenhum cliente carregado.';
            document.getElementById('client-data-form').reset();
            document.getElementById('search-input').value = '';
            document.getElementById('plano-acao').value = '';
            document.getElementById('prazo-container').classList.add('d-none'); // Oculta a seção 4
            
            // Desabilita botões do Modal 3
            document.getElementById('modal3-add-btn').disabled = true;
            document.getElementById('task-modal-warning').classList.remove('d-none');
        }

        // Salva ou atualiza os dados do cliente
        function saveOrUpdateClient() {
            const form = document.getElementById('client-data-form');
            const codigo = document.getElementById('codigo').value.trim();
            const nomeCliente = document.getElementById('nome-cliente').value.trim();
            const planoAcao = document.getElementById('plano-acao').value.trim();
            
            if (!codigo || !nomeCliente) {
                showMessage("Erro de Cadastro", "Os campos 'Código' e 'Nome Cliente' são obrigatórios.", 'danger');
                return false;
            }
            
            const clientData = { ...EMPTY_CLIENT_DATA, 'plano-acao': planoAcao };
            
            // Coleta dados do formulário
            form.querySelectorAll('input, textarea').forEach(element => {
                const key = element.id;
                if (key) clientData[key] = element.value;
            });
            
            let existingIndex = clients.findIndex(client => client.codigo === codigo);
            let existingClient = existingIndex !== -1 ? clients[existingIndex] : null;

            if (existingIndex !== -1) {
                // Atualiza cliente existente: mantém tarefas e sobrescreve com dados novos
                clients[existingIndex] = { ...existingClient, ...clientData, tarefas: existingClient.tarefas || [] };
                showMessage("Sucesso", `Cliente ${codigo} - ${nomeCliente} atualizado com sucesso!`, 'success');
            } else {
                // Cadastra novo cliente
                if (clients.some(client => client.codigo === codigo)) {
                     showMessage("Erro de Código", `O código '${codigo}' já está em uso por outro cliente.`, 'danger');
                     return false;
                }
                
                clients.push({ ...clientData, tarefas: [] });
                showMessage("Sucesso", `Novo cliente ${codigo} - ${nomeCliente} cadastrado com sucesso!`, 'success');
            }
            
            saveAllClients();
            loadClientData(clientData); // Recarrega os dados na tela
            
            return true;
        }

        // Exclui o cliente atualmente carregado
        function deleteCurrentClient() {
            if (!currentClientCode) {
                showMessage("Atenção", "Nenhum cliente carregado para exclusão.");
                return;
            }

            const client = clients.find(c => c.codigo === currentClientCode);
            if (!client) return;

            const confirmAction = () => {
                const indexToDelete = clients.findIndex(c => c.codigo === currentClientCode);
                
                if (indexToDelete !== -1) {
                    clients.splice(indexToDelete, 1);
                    saveAllClients();
                    clearFormData();
                    showMessage("Exclusão Concluída", `Cliente ${currentClientCode} excluído com sucesso!`, 'success');
                    closeModal('client-data-modal');
                }
            };
            
            showMessage("Confirmação de Exclusão", 
                        `Tem certeza que deseja EXCLUIR o cadastro do cliente: <strong>${client['nome-cliente']} (${currentClientCode})</strong>? Esta ação não pode ser desfeita.`, 
                        'warning', confirmAction);
        }

        // --- Gerenciamento de Tarefas ---

        // Adiciona uma nova tarefa à lista do cliente atual
        function addTarefa() {
            if (!currentClientCode) {
                showMessage("Erro", "Você deve carregar ou cadastrar um cliente antes de adicionar tarefas.", 'danger');
                return;
            }
            
            const descricao = document.getElementById('nova-tarefa-input').value.trim();
            const dueDate = document.getElementById('tarefa-due-date-input').value; 
            const dueTime = document.getElementById('hora-tarefa-input').value; 

            if (!descricao) {
                showMessage("Erro", "A descrição da tarefa é obrigatória.", 'danger');
                return;
            }

            let client = clients.find(c => c.codigo === currentClientCode);
            if (client) {
                client.tarefas.push({
                    descricao, 
                    concluida: false,
                    due_date: dueDate,
                    hora_tarefa: dueTime,
                    last_notified: null 
                });
                
                saveAllClients(); 
                
                // Limpa os campos do modal de tarefas
                document.getElementById('nova-tarefa-input').value = '';
                document.getElementById('tarefa-due-date-input').value = '';
                document.getElementById('hora-tarefa-input').value = '';
                
                showMessage("Sucesso", `Tarefa adicionada para o cliente ${client.codigo}.`, 'success');
            }
        }

        // Salva as alterações feitas no modal de edição rápida (Modal 5)
        function saveEditedTask() {
            const clientCode = document.getElementById('edit-client-code').value;
            const taskIndex = parseInt(document.getElementById('edit-task-index').value);
            
            const clientIndex = clients.findIndex(c => c.codigo === clientCode);
            
            if (clientIndex === -1 || isNaN(taskIndex) || !clients[clientIndex].tarefas[taskIndex]) {
                showMessage("Erro", "Cliente ou Tarefa não encontrados para atualização.", 'danger');
                return;
            }
            
            const taskToUpdate = clients[clientIndex].tarefas[taskIndex];
            
            const newDescription = document.getElementById('edit-descricao').value.trim();
            const newDueDate = document.getElementById('edit-due-date').value;
            const newDueTime = document.getElementById('edit-hora-tarefa').value;
            const newConcluida = document.getElementById('edit-concluida').checked;
            
            if (!newDescription) {
                showMessage("Erro", "A descrição da tarefa não pode estar vazia.", 'danger');
                return;
            }
            
            // Atualiza o objeto da tarefa
            taskToUpdate.descricao = newDescription;
            taskToUpdate.due_date = newDueDate;
            taskToUpdate.hora_tarefa = newDueTime;
            taskToUpdate.concluida = newConcluida;
            
            saveAllClients();
            showMessage("Sucesso", "Tarefa atualizada com sucesso!", 'success');
            
            taskEditModalInstance.hide();
            // Tenta recarregar o modal de visualização de tarefas se estiver aberto
            if (document.getElementById('client-task-view-modal').classList.contains('show')) {
                showClientTaskViewModal(clientCode);
            }
        }
        
        // Abre o modal de edição rápida (Modal 5)
        function openTaskEditModal(clientCode, taskIndex) {
            const client = clients.find(c => c.codigo === clientCode);
            if (!client || !client.tarefas || !client.tarefas[taskIndex]) {
                showMessage("Erro", "Erro ao carregar a tarefa para edição.", 'danger');
                return;
            }
            const task = client.tarefas[taskIndex];
            
            document.getElementById('edit-client-code').value = clientCode;
            document.getElementById('edit-task-index').value = taskIndex;
            
            document.getElementById('edit-descricao').value = task.descricao;
            document.getElementById('edit-due-date').value = task.due_date || '';
            document.getElementById('edit-hora-tarefa').value = task.hora_tarefa || '';
            document.getElementById('edit-concluida').checked = task.concluida;
            
            clientTaskViewModalInstance.hide(); // Fecha o modal de visualização para abrir o de edição
            taskEditModalInstance.show();
        }

        // --- Sidebar Fixo (Lista de Clientes) ---

        // Exibe o modal com a lista de todos os clientes cadastrados
        function showClientListSidebar() {
            const listOutput = document.getElementById('client-list-output');
            listOutput.innerHTML = ''; 

            if (clients.length === 0) {
                listOutput.innerHTML = '<p class="alert alert-info small">Nenhum cliente cadastrado.</p>';
            } else {
                clients.forEach(client => {
                    const div = document.createElement('div');
                    div.className = 'client-list-item';
                    div.dataset.clientId = client.codigo;
                    div.innerHTML = `<strong>${client.codigo}</strong> - ${client['nome-cliente']}`;
                    
                    // Ao clicar, abre o modal de resumo/visualização de tarefas
                    div.addEventListener('click', () => showClientTaskViewModal(client.codigo));
                    
                    listOutput.appendChild(div);
                });
            }
        }

        /**
         * NOVO: Exibe o modal de resumo de Tarefas por Cliente (Modal 4).
         * @param {string} codigo - Código do cliente.
         */
        function showClientTaskViewModal(codigo) {
            const client = clients.find(c => c.codigo === codigo);
            if (!client) return;

            const allTasks = client.tarefas || [];
            
            // Define o título
            document.getElementById('task-view-client-name').innerHTML = `<i class="bi bi-person-lines-fill"></i> Resumo de Tarefas: <strong>${client['nome-cliente']} (${client.codigo})</strong>`;
            
            // Limpa as listas
            document.getElementById('tasks-overdue-list').innerHTML = '';
            document.getElementById('tasks-today-list').innerHTML = '';
            document.getElementById('tasks-future-list').innerHTML = '';
            
            let overdueTasks = [];
            let todayTasks = [];
            let futureTasks = [];
            
            const todayDate = getTodayDateString();

            allTasks.filter(t => !t.concluida).forEach((t, index) => {
                const isOverdue = isTaskOverdue(t);
                
                if (isOverdue) {
                    overdueTasks.push({...t, index: index, clientCode: codigo});
                } else if (t.due_date === todayDate) {
                    todayTasks.push({...t, index: index, clientCode: codigo});
                } else if (t.due_date > todayDate) {
                    futureTasks.push({...t, index: index, clientCode: codigo});
                }
                // Tarefas sem prazo são ignoradas neste filtro por categoria de data
            });
            
            // Função auxiliar para renderizar a lista
            const renderTaskList = (tasks, containerId) => {
                const container = document.getElementById(containerId);
                if (tasks.length === 0) {
                    container.innerHTML = `<div class="alert alert-info">Não existem tarefas ${containerId.replace('tasks-', '').replace('-list', '')}.</div>`;
                    return;
                }
                
                tasks.forEach(t => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = `p-3 mb-2 border rounded cursor-pointer ${containerId === 'tasks-overdue-list' ? 'overdue-task' : (containerId === 'tasks-today-list' ? 'today-task' : 'bg-white')}`;
                    itemDiv.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong class="me-3">${t.descricao}</strong>
                                <span class="small text-muted">Prazo: ${t.due_date || 'S/P'} ${t.hora_tarefa ? `às ${t.hora_tarefa}` : ''}</span>
                            </div>
                            <button type="button" class="btn btn-sm btn-primary edit-task-btn" 
                                    data-client-code="${t.clientCode}" data-task-index="${t.index}">
                                Editar
                            </button>
                        </div>
                    `;
                    itemDiv.querySelector('.edit-task-btn').addEventListener('click', (e) => {
                        const clientCode = e.currentTarget.dataset.clientCode;
                        const taskIndex = parseInt(e.currentTarget.dataset.taskIndex);
                        openTaskEditModal(clientCode, taskIndex);
                    });
                    container.appendChild(itemDiv);
                });
            };
            
            renderTaskList(overdueTasks, 'tasks-overdue-list');
            renderTaskList(todayTasks, 'tasks-today-list');
            renderTaskList(futureTasks, 'tasks-future-list');
            
            clientTaskViewModalInstance.show();
        }

        // --- Filtros Globais de Tarefas (Botões da Tela Principal) ---
        
        function updateOverdueAlert() {
            let overdueCount = 0;
            clients.forEach(client => {
                const tasks = client.tarefas || [];
                overdueCount += tasks.filter(t => isTaskOverdue(t)).length;
            });

            const btn = document.getElementById('show-overdue-tasks-btn');
            const badge = document.getElementById('overdue-count');
            badge.textContent = overdueCount;

            if (overdueCount > 0) {
                btn.classList.add('btn-overdue-alert');
            } else {
                btn.classList.remove('btn-overdue-alert');
            }
        }

        /**
         * @param {string} filterType - 'today', 'overdue', 'future', 'report'
         */
        function showGlobalTasks(filterType) {
            const outputContainer = document.getElementById('global-tasks-output');
            const modalTitle = document.getElementById('globalTasksModalLabel');
            outputContainer.innerHTML = '';
            
            const todayDate = getTodayDateString();
            let allFilteredTasks = [];

            clients.forEach(client => {
                const tasks = client.tarefas || [];
                tasks.forEach((t, index) => {
                    const isOverdue = isTaskOverdue(t);
                    const isToday = t.due_date === todayDate && !isOverdue;
                    const isFuture = t.due_date > todayDate && !isOverdue;
                    const isCompleted = t.concluida;
                    
                    if (filterType === 'report') {
                        // Relatório Diário: Tarefas do dia (concluídas e não concluídas)
                        if (t.due_date === todayDate) {
                             allFilteredTasks.push({...t, index, client});
                        }
                    } else if (!isCompleted) {
                        // Filtros de Status (apenas não concluídas)
                        if (filterType === 'overdue' && isOverdue) {
                            allFilteredTasks.push({...t, index, client});
                        } else if (filterType === 'today' && isToday) {
                            allFilteredTasks.push({...t, index, client});
                        } else if (filterType === 'future' && isFuture) {
                            allFilteredTasks.push({...t, index, client});
                        }
                    }
                });
            });

            // Configuração do Título
            if (filterType === 'report') {
                modalTitle.textContent = `📊 Relatório Diário (${todayDate}): Tarefas Agendadas (Concluídas/Não Concluídas)`;
            } else if (filterType === 'today') {
                modalTitle.textContent = `🔔 Tarefas Hoje (Pendentes)`;
            } else if (filterType === 'overdue') {
                modalTitle.textContent = `⚠️ Tarefas Atrasadas (Pendentes)`;
            } else if (filterType === 'future') {
                modalTitle.textContent = `📅 Tarefas Futuras (Pendentes)`;
            }
            
            if (allFilteredTasks.length === 0) {
                const message = filterType === 'report' ? 'Nenhuma tarefa agendada para hoje.' : `Nenhuma tarefa ${filterType} pendente.`;
                outputContainer.innerHTML = `<div class="alert alert-success">${message}</div>`;
            } else {
                let html = '';
                allFilteredTasks.sort((a, b) => {
                    // Ordena por data e depois por hora
                    if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
                    return (a.hora_tarefa || '23:59').localeCompare(b.hora_tarefa || '23:59');
                }).forEach(t => {
                    const statusClass = t.concluida ? 'completed-task' : (isTaskOverdue(t) ? 'overdue-task' : (t.due_date === todayDate ? 'today-task' : 'bg-white'));
                    const statusBadge = t.concluida ? '✅ Concluída' : (isTaskOverdue(t) ? '!!! ATRASADA' : 'A Fazer');
                    
                    html += `
                        <div class="p-3 mb-2 border rounded shadow-sm ${statusClass}">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <p class="mb-1"><strong>Cliente: ${t.client.codigo} - ${t.client['nome-cliente']}</strong></p>
                                    <p class="mb-0">${t.descricao}</p>
                                </div>
                                <div class="text-end">
                                    <span class="badge ${t.concluida ? 'bg-success' : (isTaskOverdue(t) ? 'bg-danger' : 'bg-warning text-dark')}">${statusBadge}</span>
                                    <p class="small text-muted mb-0">Prazo: ${t.due_date} ${t.hora_tarefa ? `às ${t.hora_tarefa}` : ''}</p>
                                </div>
                            </div>
                        </div>
                    `;
                });
                outputContainer.innerHTML = html;
            }

            globalTasksModalInstance.show();
        }


        // --- Contador Regressivo (Seção 4) ---

        // Atualiza a mensagem do contador regressivo na seção 4
        function updateCountdown(dataInicioStr) {
            const countdownSpan = document.getElementById('countdown-message').querySelector('span');

            if (!dataInicioStr) {
                countdownSpan.textContent = "Data de Início não informada.";
                countdownSpan.className = 'fw-bold text-dark';
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

            countdownSpan.className = 'fw-bold'; // Reseta classes de cor

            const prazoConclusao = new Date(dataAlvo).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

            if (diffDays > 5) {
                countdownSpan.textContent = `${diffDays} dias restantes. Prazo final: ${prazoConclusao}.`;
                countdownSpan.classList.add('text-success');
            } else if (diffDays > 0) {
                countdownSpan.textContent = `ATENÇÃO: ${diffDays} dias restantes. Prazo final: ${prazoConclusao}.`;
                countdownSpan.classList.add('text-warning');
            } else if (diffDays === 0) {
                countdownSpan.textContent = `PRAZO FINAL HOJE! Prazo: ${prazoConclusao}.`;
                countdownSpan.classList.add('text-danger');
            } else {
                countdownSpan.textContent = `!!! ATRASADO !!! Prazo EXCEDIDO em ${Math.abs(diffDays)} dias. Data de conclusão era: ${prazoConclusao}.`;
                countdownSpan.classList.add('text-danger');
            }
        }

        // --- Configuração de Eventos ---

        /** Lógica da Busca Direta por Código ou Nome (Tela Principal) */
        function handleDirectSearch() {
            const searchInput = document.getElementById('search-input');
            const query = searchInput.value;
            const foundClient = searchClient(query);

            if (!query.trim()) return;

            if (foundClient) {
                loadClientData(foundClient);
                openModal('client-data-modal');
                searchInput.value = '';
            } else {
                const confirmAction = () => {
                    clearFormData(true);
                    openModal('client-data-modal');
                    // Pré-preenche o nome no novo modal, se foi digitado
                    document.getElementById('nome-cliente').value = query;
                    document.getElementById('search-input').value = '';
                };
                
                showMessage("Cadastro Inexistente", 
                            `Cliente "${query}" não encontrado. Deseja cadastrar um novo cliente?`, 
                            'warning', confirmAction);
            }
        }
        
        function setupEventListeners() {
            // 1. Ações da Tela Principal (Buscar / Criar Cliente)
            document.getElementById('search-btn-direct').addEventListener('click', handleDirectSearch);
            document.getElementById('search-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleDirectSearch(); }
            });
            document.getElementById('new-client-btn').addEventListener('click', () => {
                clearFormData(true);
                openModal('client-data-modal');
            });
            document.getElementById('reset-client-btn').addEventListener('click', clearFormData);

            // 2. Botões de Filtro Global
            document.getElementById('show-report-btn').addEventListener('click', () => showGlobalTasks('report'));
            document.getElementById('show-today-tasks-btn').addEventListener('click', () => showGlobalTasks('today'));
            document.getElementById('show-overdue-tasks-btn').addEventListener('click', () => showGlobalTasks('overdue'));
            document.getElementById('show-future-tasks-btn').addEventListener('click', () => showGlobalTasks('future'));
            
            // 3. Botões do Modal 1 (Dados do Cliente)
            document.getElementById('modal1-save-btn').addEventListener('click', () => {
                const saved = saveOrUpdateClient();
                if (saved) closeModal('client-data-modal');
            });
            document.getElementById('modal1-delete-btn').addEventListener('click', deleteCurrentClient);
            document.getElementById('modal1-back-btn').addEventListener('click', () => {
                clearFormData();
                closeModal('client-data-modal');
            });
            document.getElementById('modal1-summary-btn').addEventListener('click', () => openModal('summary-modal'));
            document.getElementById('modal1-task-btn').addEventListener('click', () => openModal('tasks-modal'));
            
            // 4. Botões do Modal 2 (Resumo)
            document.getElementById('modal2-save-btn').addEventListener('click', () => {
                const saved = saveOrUpdateClient();
                if (saved) openModal('client-data-modal');
            });
            
            // 5. Botões do Modal 3 (Cadastrar Tarefas)
            document.getElementById('modal3-add-btn').addEventListener('click', addTarefa);
            document.getElementById('nova-tarefa-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !document.getElementById('modal3-add-btn').disabled) {
                    e.preventDefault();
                    addTarefa();
                }
            });
            
            // 6. Botão Salvar do Modal 5 (Edição de Tarefa)
            document.getElementById('save-edited-task-btn').addEventListener('click', saveEditedTask);
        }

        // --- Lógica de Notificações Agendadas ---

        function requestNotificationPermission() {
            if (!("Notification" in window)) {
                console.log("Este navegador não suporta notificações.");
                return;
            }
            Notification.requestPermission();
        }

        function checkScheduledTasks() {
            if (Notification.permission !== "granted") {
                return;
            }

            const todayDate = getTodayDateString();
            const currentTime = getCurrentTimeString();
            
            clients.forEach(client => {
                client.tarefas.forEach(task => {
                    // Verifica: não concluída, é para hoje, horário coincide
                    if (!task.concluida && task.due_date === todayDate && task.hora_tarefa === currentTime) {
                        if (task.last_notified !== currentTime) { 
                            task.last_notified = currentTime;
                            
                            new Notification(`⏰ Lembrete de Ação Agendada para Agora!`, {
                                body: `Cliente ${client.codigo}: ${task.descricao}`,
                            });
                            
                            // Salva a marcação no cliente para evitar repetição no mesmo minuto
                            let clientToUpdate = clients.find(c => c.codigo === client.codigo);
                            if (clientToUpdate) {
                                clientToUpdate.tarefas.find(t => t.descricao === task.descricao).last_notified = currentTime;
                            }
                            saveAllClients(); 
                        }
                    }
                });
            });
        }

        // Verifica as tarefas a cada 60 segundos (1 minuto)
        setInterval(checkScheduledTasks, 60000); 