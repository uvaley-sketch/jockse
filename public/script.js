const API_URL = 'http://localhost:3000/api';

// Variables de paginación
let paginaActual = 1;
const registrosPorPagina = 10;
let todosLosMovimientos = [];
let tasaCambioActual = 36.50;

// Cargar tasa de cambio al iniciar
window.addEventListener('DOMContentLoaded', async () => {
    await cargarTasaCambio();
    await cargarHistorial();
});

async function cargarTasaCambio() {
    try {
        const response = await fetch(`${API_URL}/tasa-cambio`);
        const data = await response.json();
        tasaCambioActual = data.tasa;
        document.getElementById('tasaCambio').value = data.tasa;
    } catch (error) {
        console.error('Error al cargar tasa de cambio:', error);
    }
}

async function actualizarTasaCambio() {
    const tasa = parseFloat(document.getElementById('tasaCambio').value);
    tasaCambioActual = tasa;
    try {
        await fetch(`${API_URL}/tasa-cambio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasa })
        });
        convertirMoneda('usd');
    } catch (error) {
        console.error('Error al actualizar tasa:', error);
    }
}

function mostrarSeccion(seccion) {
    const btnIngresos = document.querySelectorAll('.toggle-btn')[0];
    const btnEgresos = document.querySelectorAll('.toggle-btn')[1];
    const secIngresos = document.getElementById('seccion-ingresos');
    const secEgresos = document.getElementById('seccion-egresos');

    if (seccion === 'ingresos') {
        btnIngresos.classList.add('active');
        btnEgresos.classList.remove('active');
        secIngresos.classList.remove('hidden');
        secEgresos.classList.add('hidden');
    } else {
        btnEgresos.classList.add('active');
        btnIngresos.classList.remove('active');
        secEgresos.classList.remove('hidden');
        secIngresos.classList.add('hidden');
    }
}

function cambiarTipoIngreso() {
    const tipoIngreso = document.querySelector('input[name="tipoIngreso"]:checked').value;
    const campoNuevo = document.getElementById('campoProductoNuevo');
    const campoExistente = document.getElementById('campoProductoExistente');
    const nombreInput = document.getElementById('nombreProducto');

    if (tipoIngreso === 'nuevo') {
        campoNuevo.classList.remove('hidden');
        campoExistente.classList.add('hidden');
        nombreInput.required = true;
    } else {
        campoNuevo.classList.add('hidden');
        campoExistente.classList.remove('hidden');
        nombreInput.required = false;
        cargarProductosExistentes();
    }
}

async function cargarProductosExistentes() {
    const categoria = document.getElementById('categoriaIngreso').value;
    const select = document.getElementById('productoExistente');
    select.innerHTML = '<option value="">Seleccione un producto...</option>';

    if (!categoria) return;

    try {
        const response = await fetch(`${API_URL}/productos/${categoria}`);
        const productos = await response.json();

        productos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.nombre;
            option.textContent = producto.nombre;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
}

function convertirMoneda(origen) {
    const tasa = parseFloat(document.getElementById('tasaCambio').value);
    const usdInput = document.getElementById('precioUSD');
    const bsInput = document.getElementById('precioBs');

    if (origen === 'usd') {
        const usd = parseFloat(usdInput.value) || 0;
        bsInput.value = (usd * tasa).toFixed(2);
    } else {
        const bs = parseFloat(bsInput.value) || 0;
        usdInput.value = (bs / tasa).toFixed(2);
    }
}

async function registrarIngreso(e) {
    e.preventDefault();
    
    const tipoIngreso = document.querySelector('input[name="tipoIngreso"]:checked').value;
    const categoria = document.getElementById('categoriaIngreso').value;
    let nombreProducto;

    if (tipoIngreso === 'nuevo') {
        nombreProducto = document.getElementById('nombreProducto').value;
    } else {
        nombreProducto = document.getElementById('productoExistente').value;
    }

    const cantidad = parseFloat(document.getElementById('cantidad').value);
    const unidad = document.getElementById('unidad').value;
    const precioUSD = parseFloat(document.getElementById('precioUSD').value) || 0;
    const precioBs = parseFloat(document.getElementById('precioBs').value) || 0;

    try {
        const response = await fetch(`${API_URL}/ingresos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nombreProducto,
                categoria,
                cantidad,
                unidad,
                precioUSD,
                precioBs
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('✅ Ingreso registrado exitosamente');
            document.getElementById('formIngreso').reset();
            paginaActual = 1;
            await cargarHistorial();
        } else {
            alert('❌ Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error al registrar ingreso:', error);
        alert('❌ Error al registrar ingreso');
    }
}

async function cargarProductosEgreso() {
    const categoria = document.getElementById('categoriaEgreso').value;
    const select = document.getElementById('productoEgreso');
    select.innerHTML = '<option value="">Seleccione un producto...</option>';
    document.getElementById('infoProducto').classList.add('hidden');

    if (!categoria) return;

    try {
        const response = await fetch(`${API_URL}/productos/${categoria}`);
        const productos = await response.json();

        productos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.nombre;
            option.textContent = producto.nombre;
            option.dataset.cantidad = producto.cantidad;
            option.dataset.unidad = producto.unidad;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
}

function mostrarInfoProducto() {
    const select = document.getElementById('productoEgreso');
    const selectedOption = select.options[select.selectedIndex];

    if (selectedOption.value) {
        const cantidad = selectedOption.dataset.cantidad;
        const unidad = selectedOption.dataset.unidad;
        document.getElementById('cantidadDisponible').textContent = parseFloat(cantidad).toFixed(2);
        document.getElementById('unidadDisponible').textContent = unidad;
        document.getElementById('infoProducto').classList.remove('hidden');
    } else {
        document.getElementById('infoProducto').classList.add('hidden');
    }
}

async function registrarEgreso(e) {
    e.preventDefault();

    const categoria = document.getElementById('categoriaEgreso').value;
    const producto = document.getElementById('productoEgreso').value;
    const cantidad = parseFloat(document.getElementById('cantidadEgreso').value);
    const razon = document.getElementById('razonEgreso').value;

    try {
        const response = await fetch(`${API_URL}/egresos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: producto,
                categoria,
                cantidad,
                razon
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('✅ Egreso registrado exitosamente');
            document.getElementById('formEgreso').reset();
            document.getElementById('infoProducto').classList.add('hidden');
            paginaActual = 1;
            await cargarHistorial();
            await cargarProductosEgreso();
        } else {
            alert('❌ Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error al registrar egreso:', error);
        alert('❌ Error al registrar egreso');
    }
}

async function cargarHistorial() {
    try {
        // Cargar TODOS los movimientos (sin parámetro limit)
        const response = await fetch(`${API_URL}/historial`);
        todosLosMovimientos = await response.json();

        renderizarPagina();
    } catch (error) {
        console.error('Error al cargar historial:', error);
        const tbody = document.getElementById('historialBody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #f00;">Error al cargar el historial</td></tr>';
    }
}

function renderizarPagina() {
    const tbody = document.getElementById('historialBody');
    tbody.innerHTML = '';

    if (todosLosMovimientos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No hay movimientos registrados</td></tr>';
        actualizarControlesPaginacion();
        return;
    }

    // Calcular índices para la paginación
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const movimientosPagina = todosLosMovimientos.slice(inicio, fin);

    // Renderizar los movimientos de la página actual
    movimientosPagina.forEach(mov => {
        const fecha = new Date(mov.fecha);
        const tr = document.createElement('tr');
        tr.className = mov.tipo === 'Ingreso' ? 'ingreso-row' : 'egreso-row';
        
        // Formatear precio/razón
        let precioRazon = mov.razon || '-';
        if (mov.tipo === 'Ingreso') {
            if (mov.precio_usd && mov.precio_bs) {
                precioRazon = `$${mov.precio_usd.toFixed(2)} / Bs ${mov.precio_bs.toFixed(2)}`;
            } else if (mov.precio_usd) {
                precioRazon = `$${mov.precio_usd.toFixed(2)}`;
            } else if (mov.precio_bs) {
                precioRazon = `Bs ${mov.precio_bs.toFixed(2)}`;
            }
        }

        // Obtener TDC directamente de la base de datos
        let tdcTexto = '-';
        if (mov.tdc && mov.tdc > 0) {
            tdcTexto = mov.tdc.toFixed(2);
        }

        tr.innerHTML = `
            <td>${fecha.toLocaleDateString('es-VE')} ${fecha.toLocaleTimeString('es-VE', {hour: '2-digit', minute: '2-digit'})}</td>
            <td><strong>${mov.tipo}</strong></td>
            <td>${mov.producto_nombre}</td>
            <td>${mov.cantidad.toFixed(2)} ${mov.unidad}</td>
            <td>${precioRazon}</td>
            <td>${tdcTexto}</td>
        `;
        tbody.appendChild(tr);
    });

    actualizarControlesPaginacion();
}

function actualizarControlesPaginacion() {
    const totalPaginas = Math.ceil(todosLosMovimientos.length / registrosPorPagina) || 1;
    
    // Actualizar texto de información
    document.getElementById('paginaInfo').textContent = `Página ${paginaActual} de ${totalPaginas}`;
    
    // Habilitar/deshabilitar botones
    document.getElementById('btnAnterior').disabled = paginaActual === 1;
    document.getElementById('btnSiguiente').disabled = paginaActual === totalPaginas;
}

function cambiarPagina(direccion) {
    const totalPaginas = Math.ceil(todosLosMovimientos.length / registrosPorPagina);
    
    paginaActual += direccion;
    
    // Validar límites
    if (paginaActual < 1) paginaActual = 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    
    renderizarPagina();
}

function exportarPaginaPDF() {
    if (todosLosMovimientos.length === 0) {
        alert('⚠️ No hay movimientos para exportar');
        return;
    }

    // Obtener los movimientos de la página actual
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const movimientosPagina = todosLosMovimientos.slice(inicio, fin);

    // Crear PDF con jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIAL DE MOVIMIENTOS', 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${paginaActual}`, 105, 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString('es-VE')}`, 105, 28, { align: 'center' });
    doc.text(`Total de registros: ${movimientosPagina.length}`, 105, 33, { align: 'center' });

    // Línea separadora
    doc.line(10, 36, 200, 36);

    let yPosition = 45;

    movimientosPagina.forEach((mov, index) => {
        const fecha = new Date(mov.fecha);
        const numeroGlobal = inicio + index + 1;

        // Verificar si necesitamos nueva página
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
        }

        // Número de registro
        doc.setFont('helvetica', 'bold');
        doc.text(`#${numeroGlobal}`, 10, yPosition);
        
        // Datos del movimiento
        doc.setFont('helvetica', 'normal');
        yPosition += 5;
        doc.text(`Fecha: ${fecha.toLocaleDateString('es-VE')} ${fecha.toLocaleTimeString('es-VE')}`, 15, yPosition);
        
        yPosition += 5;
        doc.text(`Tipo: ${mov.tipo}`, 15, yPosition);
        doc.text(`Producto: ${mov.producto_nombre}`, 70, yPosition);
        
        yPosition += 5;
        doc.text(`Cantidad: ${mov.cantidad.toFixed(2)} ${mov.unidad}`, 15, yPosition);
        
        // TDC
        let tdcTexto = 'N/A';
        if (mov.tdc && mov.tdc > 0) {
            tdcTexto = mov.tdc.toFixed(2);
        }
        doc.text(`TDC: ${tdcTexto}`, 70, yPosition);
        
        yPosition += 5;
        
        // Precio/Razón
        let precioRazon = mov.razon || 'N/A';
        if (mov.tipo === 'Ingreso') {
            if (mov.precio_usd && mov.precio_bs) {
                precioRazon = `$${mov.precio_usd.toFixed(2)} / Bs ${mov.precio_bs.toFixed(2)}`;
            } else if (mov.precio_usd) {
                precioRazon = `$${mov.precio_usd.toFixed(2)}`;
            } else if (mov.precio_bs) {
                precioRazon = `Bs ${mov.precio_bs.toFixed(2)}`;
            }
        }
        doc.text(`Precio/Razón: ${precioRazon}`, 15, yPosition);

        // Línea separadora
        yPosition += 3;
        doc.line(10, yPosition, 200, yPosition);
        yPosition += 7;
    });

    // Guardar PDF
    const nombreArchivo = `historial_pagina_${paginaActual}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nombreArchivo);

    alert(`✅ PDF generado exitosamente\n\nArchivo: ${nombreArchivo}`);
}