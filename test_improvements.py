#!/usr/bin/env python3
"""
Comprehensive Test Script for Advanced Facial Attendance System
Tests all new features, optimizations, and monitoring capabilities
"""
import asyncio
import requests
import json
import time
from datetime import datetime

class SystemTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.test_results = {}
        
    def test_basic_health(self):
        """Test basic system health"""
        print("🧪 Testing basic system health...")
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Basic health check passed: {data.get('status', 'unknown')}")
                return True
            else:
                print(f"❌ Basic health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Basic health check error: {e}")
            return False
    
    def test_monitoring_health(self):
        """Test advanced monitoring health"""
        print("🧪 Testing monitoring health...")
        try:
            response = requests.get(f"{self.base_url}/monitoring/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Monitoring health check passed: {data.get('status', 'unknown')}")
                print(f"   📊 CPU: {data.get('metrics', {}).get('cpu_percent', 0):.1f}%")
                print(f"   💾 Memory: {data.get('metrics', {}).get('memory_percent', 0):.1f}%")
                return True
            else:
                print(f"❌ Monitoring health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Monitoring health check error: {e}")
            return False
    
    def test_system_metrics(self):
        """Test system metrics collection"""
        print("🧪 Testing system metrics...")
        try:
            response = requests.get(f"{self.base_url}/monitoring/metrics", timeout=10)
            if response.status_code == 200:
                data = response.json()
                metrics = data.get('metrics', [])
                print(f"✅ System metrics collected: {len(metrics)} metrics")
                for metric in metrics[:3]:  # Show first 3 metrics
                    print(f"   📈 {metric['name']}: {metric['value']}")
                return True
            else:
                print(f"❌ System metrics failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ System metrics error: {e}")
            return False
    
    def test_system_status(self):
        """Test detailed system status"""
        print("🧪 Testing system status...")
        try:
            response = requests.get(f"{self.base_url}/monitoring/system/status", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ System status retrieved: {data.get('status', 'unknown')}")
                print(f"   🔧 Load balancer workers: {data.get('load_balancer', {}).get('workers', 0)}")
                print(f"   💾 Cache hit rate: {data.get('cache', {}).get('hit_rate', 0):.2f}")
                return True
            else:
                print(f"❌ System status failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ System status error: {e}")
            return False
    
    def test_performance_analytics(self):
        """Test performance analytics"""
        print("🧪 Testing performance analytics...")
        try:
            response = requests.get(f"{self.base_url}/monitoring/performance", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Performance analytics retrieved")
                print(f"   📊 Time period: {data.get('time_period_hours', 0)} hours")
                return True
            else:
                print(f"❌ Performance analytics failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Performance analytics error: {e}")
            return False
    
    def test_attendance_analytics(self):
        """Test attendance analytics"""
        print("🧪 Testing attendance analytics...")
        try:
            response = requests.get(f"{self.base_url}/monitoring/attendance/analytics", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Attendance analytics retrieved")
                if 'summary' in data:
                    summary = data['summary']
                    print(f"   📊 Total sessions: {summary.get('total_sessions', 0)}")
                    print(f"   👥 Total attendance: {summary.get('total_attendance', 0)}")
                return True
            else:
                print(f"❌ Attendance analytics failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Attendance analytics error: {e}")
            return False
    
    def test_api_endpoints(self):
        """Test existing API endpoints"""
        print("🧪 Testing existing API endpoints...")
        endpoints = [
            "/student/",
            "/student/classes",
            "/attendance/sessions",
            "/attendance/stats"
        ]
        
        success_count = 0
        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                if response.status_code == 200:
                    print(f"   ✅ {endpoint}")
                    success_count += 1
                else:
                    print(f"   ❌ {endpoint} ({response.status_code})")
            except Exception as e:
                print(f"   ❌ {endpoint} (error: {e})")
        
        print(f"✅ API endpoints test: {success_count}/{len(endpoints)} passed")
        return success_count == len(endpoints)
    
    def run_comprehensive_test(self):
        """Run all tests"""
        print("🚀 Starting Comprehensive System Test")
        print("=" * 60)
        
        start_time = time.time()
        
        # Test results
        tests = [
            ("Basic Health", self.test_basic_health),
            ("Monitoring Health", self.test_monitoring_health),
            ("System Metrics", self.test_system_metrics),
            ("System Status", self.test_system_status),
            ("Performance Analytics", self.test_performance_analytics),
            ("Attendance Analytics", self.test_attendance_analytics),
            ("API Endpoints", self.test_api_endpoints)
        ]
        
        results = {}
        for test_name, test_func in tests:
            print(f"\n🔍 {test_name} Test:")
            try:
                result = test_func()
                results[test_name] = result
            except Exception as e:
                print(f"❌ {test_name} test failed with exception: {e}")
                results[test_name] = False
        
        # Summary
        end_time = time.time()
        duration = end_time - start_time
        
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
        
        print(f"\n🎯 Overall Result: {passed}/{total} tests passed")
        print(f"⏱️  Test Duration: {duration:.2f} seconds")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! System is fully operational with advanced features!")
        else:
            print("⚠️  Some tests failed. Check the logs above for details.")
        
        return results

def main():
    """Main test function"""
    print("🎯 Facial Attendance System - Advanced Features Test")
    print("=" * 60)
    
    tester = SystemTester()
    results = tester.run_comprehensive_test()
    
    # Additional system information
    print("\n📋 SYSTEM INFORMATION")
    print("=" * 60)
    print(f"🕐 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 Base URL: {tester.base_url}")
    print(f"🐍 Python: {__import__('sys').version}")
    
    return results

if __name__ == "__main__":
    main()
