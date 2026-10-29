# Sabor · Sistema de Gestión Gastronómica

Plataforma integral para la administración operativa de cadenas gastronómicas. Permite gestionar sucursales, horarios de atención, asignación de empleados con roles salariales, cartas de platos y auditoría de accesos bajo un esquema seguro de autenticación.

---

## Tecnologías

* **Backend:** Python 3 + Flask 3
* **ORM & Base de Datos:** SQLAlchemy 2.0 + MariaDB (PyMySQL)
* **Migraciones de Esquema:** Alembic
* **Contenedores:** Docker & Docker Compose
* **Seguridad Web:**
  * **Flask-WTF / CSRFProtect:** Mitigación de ataques CSRF mediante inyección transparente de token en peticiones AJAX/Fetch.
  * **Flask-Limiter:** Limitación de tasa de solicitudes (rate limiting) en endpoints críticos contra ataques de fuerza bruta.
  * **Cabeceras HTTP de Seguridad:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.
  * **Cookies de Sesión Seguras:** `HttpOnly`, `SameSite=Lax`.
* **Auditoría:** `RotatingFileHandler` con rotación automática de bitácora en `logs/access.log`.

---

## Guía de Instalación y Puesta en Marcha

Sigue estos pasos en orden para inicializar el proyecto desde cero:

### 1. Crear el Entorno Virtual e Instalar Dependencias

1. Crea el entorno virtual de Python:
   ```bash
   python3 -m venv .venv
   ```

2. Activa el entorno virtual:
   * **Linux / macOS:**
     ```bash
     source .venv/bin/activate
     ```
   * **Windows:**
     ```bash
     .venv\Scripts\activate
     ```

3. Instala todas las dependencias del proyecto:
   ```bash
   pip install -r requirements.txt
   ```

---

### 2. Configurar Variables de Entorno (.env)

Crea tu archivo `.env` a partir del ejemplo proporcionado:

```bash
cp .env.example .env
```

Verifica o ajusta los parámetros de conexión:

```ini
DB_USER=root
DB_PASSWORD=rootpass
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sabor
```

---

### 3. Levantar la Base de Datos con Docker

Inicia el contenedor de MariaDB en segundo plano utilizando Docker Compose:

```bash
docker compose up -d
```

Espera unos segundos a que el motor de MariaDB complete su proceso de inicialización antes de continuar.

---

### 4. Generar y Ejecutar las Migraciones con Alembic

Con la base de datos levantada y limpia, genera la versión de migración a partir de los modelos de SQLAlchemy y luego aplícala:

1. Genera el script de migración automática:
   ```bash
   alembic revision --autogenerate -m "crear_tablas_iniciales"
   ```

2. Aplica la migración para crear todas las tablas en la base de datos:
   ```bash
   alembic upgrade head
   ```

3. (Opcional) Verifica que la base de datos esté en la última versión:
   ```bash
   alembic current
   ```

---

### 5. Cargar Datos de Prueba (seed.sql)

Para poblar las tablas con datos base de prueba (sucursales, puestos, empleados, horarios y platos), dispones de dos alternativas:

* **Opción A (Mediante Docker en terminal):**
  ```bash
  docker exec -i sabor_mariadb mariadb -u root -prootpass sabor < models/seed.sql
  ```
  *(Si cambiaste la contraseña en `.env`, reemplaza `-prootpass` por la tuya).*

* **Opción B (Mediante gestor gráfico de base de datos):**
  Abre el archivo `models/seed.sql`, copia todo su contenido, pégalo en una pestaña de consultas SQL de tu gestor preferido (DBeaver, DataGrip, MySQL Workbench, HeidiSQL, phpMyAdmin, etc.) conectado a la base `sabor`, y ejecútalo.

---

### 6. Iniciar la Aplicación y Registrar el Primer Administrador

1. Inicia el servidor de desarrollo:
   ```bash
   python app.py
   ```
   La aplicación se ejecutará en: `http://127.0.0.1:5000/`.

2. Abre tu navegador y dirígete al endpoint de registro:
   **`http://127.0.0.1:5000/auth/signup`**

3. **Bootstrap del Primer Admin:**
   * Dado que la base de datos comienza sin usuarios, el sistema te permitirá registrar el primer Administrador.
   * Una vez creada esta cuenta, el registro público se deshabilita automáticamente y solo administradores autenticados podrán dar de alta nuevas cuentas.

---

### 7. Iniciar Sesión y Operar el Panel

1. Ingresa a la pantalla de login:
   **`http://127.0.0.1:5000/auth/login`**

2. Introduce las credenciales recién creadas.

3. Al iniciar sesión accederás al panel administrativo (`/`), con las siguientes funcionalidades:
   * **Dashboard de Sucursales:** Vista general con métricas de sucursales, empleados y platos.
   * **Activación/Desactivación en tiempo real:** Interruptor para alternar el estado activo de sucursales, empleados y platos sin recargar la página.
   * **Gestión de Personal y Menú:** Modales para dar de alta y editar trabajadores, turnos y platos.
   * **Registrar Administrador:** Enlace en la barra lateral izquierda (`+ Registrar Admin`) para que el admin actual cree nuevas cuentas.
   * **Cerrar Sesión:** Enlace seguro en el pie de la barra lateral para finalizar la sesión activa.

---

## Estructura del Proyecto

```text
├── alembic/                # Historial y scripts de migraciones de base de datos
├── models/
│   ├── models.py           # Modelos de SQLAlchemy 2.0 (DeclarativeBase)
│   └── seed.sql            # Script DML con datos de prueba iniciales
├── routes/
│   ├── __init__.py         # Registro centralizado de Blueprints
│   ├── auth.py             # Autenticación (login, signup, logout)
│   ├── sucursales.py       # Endpoints de sucursales y dashboard principal
│   ├── empleados.py        # Endpoints para creación y edición de empleados
│   └── platos.py           # Endpoints para gestión de platos
├── static/
│   ├── admin.css           # Estilos de la aplicación y pantallas de autenticación
│   └── admin.js            # Lógica AJAX interactiva e interceptor global de CSRF
├── templates/
│   ├── index.html          # Panel principal de administración
│   └── login/
│       ├── login.html      # Formulario de inicio de sesión
│       └── signup.html     # Formulario de alta de administradores
├── utils/
│   ├── extensions.py       # Inicialización de extensiones (CSRF, Limiter, Logging)
│   └── decorators.py       # Decoradores personalizados (@login_required)
├── app.py                  # Fábrica de la aplicación (create_app) y middleware
├── database.py             # Motor SQLAlchemy, SessionLocal y Base declarativa
├── docker-compose.yml      # Definición del servicio de base de datos MariaDB
└── requirements.txt        # Dependencias fijadas del proyecto
```
