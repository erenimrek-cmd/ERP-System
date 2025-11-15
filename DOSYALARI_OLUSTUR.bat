@echo off
chcp 65001 >nul
echo.
echo -===============================================================¬
echo ¦          ERP Sistemi - Eksik Dosyalarý Oluþtur               ¦
echo L===============================================================-
echo.
echo Bu script eksik klasörleri ve boþ dosyalarý oluþturacak.
echo.
pause

echo.
echo [1/3] Klasör yapýsý oluþturuluyor...

REM Backend klasörleri
if not exist "backend" mkdir backend
if not exist "backend\config" mkdir backend\config
if not exist "backend\routes" mkdir backend\routes
if not exist "backend\middleware" mkdir backend\middleware

REM Frontend klasörleri
if not exist "frontend" mkdir frontend
if not exist "frontend\public" mkdir frontend\public
if not exist "frontend\src" mkdir frontend\src
if not exist "frontend\src\components" mkdir frontend\src\components
if not exist "frontend\src\pages" mkdir frontend\src\pages
if not exist "frontend\src\services" mkdir frontend\src\services
if not exist "frontend\src\utils" mkdir frontend\src\utils

REM Nginx klasörleri
if not exist "nginx" mkdir nginx
if not exist "nginx\conf.d" mkdir nginx\conf.d

REM Diðer klasörler
if not exist "ssl" mkdir ssl
if not exist "scripts" mkdir scripts

echo ? Klasörler oluþturuldu

echo.
echo [2/3] Kontrol ediliyor...
echo.

REM Kritik dosyalarý kontrol et
set MISSING=0

if not exist "docker-compose.yml" (
    echo ? docker-compose.yml EKSIK
    set MISSING=1
)

if not exist "init.sql" (
    echo ? init.sql EKSIK
    set MISSING=1
)

if not exist "backend\package.json" (
    echo ? backend\package.json EKSIK
    set MISSING=1
)

if not exist "backend\server.js" (
    echo ? backend\server.js EKSIK
    set MISSING=1
)

if not exist "frontend\package.json" (
    echo ? frontend\package.json EKSIK
    set MISSING=1
)

if not exist "frontend\src\index.js" (
    echo ? frontend\src\index.js EKSIK
    set MISSING=1
)

if %MISSING%==1 (
    echo.
    echo ??  UYARI: Bazý kritik dosyalar eksik!
    echo.
    echo Lütfen þu dosyalarý manuel olarak oluþturun:
    echo 1. Ana dizindeki tüm artifact dosyalarý
    echo 2. Backend route dosyalarý
    echo 3. Frontend component ve page dosyalarý
    echo.
    echo Detaylý liste için HIZLI_BASLANGIC.md dosyasýna bakýn.
) else (
    echo ? Tüm kritik dosyalar mevcut
)

echo.
echo [3/3] Boþ dosyalar oluþturuluyor...

REM .dockerignore dosyalarý
if not exist "backend\.dockerignore" (
    echo node_modules > backend\.dockerignore
    echo npm-debug.log >> backend\.dockerignore
    echo .env >> backend\.dockerignore
    echo ? backend\.dockerignore oluþturuldu
)

if not exist "frontend\.dockerignore" (
    echo node_modules > frontend\.dockerignore
    echo build >> frontend\.dockerignore
    echo .env >> frontend\.dockerignore
    echo ? frontend\.dockerignore oluþturuldu
)

REM .gitignore
if not exist ".gitignore" (
    (
        echo node_modules/
        echo .env
        echo .DS_Store
        echo *.log
        echo build/
        echo dist/
        echo .vscode/
        echo .idea/
    ) > .gitignore
    echo ? .gitignore oluþturuldu
)

echo.
echo ===============================================================
echo.
echo ? Ýþlem tamamlandý!
echo.
echo ?? Sonraki adýmlar:
echo.
echo 1. HIZLI_BASLANGIC.md dosyasýný açýn
echo 2. Eksik dosyalarýn listesini kontrol edin
echo 3. Her dosyanýn içeriðini Claude'dan kopyalayýp yapýþtýrýn
echo 4. menu.bat dosyasýný çalýþtýrýn
echo.
echo ?? Ýpucu: Claude'un artifact bölümünde tüm dosya içerikleri hazýr!
echo.
pause