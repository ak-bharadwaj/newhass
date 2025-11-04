# Batch Theme Fix Script - Manager Dashboard

## File: `frontend/src/app/dashboard/manager/page.tsx`

### Already Done
✅ Added import: `import { useTheme } from '@/lib/themeUtils'`
✅ Added hook: `const { isDark } = useTheme()`

### Pending Changes

#### 1. Loading State (Line ~450)
**Find:**
```tsx
<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
```

**Replace with:**
```tsx
<div className={`min-h-screen p-8 ${isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'}`}>
```

#### 2. Error State Background (Line ~461)
**Find:**
```tsx
<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
```

**Replace with:**
```tsx
<div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'}`}>
```

#### 3. Error Card (Line ~473)
**Find:**
```tsx
<div className="glass bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg rounded-2xl p-4">
```

**Replace with:**
```tsx
<div className={`glass backdrop-blur-xl border shadow-lg rounded-2xl p-4 ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/80 border-white/50'}`}>
```

#### 4. KPI Card - Active Patients (Line ~564)
**Find:**
```tsx
<div className="glass bg-gradient-to-br from-primary-500 to-primary-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
```

**Replace with:**
```tsx
<div className={`glass backdrop-blur-xl border shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-shadow ${isDark ? 'bg-gradient-to-br from-primary-900/40 to-primary-800/40 border-primary-700/50' : 'bg-gradient-to-br from-primary-500 to-primary-600 border-primary-400/30 text-white'}`}>
```

#### 5. KPI Card - Available Beds (Line ~583)
**Find:**
```tsx
<div className="glass bg-gradient-to-br from-success-500 to-success-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
```

**Replace with:**
```tsx
<div className={`glass backdrop-blur-xl border shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-shadow ${isDark ? 'bg-gradient-to-br from-success-900/40 to-success-800/40 border-success-700/50' : 'bg-gradient-to-br from-success-500 to-success-600 border-success-400/30 text-white'}`}>
```

#### 6. KPI Card - Today's Appointments (Line ~602)
**Find:**
```tsx
<div className="glass bg-gradient-to-br from-warning-500 to-warning-600 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 text-white hover:shadow-2xl transition-shadow">
```

**Replace with:**
```tsx
<div className={`glass backdrop-blur-xl border shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-shadow ${isDark ? 'bg-gradient-to-br from-warning-900/40 to-warning-800/40 border-warning-700/50' : 'bg-gradient-to-br from-warning-500 to-warning-600 border-warning-400/30 text-white'}`}>
```

#### 7. Text Inside KPI Cards
For each KPI card, replace text colors:

**Find patterns like:**
- `text-white/80` → `${isDark ? 'text-gray-300' : 'text-white/80'}`
- `text-white/90` → `${isDark ? 'text-white' : 'text-white/90'}`
- `text-white` (labels) → `${isDark ? 'text-white' : 'text-white'}`

#### 8. Search for More Patterns
Run grep to find remaining hardcoded colors:
```bash
grep -n "text-gray-900\|text-gray-600\|bg-white\|border-gray-200" frontend/src/app/dashboard/manager/page.tsx
```

Then apply conditional classes to each match.

---

## Summary
- **Total Changes Needed**: ~20-30 className replacements
- **Time Estimate**: 30-45 minutes
- **Pattern**: Same as doctor/nurse dashboards
- **Next File**: `regional_admin/page.tsx` (similar pattern)
