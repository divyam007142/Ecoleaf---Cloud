#!/usr/bin/env python3
"""
Focused Backend API Testing for Secure Auth Application
Tests specific auth flows as requested in the review
"""

import requests
import json
import os
from datetime import datetime

class FocusedAuthTester:
    def __init__(self):
        # Use the backend URL from frontend .env
        self.base_url = "http://localhost:8001/api"
        self.test_results = []
        
    def log_result(self, test_name, success, details, response_data=None):
        """Log test result with details"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"\n{status} - {test_name}")
        print(f"Details: {details}")
        if response_data:
            print(f"Response: {json.dumps(response_data, indent=2)}")
        
    def test_root_endpoint(self):
        """Test GET /api/ - Root endpoint"""
        print("\n🔍 Testing Root Endpoint...")
        try:
            response = requests.get(f"{self.base_url}/")
            success = response.status_code == 200
            
            try:
                response_data = response.json()
                expected_message = "Secure Auth API Server"
                message_correct = response_data.get("message") == expected_message
                
                if success and message_correct:
                    self.log_result(
                        "Root Endpoint", 
                        True, 
                        f"Status: {response.status_code}, Message correct",
                        response_data
                    )
                    return True
                else:
                    self.log_result(
                        "Root Endpoint", 
                        False, 
                        f"Status: {response.status_code}, Expected message: '{expected_message}', Got: {response_data}",
                        response_data
                    )
                    return False
            except Exception as e:
                self.log_result(
                    "Root Endpoint", 
                    False, 
                    f"Status: {response.status_code}, JSON parse error: {str(e)}",
                    {"raw_response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result("Root Endpoint", False, f"Request failed: {str(e)}")
            return False
    
    def test_register_new_user(self):
        """Test POST /api/auth/register - Register test123@example.com"""
        print("\n🔍 Testing User Registration...")
        try:
            data = {
                "email": "test123@example.com",
                "password": "test1234"
            }
            
            response = requests.post(
                f"{self.base_url}/auth/register",
                json=data,
                headers={'Content-Type': 'application/json'}
            )
            
            success = response.status_code in [200, 201]
            
            try:
                response_data = response.json()
                
                if success:
                    self.log_result(
                        "Register New User", 
                        True, 
                        f"Status: {response.status_code}, Registration successful",
                        response_data
                    )
                    return True
                else:
                    self.log_result(
                        "Register New User", 
                        False, 
                        f"Status: {response.status_code}, Registration failed",
                        response_data
                    )
                    return False
            except Exception as e:
                self.log_result(
                    "Register New User", 
                    False, 
                    f"Status: {response.status_code}, JSON parse error: {str(e)}",
                    {"raw_response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result("Register New User", False, f"Request failed: {str(e)}")
            return False
    
    def test_register_duplicate_user(self):
        """Test POST /api/auth/register - Try same email again"""
        print("\n🔍 Testing Duplicate User Registration...")
        try:
            data = {
                "email": "test123@example.com",
                "password": "test1234"
            }
            
            response = requests.post(
                f"{self.base_url}/auth/register",
                json=data,
                headers={'Content-Type': 'application/json'}
            )
            
            expected_status = 400
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
                expected_message = "User already registered. Please login."
                message_correct = response_data.get("detail") == expected_message
                
                if success and message_correct:
                    self.log_result(
                        "Register Duplicate User", 
                        True, 
                        f"Status: {response.status_code}, Correct error message",
                        response_data
                    )
                    return True
                else:
                    self.log_result(
                        "Register Duplicate User", 
                        False, 
                        f"Status: {response.status_code}, Expected: '{expected_message}', Got: {response_data}",
                        response_data
                    )
                    return False
            except Exception as e:
                self.log_result(
                    "Register Duplicate User", 
                    False, 
                    f"Status: {response.status_code}, JSON parse error: {str(e)}",
                    {"raw_response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result("Register Duplicate User", False, f"Request failed: {str(e)}")
            return False
    
    def test_login_wrong_password(self):
        """Test POST /api/auth/login - Login with wrong password"""
        print("\n🔍 Testing Login with Wrong Password...")
        try:
            data = {
                "email": "test123@example.com",
                "password": "wrongpassword"
            }
            
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=data,
                headers={'Content-Type': 'application/json'}
            )
            
            expected_status = 401
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
                expected_message = "Incorrect password."
                message_correct = response_data.get("detail") == expected_message
                
                if success and message_correct:
                    self.log_result(
                        "Login Wrong Password", 
                        True, 
                        f"Status: {response.status_code}, Correct error message",
                        response_data
                    )
                    return True
                else:
                    self.log_result(
                        "Login Wrong Password", 
                        False, 
                        f"Status: {response.status_code}, Expected: '{expected_message}', Got: {response_data}",
                        response_data
                    )
                    return False
            except Exception as e:
                self.log_result(
                    "Login Wrong Password", 
                    False, 
                    f"Status: {response.status_code}, JSON parse error: {str(e)}",
                    {"raw_response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result("Login Wrong Password", False, f"Request failed: {str(e)}")
            return False
    
    def test_login_nonexistent_user(self):
        """Test POST /api/auth/login - Login with non-existent user"""
        print("\n🔍 Testing Login with Non-existent User...")
        try:
            data = {
                "email": "nonexistent@example.com",
                "password": "test1234"
            }
            
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=data,
                headers={'Content-Type': 'application/json'}
            )
            
            expected_status = 404
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
                expected_message = "User not registered. Please register first."
                message_correct = response_data.get("detail") == expected_message
                
                if success and message_correct:
                    self.log_result(
                        "Login Non-existent User", 
                        True, 
                        f"Status: {response.status_code}, Correct error message",
                        response_data
                    )
                    return True
                else:
                    self.log_result(
                        "Login Non-existent User", 
                        False, 
                        f"Status: {response.status_code}, Expected: '{expected_message}', Got: {response_data}",
                        response_data
                    )
                    return False
            except Exception as e:
                self.log_result(
                    "Login Non-existent User", 
                    False, 
                    f"Status: {response.status_code}, JSON parse error: {str(e)}",
                    {"raw_response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result("Login Non-existent User", False, f"Request failed: {str(e)}")
            return False
    
    def test_login_correct_credentials(self):
        """Test POST /api/auth/login - Login with correct credentials"""
        print("\n🔍 Testing Login with Correct Credentials...")
        try:
            data = {
                "email": "test123@example.com",
                "password": "test1234"
            }
            
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=data,
                headers={'Content-Type': 'application/json'}
            )
            
            expected_status = 200
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
                
                # Check if response contains token and user data
                has_token = "token" in response_data
                has_user = "user" in response_data
                
                if success and has_token and has_user:
                    self.token = response_data["token"]  # Store for potential future use
                    self.log_result(
                        "Login Correct Credentials", 
                        True, 
                        f"Status: {response.status_code}, Token and user data received",
                        response_data
                    )
                    return True
                else:
                    self.log_result(
                        "Login Correct Credentials", 
                        False, 
                        f"Status: {response.status_code}, Missing token or user data. Has token: {has_token}, Has user: {has_user}",
                        response_data
                    )
                    return False
            except Exception as e:
                self.log_result(
                    "Login Correct Credentials", 
                    False, 
                    f"Status: {response.status_code}, JSON parse error: {str(e)}",
                    {"raw_response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_result("Login Correct Credentials", False, f"Request failed: {str(e)}")
            return False
    
    def run_focused_tests(self):
        """Run the specific tests requested in the review"""
        print("🚀 Starting Focused Backend Auth Tests")
        print("=" * 60)
        
        tests = [
            ("Root Endpoint", self.test_root_endpoint),
            ("Register New User", self.test_register_new_user),
            ("Register Duplicate User", self.test_register_duplicate_user),
            ("Login Wrong Password", self.test_login_wrong_password),
            ("Login Non-existent User", self.test_login_nonexistent_user),
            ("Login Correct Credentials", self.test_login_correct_credentials),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            if test_func():
                passed += 1
        
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All focused tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Check details above.")
            return False

def main():
    tester = FocusedAuthTester()
    success = tester.run_focused_tests()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())