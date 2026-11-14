class Producto {
    constructor(id, nombre, precio, descripcion, ciudad, imagen) {
        this.id = id;
        this.nombre = nombre;
        this.precio = parseFloat(precio);
        this.descripcion = descripcion;
        this.ciudad = ciudad;
        this.imagen = imagen || ''; 
    }
}

// Contraseña del sistema
const PASSWORD_RAW = '28443680';
let PASSWORD_HASH = '';

let inventario = JSON.parse(localStorage.getItem('mis_productos')) || [];
let modoActual = 'invitado'; 

async function inicializarPassword() {
    const msgBuffer = new TextEncoder().encode(PASSWORD_RAW);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    PASSWORD_HASH = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
inicializarPassword();

function actualizarBaseDeDatos() {
    localStorage.setItem('mis_productos', JSON.stringify(inventario));
}

// ==========================================
// SISTEMA DE "ASSETS" (IndexedDB para imágenes)
// ==========================================
const dbPromise = new Promise((resolve, reject) => {
    // Abrimos/creamos la base de datos de archivos
    const request = indexedDB.open("PuntoAlfaAssetsDB", 1);
    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('imagenes')) {
            db.createObjectStore('imagenes', { keyPath: 'id' });
        }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
});

// Guardar archivo en el "directorio virtual"
async function guardarImagenLocal(id, file) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('imagenes', 'readwrite');
        const store = transaction.objectStore('imagenes');
        const request = store.put({ id: id, data: file });
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
    });
}

// Obtener la imagen guardada para mostrarla en la web
async function obtenerImagenLocal(id) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('imagenes', 'readonly');
        const store = transaction.objectStore('imagenes');
        const request = store.get(id);
        request.onsuccess = (e) => {
            const record = e.target.result;
            if (record) {
                // Convertimos los datos de vuelta a un Blob (archivo real)
                const blob = new Blob([record.data], { type: record.data.type });
                resolve(URL.createObjectURL(blob));
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}
