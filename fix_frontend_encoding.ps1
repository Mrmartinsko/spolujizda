$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$cp1250 = [System.Text.Encoding]::GetEncoding(1250)
$suspiciousPattern = [string]([char]0x0102) + '|' + [string]([char]0x00C4) + '|' + [string]([char]0x0139) + '|' + [string]([char]0x00C2) + '|' + [string]([char]0x010F)

function Convert-Mojibake {
    param([string]$value)

    if ([string]::IsNullOrEmpty($value)) {
        return $value
    }

    return [System.Text.Encoding]::UTF8.GetString($cp1250.GetBytes($value))
}

function Fix-QuotedStringsInFile {
    param([string]$path)

    $content = Get-Content -Path $path -Raw
    $patterns = @(
        "'(?:[^'\\\\]|\\\\.)*'",
        '"(?:[^"\\\\]|\\\\.)*"',
        '`(?:[^`\\\\]|\\\\.)*`'
    )

    foreach ($pattern in $patterns) {
        $content = [System.Text.RegularExpressions.Regex]::Replace(
            $content,
            $pattern,
            {
                param($match)
                $quoted = $match.Value
                if ($quoted -notmatch $suspiciousPattern) {
                    return $quoted
                }

                $quote = $quoted.Substring(0, 1)
                $inner = $quoted.Substring(1, $quoted.Length - 2)
                $fixed = Convert-Mojibake $inner
                return $quote + $fixed + $quote
            }
        )
    }

    [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
}

Fix-QuotedStringsInFile 'frontend/src/components/rides/RideList.js'
Fix-QuotedStringsInFile 'frontend/src/pages/Chat.js'

$index = @"
<!DOCTYPE html>
<html lang="cs">

<head>
    <meta charset="UTF-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Spolujízda - platforma pro sdílenou dopravu" />
    <title>Spolujízda</title>
</head>

<body>
    <noscript>Pro správné fungování aplikace je potřeba zapnout JavaScript.</noscript>
    <div id="root"></div>
</body>

</html>
"@
[System.IO.File]::WriteAllText((Resolve-Path 'frontend/public/index.html'), $index, $utf8NoBom)

Get-ChildItem -Path 'frontend/src', 'frontend/public' -Recurse -Include *.js,*.jsx,*.ts,*.tsx,*.html | ForEach-Object {
    $content = Get-Content -Path $_.FullName -Raw
    [System.IO.File]::WriteAllText($_.FullName, $content, $utf8NoBom)
}
