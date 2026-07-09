#!/bin/bash

# Check if git is installed
if ! command -v git &> /dev/null
then
    echo "❌ Git no está instalado en este sistema. Por favor instálalo para continuar."
    exit 1
fi

# Ask for the GitHub repository URL if not provided
REMOTE_URL=$1
if [ -z "$REMOTE_URL" ]; then
    echo "--------------------------------------------------------"
    echo "🚀 ASISTENTE DE SUBIDA A GITHUB - LEAD PROSPECTOR"
    echo "--------------------------------------------------------"
    echo "Por favor, ingresa la URL de tu repositorio vacío de GitHub"
    echo "Ejemplo: https://github.com/tu-usuario/lead-prospector.git"
    echo "--------------------------------------------------------"
    read -p "URL del repositorio: " REMOTE_URL
fi

if [ -z "$REMOTE_URL" ]; then
    echo "❌ URL del repositorio vacía. Cancelando."
    exit 1
fi

# Initialize git if not already a repository
if [ ! -d ".git" ]; then
    echo "⚙️ Inicializando repositorio Git local..."
    git init
fi

# Create a clean .gitignore in the root to avoid uploading heavy folders and secrets
cat << 'EOF' > .gitignore
# Dependencias de Node
node_modules/
jspm_packages/
web_modules/

# Compilaciones
dist/
dist-ssr/
*.local

# Bases de datos locales y archivos temporales
*.db
*.db-journal
lead_prospector.db

# Variables de entorno
.env
.env.production
.env.development

# Logs de error
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Sistema operativo
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
EOF

# Add all files to stage
echo "➕ Agregando archivos al repositorio..."
git add .

# Create initial commit
echo "💾 Creando commit inicial..."
git commit -m "feat: setup lead prospector unified cloud application ready for Render deployment"

# Ensure branch is main
git branch -M main

# Configure remote origin
echo "🔗 Vinculando repositorio local con GitHub..."
git remote remove origin 2>/dev/null
git remote add origin "$REMOTE_URL"

# Push to GitHub
echo "🚀 Subiendo código a GitHub (rama main)..."
echo "Nota: Si GitHub te pide credenciales, usa tu Token de Acceso Personal (PAT) como contraseña."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "--------------------------------------------------------"
    echo "✅ ¡Proyecto subido a GitHub con éxito!"
    echo "Ahora puedes ir a Render.com y conectar este repositorio."
    echo "--------------------------------------------------------"
else
    echo "--------------------------------------------------------"
    echo "❌ Error al subir a GitHub."
    echo "Asegúrate de que el repositorio de GitHub existe y de tener permisos de acceso."
    echo "--------------------------------------------------------"
fi
