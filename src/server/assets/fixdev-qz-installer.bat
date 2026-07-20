@echo off
setlocal enabledelayedexpansion
title FIXDEV ERP - QZ Trust Certificate Installer
color 0A

echo.
echo  ============================================
echo   FIXDEV ERP - QZ Trust Certificate Setup
echo   Windows 7 / 8 / 8.1 / 10 / 11
echo  ============================================
echo.

:: --- Check admin ---
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [ERROR] Must run as Administrator.
    echo.
    echo  Right-click this file and select:
    echo    "Run as administrator"
    echo.
    pause
    exit /b 1
)
echo  [OK] Administrator confirmed.

:: --- Detect QZ Tray ---
set "QZ_PATH="
if exist "C:\Program Files\QZ Tray\qz-tray.exe" set "QZ_PATH=C:\Program Files\QZ Tray"
if exist "C:\Program Files (x86)\QZ Tray\qz-tray.exe" set "QZ_PATH=C:\Program Files (x86)\QZ Tray"
if exist "%LOCALAPPDATA%\Programs\QZ Tray\qz-tray.exe" set "QZ_PATH=%LOCALAPPDATA%\Programs\QZ Tray"

if "%QZ_PATH%"=="" (
    echo  [..] QZ Tray not found. Downloading installer...
    set "QZ_SETUP=%TEMP%\qz-tray-setup.exe"
    certutil -urlcache -split -f "https://download.qz.io/qz-tray-2.2.6.exe" "%QZ_SETUP%" >nul 2>&1
    if not exist "%QZ_SETUP%" (
        powershell -Command "try{[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;Invoke-WebRequest -Uri https://download.qz.io/qz-tray-2.2.6.exe -OutFile %QZ_SETUP% -UseBasicParsing}catch{exit 1}" >nul 2>&1
    )
    if not exist "%QZ_SETUP%" (
        bitsadmin /transfer qz "https://download.qz.io/qz-tray-2.2.6.exe" "%QZ_SETUP%" >nul 2>&1
    )
    if not exist "%QZ_SETUP%" (
        echo  [ERROR] Cannot download QZ Tray.
        echo  Manual: https://qz.io/download
        pause
        exit /b 1
    )
    echo  [..] Installing QZ Tray silently...
    "%QZ_SETUP%" /S >nul 2>&1
    timeout /t 10 /nobreak >nul
    del "%QZ_SETUP%" >nul 2>&1
    if exist "C:\Program Files\QZ Tray\qz-tray.exe" set "QZ_PATH=C:\Program Files\QZ Tray"
    if exist "C:\Program Files (x86)\QZ Tray\qz-tray.exe" set "QZ_PATH=C:\Program Files (x86)\QZ Tray"
    if exist "%LOCALAPPDATA%\Programs\QZ Tray\qz-tray.exe" set "QZ_PATH=%LOCALAPPDATA%\Programs\QZ Tray"
)

if "%QZ_PATH%"=="" (
    echo  [ERROR] QZ Tray install failed.
    echo  Manual: https://qz.io/download
    pause
    exit /b 1
)
echo  [OK] QZ Tray: %QZ_PATH%

:: --- Stop QZ Tray ---
echo  [..] Stopping QZ Tray...
taskkill /f /im qz-tray.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: --- Write certificate from embedded base64 (no network needed) ---
echo  [..] Writing certificate...
set "CERT_FILE=%TEMP%\fixdev-qz-override.crt"
del "%CERT_FILE%" >nul 2>&1

set "CERT_B64=LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURrekNDQW51Z0F3SUJBZ0lVSjVQdDl4K0hHeGxnSHFCa1c4c2dOMTUydGs0d0RRWUpLb1pJaHZjTkFRRUwKQlFBd1dURUxNQWtHQTFVRUJoTUNTVVF4RFRBTEJnTlZCQWdNQkVwaGQyRXhFekFSQmdOVkJBb01Da1pKV0VSRgpWaUJGVWxBeERqQU1CZ05WQkFzTUJWQnlhVzUwTVJZd0ZBWURWUVFEREExbWFYaGtaWFl1ZDJWaUxtbGtNQjRYCkRUSTJNRGN5TURBd05EWXlNMW9YRFRNMk1EY3hOekF3TkRZeU0xb3dXVEVMTUFrR0ExVUVCaE1DU1VReERUQUwKQmdOVkJBZ01CRXBoZDJFeEV6QVJCZ05WQkFvTUNrWkpXRVJGVmlCRlVsQXhEakFNQmdOVkJBc01CVkJ5YVc1MApNUll3RkFZRFZRUUREQTFtYVhoa1pYWXVkMlZpTG1sa01JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBCk1JSUJDZ0tDQVFFQTRiWjlSWDNaMXVqNHdBckI4Um4xSXZoUnBOMm84RkMxbHlEd3RhOWxzbk43ZUJQdGdONksKdGJQVEp6THdFUjFpVEJvRjhIOHJ4aUVyUE9JcWlJT3lFNEpUZVgyOVltQkdFYmZYdzJlaVdxclhXYjJEYm1mZQpBK2FIVjJrS25hc0ROUUdmT0dEclI0QVl4YURaS3pzUnFHbEYxWG9KRkVKZXVXek9INXBaSzBnM3ZybTdsY3hJCmErZHpsRzhuazRYYmlHaWVFVTVtR2dhK05lN0RmOGJieVVNb00xSzhVL3BIRDROcVlNOHVwOExiaTU4NkVESGEKY3h4b01xNXU2QlNJbFZ2NlR4YkQzcVIxMVhxc0tHbTcveFl2SnRZMzFLOTNFTHdsZTZ4azBFaUFEK3lYTWZpYQp1d3NoWWY5MFJYT3oxK0RoODRlSjBVcGkvbUsyRlFoTWp3SURBUUFCbzFNd1VUQWRCZ05WSFE0RUZnUVV0cnB3CnEzajZOcERLendYMXJiNTdBZkNVV3FZd0h3WURWUjBqQkJnd0ZvQVV0cnB3cTNqNk5wREt6d1gxcmI1N0FmQ1UKV3FZd0R3WURWUjBUQVFIL0JBVXdBd0VCL3pBTkJna3Foa2lHOXcwQkFRc0ZBQU9DQVFFQWhhMyt3c0EwYTJXbgpPZTBBTW9KRXpzNVZEM2QyRnNKcW1udnpSRjdoWXFXRk5pYjNjeXVIUXNQQlpqYTMzYU0zV2JJUHc2dGd6bVJKClNQa2J1bURvY05qK1RjcWlpc1NVMkpDZzdxQnVYN25kMnRMemN4RGF4Z2dSNlNvWkJQRzZwNGRNMGJUU2VuUEcKa3FOMHFITUtMV1psaU1jV05FNEJKSUd6N21xVEJqREFVT2RzSnRzSHBIRjdqR0RDL090OEpXR2dkeldjOXhNegptK2FvaURpK3ZRcExUQTExZ1ZSMkYvMFF3MkgvTmJJZHEyN0ZLemcrQUM5UXdvUVlTc0VUMUV6ZGpwUGYwcXd4CnZ6UXREaFpWeUxsVCt3RjdJRnduOGpCTVVLK3YwOUdCajkxWDF4cGppbjQ2a2VKZXV0Z2U5V1MxWWlBUTZ0dlUKeWkwY01wNmZmZz09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K"

echo !CERT_B64! > "%TEMP%\qz-cert.b64"
certutil -decode "%TEMP%\qz-cert.b64" "%CERT_FILE%" >nul 2>&1
del "%TEMP%\qz-cert.b64" >nul 2>&1

if not exist "%CERT_FILE%" (
    echo  [ERROR] Certificate decode failed.
    pause
    exit /b 1
)

findstr /c:"BEGIN CERTIFICATE" "%CERT_FILE%" >nul 2>&1
if %errorLevel% neq 0 (
    echo  [ERROR] Invalid certificate content.
    type "%CERT_FILE%" 2>nul
    del "%CERT_FILE%" >nul 2>&1
    pause
    exit /b 1
)
echo  [OK] Certificate verified.

:: --- Install certificate ---
copy /Y "%CERT_FILE%" "%QZ_PATH%\override.crt" >nul
del "%CERT_FILE%" >nul 2>&1
if not exist "%QZ_PATH%\override.crt" (
    echo  [ERROR] Copy failed.
    pause
    exit /b 1
)
echo  [OK] Installed: %QZ_PATH%\override.crt

:: --- Configure properties ---
set "PROPS_DIR=%APPDATA%\qz-tray"
set "PROPS_FILE=%PROPS_DIR%\qz-tray.properties"
if not exist "%PROPS_DIR%" mkdir "%PROPS_DIR%" >nul 2>&1
if not exist "%PROPS_FILE%" type nul > "%PROPS_FILE%"

if exist "%PROPS_FILE%" (
    findstr /v /c:"authcert.override" "%PROPS_FILE%" > "%TEMP%\qz-clean.tmp" 2>nul
    move /Y "%TEMP%\qz-clean.tmp" "%PROPS_FILE%" >nul 2>&1
)
echo authcert.override=%QZ_PATH%\override.crt >> "%PROPS_FILE%"
echo  [OK] qz-tray.properties configured.

:: --- Restart QZ Tray ---
echo  [..] Starting QZ Tray...
start "" "%QZ_PATH%\qz-tray.exe"
timeout /t 3 /nobreak >nul
tasklist /fi "imagename eq qz-tray.exe" 2>nul | find /i "qz-tray.exe" >nul 2>&1
if %errorLevel% equ 0 (echo  [OK] QZ Tray running.) else (echo  [WARN] Start QZ Tray manually.)

echo.
echo  ============================================
echo   DONE!
echo  ============================================
echo.
echo  1. Open Chrome - fixdev.web.id
echo  2. Press Ctrl+Shift+R
echo  3. Settings - Printer - QZ Tray mode
echo  4. Click Test Print
echo  ============================================
echo.
pause