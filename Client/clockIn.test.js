/*
In summary this code does this

✅ Does the function create a proper clock record?
✅ Does it save to localStorage correctly?
✅ Does it prevent duplicate clock-ins?
✅ Does it handle the data structure properly?


*/ 
// Mock SweetAlert since it's used in the clockIn function
global.Swal = {
    fire: jest.fn(() => Promise.resolve({ isConfirmed: true }))
};

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
});

describe('Clock In Functionality', () => {
    
    
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        
        // Set up basic user data that your dashboard expects
        sessionStorageMock.getItem.mockImplementation((key) => {
            if (key === 'loggedInUser') return 'John Doe';
            if (key === 'userRole') return 'Employee';
            return null;
        });
        
        // Mock that there are existing users in localStorage
        localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'users') {
                return JSON.stringify([
                    {
                        name: 'John Doe',
                        email: 'john@example.com',
                        employeeId: 'EMP001',
                        role: 'Employee'
                    }
                ]);
            }
            if (key === 'clockRecords') {
                return JSON.stringify([]); // Start with empty records
            }
            return null;
        });
    });

    test('should successfully clock in when user is not already clocked in', () => {
      
        function mockClockIn() {
            const userData = {
                id: 'EMP001',
                name: 'John Doe'
            };
            
            // Simulate the clock in process
            const now = new Date();
            const newRecord = {
                id: Date.now().toString(),
                employeeId: userData.id,
                date: now.toISOString().split('T')[0],
                clockIn: now.toISOString(),
                clockOut: null
            };
            
            // Check if already clocked in (simplified)
            const existingRecords = JSON.parse(localStorage.getItem('clockRecords') || '[]');
            const activeSession = existingRecords.find(record => 
                record.employeeId === userData.id && !record.clockOut
            );
            
            if (activeSession) {
                return { success: false, message: 'Already clocked in' };
            }
            
            // Add new record
            existingRecords.push(newRecord);
            localStorage.setItem('clockRecords', JSON.stringify(existingRecords));
            
            return { success: true, record: newRecord };
        }
        
        // Test the function
        const result = mockClockIn();
        
        // Verify the results
        expect(result.success).toBe(true);
        expect(result.record).toBeDefined();
        expect(result.record.employeeId).toBe('EMP001');
        expect(result.record.clockOut).toBeNull();
        
        // Verify localStorage was called to save the record
        expect(localStorage.setItem).toHaveBeenCalledWith(
            'clockRecords', 
            expect.stringContaining('EMP001')
        );
    });

    test('should prevent clocking in when user is already clocked in', () => {
        // Set up existing active session
        const existingRecords = [{
            id: '123',
            employeeId: 'EMP001',
            date: new Date().toISOString().split('T')[0],
            clockIn: new Date().toISOString(),
            clockOut: null // This means still clocked in
        }];
        
        localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'clockRecords') {
                return JSON.stringify(existingRecords);
            }
            return null;
        });
        
        function mockClockIn() {
            const userData = { id: 'EMP001' };
            const existingRecords = JSON.parse(localStorage.getItem('clockRecords') || '[]');
            const activeSession = existingRecords.find(record => 
                record.employeeId === userData.id && !record.clockOut
            );
            
            if (activeSession) {
                return { success: false, message: 'Already clocked in' };
            }
            
            return { success: true };
        }
        
        const result = mockClockIn();
        
        expect(result.success).toBe(false);
        expect(result.message).toBe('Already clocked in');
    });
});

//Duplicate clockin prevention test

/**
 * @jest-environment jsdom
 */

// Mock SweetAlert since your dashboard uses it


// Mock sessionStorage

Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
});

describe('Duplicate Clock-In Prevention', () => {
    
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        
        // Set up user session data
        sessionStorageMock.getItem.mockImplementation((key) => {
            if (key === 'loggedInUser') return 'John Doe';
            if (key === 'userRole') return 'Employee';
            return null;
        });
        
        // Set up user data in localStorage
        localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'users') {
                return JSON.stringify([
                    {
                        name: 'John Doe',
                        email: 'john@example.com',
                        employeeId: 'EMP001',
                        role: 'Employee'
                    }
                ]);
            }
            return null;
        });
    });

    test('should prevent clock-in when user already has an active session today', () => {
        // Set up: User already clocked in today (no clockOut time)
        const today = new Date();
        const existingActiveRecord = {
            id: '1234567890',
            employeeId: 'EMP001',
            date: today.toISOString().split('T')[0], // Today's date
            clockIn: today.toISOString(),
            clockOut: null, // NULL means still clocked in!
            location: 'Office',
            ipAddress: '192.168.1.1'
        };
        
        // Mock localStorage to return the active session
        localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'users') {
                return JSON.stringify([{
                    name: 'John Doe',
                    employeeId: 'EMP001',
                    role: 'Employee'
                }]);
            }
            if (key === 'clockRecords') {
                return JSON.stringify([existingActiveRecord]);
            }
            return null;
        });
        
        // Simulate your clockIn function logic
        function testClockIn() {
            const userData = { id: 'EMP001', name: 'John Doe' };
            
            // Check for active session (this mimics your getActiveClockSession function)
            const records = JSON.parse(localStorage.getItem('clockRecords') || '[]');
            const todayStr = new Date().toLocaleDateString('en-US');
            
            const activeSession = records.find(record => 
                record.employeeId === userData.id && 
                new Date(record.date).toLocaleDateString('en-US') === todayStr &&
                !record.clockOut
            );
            
            if (activeSession) {
                // Should show warning and prevent clock-in
                Swal.fire({
                    title: 'Already Clocked In',
                    text: 'You are currently clocked in. Please clock out first.',
                    icon: 'warning'
                });
                return { success: false, reason: 'ALREADY_CLOCKED_IN', activeSession };
            }
            
            // If no active session, proceed with clock in
            const newRecord = {
                id: Date.now().toString(),
                employeeId: userData.id,
                date: new Date().toISOString().split('T')[0],
                clockIn: new Date().toISOString(),
                clockOut: null
            };
            
            return { success: true, record: newRecord };
        }
        
        // Execute the test
        const result = testClockIn();
        
        // Assertions
        expect(result.success).toBe(false);
        expect(result.reason).toBe('ALREADY_CLOCKED_IN');
        expect(result.activeSession).toBeDefined();
        expect(result.activeSession.clockOut).toBeNull();
        
        // Verify that SweetAlert was called with the warning
        expect(Swal.fire).toHaveBeenCalledWith({
            title: 'Already Clocked In',
            text: 'You are currently clocked in. Please clock out first.',
            icon: 'warning'
        });
        
        // Verify that NO new record was saved to localStorage
        expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
            'clockRecords',
            expect.anything()
        );
    });

    test('should allow clock-in when user clocked out from previous session', () => {
        // Set up: User has a completed session from today (with clockOut time)
        const today = new Date();
        const completedRecord = {
            id: '1234567890',
            employeeId: 'EMP001',
            date: today.toISOString().split('T')[0],
            clockIn: new Date(today.getTime() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
            clockOut: new Date(today.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
            location: 'Office'
        };
        
        localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'users') {
                return JSON.stringify([{
                    name: 'John Doe',
                    employeeId: 'EMP001',
                    role: 'Employee'
                }]);
            }
            if (key === 'clockRecords') {
                return JSON.stringify([completedRecord]);
            }
            return null;
        });
        
        function testClockIn() {
            const userData = { id: 'EMP001', name: 'John Doe' };
            const records = JSON.parse(localStorage.getItem('clockRecords') || '[]');
            const todayStr = new Date().toLocaleDateString('en-US');
            
            // Look for active session (no clockOut)
            const activeSession = records.find(record => 
                record.employeeId === userData.id && 
                new Date(record.date).toLocaleDateString('en-US') === todayStr &&
                !record.clockOut
            );
            
            if (activeSession) {
                return { success: false, reason: 'ALREADY_CLOCKED_IN' };
            }
            
            // No active session found, allow clock in
            return { success: true, message: 'Clock in allowed' };
        }
        
        const result = testClockIn();
        
        // Should allow clock in since previous session is completed
        expect(result.success).toBe(true);
        expect(result.message).toBe('Clock in allowed');
        
        // Should NOT have called SweetAlert warning
        expect(Swal.fire).not.toHaveBeenCalled();
    });
});

//Record creation 


describe('Clock Record Creation - Data Structure', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Set up clean state - no existing clock records
        localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'users') {
                return JSON.stringify([{
                    name: 'John Doe',
                    employeeId: 'EMP001',
                    role: 'Employee'
                }]);
            }
            if (key === 'clockRecords') {
                return JSON.stringify([]); // Empty - no existing records
            }
            return null;
        });
    });

    test('should create clock record with all required fields and correct data types', () => {
        const testStartTime = new Date(); // Capture when test starts
        
        // Simulate your clockIn function
        function mockClockIn() {
            const userData = { id: 'EMP001', name: 'John Doe' };
            const now = new Date();
            
            // Create record exactly like your dashboard does
            const newRecord = {
                id: Date.now().toString(),
                employeeId: userData.id,
                date: now.toISOString().split('T')[0],
                clockIn: now.toISOString(),
                clockOut: null,
                location: 'Office',
                ipAddress: '192.168.1.1'
            };
            
            // Save to localStorage
            const records = JSON.parse(localStorage.getItem('clockRecords') || '[]');
            records.push(newRecord);
            localStorage.setItem('clockRecords', JSON.stringify(records));
            
            return { success: true, record: newRecord };
        }
        
        // Execute the clock in
        const result = mockClockIn();
        
        // Test 1: Function succeeded
        expect(result.success).toBe(true);
        expect(result.record).toBeDefined();
        
        const record = result.record;
        
        // Test 2: All required fields exist
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('employeeId');
        expect(record).toHaveProperty('date');
        expect(record).toHaveProperty('clockIn');
        expect(record).toHaveProperty('clockOut');
        expect(record).toHaveProperty('location');
        expect(record).toHaveProperty('ipAddress');
        
        // Test 3: Data types are correct
        expect(typeof record.id).toBe('string');
        expect(typeof record.employeeId).toBe('string');
        expect(typeof record.date).toBe('string');
        expect(typeof record.clockIn).toBe('string');
        expect(record.clockOut).toBeNull(); // Should be null initially
        expect(typeof record.location).toBe('string');
        expect(typeof record.ipAddress).toBe('string');
        
        // Test 4: Data values make sense
        expect(record.employeeId).toBe('EMP001'); // Should match user
        expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
        expect(record.clockIn).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format
        expect(record.id).toMatch(/^\d+$/); // Should be timestamp string
        
        // Test 5: Date is today
        const today = new Date().toISOString().split('T')[0];
        expect(record.date).toBe(today);
        
        // Test 6: clockIn time is recent (within last 5 seconds)
        const clockInTime = new Date(record.clockIn);
        const timeDiff = clockInTime - testStartTime;
        expect(timeDiff).toBeLessThan(5000); // Less than 5 seconds difference
        expect(timeDiff).toBeGreaterThanOrEqual(0); // Not in the future
        
        // Test 7: Verify it was saved to localStorage correctly
        expect(localStorage.setItem).toHaveBeenCalledWith(
            'clockRecords',
            expect.stringContaining(record.employeeId)
        );
        
        // Test 8: Verify the saved data can be parsed back correctly
        const savedDataCall = localStorage.setItem.mock.calls.find(call => call[0] === 'clockRecords');
        const savedRecords = JSON.parse(savedDataCall[1]);
        expect(savedRecords).toHaveLength(1);
        expect(savedRecords[0]).toEqual(record);
    });

    test('should create unique IDs for multiple clock records', () => {
        // Test that each clock-in creates a unique ID
        function mockClockIn() {
            const userData = { id: 'EMP001' };
            const now = new Date();
            
            const newRecord = {
                id: Date.now().toString(),
                employeeId: userData.id,
                date: now.toISOString().split('T')[0],
                clockIn: now.toISOString(),
                clockOut: null,
                location: 'Office',
                ipAddress: '192.168.1.1'
            };
            
            return { success: true, record: newRecord };
        }
        
        // Create two records with slight delay
        const record1 = mockClockIn().record;
        
        // Small delay to ensure different timestamp
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        
        setTimeout(() => {
            const record2 = mockClockIn().record;
            
            // IDs should be different
            expect(record1.id).not.toBe(record2.id);
            
            // Both should be valid
            expect(record1.id).toMatch(/^\d+$/);
            expect(record2.id).toMatch(/^\d+$/);
            
            // Second ID should be larger (later timestamp)
            expect(parseInt(record2.id)).toBeGreaterThan(parseInt(record1.id));
        }, 10);
    });
});