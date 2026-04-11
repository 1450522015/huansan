# 查看防火墙是否在拦截java的loopback TCP连接
Get-NetFirewallRule | Where-Object {$_.DisplayName -match "java" -and $_.Action -eq "Block"} | Format-List DisplayName, Action, Direction, Enabled

# 直接添加java的完全放行规则
$javaPath = (Get-Command java).Source
New-NetFirewallRule -DisplayName "Java Loopback Allow" -Direction Inbound -Program $javaPath -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "Java Loopback Allow Out" -Direction Outbound -Program $javaPath -Action Allow -Profile Any

# 同时放行javaw
$javawPath = $javaPath -replace "java.exe","javaw.exe"
New-NetFirewallRule -DisplayName "Javaw Loopback Allow" -Direction Inbound -Program $javawPath -Action Allow -Profile Any