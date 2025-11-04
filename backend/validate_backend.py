#!/usr/bin/env python3
"""
Comprehensive Backend Validation Script
Checks for common issues before deployment
"""
import os
import sys
import py_compile
import re
from pathlib import Path

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def check_icon(passed):
    return f"{Colors.GREEN}✅{Colors.END}" if passed else f"{Colors.RED}❌{Colors.END}"

def check_requirements():
    """Check if all required dependencies are in requirements.txt"""
    print(f"\n{Colors.BLUE}=== Checking requirements.txt ==={Colors.END}")

    required_packages = [
        'fastapi',
        'sqlalchemy',
        'jinja2',
        'qrcode',
        'celery',
        'redis',
        'google-generativeai',
        'boto3',
        'reportlab'
    ]

    try:
        with open('requirements.txt', 'r') as f:
            content = f.read()

        missing = []
        for pkg in required_packages:
            if pkg not in content.lower():
                missing.append(pkg)

        if missing:
            print(f"{check_icon(False)} Missing packages: {', '.join(missing)}")
            return False
        else:
            print(f"{check_icon(True)} All required packages present")

        # Check jinja2 specifically
        if 'jinja2' in content:
            print(f"{check_icon(True)} jinja2 dependency present (fixes PDFService)")

        return True
    except Exception as e:
        print(f"{check_icon(False)} Error reading requirements.txt: {e}")
        return False

def compile_python_files():
    """Compile critical Python files to check for syntax errors"""
    print(f"\n{Colors.BLUE}=== Compiling Python Files ==={Colors.END}")

    critical_files = [
        'app/main.py',
        'app/core/config.py',
        'app/api/routes/sse.py',
        'app/api/routes/auth.py',
        'app/api/routes/patients.py',
        'app/api/routes/clinical.py',
        'app/api/routes/qr_codes.py',
        'app/api/routes/voice_to_text.py',
        'app/api/routes/ai_intelligence.py',
        'app/services/pdf_service.py',
        'app/services/ai_bed_prediction_service.py',
        'app/services/early_warning_system.py',
        'app/services/ai_queue_optimizer.py',
        'app/models/visit.py',
        'app/models/bed.py',
        'app/models/vitals.py',
    ]

    all_passed = True
    for file_path in critical_files:
        try:
            py_compile.compile(file_path, doraise=True)
            print(f"{check_icon(True)} {file_path}")
        except Exception as e:
            print(f"{check_icon(False)} {file_path}: {str(e)[:80]}")
            all_passed = False

    return all_passed

def check_api_config():
    """Check API configuration"""
    print(f"\n{Colors.BLUE}=== Checking API Configuration ==={Colors.END}")

    try:
        with open('app/core/config.py', 'r') as f:
            content = f.read()

        # Check API_V1_STR
        if 'API_V1_STR: str = "/api/v1"' in content:
            print(f"{check_icon(True)} API_V1_STR set to /api/v1 (matches frontend)")
        elif 'API_V1_STR' in content:
            print(f"{check_icon(False)} API_V1_STR found but not set to /api/v1")
            return False
        else:
            print(f"{check_icon(False)} API_V1_STR not found")
            return False

        return True
    except Exception as e:
        print(f"{check_icon(False)} Error checking config: {e}")
        return False

def check_database_models():
    """Check database models for consistency"""
    print(f"\n{Colors.BLUE}=== Checking Database Models ==={Colors.END}")

    checks_passed = True

    # Check Vitals model has correct blood pressure fields
    try:
        with open('app/models/vitals.py', 'r') as f:
            content = f.read()

        if 'blood_pressure_systolic' in content and 'blood_pressure_diastolic' in content:
            print(f"{check_icon(True)} Vitals model has correct blood pressure fields")
        else:
            print(f"{check_icon(False)} Vitals model missing blood pressure fields")
            checks_passed = False
    except Exception as e:
        print(f"{check_icon(False)} Error checking Vitals model: {e}")
        checks_passed = False

    # Check Visit-Bed relationship
    try:
        with open('app/models/visit.py', 'r') as f:
            visit_content = f.read()
        with open('app/models/bed.py', 'r') as f:
            bed_content = f.read()

        visit_has_beds = 'beds = relationship("Bed"' in visit_content and 'back_populates="visit"' in visit_content
        bed_has_visit = 'visit = relationship("Visit"' in bed_content and 'back_populates="beds"' in bed_content

        if visit_has_beds and bed_has_visit:
            print(f"{check_icon(True)} Visit-Bed relationship configured correctly")
        else:
            print(f"{check_icon(False)} Visit-Bed relationship misconfigured")
            if not visit_has_beds:
                print(f"  Issue: Visit model missing 'beds' relationship")
            if not bed_has_visit:
                print(f"  Issue: Bed model missing 'visit' relationship")
            checks_passed = False
    except Exception as e:
        print(f"{check_icon(False)} Error checking relationships: {e}")
        checks_passed = False

    return checks_passed

def check_service_fixes():
    """Check that critical service fixes are in place"""
    print(f"\n{Colors.BLUE}=== Checking Service Layer Fixes ==={Colors.END}")

    checks_passed = True

    # Check PDFService imports jinja2
    try:
        with open('app/services/pdf_service.py', 'r') as f:
            content = f.read()

        if 'from jinja2 import' in content or 'import jinja2' in content:
            print(f"{check_icon(True)} PDFService imports jinja2 correctly")
        else:
            print(f"{check_icon(False)} PDFService missing jinja2 import")
            checks_passed = False
    except Exception as e:
        print(f"{check_icon(False)} Error checking PDFService: {e}")
        checks_passed = False

    # Check blood pressure field names in services
    services_to_check = [
        ('early_warning_system.py', 'EarlyWarningSystem'),
        ('ai_queue_optimizer.py', 'AIQueueOptimizer'),
    ]

    for filename, service_name in services_to_check:
        try:
            with open(f'app/services/{filename}', 'r') as f:
                content = f.read()

            # Should use blood_pressure_systolic, NOT systolic_bp
            if 'blood_pressure_systolic' in content:
                if 'systolic_bp' not in content or content.count('systolic_bp') < 3:
                    print(f"{check_icon(True)} {service_name} uses correct field names")
                else:
                    print(f"{check_icon(False)} {service_name} has old field names (systolic_bp)")
                    checks_passed = False
            else:
                print(f"{check_icon(False)} {service_name} missing blood_pressure_systolic")
                checks_passed = False
        except Exception as e:
            print(f"{check_icon(False)} Error checking {service_name}: {e}")
            checks_passed = False

    # Check bed_type uses lowercase "icu"
    try:
        with open('app/services/ai_bed_prediction_service.py', 'r') as f:
            content = f.read()

        # Should use "icu", not "ICU"
        icu_lowercase_count = content.count('"icu"')
        icu_uppercase_count = content.count('"ICU"')

        if icu_lowercase_count > 0 and icu_uppercase_count == 0:
            print(f"{check_icon(True)} AIBedPredictionService uses correct bed_type ('icu')")
        else:
            print(f"{check_icon(False)} AIBedPredictionService uses wrong bed_type ('ICU')")
            checks_passed = False
    except Exception as e:
        print(f"{check_icon(False)} Error checking bed_type: {e}")
        checks_passed = False

    return checks_passed

def check_sse_auth():
    """Check SSE routes have query parameter authentication"""
    print(f"\n{Colors.BLUE}=== Checking SSE Authentication ==={Colors.END}")

    try:
        with open('app/api/routes/sse.py', 'r') as f:
            content = f.read()

        if 'get_user_from_token_query' in content:
            print(f"{check_icon(True)} SSE routes use query parameter authentication")

            # Check it accepts token as query parameter
            if 'token: str = Query' in content:
                print(f"{check_icon(True)} Token query parameter defined correctly")
            else:
                print(f"{check_icon(False)} Token query parameter missing")
                return False
        else:
            print(f"{check_icon(False)} SSE routes missing query auth function")
            return False

        return True
    except Exception as e:
        print(f"{check_icon(False)} Error checking SSE auth: {e}")
        return False

def check_router_registrations():
    """Check all routers are registered in main.py"""
    print(f"\n{Colors.BLUE}=== Checking Router Registrations ==={Colors.END}")

    try:
        with open('app/main.py', 'r') as f:
            content = f.read()

        required_routes = [
            'auth', 'patients', 'clinical', 'appointments', 'beds',
            'sse', 'ai-intelligence', 'qr', 'voice-to-text', 'visits'
        ]

        missing = []
        for route in required_routes:
            # Check for route registration (various patterns)
            patterns = [
                f'"{route}"',
                f'/{route}',
                f'{route}.router',
            ]
            if any(pattern in content for pattern in patterns):
                pass
            else:
                missing.append(route)

        if missing:
            print(f"{check_icon(False)} Missing route registrations: {', '.join(missing)}")
            return False
        else:
            print(f"{check_icon(True)} All critical routes registered")

        # Check all use settings.API_V1_STR
        if '.include_router' in content:
            lines_with_include = [line for line in content.split('\n') if '.include_router' in line]
            hardcoded = [line for line in lines_with_include if 'prefix="/api' in line and 'settings.API_V1_STR' not in line]

            if hardcoded:
                print(f"{check_icon(False)} Found {len(hardcoded)} hardcoded API paths")
                return False
            else:
                print(f"{check_icon(True)} All routes use settings.API_V1_STR")

        return True
    except Exception as e:
        print(f"{check_icon(False)} Error checking routers: {e}")
        return False

def main():
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"  Backend Validation Script")
    print(f"{'='*60}{Colors.END}\n")

    # Change to backend directory if needed
    if not os.path.exists('app'):
        if os.path.exists('backend/app'):
            os.chdir('backend')
            print("Changed to backend directory\n")
        else:
            print(f"{Colors.RED}Error: Cannot find backend app directory{Colors.END}")
            sys.exit(1)

    results = []

    results.append(("Requirements", check_requirements()))
    results.append(("Python Compilation", compile_python_files()))
    results.append(("API Configuration", check_api_config()))
    results.append(("Database Models", check_database_models()))
    results.append(("Service Layer Fixes", check_service_fixes()))
    results.append(("SSE Authentication", check_sse_auth()))
    results.append(("Router Registrations", check_router_registrations()))

    # Summary
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"  Summary")
    print(f"{'='*60}{Colors.END}\n")

    all_passed = all(result[1] for result in results)

    for check_name, passed in results:
        print(f"{check_icon(passed)} {check_name}")

    print()

    if all_passed:
        print(f"{Colors.GREEN}{'='*60}")
        print(f"  ✅ ALL CHECKS PASSED - Backend is ready!")
        print(f"{'='*60}{Colors.END}\n")
        sys.exit(0)
    else:
        failed_count = sum(1 for _, passed in results if not passed)
        print(f"{Colors.RED}{'='*60}")
        print(f"  ❌ {failed_count} CHECKS FAILED - Fix errors before deployment")
        print(f"{'='*60}{Colors.END}\n")
        sys.exit(1)

if __name__ == '__main__':
    main()
