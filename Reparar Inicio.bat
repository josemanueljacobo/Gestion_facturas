@echo off
chcp 65001 >nul
title Reparar Inicio - Sistema de Facturas
cd /d "%~dp0"

echo ========================================
echo   REPARAR INICIO
echo ========================================
echo.
echo 1. Cerrando procesos bloqueados...
taskkill /F /IM node.exe 2>nul
echo.

echo 2. Limpiando cache corrupta...
if exist ".next" (
    rmdir /s /q ".next"
    echo Cache eliminada.
) else (
    echo No se encontro cache previa.
)
echo.

echo 3. Iniciando aplicacion...
echo Por favor, espera mientras se reconstruye el proyecto...
echo.

start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"
npm run dev
