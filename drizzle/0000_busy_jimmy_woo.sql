CREATE TABLE `contactos` (
	`id` text PRIMARY KEY NOT NULL,
	`tipo` text NOT NULL,
	`cif_nif` text NOT NULL,
	`nombre_fiscal` text NOT NULL,
	`nombre_comercial` text,
	`codigo_contable` text,
	`email` text,
	`direccion` text,
	`pais_iso` text(2) DEFAULT 'ES',
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `facturas` (
	`id` text PRIMARY KEY NOT NULL,
	`tipo` text NOT NULL,
	`contacto_id` text,
	`numero_factura` text NOT NULL,
	`fecha_emision` integer NOT NULL,
	`estado` text DEFAULT 'pendiente_revision' NOT NULL,
	`base_imponible_total` real NOT NULL,
	`iva_total` real NOT NULL,
	`total_factura` real NOT NULL,
	`url_archivo_pdf` text,
	`json_ia_raw` text,
	`nivel_confianza` real,
	`recargo_equivalencia` integer DEFAULT false,
	`porcentaje_retencion` real DEFAULT 0,
	`importe_retencion` real DEFAULT 0,
	`fecha_exportacion` integer,
	`asiento_contable_id` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`contacto_id`) REFERENCES `contactos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lineas_iva` (
	`id` text PRIMARY KEY NOT NULL,
	`factura_id` text NOT NULL,
	`base_imponible` real NOT NULL,
	`porcentaje_iva` real NOT NULL,
	`cuota_iva` real NOT NULL,
	`porcentaje_recargo` real,
	`cuota_recargo` real,
	FOREIGN KEY (`factura_id`) REFERENCES `facturas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contactos_cif_nif_unique` ON `contactos` (`cif_nif`);