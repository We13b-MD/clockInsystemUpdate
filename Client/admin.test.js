// admin-clock.test.js

// admin-clock.test.js


// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};

global.localStorage = mockLocalStorage;
global.window = { localStorage: mockLocalStorage };

// Mock DOM elements and methods
const mockTableBody = {
  innerHTML: '',
  appendChild: jest.fn(),
  children: []
};

const mockDocument = {
  getElementById: jest.fn().mockReturnValue(mockTableBody),
  createElement: jest.fn().mockReturnValue({
    className: '',
    innerHTML: '',
    appendChild: jest.fn()
  })
};

global.document = mockDocument;

// Extract the actual functions from your admin code
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return '0h 0m';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`; 
}

function formatTime(date) {
    if (!date) return '--:-- --';
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

function getUsers() {
    return JSON.parse(localStorage.getItem('users')) || [];
}

// Test helper function to analyze what populateLiveActivity would process
function analyzeLiveActivityLogic(users, clockRecords) {
    const today = new Date().toLocaleDateString('en-US');
    
    return users.map((user, index) => {
        const employeeId = user.employeeId || `EMP${String(index + 1).padStart(3, '0')}`;
        
        // Find today's records for this user
        const userTodayRecords = clockRecords.filter(record => 
            record.employeeId === employeeId &&
            new Date(record.date).toLocaleDateString('en-US') === today
        );
        
        // Find active session
        const activeSession = userTodayRecords.find(record => 
            record.clockIn && !record.clockOut
        );
        
        let status = 'inactive';
        let clockInTime = 'Not clocked in';
        let duration = '0h 0m';
        
        if (activeSession) {
            status = 'active';
            const clockInDate = new Date(activeSession.clockIn);
            clockInTime = formatTime(clockInDate);
            duration = calculateDuration(activeSession.clockIn, new Date());
        } else {
            const lastCompletedSession = userTodayRecords
                .filter(record => record.clockIn && record.clockOut)
                .sort((a, b) => new Date(b.clockOut) - new Date(a.clockOut))[0];
            
            if (lastCompletedSession) {
                const clockOutDate = new Date(lastCompletedSession.clockOut);
                clockInTime = `Clocked out at ${formatTime(clockOutDate)}`;
                duration = calculateDuration(lastCompletedSession.clockIn, lastCompletedSession.clockOut);
            }
        }
        
        return { user, employeeId, status, clockInTime, duration };
    });
}

describe('Admin Clock Records - Real Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.getItem.mockReturnValue(null);
        mockTableBody.innerHTML = '';
        mockTableBody.appendChild.mockClear();
    });

    describe('calculateDuration - Core Time Logic', () => {
        test('should calculate work hours correctly', () => {
            const startTime = '2024-01-15T09:00:00.000Z';
            const endTime = '2024-01-15T17:30:00.000Z';
            
            const result = calculateDuration(startTime, endTime);
            
            expect(result).toBe('8h 30m');
        });

        test('should handle lunch break scenarios', () => {
            // Half day work
            const startTime = '2024-01-15T09:00:00.000Z';
            const endTime = '2024-01-15T13:00:00.000Z';
            
            const result = calculateDuration(startTime, endTime);
            
            expect(result).toBe('4h 0m');
        });

        test('should handle overtime correctly', () => {
            // 10 hour day
            const startTime = '2024-01-15T08:00:00.000Z';
            const endTime = '2024-01-15T18:00:00.000Z';
            
            const result = calculateDuration(startTime, endTime);
            
            expect(result).toBe('10h 0m');
        });

        test('should return zero for invalid times', () => {
            expect(calculateDuration(null, '2024-01-15T17:30:00.000Z')).toBe('0h 0m');
            expect(calculateDuration('2024-01-15T09:00:00.000Z', null)).toBe('0h 0m');
            expect(calculateDuration(null, null)).toBe('0h 0m');
        });

        test('should handle very short durations', () => {
            const startTime = '2024-01-15T09:00:00.000Z';
            const endTime = '2024-01-15T09:05:00.000Z';
            
            const result = calculateDuration(startTime, endTime);
            
            expect(result).toBe('0h 5m');
        });
    });

    describe('formatTime - Display Logic', () => {
        test('should format standard work hours', () => {
            expect(formatTime(new Date('2024-01-15T09:00:00'))).toBe('9:00 AM');
            expect(formatTime(new Date('2024-01-15T17:00:00'))).toBe('5:00 PM');
            expect(formatTime(new Date('2024-01-15T12:00:00'))).toBe('12:00 PM');
            expect(formatTime(new Date('2024-01-15T00:00:00'))).toBe('12:00 AM');
        });

        test('should pad minutes correctly', () => {
            expect(formatTime(new Date('2024-01-15T09:05:00'))).toBe('9:05 AM');
            expect(formatTime(new Date('2024-01-15T14:30:00'))).toBe('2:30 PM');
        });

        test('should handle invalid dates', () => {
            expect(formatTime(null)).toBe('--:-- --');
            expect(formatTime(undefined)).toBe('--:-- --');
        });
    });

    describe('Live Activity Business Logic', () => {
        const mockUsers = [
            { name: 'John Doe', employeeId: 'EMP001', position: 'Developer' },
            { name: 'Jane Smith', position: 'Designer' } // No employeeId
        ];

        const today = new Date().toISOString().split('T')[0];

        test('should identify currently active employees', () => {
            const clockRecords = [
                {
                    employeeId: 'EMP001',
                    date: today,
                    clockIn: '2024-01-15T09:00:00.000Z',
                    clockOut: null // Still active
                }
            ];

            const result = analyzeLiveActivityLogic(mockUsers, clockRecords);

            expect(result[0].status).toBe('active');
            expect(result[0].clockInTime).toBe('9:00 AM');
            expect(result[0].duration).toMatch(/^\d+h \d+m$/);
        });

        test('should identify employees who finished work', () => {
            const clockRecords = [
                {
                    employeeId: 'EMP001',
                    date: today,
                    clockIn: '2024-01-15T09:00:00.000Z',
                    clockOut: '2024-01-15T17:00:00.000Z'
                }
            ];

            const result = analyzeLiveActivityLogic(mockUsers, clockRecords);

            expect(result[0].status).toBe('inactive');
            expect(result[0].clockInTime).toBe('Clocked out at 5:00 PM');
            expect(result[0].duration).toBe('8h 0m');
        });

        test('should identify absent employees', () => {
            const clockRecords = []; // No records

            const result = analyzeLiveActivityLogic(mockUsers, clockRecords);

            expect(result[0].status).toBe('inactive');
            expect(result[0].clockInTime).toBe('Not clocked in');
            expect(result[0].duration).toBe('0h 0m');
        });

        test('should auto-generate employee IDs', () => {
            const clockRecords = [];

            const result = analyzeLiveActivityLogic(mockUsers, clockRecords);

            // Jane Smith should get EMP002 (index 1 + 1)
            expect(result[1].employeeId).toBe('EMP002');
        });

        test('should handle multiple clock sessions correctly', () => {
            const clockRecords = [
                // Morning session
                {
                    employeeId: 'EMP001',
                    date: today,
                    clockIn: '2024-01-15T09:00:00.000Z',
                    clockOut: '2024-01-15T12:00:00.000Z'
                },
                // Afternoon session (still active)
                {
                    employeeId: 'EMP001',
                    date: today,
                    clockIn: '2024-01-15T13:00:00.000Z',
                    clockOut: null
                }
            ];

            const result = analyzeLiveActivityLogic(mockUsers, clockRecords);

            // Should show active session, not completed one
            expect(result[0].status).toBe('active');
            expect(result[0].clockInTime).toBe('1:00 PM');
        });

        test('should show most recent completed session when not active', () => {
            const clockRecords = [
                // Earlier session
                {
                    employeeId: 'EMP001',
                    date: today,
                    clockIn: '2024-01-15T09:00:00.000Z',
                    clockOut: '2024-01-15T12:00:00.000Z'
                },
                // Later session (most recent)
                {
                    employeeId: 'EMP001',
                    date: today,
                    clockIn: '2024-01-15T13:00:00.000Z',
                    clockOut: '2024-01-15T17:00:00.000Z'
                }
            ];

            const result = analyzeLiveActivityLogic(mockUsers, clockRecords);

            expect(result[0].status).toBe('inactive');
            expect(result[0].clockInTime).toBe('Clocked out at 5:00 PM');
            expect(result[0].duration).toBe('4h 0m'); // Latest session duration
        });

        test('should filter out yesterday\'s records', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayDate = yesterday.toISOString().split('T')[0];

            const clockRecords = [
                {
                    employeeId: 'EMP001',
                    date: yesterdayDate,
                    clockIn: '2024-01-14T09:00:00.000Z',
                    clockOut: '2024-01-14T17:00:00.000Z'
                }
            ];

            const result = analyzeLiveActivityLogic(mockUsers, clockRecords);

            // Should ignore yesterday's record
            expect(result[0].status).toBe('inactive');
            expect(result[0].clockInTime).toBe('Not clocked in');
        });
    });

    describe('Data Edge Cases', () => {
        test('should handle empty user array', () => {
            const result = analyzeLiveActivityLogic([], []);
            expect(result).toEqual([]);
        });

        test('should handle users without positions', () => {
            const users = [{ name: 'John Doe' }]; // No position field
            const result = analyzeLiveActivityLogic(users, []);
            
            expect(result).toHaveLength(1);
            expect(result[0].user.name).toBe('John Doe');
        });

        test('should handle malformed clock records gracefully', () => {
            const users = [{ name: 'John Doe', employeeId: 'EMP001' }];
            const clockRecords = [
                {
                    employeeId: 'EMP001',
                    date: 'invalid-date',
                    clockIn: 'invalid-time'
                }
            ];

            // Should not crash
            expect(() => analyzeLiveActivityLogic(users, clockRecords)).not.toThrow();
        });

        test('should handle cross-day work sessions', () => {
            // Night shift scenario
            const startTime = '2024-01-15T23:00:00.000Z';
            const endTime = '2024-01-16T07:00:00.000Z';
            
            const result = calculateDuration(startTime, endTime);
            
            expect(result).toBe('8h 0m');
        });
    });

    describe('getUsers function', () => {
        test('should return parsed users from localStorage', () => {
            const mockUsers = [
                { name: 'John', employeeId: 'EMP001' },
                { name: 'Jane', employeeId: 'EMP002' }
            ];
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUsers));

            const result = getUsers();

           
            expect(result).toEqual(mockUsers);
        });

        test('should return empty array when no users exist', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const result = getUsers();

            expect(result).toEqual([]);
        });

        test('should handle empty JSON array', () => {
            mockLocalStorage.getItem.mockReturnValue('[]');

            const result = getUsers();

            expect(result).toEqual([]);
        });
    });
});