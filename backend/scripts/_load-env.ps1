# Load environment variables from .env into the current PowerShell session (process env)
Get-Content .\.env | ForEach-Object {
  if ($_ -and $_ -notmatch '^\s*#') {
    $parts = $_ -split '=',2
    if ($parts.Length -eq 2) {
      $name = $parts[0].Trim()
      $value = $parts[1].Trim()
      if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1,$value.Length-2) }
      if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Substring(1,$value.Length-2) }
      Set-Item -Path env:$name -Value $value
    }
  }
}
