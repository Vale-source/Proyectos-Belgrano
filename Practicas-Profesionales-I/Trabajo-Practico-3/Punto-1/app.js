let productos = [];
let carrito = [];
let idProductoSeleccionadoModal = null;
let modalDetalleBootstrap = null;

document.addEventListener("DOMContentLoaded", function () {
    modalDetalleBootstrap = new bootstrap.Modal(document.getElementById("modalDetalle"));

    cargarProductosDesdeJSON();
    configurarEventosFiltros();

    document.getElementById("btn-modal-agregar").addEventListener("click", function () {
        if (idProductoSeleccionadoModal !== null) {
            agregarAlCarrito(idProductoSeleccionadoModal);
        }
    });

    document.getElementById("btn-vaciar-carrito").addEventListener("click", vaciarCarrito);
    document.getElementById("btn-finalizar-compra").addEventListener("click", finalizarCompra);
});

function cargarProductosDesdeJSON() {
    fetch("productos.json")
        .then(function (respuesta) {
            return respuesta.json();
        })
        .then(function (datos) {
            productos = datos;
            mostrarProductos(productos);
        })
        .catch(function (error) {
            console.error("Error al cargar los productos:", error);
            const contenedor = document.getElementById("contenedor-productos");
            contenedor.textContent = "";
            const divError = document.createElement("div");
            divError.className = "col-12 text-center text-danger py-4";
            const pError = document.createElement("p");
            pError.textContent = "Hubo un error al cargar el catálogo de productos.";
            divError.appendChild(pError);
            contenedor.appendChild(divError);
        });
}

function mostrarProductos(lista) {
    const contenedor = document.getElementById("contenedor-productos");
    const contadorResultados = document.getElementById("contador-resultados");
    const mensajeSinResultados = document.getElementById("mensaje-sin-resultados");

    contenedor.textContent = "";

    contadorResultados.textContent = lista.length + (lista.length === 1 ? " producto encontrado" : " productos encontrados");

    if (lista.length === 0) {
        mensajeSinResultados.classList.remove("d-none");
        return;
    } else {
        mensajeSinResultados.classList.add("d-none");
    }

    lista.forEach(function (producto) {
        const columna = document.createElement("div");
        columna.className = "col-md-6 col-xl-4";

        const card = document.createElement("div");
        card.className = "card card-producto h-100 shadow-sm";

        const img = document.createElement("img");
        img.src = producto.imagen;
        img.className = "card-img-top";
        img.alt = producto.nombre;

        const cardBody = document.createElement("div");
        cardBody.className = "card-body";

        const badgesDiv = document.createElement("div");
        badgesDiv.className = "d-flex justify-content-between align-items-start mb-2";

        const badgeCat = document.createElement("span");
        badgeCat.className = "badge bg-light text-dark border";
        badgeCat.textContent = producto.categoria;

        const badgeStock = document.createElement("span");
        badgeStock.className = "badge " + (producto.stock > 0 ? "bg-success" : "bg-danger");
        badgeStock.textContent = "Stock: " + producto.stock;

        badgesDiv.appendChild(badgeCat);
        badgesDiv.appendChild(badgeStock);

        const titulo = document.createElement("h5");
        titulo.className = "card-title fw-bold fs-6 mb-1";
        titulo.textContent = producto.nombre;

        const detalles = document.createElement("p");
        detalles.className = "card-text text-muted small mb-2";
        detalles.textContent = "Talle: " + producto.talle + " | Color: " + producto.color;

        const precio = document.createElement("p");
        precio.className = "precio-producto mb-3";
        precio.textContent = "$" + producto.precio.toLocaleString("es-AR");

        const botonesDiv = document.createElement("div");
        botonesDiv.className = "d-grid gap-2";

        const btnDetalle = document.createElement("button");
        btnDetalle.className = "btn btn-outline-primary btn-sm";
        btnDetalle.textContent = " Ver Detalle";
        const iconDetalle = document.createElement("i");
        iconDetalle.className = "bi bi-eye";
        btnDetalle.prepend(iconDetalle);
        btnDetalle.addEventListener("click", function () {
            verDetalles(producto.id);
        });

        const btnAgregar = document.createElement("button");
        btnAgregar.className = "btn btn-primary btn-sm";
        btnAgregar.textContent = " Agregar al Carrito";
        const iconAgregar = document.createElement("i");
        iconAgregar.className = "bi bi-cart-plus";
        btnAgregar.prepend(iconAgregar);
        if (producto.stock === 0) {
            btnAgregar.disabled = true;
        } else {
            btnAgregar.addEventListener("click", function () {
                agregarAlCarrito(producto.id);
            });
        }

        botonesDiv.appendChild(btnDetalle);
        botonesDiv.appendChild(btnAgregar);

        cardBody.appendChild(badgesDiv);
        cardBody.appendChild(titulo);
        cardBody.appendChild(detalles);
        cardBody.appendChild(precio);
        cardBody.appendChild(botonesDiv);

        card.appendChild(img);
        card.appendChild(cardBody);
        columna.appendChild(card);
        contenedor.appendChild(columna);
    });
}

function verDetalles(id) {
    const producto = productos.find(function (p) {
        return p.id === id;
    });

    if (!producto) return;

    idProductoSeleccionadoModal = producto.id;

    document.getElementById("modal-detalle-img").src = producto.imagen;
    document.getElementById("modal-detalle-img").alt = producto.nombre;
    document.getElementById("modal-detalle-categoria").textContent = producto.categoria;
    document.getElementById("modal-detalle-nombre").textContent = producto.nombre;
    document.getElementById("modal-detalle-precio").textContent = "$" + producto.precio.toLocaleString("es-AR");
    document.getElementById("modal-detalle-descripcion").textContent = producto.descripcion;
    document.getElementById("modal-detalle-talle").textContent = producto.talle;
    document.getElementById("modal-detalle-color").textContent = producto.color;
    document.getElementById("modal-detalle-stock").textContent = producto.stock;

    const btnAgregar = document.getElementById("btn-modal-agregar");
    btnAgregar.textContent = "";
    if (producto.stock === 0) {
        btnAgregar.disabled = true;
        btnAgregar.textContent = "Sin Stock";
    } else {
        btnAgregar.disabled = false;
        const icono = document.createElement("i");
        icono.className = "bi bi-cart-plus";
        btnAgregar.appendChild(icono);
        btnAgregar.append(" Agregar al Carrito");
    }

    modalDetalleBootstrap.show();
}

function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function configurarEventosFiltros() {
    const inputBusqueda = document.getElementById("input-busqueda");
    const selectCategoria = document.getElementById("select-categoria");
    const selectTalle = document.getElementById("select-talle");
    const selectColor = document.getElementById("select-color");
    const inputPrecioMin = document.getElementById("precio-min");
    const inputPrecioMax = document.getElementById("precio-max");
    const btnLimpiar = document.getElementById("btn-limpiar-filtros");

    inputBusqueda.addEventListener("input", filtrarProductos);
    selectCategoria.addEventListener("change", filtrarProductos);
    selectTalle.addEventListener("change", filtrarProductos);
    selectColor.addEventListener("change", filtrarProductos);
    inputPrecioMin.addEventListener("input", filtrarProductos);
    inputPrecioMax.addEventListener("input", filtrarProductos);

    btnLimpiar.addEventListener("click", function () {
        inputBusqueda.value = "";
        selectCategoria.value = "todas";
        selectTalle.value = "todos";
        selectColor.value = "todos";
        inputPrecioMin.value = "";
        inputPrecioMax.value = "";
        mostrarProductos(productos);
    });
}

function filtrarProductos() {
    const textoBuscado = normalizarTexto(document.getElementById("input-busqueda").value);
    const categoriaSeleccionada = document.getElementById("select-categoria").value;
    const talleSeleccionado = document.getElementById("select-talle").value;
    const colorSeleccionado = document.getElementById("select-color").value;
    const precioMin = parseFloat(document.getElementById("precio-min").value);
    const precioMax = parseFloat(document.getElementById("precio-max").value);

    const filtrados = productos.filter(function (producto) {
        const nombreNormalizado = normalizarTexto(producto.nombre);
        const coincideNombre = nombreNormalizado.includes(textoBuscado);
        const coincideCategoria = (categoriaSeleccionada === "todas" || producto.categoria === categoriaSeleccionada);
        const coincideTalle = (talleSeleccionado === "todos" || producto.talle === talleSeleccionado);
        const coincideColor = (colorSeleccionado === "todos" || producto.color === colorSeleccionado);

        let coincidePrecio = true;
        if (!isNaN(precioMin) && producto.precio < precioMin) {
            coincidePrecio = false;
        }
        if (!isNaN(precioMax) && producto.precio > precioMax) {
            coincidePrecio = false;
        }

        return coincideNombre && coincideCategoria && coincideTalle && coincideColor && coincidePrecio;
    });

    mostrarProductos(filtrados);
}

function agregarAlCarrito(id) {
    const producto = productos.find(function (p) {
        return p.id === id;
    });

    if (!producto) return;

    const itemEnCarrito = carrito.find(function (item) {
        return item.id === id;
    });

    if (itemEnCarrito) {
        if (itemEnCarrito.cantidad >= producto.stock) {
            alert("¡Atención! No puedes agregar más unidades. El stock máximo disponible para \"" + producto.nombre + "\" es de " + producto.stock + " unidades.");
            return;
        }
        itemEnCarrito.cantidad++;
    } else {
        if (producto.stock <= 0) {
            alert("Lo sentimos, \"" + producto.nombre + "\" se encuentra agotado.");
            return;
        }
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: producto.imagen,
            stock: producto.stock,
            cantidad: 1
        });
    }

    actualizarCarrito();
    alert("¡\"" + producto.nombre + "\" fue agregado al carrito!");
}

function cambiarCantidad(id, cambio) {
    const item = carrito.find(function (i) {
        return i.id === id;
    });

    if (!item) return;

    if (cambio > 0) {
        if (item.cantidad >= item.stock) {
            alert("No puedes agregar más. Has alcanzado el stock máximo (" + item.stock + " unidades).");
            return;
        }
        item.cantidad++;
    } else if (cambio < 0) {
        item.cantidad--;
        if (item.cantidad <= 0) {
            eliminarDelCarrito(id);
            return;
        }
    }

    actualizarCarrito();
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(function (item) {
        return item.id !== id;
    });
    actualizarCarrito();
}

function vaciarCarrito() {
    if (carrito.length === 0) return;

    if (confirm("¿Estás seguro de que deseas vaciar el carrito?")) {
        carrito = [];
        actualizarCarrito();
    }
}

function finalizarCompra() {
    if (carrito.length === 0) return;

    alert("¡Muchas gracias por tu compra en Moda Urbana! Tu pedido está en proceso.");
    carrito = [];
    actualizarCarrito();

    const modalCarritoElement = document.getElementById("modalCarrito");
    const modalCarritoBootstrap = bootstrap.Modal.getOrCreateInstance(modalCarritoElement);
    if (modalCarritoBootstrap) {
        modalCarritoBootstrap.hide();
    }
}

function actualizarCarrito() {
    const cuerpoTabla = document.getElementById("cuerpo-tabla-carrito");
    const totalElemento = document.getElementById("total-carrito");
    const contadorBadge = document.getElementById("contador-carrito");
    const mensajeVacio = document.getElementById("mensaje-carrito-vacio");
    const tablaContenedor = document.getElementById("tabla-carrito-contenedor");
    const btnVaciar = document.getElementById("btn-vaciar-carrito");
    const btnFinalizar = document.getElementById("btn-finalizar-compra");

    cuerpoTabla.textContent = "";

    let totalPrendas = 0;
    let montoTotal = 0;

    if (carrito.length === 0) {
        mensajeVacio.classList.remove("d-none");
        tablaContenedor.classList.add("d-none");
        btnVaciar.classList.add("d-none");
        btnFinalizar.classList.add("d-none");
        contadorBadge.textContent = "0";
        totalElemento.textContent = "$0";
        return;
    }

    mensajeVacio.classList.add("d-none");
    tablaContenedor.classList.remove("d-none");
    btnVaciar.classList.remove("d-none");
    btnFinalizar.classList.remove("d-none");

    carrito.forEach(function (item) {
        totalPrendas += item.cantidad;
        const subtotal = item.precio * item.cantidad;
        montoTotal += subtotal;

        const fila = document.createElement("tr");

        const tdProducto = document.createElement("td");
        const contProducto = document.createElement("div");
        contProducto.className = "d-flex align-items-center gap-2";

        const imgMin = document.createElement("img");
        imgMin.src = item.imagen;
        imgMin.className = "carrito-img-miniatura";
        imgMin.alt = item.nombre;

        const infoDiv = document.createElement("div");
        const spanNombre = document.createElement("span");
        spanNombre.className = "fw-semibold";
        spanNombre.textContent = item.nombre;

        const br = document.createElement("br");

        const smallStock = document.createElement("small");
        smallStock.className = "text-muted";
        smallStock.textContent = "Stock máx: " + item.stock;

        infoDiv.appendChild(spanNombre);
        infoDiv.appendChild(br);
        infoDiv.appendChild(smallStock);

        contProducto.appendChild(imgMin);
        contProducto.appendChild(infoDiv);
        tdProducto.appendChild(contProducto);

        const tdPrecio = document.createElement("td");
        tdPrecio.textContent = "$" + item.precio.toLocaleString("es-AR");

        const tdCantidad = document.createElement("td");
        tdCantidad.className = "text-center";
        const contCantidad = document.createElement("div");
        contCantidad.className = "d-inline-flex align-items-center gap-1 border rounded px-2 py-1 bg-white";

        const btnRestar = document.createElement("button");
        btnRestar.className = "btn btn-sm btn-light border-0 py-0 px-1";
        const iconRestar = document.createElement("i");
        iconRestar.className = "bi bi-dash";
        btnRestar.appendChild(iconRestar);
        btnRestar.addEventListener("click", function () {
            cambiarCantidad(item.id, -1);
        });

        const spanCantidad = document.createElement("span");
        spanCantidad.className = "fw-bold px-2";
        spanCantidad.textContent = item.cantidad;

        const btnSumar = document.createElement("button");
        btnSumar.className = "btn btn-sm btn-light border-0 py-0 px-1";
        const iconSumar = document.createElement("i");
        iconSumar.className = "bi bi-plus";
        btnSumar.appendChild(iconSumar);
        if (item.cantidad >= item.stock) {
            btnSumar.disabled = true;
        } else {
            btnSumar.addEventListener("click", function () {
                cambiarCantidad(item.id, 1);
            });
        }

        contCantidad.appendChild(btnRestar);
        contCantidad.appendChild(spanCantidad);
        contCantidad.appendChild(btnSumar);
        tdCantidad.appendChild(contCantidad);

        const tdSubtotal = document.createElement("td");
        tdSubtotal.className = "fw-bold text-primary";
        tdSubtotal.textContent = "$" + subtotal.toLocaleString("es-AR");

        const tdAccion = document.createElement("td");
        tdAccion.className = "text-center";
        const btnEliminar = document.createElement("button");
        btnEliminar.className = "btn btn-outline-danger btn-sm";
        btnEliminar.title = "Eliminar producto";
        const iconEliminar = document.createElement("i");
        iconEliminar.className = "bi bi-trash";
        btnEliminar.appendChild(iconEliminar);
        btnEliminar.addEventListener("click", function () {
            eliminarDelCarrito(item.id);
        });
        tdAccion.appendChild(btnEliminar);

        fila.appendChild(tdProducto);
        fila.appendChild(tdPrecio);
        fila.appendChild(tdCantidad);
        fila.appendChild(tdSubtotal);
        fila.appendChild(tdAccion);

        cuerpoTabla.appendChild(fila);
    });

    contadorBadge.textContent = totalPrendas;
    totalElemento.textContent = "$" + montoTotal.toLocaleString("es-AR");
}
