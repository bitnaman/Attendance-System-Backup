# Test student registration via PowerShell
$boundary = [System.Guid]::NewGuid().ToString()
$uri = "http://127.0.0.1:8000/student/"

# Create a simple test image (1x1 pixel PNG)
$testImage = @(137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,0,1,0,0,5,0,1,13,10,219,181,0,0,0,0,73,69,78,68,174,66,96,130)
$testImagePath = "test_image.png"
[System.IO.File]::WriteAllBytes($testImagePath, $testImage)

# Create form data
$formData = @"
--$boundary
Content-Disposition: form-data; name="name"

Test Student
--$boundary
Content-Disposition: form-data; name="age"

20
--$boundary
Content-Disposition: form-data; name="roll_no"

TEST001
--$boundary
Content-Disposition: form-data; name="prn"

PRN001
--$boundary
Content-Disposition: form-data; name="seat_no"

SEAT001
--$boundary
Content-Disposition: form-data; name="class_id"

1
--$boundary
Content-Disposition: form-data; name="email"

test@example.com
--$boundary
Content-Disposition: form-data; name="image"; filename="test.png"
Content-Type: image/png

$([System.Text.Encoding]::ASCII.GetString($testImage))
--$boundary--
"@

try {
    $headers = @{
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    $response = Invoke-RestMethod -Uri $uri -Method POST -Body $formData -Headers $headers
    Write-Host "Registration successful!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "Registration failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.Exception.Response.StatusCode
}

# Cleanup
Remove-Item $testImagePath -ErrorAction SilentlyContinue
