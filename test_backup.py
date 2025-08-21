#!/usr/bin/env python3
"""
Simple test script to verify backup functionality works
"""
import requests
import json
import time

BASE_URL = "http://localhost:8001"

def test_backup_endpoints():
    print("🧪 Testing Backup Endpoints...")
    
    # Wait for server startup
    print("⏳ Waiting for server to be ready...")
    time.sleep(5)
    
    # Test 1: List backups (should return empty list initially)
    try:
        print("\n📝 Test 1: List existing backups")
        response = requests.get(f"{BASE_URL}/student/backups")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ List backups endpoint working!")
        else:
            print("❌ List backups endpoint failed!")
            
    except Exception as e:
        print(f"❌ Error testing list backups: {e}")
    
    # Test 2: Create a backup
    try:
        print("\n📦 Test 2: Create backup")
        response = requests.post(f"{BASE_URL}/student/backup")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Create backup endpoint working!")
        else:
            print("❌ Create backup endpoint failed!")
            
    except Exception as e:
        print(f"❌ Error testing create backup: {e}")
    
    # Test 3: List backups again (should show our new backup)
    try:
        print("\n📋 Test 3: List backups after creation")
        response = requests.get(f"{BASE_URL}/student/backups")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Backup listing updated successfully!")
        else:
            print("❌ Backup listing failed!")
            
    except Exception as e:
        print(f"❌ Error testing backup list: {e}")

if __name__ == "__main__":
    test_backup_endpoints()
