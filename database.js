const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear o abrir la base de datos
const dbPath = path.join(__dirname, 'inventario.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
        initDatabase();
    }
});

// Inicializar las tablas
function initDatabase() {
    // Tabla de productos en inventario
    db.run(`
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            categoria TEXT NOT NULL,
            cantidad REAL DEFAULT 0,
            unidad TEXT NOT NULL,
            precio_usd REAL,
            precio_bs REAL,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(nombre, categoria)
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla productos:', err.message);
        } else {
            console.log('✅ Tabla "productos" lista');
        }
    });

    // Tabla de historial de movimientos (ingresos y egresos)
    db.run(`
        CREATE TABLE IF NOT EXISTS movimientos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            producto_nombre TEXT NOT NULL,
            categoria TEXT NOT NULL,
            cantidad REAL NOT NULL,
            unidad TEXT NOT NULL,
            precio_usd REAL,
            precio_bs REAL,
            tdc REAL,
            razon TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla movimientos:', err.message);
        } else {
            console.log('✅ Tabla "movimientos" lista');
            // Agregar columna TDC si no existe (para bases de datos existentes)
            db.run(`ALTER TABLE movimientos ADD COLUMN tdc REAL`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Error al agregar columna tdc:', err.message);
                } else if (!err) {
                    console.log('✅ Columna "tdc" agregada a movimientos');
                }
            });
        }
    });

    // Tabla de configuración (para tasa de cambio)
    db.run(`
        CREATE TABLE IF NOT EXISTS configuracion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla configuracion:', err.message);
        } else {
            console.log('✅ Tabla "configuracion" lista');
            // Insertar tasa de cambio por defecto si no existe
            db.run(`
                INSERT OR IGNORE INTO configuracion (clave, valor) 
                VALUES ('tasa_cambio', '36.50')
            `);
        }
    });
}

module.exports = db;