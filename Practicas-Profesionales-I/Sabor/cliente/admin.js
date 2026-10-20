document.addEventListener('DOMContentLoaded', () => {
    // Estado centralizado de la aplicación
    const state = {
        branches: [
            {
                id: 'centro',
                name: 'Sabor Centro',
                address: 'Av. Corrientes 1234 · Buenos Aires',
                hours: 'Lun a Dom · 12:00 – 23:00',
                phone: '+54 11 4321 1234',
                symbol: 'SC',
                status: 'Activa',
                workers: [
                    { id: 'martina', name: 'Martina Gómez', role: 'Encargada', salary: 780000, phone: '+54 9 11 5555 1212' },
                    { id: 'julian', name: 'Julián Torres', role: 'Cocinero', salary: 650000, phone: '+54 9 11 4444 3333' },
                    { id: 'sofia', name: 'Sofía Rossi', role: 'Moza', salary: 520000, phone: '+54 9 11 3333 2222' },
                    { id: 'carlos', name: 'Carlos Benítez', role: 'Ayudante de cocina', salary: 490000, phone: '+54 9 11 2222 1111' },
                    { id: 'lucia', name: 'Lucia Fernández', role: 'Moza', salary: 520000, phone: '+54 9 11 1111 0000' },
                    { id: 'mateo', name: 'Mateo Romero', role: 'Cajero', salary: 580000, phone: '+54 9 11 9999 8888' },
                    { id: 'valentina', name: 'Valentina Silva', role: 'Barista', salary: 550000, phone: '+54 9 11 8888 7777' },
                    { id: 'diego', name: 'Diego Morales', role: 'Lava lozas', salary: 460000, phone: '+54 9 11 7777 6666' }
                ],
                dishes: [
                    { id: 'salmon', name: 'Salmón a la parrilla', price: 18900 },
                    { id: 'pasta', name: 'Pasta artesanal', price: 14200 },
                    { id: 'bife', name: 'Ojo de bife con papas', price: 21000 },
                    { id: 'risotto', name: 'Risotto de hongos', price: 16500 },
                    { id: 'milanesa', name: 'Milanesa napolitana', price: 13800 },
                    { id: 'tiramisu', name: 'Tiramisú de la casa', price: 6500 }
                ]
            },
            {
                id: 'palermo',
                name: 'Sabor Palermo',
                address: 'Honduras 5500 · Buenos Aires',
                hours: 'Mar a Dom · 19:00 – 01:00',
                phone: '+54 11 4777 8888',
                symbol: 'SP',
                status: 'Activa',
                workers: [
                    { id: 'andres', name: 'Andrés Castro', role: 'Encargado', salary: 790000, phone: '+54 9 11 6666 5555' },
                    { id: 'camila', name: 'Camila López', role: 'Chef executive', salary: 850000, phone: '+54 9 11 5555 4444' },
                    { id: 'lucas', name: 'Lucas Díaz', role: 'Barman', salary: 600000, phone: '+54 9 11 4444 3333' },
                    { id: 'elena', name: 'Elena Gómez', role: 'Moza', salary: 530000, phone: '+54 9 11 3333 2222' },
                    { id: 'nicolas', name: 'Nicolás Ruiz', role: 'Mozo', salary: 530000, phone: '+54 9 11 2222 1111' },
                    { id: 'paula', name: 'Paula Méndez', role: 'Sushiman', salary: 720000, phone: '+54 9 11 1111 0000' }
                ],
                dishes: [
                    { id: 'burger', name: 'Burger gourmet Sabor', price: 15500 },
                    { id: 'tabla', name: 'Tabla de fiambres y quesos', price: 19000 },
                    { id: 'empanadas', name: 'Empanadas de entraña', price: 4500 },
                    { id: 'coctel', name: 'Cóctel de autor', price: 7200 },
                    { id: 'cheesecake', name: 'Cheesecake de frutos rojos', price: 6800 }
                ]
            },
            {
                id: 'costanera',
                name: 'Sabor Costanera',
                address: 'Av. Rafael Obligado 2100 · Buenos Aires',
                hours: 'Mié a Dom · 12:00 – 00:00',
                phone: '+54 11 4800 9900',
                symbol: 'SC',
                status: 'Activa',
                workers: [
                    { id: 'franco', name: 'Franco Herrera', role: 'Encargado', salary: 770000, phone: '+54 9 11 7777 8888' },
                    { id: 'valeria', name: 'Valeria Giménez', role: 'Parrillera', salary: 710000, phone: '+54 9 11 6666 7777' },
                    { id: 'tomas', name: 'Tomás Blanco', role: 'Mozo', salary: 510000, phone: '+54 9 11 5555 6666' },
                    { id: 'romina', name: 'Romina Juárez', role: 'Cajera', salary: 570000, phone: '+54 9 11 4444 5555' }
                ],
                dishes: [
                    { id: 'parrillada', name: 'Parrillada para dos', price: 32000 },
                    { id: 'chuleton', name: 'Chuleton de cerdo', price: 17900 },
                    { id: 'ensalada', name: 'Ensalada César con pollo', price: 11500 },
                    { id: 'flan', name: 'Flan casero con dulce', price: 5800 },
                    { id: 'pacu', name: 'Pacú a la parrilla', price: 22500 }
                ]
            }
        ],
        activeBranchId: null,
        editingWorkerId: null,
        modalBranchDraft: null
    };

    // Elementos del DOM
    const branchContainer = document.getElementById('branch-container');
    const metricBranches = document.getElementById('metric-branches');
    const metricWorkers = document.getElementById('metric-workers');
    const metricDishes = document.getElementById('metric-dishes');

    // Ventanas modales
    const branchModal = document.getElementById('branch-modal');
    const workerModal = document.getElementById('worker-modal');
    const addBranchModal = document.getElementById('add-branch-modal');

    // Formularios
    const addBranchForm = document.getElementById('add-branch-form');
    const workerForm = document.getElementById('worker-form');

    // Utilidades
    const formatCurrency = (val) => new Intl.NumberFormat('es-AR').format(val);

    const getInitials = (name) => {
        if (!name) return 'SB';
        return name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0].toUpperCase())
            .join('');
    };

    // Actualización de Métricas del Dashboard
    const updateMetrics = () => {
        if (metricBranches) metricBranches.textContent = state.branches.length;
        const totalWorkers = state.branches.reduce((acc, b) => acc + b.workers.length, 0);
        if (metricWorkers) metricWorkers.textContent = totalWorkers;
        const totalDishes = state.branches.reduce((acc, b) => acc + b.dishes.length, 0);
        if (metricDishes) metricDishes.textContent = totalDishes;
    };

    // Renderizar lista de sucursales en el Dashboard
    const renderBranches = () => {
        if (!branchContainer) return;
        branchContainer.innerHTML = '';

        if (state.branches.length === 0) {
            branchContainer.innerHTML = '<p class="helper-text">No hay sucursales registradas.</p>';
            updateMetrics();
            return;
        }

        state.branches.forEach(branch => {
            const article = document.createElement('article');
            article.className = 'branch-row';
            article.setAttribute('data-branch-id', branch.id);
            article.innerHTML = `
                <div class="branch-symbol" aria-hidden="true">${branch.symbol}</div>
                <div class="branch-main">
                    <h3>${branch.name}</h3>
                    <p>${branch.address}</p>
                </div>
                <span class="status status-active">${branch.status}</span>
                <span class="branch-meta">${branch.dishes.length} platos · ${branch.workers.length} trabajadores</span>
                <button class="button button-outline" type="button" data-action="view-branch" data-branch-id="${branch.id}">Ver sucursal</button>
                <button class="icon-button danger" type="button" aria-label="Eliminar ${branch.name}" data-action="delete-branch" data-branch-id="${branch.id}">×</button>
            `;
            branchContainer.appendChild(article);
        });

        updateMetrics();
    };

    // --- Modal Agregar Sucursal ---
    const openAddBranchModal = () => {
        if (addBranchForm) addBranchForm.reset();
        if (addBranchModal) addBranchModal.showModal();
    };

    const closeAddBranchModal = () => {
        if (addBranchModal) addBranchModal.close();
    };

    if (addBranchForm) {
        addBranchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(addBranchForm);
            const name = formData.get('name').trim();
            const address = formData.get('address').trim();
            const daysStart = formData.get('days_start');
            const daysEnd = formData.get('days_end');
            const timeOpen = formData.get('time_open');
            const timeClose = formData.get('time_close');
            const phone = formData.get('phone').trim();

            if (!name || !address || !timeOpen || !timeClose) return;

            // Formatear rango de días y horarios
            const daysText = (daysStart === daysEnd) ? daysStart : `${daysStart} a ${daysEnd}`;
            const hours = `${daysText} · ${timeOpen} – ${timeClose}`;

            const id = 'branch-' + Date.now();
            const symbol = getInitials(name);

            const newBranch = {
                id,
                name,
                address,
                hours,
                phone,
                symbol,
                status: 'Activa',
                workers: [],
                dishes: []
            };

            state.branches.push(newBranch);
            renderBranches();
            closeAddBranchModal();
        });
    }

    // Filtrar caracteres no permitidos en campos telefónicos (solo dígitos, +, - y espacios)
    document.querySelectorAll('input[type="tel"]').forEach(input => {
        input.addEventListener('input', () => {
            input.value = input.value.replace(/[^0-9+\s-]/g, '');
        });
    });

    // --- Modal Detalle de Sucursal ---
    const openBranchModal = (branchId) => {
        state.activeBranchId = branchId;
        const branch = state.branches.find(b => b.id === branchId);
        if (!branch) return;

        // Copia profunda para borrador en edición
        state.modalBranchDraft = JSON.parse(JSON.stringify(branch));

        renderModalBranchContent();
        if (branchModal) branchModal.showModal();
    };

    const closeBranchModal = () => {
        if (branchModal) branchModal.close();
        state.activeBranchId = null;
        state.modalBranchDraft = null;
    };

    const renderModalBranchContent = () => {
        const draft = state.modalBranchDraft;
        if (!draft) return;

        const titleEl = document.getElementById('branch-modal-title');
        const addrEl = document.getElementById('branch-detail-address');
        const hoursEl = document.getElementById('branch-detail-hours');
        const phoneEl = document.getElementById('branch-detail-phone');

        if (titleEl) titleEl.textContent = draft.name;
        if (addrEl) addrEl.textContent = draft.address;
        if (hoursEl) hoursEl.textContent = draft.hours;
        if (phoneEl) phoneEl.textContent = draft.phone;

        // Renderizar Lista de Trabajadores
        const workerListEl = document.getElementById('modal-worker-list');
        if (workerListEl) {
            workerListEl.innerHTML = '';
            if (draft.workers.length === 0) {
                workerListEl.innerHTML = '<li class="helper-text" style="padding: 10px 0;">No hay trabajadores registrados en esta sucursal.</li>';
            } else {
                draft.workers.forEach(w => {
                    const li = document.createElement('li');
                    li.className = 'worker-row';
                    li.innerHTML = `
                        <span class="worker-avatar">${getInitials(w.name)}</span>
                        <span class="worker-info">
                            <strong>${w.name}</strong>
                            <small>${w.role || 'Empleado'} · $${formatCurrency(w.salary)}</small>
                        </span>
                        <button class="button button-small button-outline" type="button" data-action="edit-worker" data-worker-id="${w.id}">Editar</button>
                        <button class="icon-button danger" type="button" aria-label="Eliminar a ${w.name}" data-action="delete-worker" data-worker-id="${w.id}">×</button>
                    `;
                    workerListEl.appendChild(li);
                });
            }
        }

        // Renderizar Lista de Platos
        const dishListEl = document.getElementById('modal-dish-list');
        if (dishListEl) {
            dishListEl.innerHTML = '';
            if (draft.dishes.length === 0) {
                dishListEl.innerHTML = '<p class="helper-text" style="padding: 10px 0;">No hay platos en la carta de esta sucursal.</p>';
            } else {
                draft.dishes.forEach((d, index) => {
                    const div = document.createElement('div');
                    div.className = 'dish-edit-row';
                    div.setAttribute('data-dish-index', index);
                    div.innerHTML = `
                        <input class="dish-name-input" type="text" value="${d.name}" placeholder="Nombre del plato" data-field="dish-name" data-index="${index}" required>
                        <div class="input-prefix">
                            <span>$</span>
                            <input type="number" value="${d.price}" min="0" placeholder="Precio" data-field="dish-price" data-index="${index}" required>
                        </div>
                        <button class="icon-button danger" type="button" aria-label="Eliminar plato ${d.name}" data-action="delete-dish" data-index="${index}">×</button>
                    `;
                    dishListEl.appendChild(div);
                });
            }
        }
    };

    // Guardar cambios del borrador de la sucursal
    const saveBranchModal = () => {
        if (!state.activeBranchId || !state.modalBranchDraft) return;

        // Recopilar nombres y precios actualizados del DOM del modal
        const dishRows = document.querySelectorAll('#modal-dish-list .dish-edit-row');
        const updatedDishes = [];
        dishRows.forEach((row) => {
            const nameInput = row.querySelector('[data-field="dish-name"]');
            const priceInput = row.querySelector('[data-field="dish-price"]');
            if (nameInput && priceInput && nameInput.value.trim() !== '') {
                const origIndex = row.getAttribute('data-dish-index');
                const origDish = state.modalBranchDraft.dishes[origIndex];
                updatedDishes.push({
                    id: origDish ? origDish.id : 'dish-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                    name: nameInput.value.trim(),
                    price: parseFloat(priceInput.value) || 0
                });
            }
        });
        state.modalBranchDraft.dishes = updatedDishes;

        // Confirmar cambios al estado global
        const branchIndex = state.branches.findIndex(b => b.id === state.activeBranchId);
        if (branchIndex !== -1) {
            state.branches[branchIndex] = JSON.parse(JSON.stringify(state.modalBranchDraft));
        }

        renderBranches();
        closeBranchModal();
    };

    // Modal Trabajador
    const openWorkerModal = (workerId = null) => {
        state.editingWorkerId = workerId;
        const titleEl = document.getElementById('worker-modal-title');

        if (workerId && state.modalBranchDraft) {
            if (titleEl) titleEl.textContent = 'Editar trabajador';
            const worker = state.modalBranchDraft.workers.find(w => w.id === workerId);
            if (worker) {
                document.getElementById('worker-name').value = worker.name;
                document.getElementById('worker-role').value = worker.role || '';
                document.getElementById('worker-salary').value = worker.salary;
                document.getElementById('worker-phone').value = worker.phone || '';
            }
        } else {
            if (titleEl) titleEl.textContent = 'Agregar trabajador';
            if (workerForm) workerForm.reset();
        }

        if (workerModal) workerModal.showModal();
    };

    const closeWorkerModal = () => {
        if (workerModal) workerModal.close();
        state.editingWorkerId = null;
    };

    if (workerForm) {
        workerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!state.modalBranchDraft) return;

            const name = document.getElementById('worker-name').value.trim();
            const role = document.getElementById('worker-role').value.trim();
            const salary = parseFloat(document.getElementById('worker-salary').value) || 0;
            const phone = document.getElementById('worker-phone').value.trim();

            if (!name || !role) return;

            if (state.editingWorkerId) {
                // Editar trabajador existente en el borrador
                const worker = state.modalBranchDraft.workers.find(w => w.id === state.editingWorkerId);
                if (worker) {
                    worker.name = name;
                    worker.role = role;
                    worker.salary = salary;
                    worker.phone = phone;
                }
            } else {
                // Agregar nuevo trabajador en el borrador
                const newWorker = {
                    id: 'worker-' + Date.now(),
                    name,
                    role,
                    salary,
                    phone
                };
                state.modalBranchDraft.workers.push(newWorker);
            }

            renderModalBranchContent();
            closeWorkerModal();
        });
    }

    // Acciones de Platos en el Borrador
    const addDishToDraft = () => {
        if (!state.modalBranchDraft) return;

        // Guardar valores actuales antes de re-renderizar
        saveCurrentDishInputsToDraft();

        state.modalBranchDraft.dishes.push({
            id: 'dish-' + Date.now(),
            name: 'Nuevo plato',
            price: 10000
        });
        renderModalBranchContent();
    };

    const saveCurrentDishInputsToDraft = () => {
        if (!state.modalBranchDraft) return;
        const dishRows = document.querySelectorAll('#modal-dish-list .dish-edit-row');
        dishRows.forEach((row, idx) => {
            const nameInput = row.querySelector('[data-field="dish-name"]');
            const priceInput = row.querySelector('[data-field="dish-price"]');
            if (nameInput && priceInput && state.modalBranchDraft.dishes[idx]) {
                state.modalBranchDraft.dishes[idx].name = nameInput.value.trim();
                state.modalBranchDraft.dishes[idx].price = parseFloat(priceInput.value) || 0;
            }
        });
    };

    const deleteDishFromDraft = (index) => {
        if (!state.modalBranchDraft) return;
        saveCurrentDishInputsToDraft();
        state.modalBranchDraft.dishes.splice(index, 1);
        renderModalBranchContent();
    };

    const deleteWorkerFromDraft = (workerId) => {
        if (!state.modalBranchDraft) return;
        saveCurrentDishInputsToDraft();
        state.modalBranchDraft.workers = state.modalBranchDraft.workers.filter(w => w.id !== workerId);
        renderModalBranchContent();
    };

    // --- Eliminar Sucursal ---
    const deleteBranch = (branchId) => {
        const branch = state.branches.find(b => b.id === branchId);
        if (!branch) return;

        if (confirm(`¿Estás seguro de que querés eliminar la sucursal "${branch.name}"?`)) {
            state.branches = state.branches.filter(b => b.id !== branchId);
            renderBranches();
        }
    };

    // Delegación Global de Eventos de Clic
    document.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        switch (action) {
            case 'add-branch':
                openAddBranchModal();
                break;
            case 'close-add-branch':
                closeAddBranchModal();
                break;
            case 'view-branch': {
                const branchId = actionBtn.getAttribute('data-branch-id');
                openBranchModal(branchId);
                break;
            }
            case 'close-branch':
                closeBranchModal();
                break;
            case 'save-branch':
                saveBranchModal();
                break;
            case 'delete-branch': {
                const branchId = actionBtn.getAttribute('data-branch-id');
                deleteBranch(branchId);
                break;
            }
            case 'add-worker':
                openWorkerModal();
                break;
            case 'edit-worker': {
                const workerId = actionBtn.getAttribute('data-worker-id');
                openWorkerModal(workerId);
                break;
            }
            case 'close-worker':
                closeWorkerModal();
                break;
            case 'delete-worker': {
                const workerId = actionBtn.getAttribute('data-worker-id');
                deleteWorkerFromDraft(workerId);
                break;
            }
            case 'add-dish':
                addDishToDraft();
                break;
            case 'delete-dish': {
                const index = parseInt(actionBtn.getAttribute('data-index'), 10);
                deleteDishFromDraft(index);
                break;
            }
        }
    });

    // Cerrar ventanas modales haciendo clic en el fondo (backdrop)
    [branchModal, workerModal, addBranchModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            // Solo cerrar si el click fue directamente sobre el elemento dialog (backdrop) y no en sus hijos
            if (e.target !== modal) return;

            const rect = modal.getBoundingClientRect();
            const isClickInsideModalBox = (
                rect.top <= e.clientY &&
                e.clientY <= rect.top + rect.height &&
                rect.left <= e.clientX &&
                e.clientX <= rect.left + rect.width
            );
            if (!isClickInsideModalBox) {
                modal.close();
            }
        });
    });

    // Render inicial
    renderBranches();
});
