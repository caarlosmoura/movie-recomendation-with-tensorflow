param(
    [string]$BaseUrl = 'http://localhost:6333',
    [string]$CollectionName,
    [int]$Limit = 10,
    [switch]$WithVectors,
    [Nullable[int]]$PointId
)

$ErrorActionPreference = 'Stop'

function Invoke-QdrantGet {
    param([string]$Path)
    Invoke-RestMethod -Method Get -Uri ("$BaseUrl$Path")
}

function Invoke-QdrantPost {
    param(
        [string]$Path,
        [hashtable]$Body
    )

    $jsonBody = $Body | ConvertTo-Json -Depth 10
    Invoke-RestMethod -Method Post -Uri ("$BaseUrl$Path") -ContentType 'application/json' -Body $jsonBody
}

Write-Host "Qdrant endpoint: $BaseUrl"

$collectionsResponse = Invoke-QdrantGet -Path '/collections'
$collectionNames = @($collectionsResponse.result.collections | ForEach-Object { $_.name })

Write-Host ''
Write-Host 'Collections:'
if ($collectionNames.Count -eq 0) {
    Write-Host '  No collections found.'
    exit 0
}

$collectionNames | ForEach-Object { Write-Host "  - $_" }

if (-not $CollectionName) {
    exit 0
}

Write-Host ''
Write-Host "Collection info: $CollectionName"
$collectionInfo = Invoke-QdrantGet -Path "/collections/$CollectionName"
$collectionInfo.result | ConvertTo-Json -Depth 10

if ($PointId -ne $null) {
    Write-Host ''
    Write-Host "Point: $PointId"
    $pointResponse = Invoke-QdrantGet -Path "/collections/$CollectionName/points/$PointId"
    $pointResponse.result | ConvertTo-Json -Depth 10
    exit 0
}

Write-Host ''
Write-Host "Points sample: $CollectionName"
$scrollBody = @{
    limit = $Limit
    with_payload = $true
    with_vector = [bool]$WithVectors
}
$pointsResponse = Invoke-QdrantPost -Path "/collections/$CollectionName/points/scroll" -Body $scrollBody
$pointsResponse.result | ConvertTo-Json -Depth 10
