Write-Host "=== APK Build Script ==="

# 设置环境
$env:JAVA_HOME = "C:\Users\Struggle\.jdks\jdk-21"
$env:ANDROID_HOME = "C:\Users\Struggle\AppData\Local\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# 获取当前目录（脚本执行位置）
$startDir = Get-Location
Write-Host "Start directory: $startDir"
Write-Host "JAVA_HOME: $env:JAVA_HOME"
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"
Write-Host "Java version:"
& java -version

# 构建APK
Write-Host "`n=== Building APK ==="
Set-Location android
& .\gradlew.bat clean assembleDebug --no-daemon

# 返回起始目录
Set-Location $startDir

# 检查APK是否存在
$sourceApk = "android\app\build\outputs\apk\debug\app-debug.apk"
Write-Host "`n=== Copying APK to output directory ==="
Write-Host "Checking for APK at: $sourceApk"

if (Test-Path $sourceApk) {
    Write-Host "APK found successfully"
    
    # 创建apk目录
    $apkDir = "apk"
    if (-not (Test-Path $apkDir)) {
        New-Item -ItemType Directory -Path $apkDir -Force
        Write-Host "Created directory: $apkDir"
    }
    
    # 清理旧的APK文件（只保留最新的）
    Write-Host "Cleaning old APK files..."
    Get-ChildItem $apkDir -Filter "*.apk" | ForEach-Object {
        Remove-Item $_.FullName -Force
    }
    
    # 生成时间戳文件名
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $targetApk = "$apkDir\dezhou-$timestamp.apk"
    
    # 复制文件
    Write-Host "Copying to: $targetApk"
    Copy-Item $sourceApk $targetApk -Force
} else {
    Write-Host "ERROR: APK not found at $sourceApk!"
}

Write-Host "`n=== Build completed! ==="
