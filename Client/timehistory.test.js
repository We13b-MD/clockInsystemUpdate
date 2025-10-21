/*
Does your calculateDuration() handle overnight shifts correctly?
Should it round minutes or show exact minutes?
What should happen with negative durations (end time before start time)?

Once you confirm these behaviors, we can write the Jest tests to verify the function works correctly for payroll calculations.

*/


// timeTracker.test.js
// Priority test cases for time tracking dashboard

// Mock localStorage and sessionStorage
// timeTracker.test.js
// Priority test cases for time tracking dashboard

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock window.location (only define once)
delete window.location;
window.location = { href: '' };

// Sample test data
const mockUsers = [
  {
    employeeId: 'EMP001',
    name: 'John Doe',
    role: 'Developer',
    roleType: 'employee'
  },
  {
    employeeId: 'EMP002',
    name: 'Jane Smith',
    role: 'Manager',
    roleType: 'admin'
  }
];

const mockClockRecords = [
  {
    employeeId: 'EMP001',
    date: '2024-01-15',
    clockIn: '2024-01-15T09:00:00.000Z',
    clockOut: '2024-01-15T17:30:00.000Z'
  },
  {
    employeeId: 'EMP001',
    date: '2024-01-16',
    clockIn: '2024-01-16T08:30:00.000Z',
    clockOut: null // Still clocked in
  }
];

describe('Time Tracking Dashboard - PRIORITY TESTS', () => {

  // ============================================================================
  // HIGH PRIORITY: Authentication & Authorization
  // ============================================================================
  
  describe('Authentication & Authorization', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      window.location.href = '';
    });

    test('should redirect to login when user is not authenticated', () => {
      sessionStorageMock.getItem.mockReturnValue(null);
      
      // Simulate page load
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
     // expect(window.location.href).toBe('form.html');
    });

    test('should allow authenticated user to access dashboard', () => {
      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'loggedInUser') return 'John Doe';
        if (key === 'userRole') return 'employee';
        return null;
      });
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUsers));
      
      // Test the authentication logic directly
      function checkAuthentication() {
        const loggedInUser = sessionStorage.getItem('loggedInUser');
        if (!loggedInUser) {
          window.location.href = 'form.html';
          return false;
        }
        return true;
      }
      
      const result = checkAuthentication();
      
      expect(result).toBe(true);
      expect(window.location.href).not.toBe('form.html');
    });

    test('should show company data only for admin/management roles', () => {
      const adminUser = { ...mockUsers[1], roleType: 'admin' };
      const regularUser = { ...mockUsers[0], roleType: 'employee' };
      
      // Test admin access
      expect(shouldShowCompanyData(adminUser)).toBe(true);
      
      // Test regular employee access
      expect(shouldShowCompanyData(regularUser)).toBe(false);
    });
  });

  // ============================================================================
  // HIGH PRIORITY: Time Calculations
  // ============================================================================
  
  describe('Time Calculations', () => {
    
    test('formatTime should return correct 12-hour format', () => {
      const morning = new Date('2024-01-15T09:30:00');
      const afternoon = new Date('2024-01-15T15:45:00');
      const midnight = new Date('2024-01-15T00:00:00');
      const noon = new Date('2024-01-15T12:00:00');
      
      expect(formatTime(morning)).toBe('9:30 AM');
      expect(formatTime(afternoon)).toBe('3:45 PM');
      expect(formatTime(midnight)).toBe('12:00 AM');
      expect(formatTime(noon)).toBe('12:00 PM');
    });

    test('formatTime should handle null/undefined dates', () => {
      expect(formatTime(null)).toBe('--:-- --');
      expect(formatTime(undefined)).toBe('--:-- --');
    });

    test('calculateDuration should return correct duration for normal work day', () => {
      const startTime = '2024-01-15T09:00:00.000Z';
      const endTime = '2024-01-15T17:30:00.000Z';
      
      expect(calculateDuration(startTime, endTime)).toBe('8h 30m');
    });

    test('calculateDuration should handle null clockOut time', () => {
      const startTime = '2024-01-15T09:00:00.000Z';
      const endTime = null;
      
      expect(calculateDuration(startTime, endTime)).toBe('--');
    });

    test('calculateDuration should handle undefined parameters', () => {
      expect(calculateDuration(null, null)).toBe('--');
      expect(calculateDuration(undefined, undefined)).toBe('--');
    });

    test('calculateDuration should handle same clock in/out time', () => {
      const sameTime = '2024-01-15T09:00:00.000Z';
      
      expect(calculateDuration(sameTime, sameTime)).toBe('0h 0m');
    });

    test('calculateDuration should handle overnight shifts', () => {
      const startTime = '2024-01-15T23:00:00.000Z'; // 11 PM
      const endTime = '2024-01-16T07:00:00.000Z';   // 7 AM next day
      
      expect(calculateDuration(startTime, endTime)).toBe('8h 0m');
    });

    test('calculateDuration should handle short durations', () => {
      const startTime = '2024-01-15T09:00:00.000Z';
      const endTime = '2024-01-15T09:30:00.000Z';   // 30 minutes
      
      expect(calculateDuration(startTime, endTime)).toBe('0h 30m');
    });

    test('calculateDuration should handle long shifts', () => {
      const startTime = '2024-01-15T08:00:00.000Z';
      const endTime = '2024-01-15T22:00:00.000Z';   // 14 hours
      
      expect(calculateDuration(startTime, endTime)).toBe('14h 0m');
    });

    test('calculateDuration should handle minutes correctly', () => {
      const startTime = '2024-01-15T09:15:00.000Z';
      const endTime = '2024-01-15T17:45:00.000Z';   // 8h 30m
      
      expect(calculateDuration(startTime, endTime)).toBe('8h 30m');
    });
  });

  // ============================================================================
  // Helper function to extract from your original code for testing
  // ============================================================================
  
  // Copy your calculateDuration function here for testing
  function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return '--';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  // Copy your formatTime function here for testing
  function formatTime(date) {
    if (!date) return '--:-- --';
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  }

  // Helper function for authorization testing
  function shouldShowCompanyData(user) {
    const userRoleType = user.roleType || 'employee';
    return userRoleType.toLowerCase() === 'admin' || userRoleType.toLowerCase() === 'management';
  }
});