import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InsertDataPage from '../src/pages/InsertDataPage'

// Mock the child components
vi.mock('../src/components/DatabaseExplorer', () => ({
  default: ({ onDatabaseSelect, selectedDatabase }: { 
    onDatabaseSelect: (db: unknown) => void; 
    selectedDatabase: { name: string } | null 
  }) => (
    <div data-testid="database-explorer" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Databases</h2>
        <p className="text-sm text-gray-500">SmartDB AI managed databases</p>
      </div>
      <button 
        onClick={() => onDatabaseSelect({ 
          name: 'testdb', 
          tables: [{ name: 'users', columns: [] }] 
        })}
      >
        Select Database
      </button>
      {selectedDatabase && <div>Selected: {selectedDatabase.name}</div>}
      <button className="mt-4 w-full text-sm text-blue-600 hover:text-blue-700 py-2">
        Refresh
      </button>
    </div>
  )
}))

vi.mock('../src/components/DataUpload', () => ({
  default: ({ database }: { database: { name: string } }) => (
    <div data-testid="data-upload">Data Upload for {database.name}</div>
  )
}))

vi.mock('../src/components/InsertDataModal', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? (
      <div data-testid="insert-data-modal">
        <div>Insert Data Modal</div>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  )
}))

describe('InsertDataPage', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    mockOnBack.mockClear()
  })

  it('renders main elements correctly', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    // Check header elements
    expect(screen.getByText('Insert Data')).toBeInTheDocument()
    expect(screen.getByText('Upload data to your databases')).toBeInTheDocument()
    expect(screen.getAllByText('Create Database')).toHaveLength(2) // Header and empty state
    
    // Check for back button
    const backButtons = screen.getAllByRole('button')
    expect(backButtons.length).toBeGreaterThan(0)
    
    // Check for database explorer
    expect(screen.getByTestId('database-explorer')).toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    const backButton = screen.getAllByRole('button')[0] // First button is the back button
    fireEvent.click(backButton)
    
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('shows no database selected state by default', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    expect(screen.getByText('No Database Selected')).toBeInTheDocument()
    expect(screen.getByText(/Select a database from the left panel/)).toBeInTheDocument()
  })

  it('opens modal when Create Database button is clicked from header', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    const createButton = screen.getAllByText('Create Database')[0] // Get header button
    fireEvent.click(createButton!)
    
    expect(screen.getByTestId('insert-data-modal')).toBeInTheDocument()
    expect(screen.getByText('Insert Data Modal')).toBeInTheDocument()
  })

  it('opens modal when Create Database button is clicked from empty state', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    const createButton = screen.getAllByText('Create Database')[1] // Get empty state button
    fireEvent.click(createButton!)
    
    expect(screen.getByTestId('insert-data-modal')).toBeInTheDocument()
  })

  it('closes modal when close button is clicked', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    // Open modal
    const createButton = screen.getAllByText('Create Database')[0]
    fireEvent.click(createButton!)
    
    // Close modal
    const closeButton = screen.getByText('Close Modal')
    fireEvent.click(closeButton)
    
    expect(screen.queryByTestId('insert-data-modal')).not.toBeInTheDocument()
  })

  it('shows DataUpload component when database is selected', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    // Select a database
    const selectButton = screen.getByText('Select Database')
    fireEvent.click(selectButton)
    
    // Should show DataUpload component
    expect(screen.getByTestId('data-upload')).toBeInTheDocument()
    expect(screen.getByText('Data Upload for testdb')).toBeInTheDocument()
    
    // Should not show empty state
    expect(screen.queryByText('No Database Selected')).not.toBeInTheDocument()
  })

  it('updates selected database state correctly', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    // Initially no database selected
    expect(screen.queryByText('Selected: testdb')).not.toBeInTheDocument()
    
    // Select database
    const selectButton = screen.getByText('Select Database')
    fireEvent.click(selectButton)
    
    // Should show selected database
    expect(screen.getByText('Selected: testdb')).toBeInTheDocument()
  })

  it('handles database selection and deselection', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    // Select database
    fireEvent.click(screen.getByText('Select Database'))
    expect(screen.getByTestId('data-upload')).toBeInTheDocument()
    
    // Note: In a real scenario, we would test deselection too,
    // but our mock doesn't implement that functionality
  })

  it('has correct layout structure', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    // Check for grid layout container
    const gridContainer = document.querySelector('.grid.grid-cols-12')
    expect(gridContainer).toBeInTheDocument()
    
    // Check for database explorer in left column
    expect(screen.getByTestId('database-explorer')).toBeInTheDocument()
    
    // Check for 4-8 column layout by finding the elements with correct classes
    const leftColumn = document.querySelector('.col-span-4')
    const rightColumn = document.querySelector('.col-span-8')
    expect(leftColumn).toBeInTheDocument()
    expect(rightColumn).toBeInTheDocument()
  })

  it('renders icons correctly', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    // Check for various icons (lucide-react icons have lucide class names)
    expect(document.querySelector('.lucide-arrow-left')).toBeInTheDocument()
    expect(document.querySelector('.lucide-database')).toBeInTheDocument()
    expect(document.querySelector('.lucide-plus')).toBeInTheDocument()
  })

  it('maintains modal state correctly', () => {
    render(<InsertDataPage onBack={mockOnBack} />)
    
    // Modal should not be open initially
    expect(screen.queryByTestId('insert-data-modal')).not.toBeInTheDocument()
    
    // Open modal
    fireEvent.click(screen.getAllByText('Create Database')[0]!)
    expect(screen.getByTestId('insert-data-modal')).toBeInTheDocument()
    
    // Close modal
    fireEvent.click(screen.getByText('Close Modal'))
    expect(screen.queryByTestId('insert-data-modal')).not.toBeInTheDocument()
    
    // Open again
    fireEvent.click(screen.getAllByText('Create Database')[0]!)
    expect(screen.getByTestId('insert-data-modal')).toBeInTheDocument()
  })
})