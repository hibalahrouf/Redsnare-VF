$file = "c:\Users\pc\.gemini\antigravity\scratch\bugbounty-admin-portal\frontend\app\submit\page.tsx"
$lines = [System.IO.File]::ReadAllLines($file)

Write-Host "Total lines: $($lines.Length)"
Write-Host "Line 322: [$($lines[321])]"
Write-Host "Line 323: [$($lines[322])]"
Write-Host "Line 324: [$($lines[323])]"
Write-Host "Line 325: [$($lines[324])]"

# Replace lines 322-325 (index 321-324) with the fixed version
$newLines = @()
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -eq 321) {
        # Line 322: replace with clean Approval Status span
        $newLines += '                        <span className="text-gray-500 font-medium">Approval Status</span>'
    }
    elseif ($i -ge 322 -and $i -le 324) {
        # Skip lines 323-325 (the broken p tags)
        continue
    }
    else {
        $newLines += $lines[$i]
    }
}

[System.IO.File]::WriteAllLines($file, $newLines)
Write-Host "DONE - fixed $file (was $($lines.Length) lines, now $($newLines.Length) lines)"
