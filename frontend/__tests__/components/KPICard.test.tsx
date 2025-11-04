/**
 * Unit tests for KPICard component
 */
import { render, screen } from '@testing-library/react'
import { KPICard } from '@/components/dashboard/KPICard'

describe('KPICard', () => {
  it('renders with title and value', () => {
    render(<KPICard title="Total Patients" value={150} />)
    
    expect(screen.getByText('Total Patients')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('renders with trend indicator', () => {
    render(<KPICard title="Active Visits" value={45} trend={{ value: 12, isPositive: true }} />)
    
    expect(screen.getByText('Active Visits')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('12%', { exact: false })).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    const TestIcon = () => <div data-testid="test-icon">Icon</div>
    render(<KPICard title="Test" value={100} icon={<TestIcon />} />)
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })
})
