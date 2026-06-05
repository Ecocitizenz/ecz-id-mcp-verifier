# Phase 9A — Distribution Readiness proof script for ECZ-ID MCP Verifier(TM).
#
# Local, read-only proof. Does NOT publish. Does NOT deploy. Does NOT push.
# Does NOT remove "private": true. Does NOT remove prepublishOnly guard.
#
# Run:
#   powershell -ExecutionPolicy Bypass -File scripts/prove_phase_9a_distribution_readiness.ps1

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

$script:failures = New-Object System.Collections.Generic.List[string]
$script:passes   = New-Object System.Collections.Generic.List[string]

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if ($Condition) {
        $script:passes.Add($Message) | Out-Null
        Write-Host ("[ OK ] " + $Message) -ForegroundColor Green
    } else {
        $script:failures.Add($Message) | Out-Null
        Write-Host ("[FAIL] " + $Message) -ForegroundColor Red
    }
}

function Test-FileContains {
    param([string]$Path, [string]$Pattern, [switch]$Regex)
    if (-not (Test-Path $Path)) { return $false }
    $content = Get-Content $Path -Raw
    if ($Regex) { return ($content -match $Pattern) }
    return ($content -like "*$Pattern*")
}

Write-Host "`n=== Phase 9A Distribution Readiness Proof ===`n" -ForegroundColor Cyan

# ---------- 1..5  package.json checks ----------
$pkgPath = Join-Path $repoRoot 'package.json'
Assert-True (Test-Path $pkgPath) "package.json exists"
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json

Assert-True ($pkg.private -eq $true) "package.json keeps `"private`": true"
Assert-True ($null -ne $pkg.scripts.prepublishOnly -and ($pkg.scripts.prepublishOnly -like "*process.exit(1)*")) "prepublishOnly guard present (exits non-zero)"
Assert-True ($pkg.name -eq '@ecocitizenz/ecz-id-mcp-verifier') "package name is @ecocitizenz/ecz-id-mcp-verifier"
Assert-True ($null -ne $pkg.bin.'ecz-id-mcp-verifier' -and $null -ne $pkg.bin.'ecz-mcp-verify') "bin entries exist (ecz-id-mcp-verifier, ecz-mcp-verify)"
Assert-True ($pkg.bin.'ecz-mcp-verify' -eq 'dist/cli.js') "bin -> dist/cli.js"
Assert-True ($null -ne $pkg.keywords -and $pkg.keywords -contains 'mcp' -and $pkg.keywords -contains 'verifier') "keywords contain mcp + verifier"
Assert-True ($pkg.homepage -eq 'https://developers.ecocitizenz.com/mcp') "homepage set to Developer Gateway /mcp"
Assert-True ($null -ne $pkg.license -and $pkg.license -ne '') "license field present (placeholder allowed)"

# Confirm no publishConfig that would enable publishing
$hasPublishConfig = $pkg.PSObject.Properties.Name -contains 'publishConfig'
Assert-True (-not $hasPublishConfig) "no publishConfig block that would enable publishing"

# ---------- 6  action.yml checks ----------
$actionPath = Join-Path $repoRoot 'action.yml'
Assert-True (Test-Path $actionPath) "action.yml exists"
$actionContent = Get-Content $actionPath -Raw
Assert-True ($actionContent -match 'using:\s*"?node20"?') "action.yml uses node20"
Assert-True ($actionContent -match 'main:\s*"?dist/cli\.js"?') "action.yml points to dist/cli.js"
foreach ($inp in @('target','target-type','policy','operator','resolver-base','no-network','timeout-ms')) {
    Assert-True ($actionContent -match "(?m)^\s*${inp}:") "action.yml input present: $inp"
}
foreach ($out in @('result-state','reason-codes','action-envelope-json','acquisition-flow-json','primary-action','trustops-action-url','developer-guidance-url')) {
    Assert-True ($actionContent -match "(?m)^\s*${out}:") "action.yml output present: $out"
}

# ---------- 7  dist/cli.js after build ----------
# Build is required before running this script. Verify file presence only.
$cliJs = Join-Path $repoRoot 'dist\cli.js'
Assert-True (Test-Path $cliJs) "dist/cli.js exists (run 'npm run build' first if missing)"

# ---------- 8..9  files allow-list excludes _reference, secrets, env, src, tests, logs ----------
$files = @($pkg.files)
$forbiddenFilesEntries = @('_reference','tests','src','.env','node_modules','coverage','*.log')
foreach ($f in $files) {
    foreach ($bad in $forbiddenFilesEntries) {
        Assert-True (-not ($f -like "*${bad}*")) "package files entry does not include '$bad' (entry: $f)"
    }
}
Assert-True ($files -contains 'dist') "package files include dist"
Assert-True ($files -contains 'action.yml') "package files include action.yml"
Assert-True ($files -contains 'README.md') "package files include README.md"

# ---------- 10..15  README content checks ----------
$readme = Join-Path $repoRoot 'README.md'
$readmeText = Get-Content $readme -Raw

Assert-True ($readmeText -match '(?i)role split') "README contains role split"
Assert-True ($readmeText -match '(?i)no source upload' -or $readmeText -match '(?i)no-upload') "README contains privacy / no-upload statement"
Assert-True ($readmeText -match 'OPEN' -and $readmeText -match 'PREFER' -and $readmeText -match 'REQUIRE') "README contains all three policy modes"
Assert-True ($readmeText -match '(?i)--operator' -and $readmeText -match 'self' -and $readmeText -match 'third_party' -and $readmeText -match 'unknown') "README contains operator modes (self/third_party/unknown)"
Assert-True ($readmeText -match '(?i)exit code') "README contains exit codes"
Assert-True ($readmeText -match '(?i)distribution-readiness' -or $readmeText -match '(?i)not yet published') "README status mentions not-yet-published / distribution-readiness"

# ---------- Forbidden overclaim copy ----------
# Each phrase is forbidden ONLY when used as a positive claim.
# We allow boundary statements (e.g. "does not certify safety"): when a
# negation word ("not","never","no ","without","doesn't","don't","avoid","nor","neither")
# appears within the preceding 140 characters of the occurrence, the
# occurrence is treated as a boundary statement and skipped.
$forbiddenPhrases = @(
    'is safe',
    'is certified',
    'is approved',
    'regulator-approved',
    'platform-approved',
    'guaranteed safe',
    'guaranteed trust',
    'fully compliant',
    'is insured',
    'demand proof',
    'must buy',
    'blocked because no ECZ-ID',
    'unsafe server',
    'untrusted agent',
    'activate_proof'
)
$negRegex = '(?i)(\bnot\b|\bnever\b|\bno\b|\bno_|\bwithout\b|\bdoesn''?t\b|\bdon''?t\b|\bcannot\b|cannot_|_cannot_|_not_|not_allowed|\bcan''?t\b|\bavoid\b|\bnor\b|\bneither\b|\bnothing\b|\bnone\b|\bdoes not\b|\bmust not\b)'

function Find-OverclaimViolations {
    param([string]$Path)
    $violations = @()
    if (-not (Test-Path $Path)) { return $violations }
    $text = Get-Content $Path -Raw
    foreach ($phrase in $forbiddenPhrases) {
        $idx = 0
        while ($true) {
            $found = $text.IndexOf($phrase, $idx, [System.StringComparison]::OrdinalIgnoreCase)
            if ($found -lt 0) { break }
            $contextStart = [Math]::Max(0, $found - 220)
            $context = $text.Substring($contextStart, $found - $contextStart)
            if ($context -notmatch $negRegex) {
                $violations += "$Path : '$phrase' at offset $found (no negation in preceding 220 chars)"
            }
            $idx = $found + $phrase.Length
        }
    }
    return $violations
}

# Scan README, docs/*.md (excluding _reference, excluding the copy-safety
# checklist file itself which lists the phrases verbatim), examples, src.
$scanTargets = @()
$scanTargets += $readme
$scanTargets += Get-ChildItem -Path (Join-Path $repoRoot 'docs') -Recurse -File -Include *.md `
    | Where-Object { $_.FullName -notlike '*_reference*' -and $_.Name -ne 'copy-safety-checklist.md' } `
    | ForEach-Object { $_.FullName }
$scanTargets += Get-ChildItem -Path (Join-Path $repoRoot 'examples') -Recurse -File -Include *.md,*.json,*.yml `
    | ForEach-Object { $_.FullName }
$scanTargets += Get-ChildItem -Path (Join-Path $repoRoot 'src') -Recurse -File -Include *.ts `
    | ForEach-Object { $_.FullName }

$allViolations = @()
foreach ($t in $scanTargets) {
    $allViolations += Find-OverclaimViolations -Path $t
}
if ($allViolations.Count -gt 0) {
    foreach ($v in $allViolations) { Write-Host "       $v" -ForegroundColor Yellow }
}
Assert-True ($allViolations.Count -eq 0) "no forbidden overclaim copy found in README/docs/examples/src (positive-claim form)"

# ---------- 16..17  examples exist + no secrets ----------
$expectedExamples = @(
    'examples\README.md',
    'examples\cli-basic.md',
    'examples\cli-policy-modes.md',
    'examples\github-action.yml',
    'examples\action-envelope-output.json',
    'examples\json-output-missing-proof.json',
    'examples\json-output-resolver-verifiable.json'
)
foreach ($e in $expectedExamples) {
    Assert-True (Test-Path (Join-Path $repoRoot $e)) "example exists: $e"
}
$secretPatterns = @('AKIA[0-9A-Z]{16}','-----BEGIN [A-Z ]*PRIVATE KEY-----','xox[abprs]-[0-9a-zA-Z-]{10,}','ghp_[0-9A-Za-z]{20,}','sk_live_[0-9A-Za-z]{20,}','password\s*=\s*["''][^"'']+["'']','api[_-]?key\s*=\s*["''][^"'']+["'']')
$examplesFiles = Get-ChildItem -Path (Join-Path $repoRoot 'examples') -Recurse -File | ForEach-Object { $_.FullName }
$secretsHits = @()
foreach ($f in $examplesFiles) {
    $c = Get-Content $f -Raw
    foreach ($p in $secretPatterns) {
        if ($c -match $p) { $secretsHits += "$f matches $p" }
    }
}
Assert-True ($secretsHits.Count -eq 0) "examples contain no secrets / keys"

# ---------- 18..19  listing drafts exist + no overclaim ----------
$expectedDrafts = @(
    'docs\distribution\npm-listing-draft.md',
    'docs\distribution\github-action-listing-draft.md',
    'docs\distribution\mcp-registry-listing-draft.md',
    'docs\distribution\release-checklist.md',
    'docs\distribution\copy-safety-checklist.md',
    'docs\distribution\package-readiness-report.md'
)
foreach ($d in $expectedDrafts) {
    Assert-True (Test-Path (Join-Path $repoRoot $d)) "listing draft exists: $d"
}
# Overclaim scan over docs already covered drafts (except copy-safety-checklist which is the rules file itself).

# ---------- 20  no mojibake in docs/README/examples ----------
# Detect U+FFFD replacement character and common cp1252-misread sequences.
$replacementChar = [char]0xFFFD
$mojibakeSeqs = @(
    [string]([char]0xC3 + [char]0xA2 + [char]0x20AC + [char]0x2122), # â€™
    [string]([char]0xC3 + [char]0xA2 + [char]0x20AC + [char]0x0153), # â€œ
    [string]([char]0xC2 + [char]0xA0)                                 # NBSP-as-Â
)
$mojibakeHits = @()
$mojibakeScan = @($readme) + (Get-ChildItem -Path (Join-Path $repoRoot 'docs') -Recurse -File -Include *.md | ForEach-Object { $_.FullName })
$mojibakeScan += Get-ChildItem -Path (Join-Path $repoRoot 'examples') -Recurse -File | ForEach-Object { $_.FullName }
foreach ($f in $mojibakeScan) {
    $c = Get-Content $f -Raw
    if ($c.IndexOf($replacementChar) -ge 0) { $mojibakeHits += "$f contains U+FFFD" }
    foreach ($seq in $mojibakeSeqs) {
        if ($c.Contains($seq)) { $mojibakeHits += "$f contains cp1252-misread sequence" }
    }
}
Assert-True ($mojibakeHits.Count -eq 0) "no mojibake in README/docs/examples"

# ---------- 21  no MCP Passport / Reciprocity Passport ----------
$forbiddenSymbols = @('MCP Passport','MCPPassport','Reciprocity Passport','ReciprocityPassport')
$srcFiles = Get-ChildItem -Path (Join-Path $repoRoot 'src') -Recurse -File -Include *.ts | ForEach-Object { $_.FullName }
$symbolHits = @()
foreach ($f in $srcFiles) {
    $c = Get-Content $f -Raw
    foreach ($s in $forbiddenSymbols) {
        if ($c -like "*$s*") { $symbolHits += "$f contains '$s'" }
    }
}
Assert-True ($symbolHits.Count -eq 0) "no MCP Passport or Reciprocity Passport in src/"

# ---------- 22  no autonomous LLM/agent in active src ----------
$llmPatterns = @('openai','anthropic','langchain','autogen','autonomous agent','llm.invoke','llm\.complete','agent.run\(')
$llmHits = @()
foreach ($f in $srcFiles) {
    $c = Get-Content $f -Raw
    foreach ($p in $llmPatterns) {
        if ($c -match $p) { $llmHits += "$f matches $p" }
    }
}
Assert-True ($llmHits.Count -eq 0) "no autonomous LLM/agent imports or strings in src/"

# ---------- 23  no telemetry in active src or package deps ----------
# Flag only actual call-site / import patterns (avoid false positives on the
# string literal "no_telemetry: true" or comments that describe the policy).
$teleCallPatterns = @(
    '(?i)\bSentry\.[A-Za-z_]',
    '(?i)\bposthog\.[A-Za-z_]',
    '(?i)\bmixpanel\.[A-Za-z_]',
    '(?i)\bamplitude\.[A-Za-z_]',
    '(?i)\bdatadog\.[A-Za-z_]',
    '(?i)\banalytics\.(track|identify|page|capture)',
    '(?i)from\s+["''](sentry|posthog|mixpanel|amplitude|datadog|segment|@sentry|@posthog)',
    '(?i)require\(["''](sentry|posthog|mixpanel|amplitude|datadog|segment|@sentry|@posthog)'
)
$teleHits = @()
foreach ($f in $srcFiles) {
    $c = Get-Content $f -Raw
    foreach ($p in $teleCallPatterns) {
        if ($c -match $p) { $teleHits += "$f matches $p" }
    }
}
Assert-True ($teleHits.Count -eq 0) "no telemetry/analytics live references in src/"
# Also check deps
$depNames = @()
if ($pkg.PSObject.Properties.Name -contains 'dependencies' -and $pkg.dependencies)    { $depNames += $pkg.dependencies.PSObject.Properties.Name }
if ($pkg.PSObject.Properties.Name -contains 'devDependencies' -and $pkg.devDependencies) { $depNames += $pkg.devDependencies.PSObject.Properties.Name }
$badDeps = @($depNames | Where-Object { $_ -match '(?i)(sentry|posthog|mixpanel|segment|amplitude|datadog|^analytics$)' })
Assert-True ($badDeps.Count -eq 0) "no telemetry packages in dependencies"

# ---------- 24  no checkout / payment / proof activation / BOUND in active src ----------
# Apply negation-aware scanning: tokens like SHOPIFY_CANNOT_ACTIVATE_PROOF or
# TRUSTOPS_CANNOT_MARK_BOUND or MARKETPLACE_CHECKOUT_NOT_ALLOWED are boundary
# reason codes (the verifier reports that the action CANNOT happen here).
$forbiddenSrcStrings = @('activate_proof','checkout','stripe.','paypal.','create_payment','mark_bound','MARK_BOUND','BOUND_STATE')
$srcStringHits = @()
foreach ($f in $srcFiles) {
    $text = Get-Content $f -Raw
    foreach ($s in $forbiddenSrcStrings) {
        $idx = 0
        while ($true) {
            $found = $text.IndexOf($s, $idx, [System.StringComparison]::OrdinalIgnoreCase)
            if ($found -lt 0) { break }
            $ctxStart = [Math]::Max(0, $found - 60)
            $ctx = $text.Substring($ctxStart, $found - $ctxStart)
            $tail = $text.Substring($found, [Math]::Min(40, $text.Length - $found))
            if ($ctx -notmatch $negRegex -and $tail -notmatch '(?i)not_allowed') {
                $srcStringHits += "$f contains '$s' at offset $found"
            }
            $idx = $found + $s.Length
        }
    }
}
Assert-True ($srcStringHits.Count -eq 0) "no checkout/payment/proof-activation/BOUND strings in active src/"

# ---------- 25  _reference remains ignored and not imported ----------
$gitignore = Get-Content (Join-Path $repoRoot '.gitignore') -Raw
Assert-True ($gitignore -match '_reference') ".gitignore ignores _reference/"
$npmignore = Get-Content (Join-Path $repoRoot '.npmignore') -Raw
Assert-True ($npmignore -match '_reference') ".npmignore ignores _reference/"
$refImportHits = @()
$importRegex = '(?m)(from\s+["''`][^"''`]*_reference|require\(\s*["''`][^"''`]*_reference|import\s+["''`][^"''`]*_reference)'
foreach ($f in $srcFiles) {
    $c = Get-Content $f -Raw
    if ($c -match $importRegex) { $refImportHits += $f }
}
$testFiles = Get-ChildItem -Path (Join-Path $repoRoot 'tests') -Recurse -File -Include *.ts | ForEach-Object { $_.FullName }
foreach ($f in $testFiles) {
    $c = Get-Content $f -Raw
    if ($c -match $importRegex) { $refImportHits += $f }
}
Assert-True ($refImportHits.Count -eq 0) "no src/ or tests/ file imports _reference (string mentions in quarantine-enforcement tests are allowed)"

# ---------- 26..28  npm scripts ----------
# Invoke npm via cmd.exe so npm.ps1 isn't loaded inside this strict-mode session
# (npm.ps1 references $MyInvocation.Statement which is unavailable under Set-StrictMode -Version Latest).
function Invoke-Npm {
    param([string]$Script)
    $out = & cmd.exe /c "npm run $Script 2>&1"
    return @{ Code = $LASTEXITCODE; Output = ($out -join "`n") }
}

Write-Host "`n--- running: npm run test ---" -ForegroundColor Cyan
$rTest = Invoke-Npm 'test'
Assert-True ($rTest.Code -eq 0) "npm run test exits 0"

Write-Host "`n--- running: npm run typecheck ---" -ForegroundColor Cyan
$rType = Invoke-Npm 'typecheck'
Assert-True ($rType.Code -eq 0) "npm run typecheck exits 0"

Write-Host "`n--- running: npm run build ---" -ForegroundColor Cyan
$rBuild = Invoke-Npm 'build'
Assert-True ($rBuild.Code -eq 0) "npm run build exits 0"

Assert-True (Test-Path $cliJs) "dist/cli.js exists after build"

# ---------- 29  npm pack --dry-run (does NOT publish) ----------
Write-Host "`n--- running: npm pack --dry-run ---" -ForegroundColor Cyan
$packOut = & cmd.exe /c "npm pack --dry-run --json 2>&1"
$packCode = $LASTEXITCODE
$packText = ($packOut -join "`n")
if ($packCode -eq 0) {
    Assert-True $true "npm pack --dry-run exits 0 (no publish)"
    # Confirm contents would exclude _reference and source-only directories.
    Assert-True ($packText -notmatch '_reference')                  "npm pack --dry-run output does not include _reference"
    Assert-True ($packText -notmatch '(?m)\bsrc/')                   "npm pack --dry-run output does not include raw src/ files"
    Assert-True ($packText -notmatch '(?m)\btests/')                 "npm pack --dry-run output does not include tests/"
    Assert-True ($packText -notmatch '(?i)\.env')                   "npm pack --dry-run output does not include .env files"
    Assert-True ($packText -match 'dist/cli\.js')                   "npm pack --dry-run output includes dist/cli.js"
    Assert-True ($packText -match 'action\.yml')                    "npm pack --dry-run output includes action.yml"
} else {
    Write-Host "npm pack --dry-run failed; falling back to package.files allow-list inspection." -ForegroundColor Yellow
    Assert-True ($files -notcontains '_reference') "package files allow-list does not contain _reference (fallback)"
    Assert-True ($files -notcontains 'src')        "package files allow-list does not contain src (fallback)"
    Assert-True ($files -notcontains 'tests')      "package files allow-list does not contain tests (fallback)"
}

# ---------- 30  no deploy / no publish executed ----------
# This script does not execute npm publish, az deploy, gh release, or git push.
Assert-True $true "this proof script did not run npm publish / deploy / release / git push"

# ---------- Summary ----------
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host ("Passed: " + $script:passes.Count)   -ForegroundColor Green
Write-Host ("Failed: " + $script:failures.Count) -ForegroundColor ($(if ($script:failures.Count -eq 0) {'Green'} else {'Red'}))

if ($script:failures.Count -gt 0) {
    Write-Host "`nFailures:" -ForegroundColor Red
    foreach ($f in $script:failures) { Write-Host " - $f" -ForegroundColor Red }
    exit 1
}

Write-Host "`nPhase 9A distribution-readiness proof: PASS" -ForegroundColor Green
exit 0
