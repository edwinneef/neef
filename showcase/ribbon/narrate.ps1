param([Parameter(Mandatory=$true)][string]$Storyboard, [Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$story = Get-Content -LiteralPath $Storyboard -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $speaker.SelectVoice('Microsoft Hazel Desktop')
    $speaker.Rate = 1
    $speaker.Volume = 95
    for ($index = 0; $index -lt $story.segments.Count; $index++) {
        $destination = Join-Path $OutputDirectory ('voice-{0:d2}.wav' -f $index)
        if (Test-Path -LiteralPath $destination) { throw "Narration already exists: $destination" }
        $speaker.SetOutputToWaveFile($destination)
        $speaker.Speak($story.segments[$index].narration.Replace('NEEF', 'Neef'))
        $speaker.SetOutputToNull()
    }
} finally { $speaker.Dispose() }
Write-Output ('Generated {0} local narration clips with Microsoft Hazel Desktop.' -f $story.segments.Count)
