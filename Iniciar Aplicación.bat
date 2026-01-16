@echo off
chcp 65001 >nul
title Sistema de Gestion de Facturas
cd /d "%~dp0"
echo ========================================
echo   Sistema de Gestion de Facturas
echo ========================================
echo.

REM Limpiar cache de Next.js para evitar errores
echo Limpiando cache...
REM La limpieza de cache se ha desactivado para acelerar el inicio.
REM Si tienes problemas graves, borra la carpeta .next manualmente.
REM if exist ".next" (
REM     rmdir /s /q ".next" 2>nul
REM     echo Cache limpiada correctamente.
REM ) else (
REM     echo No hay cache que limpiar.
REM )
echo.

echo Iniciando servidor de desarrollo...
echo.

REM Abrir navegador despues de un pequeno retraso
start "" cmd /c "timeout /t 8 /nobreak >nul && start http://localhost:3000"

echo ========================================
echo La aplicacion estara disponible en:
echo http://localhost:3000
echo.
echo Para detener: cierra esta ventana o presiona Ctrl+C
echo ========================================
echo.

REM Ejecutar npm run dev directamente (mantiene la ventana abierta)
npm run dev
