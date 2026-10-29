// Interceptor global de fetch para inyectar automáticamente el token CSRF
const originalFetch = window.fetch;
window.fetch = async function (resource, options = {}) {
    const opts = { ...options };
    const method = (opts.method || 'GET').toUpperCase();

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
            const headers = new Headers(opts.headers || {});
            if (!headers.has('X-CSRFToken')) {
                headers.set('X-CSRFToken', csrfToken);
            }
            opts.headers = headers;
        }
    }

    return originalFetch(resource, opts);
};

document.addEventListener('DOMContentLoaded', () => {
    // Estado de la aplicación
    const state = {
        activeBranchId: null
    };

    // Elementos del DOM
    const branchContainer = document.getElementById('branch-container');
    const metricBranches = document.getElementById('metric-branches');
    const metricWorkers = document.getElementById('metric-workers');
    const metricDishes = document.getElementById('metric-dishes');

    // Modales
    const branchModal = document.getElementById('branch-modal');
    const workerModal = document.getElementById('worker-modal');
    const dishModal = document.getElementById('dish-modal');
    const addBranchModal = document.getElementById('add-branch-modal');

    // Formularios
    const addBranchForm = document.getElementById('add-branch-form');
    const workerForm = document.getElementById('worker-form');
    const dishForm = document.getElementById('dish-form');

    // Formateador de moneda
    const formatCurrency = (val) => new Intl.NumberFormat('es-AR').format(val);

    // Obtener iniciales para avatares
    const getInitials = (name) => {
        if (!name) return 'SB';
        return name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0].toUpperCase())
            .join('');
    };

    // Actualizar contadores de la fila de la sucursal en el dashboard principal
    const updateDashboardBranchCounters = (branchId, workerCount, dishCount) => {
        const row = document.querySelector(`.branch-row[data-branch-id="${branchId}"]`);
        if (row) {
            const wCounter = row.querySelector('.branch-worker-count');
            const dCounter = row.querySelector('.branch-dish-count');
            if (wCounter && workerCount !== undefined) wCounter.textContent = workerCount;
            if (dCounter && dishCount !== undefined) dCounter.textContent = dishCount;
        }

        // Recalcular métricas totales del dashboard
        let totalW = 0;
        let totalD = 0;
        document.querySelectorAll('.branch-worker-count').forEach(el => totalW += parseInt(el.textContent) || 0);
        document.querySelectorAll('.branch-dish-count').forEach(el => totalD += parseInt(el.textContent) || 0);

        if (metricWorkers) metricWorkers.textContent = totalW;
        if (metricDishes) metricDishes.textContent = totalD;
    };

    // Modal Detalle de Sucursal
    const fetchBranchDetails = async (branchId) => {
        try {
            const res = await fetch(`/${branchId}`);
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'No se pudo cargar la sucursal');
                return;
            }
            const data = await res.json();

            // Llenar campos de cabecera
            const titleEl = document.getElementById('branch-modal-title');
            const addrEl = document.getElementById('branch-detail-address');
            const hoursEl = document.getElementById('branch-detail-hours');
            const phoneEl = document.getElementById('branch-detail-phone');

            if (titleEl) titleEl.textContent = data.nombre;
            if (addrEl) addrEl.textContent = data.direccion;
            if (hoursEl) hoursEl.innerHTML = (data.horarios && data.horarios.length > 0) ? data.horarios.join('<br>') : 'Sin horario definido';
            if (phoneEl) phoneEl.textContent = data.num_telefono || '-';

            // Renderizar Lista de Trabajadores
            const workerListEl = document.getElementById('modal-worker-list');
            if (workerListEl) {
                workerListEl.innerHTML = '';
                if (!data.trabajadores || data.trabajadores.length === 0) {
                    workerListEl.innerHTML = '<li class="helper-text" style="padding: 10px 0;">No hay trabajadores registrados en esta sucursal.</li>';
                } else {
                    data.trabajadores.forEach(w => {
                        const li = document.createElement('li');
                        li.className = `worker-row${w.activo ? '' : ' is-inactive'}`;
                        li.setAttribute('data-worker-id', w.id);
                        li.innerHTML = `
                            <span class="worker-avatar">${getInitials(w.nombre + ' ' + (w.apellido || ''))}</span>
                            <span class="worker-info">
                                <strong>${w.nombre} ${w.apellido || ''}</strong>
                                <small>${w.puesto || 'Puesto no asignado'} · Tel: ${w.numero_telefono || '-'}</small>
                            </span>
                            <label class="toggle-switch" title="Activo / Inactivo">
                                <input type="checkbox" data-action="toggle-worker" data-worker-id="${w.id}" ${w.activo ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <button class="button button-small button-outline" type="button" data-action="edit-worker" data-worker-id="${w.id}">Editar</button>
                        `;
                        workerListEl.appendChild(li);
                    });
                }
            }

            // Renderizar Lista de Platos
            const dishListEl = document.getElementById('modal-dish-list');
            if (dishListEl) {
                dishListEl.innerHTML = '';
                if (!data.platos || data.platos.length === 0) {
                    dishListEl.innerHTML = '<p class="helper-text" style="padding: 10px 0;">No hay platos en la carta de esta sucursal.</p>';
                } else {
                    data.platos.forEach(d => {
                        const div = document.createElement('div');
                        div.className = `dish-edit-row${d.activo ? '' : ' is-inactive'}`;
                        div.setAttribute('data-dish-id', d.id);
                        div.innerHTML = `
                            <div style="flex:1;">
                                <strong>${d.nombre}</strong>
                                <span style="color:var(--admin-primary); font-weight:600; margin-left:6px;">$${formatCurrency(d.precio)}</span>
                                ${d.apto_celiaco ? '<span class="status status-active" style="padding:2px 6px; font-size:10px; margin-left:6px;">Sin TACC</span>' : ''}
                                <br><small style="color:var(--admin-muted); font-size:11px;">${d.descripcion || 'Sin descripción'}</small>
                            </div>
                            <label class="toggle-switch" title="Activo / Inactivo">
                                <input type="checkbox" data-action="toggle-dish" data-dish-id="${d.id}" ${d.activo ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <button class="button button-small button-outline" type="button" data-action="edit-dish" data-dish-id="${d.id}">Editar</button>
                        `;
                        dishListEl.appendChild(div);
                    });
                }
            }

            // Actualizar contadores en la tarjeta de la sucursal
            updateDashboardBranchCounters(branchId, (data.trabajadores || []).length, (data.platos || []).length);

        } catch (error) {
            console.error('Error al obtener datos de la sucursal:', error);
            alert('Error de conexión al cargar la sucursal');
        }
    };

    const openBranchModal = (branchId) => {
        state.activeBranchId = branchId;
        fetchBranchDetails(branchId);
        if (branchModal) branchModal.showModal();
    };

    const closeBranchModal = () => {
        if (branchModal) branchModal.close();
        state.activeBranchId = null;
    };

    // Modal Trabajador (Crear / Editar con PUT)
    const openWorkerModal = async (workerId = null) => {
        const titleEl = document.getElementById('worker-modal-title');
        const submitBtn = document.getElementById('worker-submit-btn');
        const workerIdInput = document.getElementById('worker-id');

        if (workerId) {
            if (titleEl) titleEl.textContent = 'Editar trabajador';
            if (submitBtn) submitBtn.textContent = 'Guardar cambios';
            if (workerIdInput) workerIdInput.value = workerId;

            try {
                const res = await fetch(`/${state.activeBranchId}/${workerId}/edit_empleado`);
                if (!res.ok) throw new Error('No se pudo cargar el trabajador');
                const emp = await res.json();

                document.getElementById('worker-name').value = emp.nombre || '';
                document.getElementById('worker-lastname').value = emp.apellido || '';
                document.getElementById('worker-role').value = emp.puesto || '';
                document.getElementById('worker-phone').value = emp.numero_telefono || '';
            } catch (err) {
                alert(err.message || 'Error al obtener empleado');
                return;
            }
        } else {
            if (titleEl) titleEl.textContent = 'Agregar trabajador';
            if (submitBtn) submitBtn.textContent = 'Crear trabajador';
            if (workerIdInput) workerIdInput.value = '';
            if (workerForm) workerForm.reset();
        }

        if (workerModal) workerModal.showModal();
    };

    const closeWorkerModal = () => {
        if (workerModal) workerModal.close();
    };

    if (workerForm) {
        workerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!state.activeBranchId) return;

            const workerId = document.getElementById('worker-id').value;
            const formData = new FormData(workerForm);

            const isEdit = Boolean(workerId);
            const url = isEdit
                ? `/${state.activeBranchId}/${workerId}/edit_empleado`
                : `/${state.activeBranchId}/post_empleado`;
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    body: formData
                });
                const result = await res.json();

                if (!res.ok) {
                    alert(result.error || 'Ocurrió un error al procesar el trabajador');
                    return;
                }

                closeWorkerModal();
                fetchBranchDetails(state.activeBranchId);
            } catch (err) {
                console.error(err);
                alert('Error al comunicarse con el servidor');
            }
        });
    }

    // Modal Plato (Crear / Editar con PUT)
    const openDishModal = async (dishId = null) => {
        const titleEl = document.getElementById('dish-modal-title');
        const submitBtn = document.getElementById('dish-submit-btn');
        const dishIdInput = document.getElementById('dish-id');

        if (dishId) {
            if (titleEl) titleEl.textContent = 'Editar plato';
            if (submitBtn) submitBtn.textContent = 'Guardar cambios';
            if (dishIdInput) dishIdInput.value = dishId;

            try {
                const res = await fetch(`/${state.activeBranchId}/${dishId}/edit_plato`);
                if (!res.ok) throw new Error('No se pudo cargar el plato');
                const plato = await res.json();

                document.getElementById('dish-name').value = plato.nombre || '';
                document.getElementById('dish-price').value = plato.precio || '';
                document.getElementById('dish-desc').value = plato.descripcion || '';
                document.getElementById('dish-celiaco').checked = Boolean(plato.apto_celiaco);
            } catch (err) {
                alert(err.message || 'Error al obtener datos del plato');
                return;
            }
        } else {
            if (titleEl) titleEl.textContent = 'Agregar plato';
            if (submitBtn) submitBtn.textContent = 'Crear plato';
            if (dishIdInput) dishIdInput.value = '';
            if (dishForm) dishForm.reset();
        }

        if (dishModal) dishModal.showModal();
    };

    const closeDishModal = () => {
        if (dishModal) dishModal.close();
    };

    if (dishForm) {
        dishForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!state.activeBranchId) return;

            const dishId = document.getElementById('dish-id').value;
            const formData = new FormData(dishForm);

            const isEdit = Boolean(dishId);
            const url = isEdit
                ? `/${state.activeBranchId}/${dishId}/edit_plato`
                : `/${state.activeBranchId}/post_plato`;
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    body: formData
                });
                const result = await res.json();

                if (!res.ok) {
                    alert(result.error || 'Ocurrió un error al procesar el plato');
                    return;
                }

                closeDishModal();
                fetchBranchDetails(state.activeBranchId);
            } catch (err) {
                console.error(err);
                alert('Error al comunicarse con el servidor');
            }
        });
    }

    // Modal Agregar Sucursal
    const openAddBranchModal = () => {
        if (addBranchForm) addBranchForm.reset();
        if (addBranchModal) addBranchModal.showModal();
    };

    const closeAddBranchModal = () => {
        if (addBranchModal) addBranchModal.close();
    };

    if (addBranchForm) {
        addBranchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addBranchForm);

            try {
                const res = await fetch('/post_sucursal', {
                    method: 'POST',
                    body: formData
                });
                const result = await res.json();

                if (!res.ok) {
                    alert(result.error || 'Error al crear la sucursal');
                    return;
                }

                closeAddBranchModal();
                // Recargar página para reflejar la nueva sucursal y actualizar contadores
                window.location.reload();
            } catch (err) {
                console.error(err);
                alert('Error al conectar con el servidor');
            }
        });
    }

    // Filtrar caracteres no numéricos en inputs de teléfono
    document.querySelectorAll('input[type="tel"]').forEach(input => {
        input.addEventListener('input', () => {
            input.value = input.value.replace(/[^0-9+\s-]/g, '');
        });
    });

    // Toggle activo/inactivo vía change en checkboxes
    document.addEventListener('change', async (e) => {
        const toggle = e.target;
        if (!toggle.matches('[data-action^="toggle-"]')) return;

        const action = toggle.getAttribute('data-action');
        const isActive = toggle.checked;

        if (action === 'toggle-branch') {
            const branchId = toggle.getAttribute('data-branch-id');
            try {
                const formData = new FormData();
                formData.append('activo', isActive ? 'true' : 'false');
                const res = await fetch(`/${branchId}/toggle_activo`, { method: 'PUT', body: formData });
                if (!res.ok) throw new Error();

                const row = toggle.closest('.branch-row');
                const statusEl = row.querySelector('.status');
                if (isActive) {
                    row.classList.remove('is-inactive');
                    statusEl.className = 'status status-active';
                    statusEl.textContent = 'Activa';
                } else {
                    row.classList.add('is-inactive');
                    statusEl.className = 'status status-inactive';
                    statusEl.textContent = 'Inactiva';
                }
            } catch {
                toggle.checked = !isActive;
                alert('Error al cambiar el estado de la sucursal');
            }
        }

        if (action === 'toggle-worker') {
            const workerId = toggle.getAttribute('data-worker-id');
            try {
                const formData = new FormData();
                formData.append('activo', isActive ? 'true' : 'false');
                const res = await fetch(`/${state.activeBranchId}/${workerId}/edit_empleado`, { method: 'PUT', body: formData });
                if (!res.ok) throw new Error();

                const row = toggle.closest('.worker-row');
                row.classList.toggle('is-inactive', !isActive);
            } catch {
                toggle.checked = !isActive;
                alert('Error al cambiar el estado del trabajador');
            }
        }

        if (action === 'toggle-dish') {
            const dishId = toggle.getAttribute('data-dish-id');
            try {
                const formData = new FormData();
                formData.append('activo', isActive ? 'true' : 'false');
                const res = await fetch(`/${state.activeBranchId}/${dishId}/edit_plato`, { method: 'PUT', body: formData });
                if (!res.ok) throw new Error();

                const row = toggle.closest('.dish-edit-row');
                row.classList.toggle('is-inactive', !isActive);
            } catch {
                toggle.checked = !isActive;
                alert('Error al cambiar el estado del plato');
            }
        }
    });

    // Delegación global de eventos de clic
    document.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');

        // Los toggles se manejan con el evento 'change', no con 'click'
        if (action.startsWith('toggle-')) return;

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
            case 'add-dish':
                openDishModal();
                break;
            case 'edit-dish': {
                const dishId = actionBtn.getAttribute('data-dish-id');
                openDishModal(dishId);
                break;
            }
            case 'close-dish':
                closeDishModal();
                break;
        }
    });

    // Cerrar ventanas modales haciendo clic en el backdrop
    [branchModal, workerModal, dishModal, addBranchModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (e) => {
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
});
