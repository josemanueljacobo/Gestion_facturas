import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Empresas (Companies managed by the system)
export const empresas = sqliteTable('empresas', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    cif_nif: text('cif_nif').unique().notNull(),
    nombre_fiscal: text('nombre_fiscal').notNull(),
    nombre_comercial: text('nombre_comercial'),
    direccion: text('direccion'),
    email: text('email'),
    telefono: text('telefono'),
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Contactos (Suppliers and Clients)
export const contactos = sqliteTable('contactos', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    tipo: text('tipo', { enum: ['proveedor', 'cliente'] }).notNull(),
    cif_nif: text('cif_nif').unique().notNull(),
    nombre_fiscal: text('nombre_fiscal').notNull(),
    nombre_comercial: text('nombre_comercial'),
    codigo_contable: text('codigo_contable'), // e.g., 400.0.0.001
    email: text('email'),
    direccion: text('direccion'),
    pais_iso: text('pais_iso', { length: 2 }).default('ES'),
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Facturas (Invoices)
export const facturas = sqliteTable('facturas', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    tipo: text('tipo', { enum: ['recibida', 'emitida'] }).notNull(),
    empresa_id: text('empresa_id').references(() => empresas.id),
    contacto_id: text('contacto_id').references(() => contactos.id, { onDelete: 'cascade' }),
    numero_factura: text('numero_factura').notNull(),
    fecha_emision: integer('fecha_emision', { mode: 'timestamp' }).notNull(),
    estado: text('estado', {
        enum: ['pendiente_revision', 'validada', 'exportada']
    }).default('pendiente_revision').notNull(),

    // Financial breakdown
    base_imponible_total: real('base_imponible_total').notNull(),
    iva_total: real('iva_total').notNull(),
    total_factura: real('total_factura').notNull(),

    // AI metadata
    url_archivo_pdf: text('url_archivo_pdf'),
    json_ia_raw: text('json_ia_raw', { mode: 'json' }),
    nivel_confianza: real('nivel_confianza'), // 0.0 to 1.0

    // Advanced Tax Fields
    recargo_equivalencia: integer('recargo_equivalencia', { mode: 'boolean' }).default(false),
    porcentaje_retencion: real('porcentaje_retencion').default(0), // IRPF %
    importe_retencion: real('importe_retencion').default(0),      // IRPF Amount

    // Factusol Accounting Fields
    bien_inversion: integer('bien_inversion', { mode: 'boolean' }).default(false), // Col CK
    tipo_retencion: integer('tipo_retencion').default(0), // Col CM (0=None, 1=Prof, etc.)
    clave_operacion: text('clave_operacion').default(''), // Col CN (letter codes: A, B, C, etc.)
    fecha_operacion: integer('fecha_operacion', { mode: 'timestamp' }), // Col CO

    // Factusol export data
    fecha_exportacion: integer('fecha_exportacion', { mode: 'timestamp' }),
    asiento_contable_id: text('asiento_contable_id'),

    departamento_id: text('departamento_id').references(() => departamentos.id),

    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Lineas IVA (VAT lines for invoices with multiple tax rates)
export const lineas_iva = sqliteTable('lineas_iva', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    factura_id: text('factura_id').references(() => facturas.id, { onDelete: 'cascade' }).notNull(),
    base_imponible: real('base_imponible').notNull(),
    porcentaje_iva: real('porcentaje_iva').notNull(),
    cuota_iva: real('cuota_iva').notNull(),
    porcentaje_recargo: real('porcentaje_recargo'),
    cuota_recargo: real('cuota_recargo'),
});

// Departamentos
export const departamentos = sqliteTable('departamentos', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    nombre: text('nombre').notNull(),
    codigo: integer('codigo').unique().notNull(), // Factusol numeric code
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Type exports for TypeScript
export type Empresa = typeof empresas.$inferSelect;
export type NewEmpresa = typeof empresas.$inferInsert;
export type Contacto = typeof contactos.$inferSelect;
export type NewContacto = typeof contactos.$inferInsert;
export type Factura = typeof facturas.$inferSelect;
export type NewFactura = typeof facturas.$inferInsert;
export type LineaIVA = typeof lineas_iva.$inferSelect;
export type NewLineaIVA = typeof lineas_iva.$inferInsert;
export type Departamento = typeof departamentos.$inferSelect;
export type NewDepartamento = typeof departamentos.$inferInsert;
