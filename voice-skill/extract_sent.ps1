<#
.SYNOPSIS
Exports the mail you wrote from an Outlook PST file to JSON Lines (one mail per line).

.DESCRIPTION
Uses the installed Outlook desktop app, so nothing leaves the machine. By default it reads
the Sent folder(s) (Sent Items / Skickat / Skickade objekt). With -Me it scans every mail
folder instead and keeps only mail sent by you, which also catches sent mail filed away
in project folders.

.EXAMPLE
.\extract_sent.ps1 -PstPath "C:\Users\johan\Documents\Outlook Files\archive.pst"

.EXAMPLE
.\extract_sent.ps1 -PstPath .\archive.pst -Me "johan@example.se", "Johan"
#>
param(
    [Parameter(Mandatory)] [string] $PstPath,
    [string] $OutFile = (Join-Path $PSScriptRoot 'data\raw.jsonl'),
    [string[]] $Me = @()
)

$ErrorActionPreference = 'Stop'
$PstPath = (Resolve-Path $PstPath).Path
New-Item -ItemType Directory -Force (Split-Path $OutFile) | Out-Null

$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace('MAPI')

function Find-Store { $ns.Stores | Where-Object { $_.FilePath -eq $PstPath } | Select-Object -First 1 }

# Mount the PST unless it is already open in Outlook; unmount it again at the end.
$store = Find-Store
$added = $false
if (-not $store) {
    $ns.AddStore($PstPath)
    $store = Find-Store
    $added = $true
}
if (-not $store) { throw "Outlook could not open $PstPath" }

function Get-Folders($folder) {
    $folder
    foreach ($child in $folder.Folders) { Get-Folders $child }
}

$mailFolders = @(Get-Folders $store.GetRootFolder() | Where-Object { $_.DefaultItemType -eq 0 })
if ($Me) {
    $folders = $mailFolders
} else {
    $folders = @($mailFolders | Where-Object { $_.Name -match '^(Sent Items|Sent|Sent Mail|Skickat|Skickade objekt|Skickade)$' })
    if (-not $folders) {
        $names = ($mailFolders | ForEach-Object { $_.FolderPath }) -join "`n  "
        throw "No Sent folder found. Re-run with -Me <your address/name>. Folders in this PST:`n  $names"
    }
}

$writer = [System.IO.StreamWriter]::new($OutFile, $false, [System.Text.UTF8Encoding]::new($false))
$count = 0
$skipped = 0
try {
    foreach ($folder in $folders) {
        Write-Host "Reading $($folder.FolderPath) ($($folder.Items.Count) items)"
        foreach ($item in $folder.Items) {
            try {
                # 43 = olMail; unsent drafts have Sent = $false
                if ($item.Class -ne 43 -or -not $item.Sent) { continue }
                if ($Me) {
                    $sender = "$($item.SenderName) $($item.SenderEmailAddress)"
                    if (-not ($Me | Where-Object { $sender -like "*$_*" })) { continue }
                }
                $record = [ordered]@{
                    id      = $item.EntryID
                    folder  = $folder.FolderPath
                    sent    = $item.SentOn.ToString('s')
                    subject = $item.Subject
                    to      = @($item.Recipients | ForEach-Object { $_.Name })
                    to_addr = @($item.Recipients | ForEach-Object { $_.Address })
                    body    = $item.Body
                }
                $writer.WriteLine(($record | ConvertTo-Json -Compress))
                $count++
                if ($count % 500 -eq 0) { Write-Host "  $count mails..." }
            } catch {
                $skipped++
            }
        }
    }
} finally {
    $writer.Close()
    if ($added) { $ns.RemoveStore($store.GetRootFolder()) }
}

Write-Host "Wrote $count mails to $OutFile ($skipped unreadable items skipped)"
