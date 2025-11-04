# Public Health Monitoring Feature - Hospitalization Reasons Analytics

**Added:** October 29, 2025  
**Purpose:** Enable hospitals to monitor and alert local government about hospitalization trends for public health monitoring

## 🚨 New Feature: Hospitalization Reasons Analytics

### Overview
A specialized analytics section that tracks **why people are getting hospitalized**, providing critical data for local government health authorities to identify public health trends and respond to emerging health crises.

### Key Features

#### 1. **Comprehensive Reason Tracking**
Tracks 15+ major hospitalization reasons including:
- ✅ Respiratory Infections (with severity and trend %)
- ✅ Cardiovascular Disease
- ✅ Accidents & Trauma
- ✅ Diabetes Complications
- ✅ Infectious Diseases
- ✅ Gastrointestinal Issues
- ✅ Neurological Disorders
- ✅ Cancer Treatment
- ✅ Pregnancy & Childbirth
- ✅ Mental Health Crisis
- ✅ Kidney Disease
- ✅ Pneumonia
- ✅ Hypertension
- ✅ Asthma/COPD
- ✅ Other

#### 2. **Severity Classification**
Each reason is classified by severity:
- 🔴 **Critical** (Red) - Immediate govt attention needed
- 🟠 **High** (Orange) - Significant concern
- 🟡 **Medium** (Yellow) - Moderate monitoring
- 🟢 **Low** (Green) - Normal levels

#### 3. **Trend Analysis**
- Tracks percentage change over time periods
- Identifies rapidly increasing cases (>10%, >15%, >20%)
- Color-coded trends:
  - Red: Increasing (⬆)
  - Green: Decreasing (⬇)

#### 4. **Visual Analytics**

**Bar Chart:**
- Shows hospitalization volume by reason
- Color-coded by severity (red=critical, orange=high, yellow=medium, green=low)
- Interactive tooltips with count, severity, and trend
- X-axis with rotated labels for readability
- Responsive design

**Critical Alerts Table:**
- Filters to show only critical severity OR rapidly increasing trends (>10%)
- Real-time pulse animation on critical items
- Displays:
  - Reason name
  - Severity badge
  - Case count
  - Trend percentage
  - Special alert for >15% increases: "Rapid increase detected - Local govt alert recommended"

#### 5. **Generate Alert Report Button**
Creates a downloadable JSON report containing:
```json
{
  "timestamp": "2025-10-29T...",
  "period": "2025-09-29 to 2025-10-29",
  "hospital": "Hospital ID or 'All Hospitals'",
  "topReasons": [top 5 reasons],
  "criticalAlerts": [all critical severity or >15% increase reasons]
}
```
- One-click download
- Formatted for government health authorities
- Includes alert message: "This report can be sent to local government health authorities"

#### 6. **Summary Statistics Dashboard**
4 summary cards:
- **Total Cases**: Sum of all hospitalization reasons
- **Critical Severity**: Count of critical-level reasons
- **Trending Up (>10%)**: Count of rapidly increasing reasons
- **Most Common**: The #1 hospitalization reason

### 🎨 UI Design

**Section Styling:**
- Orange/red gradient background (indicates alert/warning)
- Orange border glow effect
- Dedicated section with warning icon
- Title: "Public Health Alert: Hospitalization Reasons"
- Subtitle: "Critical data for local government health monitoring"

**Responsive Layout:**
- 2-column grid (chart + alerts table) on desktop
- Stacks vertically on mobile
- Scrollable alerts table (max-height 400px)
- Full-width summary cards grid

### 📊 Sample Data (Mock)

The system includes realistic mock data for demonstration:

```typescript
Respiratory Infections: 185 cases, HIGH severity, +12% trend
Cardiovascular Disease: 156 cases, CRITICAL severity, +8% trend
Accidents & Trauma: 142 cases, HIGH severity, -3% trend (improving)
Diabetes Complications: 128 cases, MEDIUM severity, +15% trend ⚠️
Infectious Diseases: 98 cases, HIGH severity, +25% trend ⚠️ ALERT
...
```

### 🔧 Technical Implementation

**Component Location:**
- `frontend/src/app/dashboard/admin/analytics/page.tsx`

**New Interface Properties:**
```typescript
interface AnalyticsData {
  // ... existing properties
  hospitalizationReasons: any[];
}
```

**New Chart Type:**
```typescript
chartTypes: {
  // ... existing types
  hospitalizationReasons: 'bar',
}
```

**Data Structure:**
```typescript
{
  reason: string,          // e.g., "Respiratory Infections"
  count: number,           // e.g., 185
  severity: string,        // 'critical' | 'high' | 'medium' | 'low'
  trend: string,           // e.g., "+12%"
  value: number            // same as count, for chart compatibility
}
```

### 🌐 Use Cases

1. **Public Health Surveillance**
   - Local health departments can monitor disease outbreaks
   - Identify emerging health crises early
   - Track seasonal illness patterns

2. **Resource Allocation**
   - Government can allocate medical resources based on trends
   - Plan public health campaigns (e.g., vaccination drives)
   - Prepare emergency response capacity

3. **Epidemic/Pandemic Early Warning**
   - Rapid increase in respiratory infections → potential outbreak
   - High infectious disease numbers → investigate cause
   - Mental health crisis surge → allocate counseling resources

4. **Policy Making**
   - Data-driven health policy decisions
   - Target preventive healthcare programs
   - Budget allocation for specific health concerns

### 🚀 Future Enhancements

**API Integration (When Backend Ready):**
```typescript
apiClient.getHospitalizationReasons(token, {
  startDate: dateRange.startDate,
  endDate: dateRange.endDate,
  hospitalId: user?.hospital_id,
  regionId: selectedRegion,
  severity: ['critical', 'high'],
  minTrendPercentage: 10
})
```

**Automated Alerts:**
- Email alerts to govt health authorities when:
  - Any reason reaches critical severity
  - Any reason increases >20% in 7 days
  - Multiple reasons show upward trends simultaneously

**Integration with Government Systems:**
- Direct API endpoint for health department systems
- Automated report scheduling (daily/weekly)
- Real-time data push to government dashboards

### 📱 Accessibility

- ✅ Screen reader compatible
- ✅ Keyboard navigation
- ✅ High contrast colors for severity levels
- ✅ Alternative text for charts
- ✅ Responsive mobile design

### 🔐 Security & Privacy

- ✅ Admin/Hospital Admin/Regional Admin/Super Admin access only
- ✅ No patient-identifiable information in reports
- ✅ Aggregated data only
- ✅ Secure JSON export (no PII)
- ✅ Hospital-level filtering available

## 📄 Report Format

**Generated Alert Report Example:**

```json
{
  "timestamp": "2025-10-29T10:30:45.123Z",
  "period": "2025-09-29 to 2025-10-29",
  "hospital": "Central Hospital (ID: abc123)",
  "topReasons": [
    {
      "reason": "Respiratory Infections",
      "count": 185,
      "severity": "high",
      "trend": "+12%"
    },
    {
      "reason": "Cardiovascular Disease",
      "count": 156,
      "severity": "critical",
      "trend": "+8%"
    },
    ...
  ],
  "criticalAlerts": [
    {
      "reason": "Infectious Diseases",
      "count": 98,
      "severity": "high",
      "trend": "+25%",
      "alertLevel": "URGENT - Rapid increase detected"
    },
    {
      "reason": "Diabetes Complications",
      "count": 128,
      "severity": "medium",
      "trend": "+15%",
      "alertLevel": "WARNING - Above normal increase"
    }
  ]
}
```

## 🎯 Impact

This feature enables:
- ✅ **Proactive Public Health Response** - Early detection of health crises
- ✅ **Evidence-Based Policy** - Data-driven government decisions
- ✅ **Community Safety** - Faster response to disease outbreaks
- ✅ **Resource Optimization** - Better allocation of medical resources
- ✅ **Transparent Reporting** - Clear communication with health authorities

## 🏥 Example Scenarios

### Scenario 1: Respiratory Outbreak Detection
```
Week 1: Respiratory Infections = 120 cases
Week 2: Respiratory Infections = 145 cases (+20.8%)
Week 3: Respiratory Infections = 185 cases (+27.6%)

🚨 ALERT: Report generated and sent to local health department
→ Investigation reveals flu outbreak in local schools
→ Government initiates vaccination campaign
```

### Scenario 2: Mental Health Crisis
```
Month 1: Mental Health Crisis = 35 cases
Month 2: Mental Health Crisis = 52 cases (+48.6%)

🚨 ALERT: Critical increase detected
→ Report sent to mental health authorities
→ Government expands crisis counseling services
```

---

## 🔄 Integration Status

**Current Status:** ✅ Fully Implemented in Frontend
- UI/UX Complete
- Mock Data Generation Complete
- Export Functionality Complete
- Responsive Design Complete

**Pending:** ⏳ Backend API Integration
- Requires new endpoint: `GET /api/v1/analytics/hospitalization-reasons`
- Data aggregation from patient admission records
- Trend calculation algorithms
- Severity classification logic

**Ready for:** ✅ User Testing & Feedback

---

**This feature directly addresses your request:**
> "can we check analytics like for what reasons people hospitalized to alert local govt"

**Answer:** YES! The feature:
1. ✅ Tracks hospitalization reasons
2. ✅ Identifies critical trends
3. ✅ Generates alert reports
4. ✅ Provides exportable data for local government
5. ✅ Shows visual analytics with severity levels
6. ✅ Highlights rapidly increasing cases
