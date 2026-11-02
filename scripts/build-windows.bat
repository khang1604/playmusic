@echo off
REM ==============================================================================
REM PlayMusic Studio - Windows Installer (.exe & .msi) Build Script
REM ==============================================================================
echo ============================================================
echo  Building PlayMusic Studio for Windows
echo ============================================================

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%.."

echo [1/3] Building Frontend Web Bundle...
cd frontend
call npm install
call npm run build
cd ..

echo [2/3] Checking Cargo & Tauri CLI...
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Rust / Cargo not found. Please install Rust from https://rustup.rs
    pause
    exit /b 1
)

where cargo-tauri >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] Installing Tauri CLI...
    cargo install tauri-cli --version "^2.0.0" --locked
)

echo [3/3] Building Windows Installer (.exe & .msi)...
cargo tauri build --ignore-version-mismatches

echo ============================================================
echo  [SUCCESS] Windows Installers Generated:
echo  NSIS .exe: src-tauri\target\release\bundle\nsis\
echo  MSI:      src-tauri\target\release\bundle\msi\
echo ============================================================
pause

