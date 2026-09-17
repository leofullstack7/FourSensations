param(
    [string]$CsvPath = "C:\Users\dawil\OneDrive\Documents\Ginna\web\docs\SAMY REPOSITORIO IMAGENES.xlsx - Images 1 (1).csv",
    [string]$OutputDir = "C:\Users\dawil\OneDrive\Documents\Ginna\web\docs\samy-nuevo",
    [int]$MaxParallel = 10
)

$csv = Import-Csv $CsvPath
$urls = $csv | ForEach-Object { $_.("Ruta de la imagen") } | Where-Object { $_ -ne "" }
$total = $urls.Count

Write-Host "Iniciando descarga de $total imagenes..."
Write-Host "Destino: $OutputDir"
Write-Host ""

$success = 0
$failed = 0
$skipped = 0
$failedList = @()

# Process in batches
$batches = [System.Collections.Generic.List[object[]]]::new()
$batch = [System.Collections.Generic.List[string]]::new()
foreach ($url in $urls) {
    $batch.Add($url)
    if ($batch.Count -ge $MaxParallel) {
        $batches.Add($batch.ToArray())
        $batch = [System.Collections.Generic.List[string]]::new()
    }
}
if ($batch.Count -gt 0) { $batches.Add($batch.ToArray()) }

$processed = 0
foreach ($b in $batches) {
    $jobs = @()
    foreach ($url in $b) {
        $fileName = $url.Split('/')[-1]
        $destPath = Join-Path $OutputDir $fileName

        if (Test-Path $destPath) {
            $skipped++
            $processed++
            continue
        }

        $jobs += Start-Job -ScriptBlock {
            param($u, $dest)
            try {
                $wc = New-Object System.Net.WebClient
                $wc.DownloadFile($u, $dest)
                return "OK"
            } catch {
                return "FAIL:$u"
            }
        } -ArgumentList $url, $destPath
    }

    if ($jobs.Count -gt 0) {
        $results = $jobs | Wait-Job | Receive-Job
        $jobs | Remove-Job
        foreach ($r in $results) {
            $processed++
            if ($r -eq "OK") { $success++ }
            elseif ($r -like "FAIL:*") {
                $failed++
                $failedList += $r.Substring(5)
            }
        }
    }

    $pct = [math]::Round(($processed / $total) * 100, 1)
    Write-Host "[$pct%] $processed/$total - OK:$success Saltadas:$skipped Errores:$failed"
}

Write-Host ""
Write-Host "=== DESCARGA COMPLETADA ==="
Write-Host "Total:    $total"
Write-Host "OK:       $success"
Write-Host "Saltadas: $skipped"
Write-Host "Errores:  $failed"

if ($failedList.Count -gt 0) {
    $logPath = Join-Path $OutputDir "errores.txt"
    $failedList | Out-File $logPath -Encoding utf8
    Write-Host "URLs con error guardadas en: $logPath"
}
