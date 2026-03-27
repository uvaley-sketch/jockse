const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ============ RUTAS API ============

// Obtener tasa de cambio
app.get('/api/tasa-cambio', (req, res) => {
    db.get('SELECT valor FROM configuracion WHERE clave = ?', ['tasa_cambio'], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ tasa: row ? parseFloat(row.valor) : 36.50 });
    });
});

// Actualizar tasa de cambio
app.post('/api/tasa-cambio', (req, res) => {
    const { tasa } = req.body;
    db.run(
        'UPDATE configuracion SET valor = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE clave = ?',
        [tasa.toString(), 'tasa_cambio'],
        (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, tasa });
        }
    );
});

// Registrar ingreso
app.post('/api/ingresos', (req, res) => {
    const { nombre, categoria, cantidad, unidad, precioUSD, precioBs } = req.body;

    // Obtener tasa de cambio actual
    db.get('SELECT valor FROM configuracion WHERE clave = ?', ['tasa_cambio'], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const tasaCambio = row ? parseFloat(row.valor) : null;

        // Insertar o actualizar producto en inventario
        db.run(
            `INSERT INTO productos (nombre, categoria, cantidad, unidad, precio_usd, precio_bs)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(nombre, categoria) 
             DO UPDATE SET 
                cantidad = cantidad + ?,
                precio_usd = ?,
                precio_bs = ?`,
            [nombre, categoria, cantidad, unidad, precioUSD, precioBs, cantidad, precioUSD, precioBs],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // Registrar en historial CON TDC
                db.run(
                    `INSERT INTO movimientos (tipo, producto_nombre, categoria, cantidad, unidad, precio_usd, precio_bs, tdc)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    ['Ingreso', nombre, categoria, cantidad, unidad, precioUSD, precioBs, tasaCambio],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ success: true, message: 'Ingreso registrado' });
                    }
                );
            }
        );
    });
});

// Registrar egreso
app.post('/api/egresos', (req, res) => {
    const { nombre, categoria, cantidad, razon } = req.body;

    // Verificar que hay suficiente stock
    db.get(
        'SELECT * FROM productos WHERE nombre = ? AND categoria = ?',
        [nombre, categoria],
        (err, producto) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!producto) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            if (producto.cantidad < cantidad) {
                return res.status(400).json({ error: 'Cantidad insuficiente en inventario' });
            }

            // Actualizar inventario
            db.run(
                'UPDATE productos SET cantidad = cantidad - ? WHERE nombre = ? AND categoria = ?',
                [cantidad, nombre, categoria],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    // Registrar en historial
                    db.run(
                        `INSERT INTO movimientos (tipo, producto_nombre, categoria, cantidad, unidad, razon)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        ['Egreso', nombre, categoria, cantidad, producto.unidad, razon],
                        (err) => {
                            if (err) {
                                return res.status(500).json({ error: err.message });
                            }
                            res.json({ success: true, message: 'Egreso registrado' });
                        }
                    );
                }
            );
        }
    );
});

// Obtener productos por categoría
app.get('/api/productos/:categoria', (req, res) => {
    const { categoria } = req.params;
    db.all(
        'SELECT * FROM productos WHERE categoria = ? ORDER BY nombre',
        [categoria],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Obtener todos los productos
app.get('/api/productos', (req, res) => {
    db.all('SELECT * FROM productos ORDER BY categoria, nombre', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Obtener stock de inventario con paginación
app.get('/api/stock/:categoria', (req, res) => {
    const { categoria } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Obtener productos con paginación
    db.all(
        `SELECT * FROM productos 
         WHERE categoria = ? 
         ORDER BY nombre 
         LIMIT ? OFFSET ?`,
        [categoria, limit, offset],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Obtener total de productos
            db.get(
                'SELECT COUNT(*) as total FROM productos WHERE categoria = ?',
                [categoria],
                (err, countRow) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({
                        productos: rows,
                        total: countRow.total,
                        page: page,
                        totalPages: Math.ceil(countRow.total / limit)
                    });
                }
            );
        }
    );
});

// MODIFICADO: Obtener historial de movimientos - SIN LÍMITE cuando no se especifica
app.get('/api/historial', (req, res) => {
    // Si NO se pasa el parámetro limit, devolver TODOS los registros
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    
    let query = 'SELECT * FROM movimientos ORDER BY fecha DESC';
    let params = [];
    
    if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Obtener historial de movimientos por tipo con paginación
app.get('/api/historial/:tipo', (req, res) => {
    const { tipo } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    // Obtener movimientos con paginación
    db.all(
        `SELECT * FROM movimientos 
         WHERE tipo = ? 
         ORDER BY fecha DESC 
         LIMIT ? OFFSET ?`,
        [tipo, limit, offset],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Obtener total de movimientos
            db.get(
                'SELECT COUNT(*) as total FROM movimientos WHERE tipo = ?',
                [tipo],
                (err, countRow) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({
                        movimientos: rows,
                        total: countRow.total,
                        page: page,
                        totalPages: Math.ceil(countRow.total / limit)
                    });
                }
            );
        }
    );
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});