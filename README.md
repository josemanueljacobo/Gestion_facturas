# Sistema de Gestión de Facturas

Aplicación web para gestionar facturas con extracción automática de datos mediante IA (Google Gemini).

## Requisitos

- **Node.js** v18 o superior
- **npm** (incluido con Node.js)
- **Clave API de Google Gemini** (para la extracción IA)

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/josemanueljacobo/Gestion_facturas.git
cd Gestion_facturas
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
DATABASE_URL=file:./data/database.db
GEMINI_API_KEY=tu_clave_api_de_gemini
```

> **Nota**: Obtén tu clave API de Gemini en [Google AI Studio](https://aistudio.google.com/app/apikey)

### 4. Inicializar la base de datos

```bash
npm run db:push
```

### 5. Iniciar la aplicación

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

## Uso

### Subir Facturas
1. Ir a **Facturas** en el menú lateral
2. Clic en **"Subir Facturas"**
3. Seleccionar archivos PDF
4. La IA extraerá automáticamente los datos

### Validar Facturas
1. Las facturas subidas aparecen como "Pendiente Revisión"
2. Clic en **"Validar"** para revisar y corregir los datos
3. Clic en **"Validar y Guardar"** para confirmar

### Gestionar Contactos
- Ir a **Contactos** para añadir/editar proveedores y clientes
- También se pueden importar desde Excel

### Departamentos
- Ir a **Departamentos** para gestionar centros de coste

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia en modo desarrollo |
| `npm run build` | Compila para producción |
| `npm run start` | Inicia en modo producción |
| `npm run db:push` | Sincroniza el esquema de BD |
| `npm run db:studio` | Abre Drizzle Studio (BD visual) |

## Estructura del Proyecto

```
app-facturas/
├── app/                 # Páginas Next.js
│   ├── api/             # Rutas API
│   ├── facturas/        # Módulo de facturas
│   ├── contactos/       # Módulo de contactos
│   └── departamentos/   # Módulo de departamentos
├── lib/
│   ├── db/              # Esquema y conexión BD
│   └── services/        # Servicios (IA, etc.)
├── data/                # Base de datos SQLite
└── scripts/             # Scripts de utilidad
```

## Tecnologías

- **Next.js 14** - Framework React
- **Drizzle ORM** - ORM para SQLite
- **SQLite** - Base de datos local
- **Google Gemini** - IA para extracción de datos
- **TypeScript** - Tipado estático

## Licencia

MIT
