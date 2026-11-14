// ====== ELEMENTOS ======
const form            = document.getElementById('formulario-tienda');
const listaDiv        = document.getElementById('contenedor-lista');
const buscador        = document.getElementById('buscador');
const listaCiudades   = document.getElementById('lista-ciudades');
const modalLogin      = document.getElementById('modal-login');
const inputPassword   = document.getElementById('input-password');
const loginError      = document.getElementById('login-error');
const btnLogout       = document.getElementById('btn-logout');

// Galería
const inputFile       = document.getElementById('prod-file');
const btnGaleria      = document.getElementById('btn-galeria');
const inputUrl        = document.getElementById('prod-img');
const previewContainer= document.getElementById('preview-container');
const imgPreview      = document.getElementById('img-preview');

const pantallaLogin   = document.getElementById('vista-login');
const appPrincipal    = document.getElementById('app-principal');
const topbarAdminZone = document.getElementById('topbar-admin-zone');

let filtroCiudadActual = null;
let archivoImagenSeleccionado = null; // Guardamos el archivo físico aquí

// ====== CONTROL DE VISTAS ======
const vistas = {
    productos: document.getElementById('vista-productos'),
    agregar:   document.getElementById('vista-agregar')
};

function mostrarVista(nombre) {
    Object.values(vistas).forEach(v => { if (v) v.style.display = 'none'; });
    if (vistas[nombre]) vistas[nombre].style.display = 'block';
    document.querySelectorAll('.nav-item[data-vista]').forEach(a => {
        a.classList.toggle('active', a.dataset.vista === nombre);
    });
}

document.querySelectorAll('.nav-item[data-vista]').forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        const vista = item.dataset.vista;
        if (vista === 'agregar' && modoActual !== 'admin') return;
        if (vista === 'agregar') limpiarFormulario();
        mostrarVista(vista);
    });
});

// ====== MODO / ROL ======
function aplicarModo() {
    const esAdmin = modoActual === 'admin';
    document.querySelectorAll('.solo-admin').forEach(el => {
        el.style.display = esAdmin ? (el.tagName === 'BUTTON' ? 'inline-flex' : 'flex') : 'none';
    });
    if (esAdmin) {
        topbarAdminZone.style.display = 'block';
    } else {
        topbarAdminZone.style.display = 'none'; 
    }
    dibujarProductos(filtrarInventario(buscador.value, filtroCiudadActual));
    generarFiltroCiudades();
}

function cerrarSesion() {
    modoActual = 'invitado';
    appPrincipal.style.display = 'none';
    pantallaLogin.style.display = 'flex';
    modalLogin.style.display = 'none';
    filtroCiudadActual = null;
    buscador.value = '';
    mostrarVista('productos');
}

// ====== LOGIN ======
document.getElementById('btn-entrar-cliente').addEventListener('click', () => {
    modoActual = 'cliente';
    pantallaLogin.style.display = 'none';
    appPrincipal.style.display = 'block';
    aplicarModo();
    mostrarVista('productos');
});

document.getElementById('btn-entrar-admin').addEventListener('click', () => {
    inputPassword.value = '';
    loginError.style.display = 'none';
    modalLogin.style.display = 'flex';
    setTimeout(() => inputPassword.focus(), 100);
});

btnLogout.addEventListener('click', (e) => { e.preventDefault(); cerrarSesion(); });
document.getElementById('btn-cambiar-modo').addEventListener('click', () => {
    if (modoActual === 'admin') cerrarSesion();
});

// ====== VALIDACIÓN ======
document.getElementById('btn-login-ok').addEventListener('click', validarPassword);
inputPassword.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); validarPassword(); }
});
document.getElementById('btn-login-cancel').addEventListener('click', () => {
    modalLogin.style.display = 'none';
});

async function validarPassword() {
    const passIngresada = inputPassword.value;
    const msgBuffer = new TextEncoder().encode(passIngresada);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashIngresado = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashIngresado === PASSWORD_HASH) {
        modalLogin.style.display = 'none';
        modoActual = 'admin';
        pantallaLogin.style.display = 'none';
        appPrincipal.style.display = 'block';
        aplicarModo();
        mostrarVista('productos');
    } else {
        loginError.style.display = 'block';
        inputPassword.select();
    }
}

// ====== LÓGICA DE GALERÍA (ASSETS) ======
btnGaleria.addEventListener('click', () => inputFile.click());

inputFile.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona una imagen válida.');
        return;
    }
    
    archivoImagenSeleccionado = file; // Guardamos el archivo físico

    const reader = new FileReader();
    reader.onload = function(event) {
        imgPreview.src = event.target.result;
        previewContainer.style.display = 'block';
        inputUrl.value = ''; // Limpiamos la URL si suben un archivo
    };
    reader.readAsDataURL(file);
});

// ====== GUARDAR PRODUCTO ======
form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (modoActual !== 'admin') return;

    const idExistente = document.getElementById('prod-id').value;
    const prodId = idExistente ? parseInt(idExistente) : Date.now();
    
    // Determinamos qué hacer con la imagen
    let imagenId = inputUrl.value.trim(); 

    // Si hay un archivo seleccionado de la galería, lo guardamos en la "carpeta" (IndexedDB)
    if (archivoImagenSeleccionado) {
        imagenId = 'img_' + Date.now(); // Creamos un nombre único para el archivo
        await guardarImagenLocal(imagenId, archivoImagenSeleccionado);
    } else if (!imagenId && idExistente) {
        // Si editamos y no cambiamos la foto, mantenemos la anterior
        const prodAnterior = inventario.find(p => p.id === parseInt(idExistente));
        if (prodAnterior) imagenId = prodAnterior.imagen;
    }

    const producto = {
        id: prodId,
        nombre:      document.getElementById('prod-nombre').value.trim(),
        precio:      document.getElementById('prod-precio').value,
        descripcion: document.getElementById('prod-desc').value.trim(),
        ciudad:      document.getElementById('prod-ciudad').value.trim(),
        imagen:      imagenId // Guardamos solo el ID/URL
    };

    if (idExistente) {
        const index = inventario.findIndex(p => p.id === parseInt(idExistente));
        if (index !== -1) inventario[index] = producto;
    } else {
        inventario.push(producto);
    }

    actualizarBaseDeDatos();
    dibujarProductos(filtrarInventario(buscador.value, filtroCiudadActual));
    generarFiltroCiudades();
    limpiarFormulario();
    mostrarVista('productos');
});

function limpiarFormulario() {
    form.reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('btn-accion').innerText = 'GUARDAR ACTIVO';
    document.getElementById('titulo-operacion').textContent = 'REGISTRAR NUEVO ACTIVO';
    archivoImagenSeleccionado = null;
    inputFile.value = '';
    imgPreview.src = '';
    previewContainer.style.display = 'none';
}

// ====== RENDERIZADO DE TARJETAS ======
async function dibujarProductos(datos) {
    listaDiv.innerHTML = '';

    if (datos.length === 0) {
        listaDiv.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 40px; color:#8c8c8c; font-family:var(--font-tactical);">NO HAY ACTIVOS REGISTRADOS.</p>';
        return;
    }

    for (const p of datos) {
        const card = document.createElement('div');
        card.className = 'producto-card';

        // Resolvemos la imagen
        let srcImagen = 'https://via.placeholder.com/300x300?text=NO+IMAGE';
        if (p.imagen) {
            if (p.imagen.startsWith('http')) {
                srcImagen = p.imagen;
            } else if (p.imagen.startsWith('img_')) {
                // Es una imagen guardada en nuestra carpeta local
                srcImagen = await obtenerImagenLocal(p.imagen) || srcImagen;
            }
        }

        const acciones = modoActual === 'admin'
            ? `<div class="acciones">
                   <button class="btn-editar" data-id="${p.id}"><i class="fa-solid fa-pen"></i> EDITAR</button>
                   <button class="btn-eliminar" data-id="${p.id}"><i class="fa-solid fa-trash"></i> BORRAR</button>
               </div>`
            : '';

        card.innerHTML = `
            <img src="${srcImagen}" alt="${p.nombre}" onerror="this.src='https://via.placeholder.com/300x300?text=NO+IMAGE'">
            <div class="tags">
                <span class="tag primary">${p.ciudad}</span>
                ${p.descripcion ? `<span class="tag">${p.descripcion.substring(0, 12)}...</span>` : ''}
            </div>
            <h4>${p.nombre}</h4>
            <p class="sku">SKU: ${p.id.toString().slice(-6)}</p>
            <p class="precio">$${Number(p.precio).toFixed(2)}</p>
            ${acciones}
        `;

        card.querySelectorAll('.btn-editar').forEach(btn =>
            btn.addEventListener('click', () => cargarParaEditar(parseInt(btn.dataset.id)))
        );
        card.querySelectorAll('.btn-eliminar').forEach(btn =>
            btn.addEventListener('click', () => borrarProducto(parseInt(btn.dataset.id)))
        );

        listaDiv.appendChild(card);
    }
}

// ====== EDICIÓN Y ELIMINACIÓN ======
async function cargarParaEditar(id) {
    if (modoActual !== 'admin') return;
    const p = inventario.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('prod-id').value      = p.id;
    document.getElementById('prod-nombre').value  = p.nombre;
    document.getElementById('prod-precio').value  = p.precio;
    document.getElementById('prod-desc').value    = p.descripcion;
    document.getElementById('prod-ciudad').value  = p.ciudad;
    
    archivoImagenSeleccionado = null; // Reseteamos archivo
    
    if (p.imagen) {
        if (p.imagen.startsWith('http')) {
            inputUrl.value = p.imagen;
            imgPreview.src = p.imagen;
        } else if (p.imagen.startsWith('img_')) {
            inputUrl.value = ''; // No mostramos el ID en la URL
            const urlLocal = await obtenerImagenLocal(p.imagen);
            if (urlLocal) {
                imgPreview.src = urlLocal;
            }
        }
        previewContainer.style.display = 'block';
    } else {
        inputUrl.value = '';
        previewContainer.style.display = 'none';
    }

    document.getElementById('btn-accion').innerText = 'ACTUALIZAR ACTIVO';
    document.getElementById('titulo-operacion').textContent = 'EDITAR ACTIVO';

    mostrarVista('agregar');
}

function borrarProducto(id) {
    if (modoActual !== 'admin') return;
    if (!confirm('¿ELIMINAR ESTE ACTIVO DEL INVENTARIO?')) return;
    inventario = inventario.filter(p => p.id !== id);
    actualizarBaseDeDatos();
    dibujarProductos(filtrarInventario(buscador.value, filtroCiudadActual));
    generarFiltroCiudades();
}

// ====== FILTROS Y BÚSQUEDA ======
function generarFiltroCiudades() {
    listaCiudades.innerHTML = '';
    const ciudades = [...new Set(inventario.map(p => p.ciudad))];
    
    const liTodos = document.createElement('li');
    liTodos.innerHTML = `<span>TODAS LAS CIUDADES</span> <span>${inventario.length}</span>`;
    liTodos.className = filtroCiudadActual === null ? 'active' : '';
    liTodos.onclick = () => {
        filtroCiudadActual = null;
        generarFiltroCiudades();
        dibujarProductos(filtrarInventario(buscador.value, filtroCiudadActual));
    };
    listaCiudades.appendChild(liTodos);

    ciudades.forEach(ciudad => {
        const count = inventario.filter(p => p.ciudad === ciudad).length;
        const li = document.createElement('li');
        li.innerHTML = `<span>${ciudad.toUpperCase()}</span> <span>${count}</span>`;
        li.className = filtroCiudadActual === ciudad ? 'active' : '';
        li.onclick = () => {
            filtroCiudadActual = ciudad;
            generarFiltroCiudades();
            dibujarProductos(filtrarInventario(buscador.value, filtroCiudadActual));
        };
        listaCiudades.appendChild(li);
    });
}

buscador.addEventListener('input', () => {
    dibujarProductos(filtrarInventario(buscador.value, filtroCiudadActual));
});

document.querySelector('.btn-buscar-todos').addEventListener('click', () => {
    buscador.value = '';
    filtroCiudadActual = null;
    generarFiltroCiudades();
    dibujarProductos(filtrarInventario('', null));
});

function filtrarInventario(texto, ciudad) {
    return inventario.filter(p => {
        const coincideTexto = p.nombre.toLowerCase().includes(texto.toLowerCase()) ||
                              p.ciudad.toLowerCase().includes(texto.toLowerCase());
        const coincideCiudad = ciudad ? p.ciudad === ciudad : true;
        return coincideTexto && coincideCiudad;
    });
}

document.getElementById('BotonAgregar').addEventListener('click', () => {
    limpiarFormulario();
    mostrarVista('agregar');
});
