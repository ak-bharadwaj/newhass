#!/usr/bin/env python3
"""
Complete AI Features Discovery Script
Finds ALL AI/intelligent features in the codebase
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Set

class AIFeatureDiscovery:
    def __init__(self):
        self.frontend_dir = Path("frontend/src")
        self.backend_dir = Path("backend")
        self.ai_features = {}
        
    def discover_ai_api_methods(self):
        """Find all AI-related API methods"""
        print("🔍 Discovering AI API Methods...")
        
        api_file = self.frontend_dir / "lib" / "api.ts"
        if not api_file.exists():
            return
        
        with open(api_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all async methods
        methods = re.findall(r'async\s+(\w+)\s*\([^)]*\)\s*:\s*Promise<([^>]+)>', content)
        
        ai_keywords = ['ai', 'suggest', 'predict', 'recommend', 'analyze', 'intelligent', 
                       'smart', 'validate', 'assistant', 'diagnosis', 'treatment']
        
        ai_methods = []
        for method, return_type in methods:
            if any(keyword in method.lower() for keyword in ai_keywords):
                ai_methods.append((method, return_type))
        
        self.ai_features['API Methods'] = ai_methods
        print(f"   Found {len(ai_methods)} AI API methods")
        
        return ai_methods
    
    def discover_ai_components(self):
        """Find all AI-related React components"""
        print("\n🔍 Discovering AI Components...")
        
        tsx_files = list(self.frontend_dir.rglob("*.tsx"))
        
        ai_components = []
        for file_path in tsx_files:
            filename = file_path.name
            
            # Check filename
            ai_keywords = ['AI', 'Ai', 'Voice', 'Smart', 'Intelligent', 'Assistant', 
                          'Predict', 'Recommend', 'Suggest']
            
            if any(keyword in filename for keyword in ai_keywords):
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    line_count = len(lines)
                
                ai_components.append({
                    'name': filename,
                    'path': str(file_path.relative_to(self.frontend_dir)),
                    'lines': line_count
                })
        
        self.ai_features['Components'] = ai_components
        print(f"   Found {len(ai_components)} AI components")
        
        return ai_components
    
    def discover_ai_services(self):
        """Find all AI-related services"""
        print("\n🔍 Discovering AI Services...")
        
        services_dir = self.frontend_dir / "services"
        if not services_dir.exists():
            return []
        
        ai_services = []
        for file_path in services_dir.rglob("*.ts"):
            filename = file_path.name
            
            ai_keywords = ['ai', 'voice', 'smart', 'intelligent', 'assistant', 
                          'predict', 'recommend']
            
            if any(keyword in filename.lower() for keyword in ai_keywords):
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = len(content.split('\n'))
                
                # Count classes and functions
                classes = len(re.findall(r'class\s+\w+', content))
                functions = len(re.findall(r'(?:export\s+)?(?:async\s+)?function\s+\w+', content))
                
                ai_services.append({
                    'name': filename,
                    'path': str(file_path.relative_to(self.frontend_dir)),
                    'lines': lines,
                    'classes': classes,
                    'functions': functions
                })
        
        self.ai_features['Services'] = ai_services
        print(f"   Found {len(ai_services)} AI services")
        
        return ai_services
    
    def discover_ai_hooks(self):
        """Find all AI-related React hooks"""
        print("\n🔍 Discovering AI Hooks...")
        
        hooks_dir = self.frontend_dir / "hooks"
        if not hooks_dir.exists():
            return []
        
        ai_hooks = []
        for file_path in hooks_dir.rglob("*.ts*"):
            filename = file_path.name
            
            if filename.startswith('use') and any(keyword in filename.lower() for keyword in 
                ['ai', 'voice', 'smart', 'intelligent', 'assistant']):
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = len(f.readlines())
                
                ai_hooks.append({
                    'name': filename,
                    'path': str(file_path.relative_to(self.frontend_dir)),
                    'lines': lines
                })
        
        self.ai_features['Hooks'] = ai_hooks
        print(f"   Found {len(ai_hooks)} AI hooks")
        
        return ai_hooks
    
    def discover_intelligent_features(self):
        """Find intelligent features like autocomplete, suggestions, etc."""
        print("\n🔍 Discovering Intelligent Features...")
        
        tsx_files = list(self.frontend_dir.rglob("*.tsx"))
        
        features = {
            'Autocomplete': 0,
            'Suggestions': 0,
            'Recommendations': 0,
            'Predictions': 0,
            'Smart Search': 0,
            'Voice Commands': 0,
            'Real-time Analysis': 0,
            'Intelligent Routing': 0,
        }
        
        for file_path in tsx_files:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read().lower()
            
            if 'autocomplete' in content:
                features['Autocomplete'] += 1
            if 'suggest' in content or 'suggestion' in content:
                features['Suggestions'] += 1
            if 'recommend' in content:
                features['Recommendations'] += 1
            if 'predict' in content:
                features['Predictions'] += 1
            if 'smart' in content and 'search' in content:
                features['Smart Search'] += 1
            if 'voice' in content and 'command' in content:
                features['Voice Commands'] += 1
            if 'real-time' in content or 'realtime' in content:
                features['Real-time Analysis'] += 1
            if 'intelligent' in content or 'smart' in content:
                features['Intelligent Routing'] += 1
        
        self.ai_features['Intelligent Features'] = features
        print(f"   Found {sum(features.values())} intelligent feature implementations")
        
        return features
    
    def generate_report(self):
        """Generate comprehensive AI features report"""
        print("\n" + "="*70)
        print("🤖 COMPLETE AI FEATURES REPORT")
        print("="*70)
        
        total_features = 0
        
        # API Methods
        if 'API Methods' in self.ai_features:
            methods = self.ai_features['API Methods']
            print(f"\n📡 AI API METHODS ({len(methods)}):")
            for method, return_type in methods[:15]:  # Show first 15
                print(f"   ✅ {method}() → {return_type}")
                total_features += 1
            if len(methods) > 15:
                print(f"   ... and {len(methods) - 15} more methods")
        
        # Components
        if 'Components' in self.ai_features:
            components = self.ai_features['Components']
            print(f"\n🧩 AI COMPONENTS ({len(components)}):")
            for comp in components:
                print(f"   ✅ {comp['name']} ({comp['lines']} lines)")
                total_features += 1
        
        # Services
        if 'Services' in self.ai_features:
            services = self.ai_features['Services']
            print(f"\n⚙️  AI SERVICES ({len(services)}):")
            for svc in services:
                print(f"   ✅ {svc['name']} ({svc['lines']} lines, {svc['classes']} classes, {svc['functions']} functions)")
                total_features += 1
        
        # Hooks
        if 'Hooks' in self.ai_features:
            hooks = self.ai_features['Hooks']
            print(f"\n🪝 AI HOOKS ({len(hooks)}):")
            for hook in hooks:
                print(f"   ✅ {hook['name']} ({hook['lines']} lines)")
                total_features += 1
        
        # Intelligent Features
        if 'Intelligent Features' in self.ai_features:
            features = self.ai_features['Intelligent Features']
            print(f"\n🧠 INTELLIGENT FEATURES:")
            for feature, count in features.items():
                if count > 0:
                    print(f"   ✅ {feature}: {count} implementations")
        
        print("\n" + "="*70)
        print(f"📊 TOTAL AI/INTELLIGENT FEATURES: {total_features}+")
        print("="*70)
        
        return total_features
    
    def run(self):
        """Run complete AI discovery"""
        print("🤖 COMPLETE AI FEATURES DISCOVERY")
        print("="*70)
        print("Scanning entire codebase for AI/intelligent features...")
        print()
        
        self.discover_ai_api_methods()
        self.discover_ai_components()
        self.discover_ai_services()
        self.discover_ai_hooks()
        self.discover_intelligent_features()
        
        total = self.generate_report()
        
        return self.ai_features, total

if __name__ == "__main__":
    discovery = AIFeatureDiscovery()
    features, total = discovery.run()
    
    print(f"\n✅ Discovery complete! Found {total}+ AI/intelligent features")
