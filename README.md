# 🗳️ Elecciones Estudiantiles UNR — Escrutinio Digital

App para cargar y visualizar resultados de elecciones estudiantiles de la UNR.
Soporta Centro de Estudiantes y Consejo Directivo con distribución D'Hondt.

---

## 🚀 Deploy en Render (paso a paso)

### 1. Subir a GitHub

```bash
# En tu computadora, en la carpeta del proyecto:
git init
git add .
git commit -m "primera versión"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/elecciones-unr.git
git push -u origin main
```

### 2. Crear base de datos en Render

1. Entrá a [render.com](https://render.com) y creá una cuenta (gratis)
2. Click en **New +** → **PostgreSQL**
3. Nombre: `elecciones-unr-db`
4. Plan: **Free**
5. Click **Create Database**
6. Copiá el valor de **Internal Database URL** (lo vas a necesitar en el paso 4)

### 3. Crear el Web Service en Render

1. Click en **New +** → **Web Service**
2. Conectá tu repo de GitHub (`elecciones-unr`)
3. Completá estos campos:
   - **Name**: `elecciones-unr`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 4. Configurar variables de entorno

En el Web Service, ir a **Environment** y agregar:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | (pegá el Internal Database URL del paso 2) |
| `ADMIN_KEY` | (elegí una contraseña, ej: `rosario2025`) |
| `NODE_ENV` | `production` |

### 5. Deploy

Click en **Create Web Service**. Render va a buildear y deployar automáticamente.
En 2-3 minutos tenés la URL pública (ej: `https://elecciones-unr.onrender.com`).

---

## 💻 Desarrollo local

```bash
# Instalar dependencias raíz
npm install

# Instalar dependencias del cliente
cd client && npm install && cd ..

# Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL local

# Levantar servidor + cliente juntos
npm run dev
```

El cliente corre en `http://localhost:5173`  
El servidor corre en `http://localhost:3001`

---

## 📁 Estructura del proyecto

```
elecciones-unr/
├── server/
│   └── index.js          # Express + PostgreSQL
├── client/
│   ├── src/
│   │   ├── App.jsx        # App principal
│   │   ├── PanelFiscal.jsx
│   │   ├── PanelResultados.jsx
│   │   ├── PanelLog.jsx
│   │   ├── UI.jsx         # Componentes reutilizables
│   │   ├── config.js      # Facultades y agrupaciones UNR
│   │   ├── api.js         # Llamadas al backend
│   │   └── dhondt.js      # Algoritmo D'Hondt
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── package.json
├── .env.example
└── .gitignore
```

---

## 📊 Exportar resultados

Desde la pestaña **Resultados**, click en **⬇ Exportar CSV / Excel**.  
El archivo se abre directamente en Excel con todas las columnas:
- Facultad, Tipo (Centro/Consejo), Agrupación, Votos, Bancas D'Hondt

---

## 🔐 Seguridad

- El borrado de resultados requiere la `ADMIN_KEY` definida en Render
- No hay login de fiscales (se asume que el link se comparte internamente)
- Los datos se actualizan automáticamente cada 30 segundos en todos los dispositivos

---

## ❓ Problemas frecuentes

**La app tarda en cargar la primera vez**  
El plan free de Render "duerme" el servidor tras 15 min de inactividad. La primera visita puede tardar 30-60 segundos.

**Error de conexión a la DB**  
Verificá que `DATABASE_URL` esté correctamente copiada en las variables de entorno de Render.
