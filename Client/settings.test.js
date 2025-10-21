// Mock DOM and global objects
const createMockElement = (id, value = '', type = 'input') => {
  const element = {
    id,
    value,
    src: type === 'img' ? '' : undefined,
    textContent: type === 'div' ? '' : undefined,
    files: type === 'file' ? [] : undefined,
    click: jest.fn(),
    addEventListener: jest.fn()
  };
  return element;
};

// Create proper Jest mock functions
const mockGetElementById = jest.fn();
const mockAddEventListener = jest.fn();

// Mock DOM methods
global.document = {
  getElementById: mockGetElementById,
  addEventListener: mockAddEventListener
};

global.window = {
  location: { href: '', reload: jest.fn() },
  alert: jest.fn(),
  confirm: jest.fn()
};

// Mock FileReader
global.FileReader = jest.fn(() => ({
  readAsDataURL: jest.fn(),
  onload: null,
  result: 'data:image/jpeg;base64,mockImageData'
}));

// Mock storage
const localStorageMock = {
  data: {},
  getItem: jest.fn((key) => localStorageMock.data[key] || null),
  setItem: jest.fn((key, value) => { localStorageMock.data[key] = value; }),
  removeItem: jest.fn((key) => { delete localStorageMock.data[key]; }),
  clear: jest.fn(() => { localStorageMock.data = {}; })
};

const sessionStorageMock = {
  data: {},
  getItem: jest.fn((key) => sessionStorageMock.data[key] || null),
  setItem: jest.fn((key, value) => { sessionStorageMock.data[key] = value; }),
  removeItem: jest.fn((key) => { delete sessionStorageMock.data[key]; }),
  clear: jest.fn(() => { sessionStorageMock.data = {}; })
};

global.localStorage = localStorageMock;
global.sessionStorage = sessionStorageMock;

// Import functions to test (assuming they're in a separate module or copy them here)
function loadUserProfile() {
    const currentUser = sessionStorage.getItem('loggedInUser');
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(function(u) { 
        return u.name.toLowerCase() === currentUser.toLowerCase(); 
    });
    
    if (user) {
        const firstNameEl = document.getElementById('firstName');
        const lastNameEl = document.getElementById('lastName');
        const emailEl = document.getElementById('email');
        const roleEl = document.getElementById('role');
        const profileImageEl = document.getElementById('profileImage');
        
        if (firstNameEl) firstNameEl.value = user.firstName || user.name.split(' ')[0] || '';
        if (lastNameEl) lastNameEl.value = user.lastName || user.name.split(' ')[1] || '';
        if (emailEl) emailEl.value = user.email || '';
        if (roleEl) roleEl.value = user.role || 'employee';
        
        if (profileImageEl) {
            if (user.profileImage) {
                profileImageEl.src = user.profileImage;
            } else {
                const fullName = (user.firstName || user.name) + ' ' + (user.lastName || '');
                profileImageEl.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(fullName.trim()) + '&background=random';
            }
        }
    }
}

function saveProfileData(currentUser, firstName, lastName, email, role, profileImage) {
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(function(u) {
            return u.name.toLowerCase() === currentUser.toLowerCase();
        });
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }
        
        const newUserName = (firstName + ' ' + lastName).trim();
        const oldPassword = users[userIndex].password;
        
        users[userIndex] = {
            name: newUserName,
            password: oldPassword,
            firstName: firstName,
            lastName: lastName,
            email: email,
            role: role,
            profileImage: profileImage.startsWith('data:') ? profileImage : null,
            lastUpdated: new Date().toISOString(),
            createdAt: users[userIndex].createdAt || new Date().toISOString()
        };
        
        localStorage.setItem('users', JSON.stringify(users));
        sessionStorage.setItem('loggedInUser', newUserName);
        
        return { success: true, message: 'Profile updated successfully!' };
        
    } catch (error) {
        throw error;
    }
}

function handleProfilePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            throw new Error('Please select a valid image file');
        }
        
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('File size must be less than 5MB');
        }
        
        return { success: true, file };
    }
    return { success: false };
}

function handleDeleteAccount() {
    const currentUser = sessionStorage.getItem('loggedInUser');
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return { success: false, message: 'No user logged in' };
    }
    
    try {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const filteredUsers = users.filter(function(u) {
            return u.name.toLowerCase() !== currentUser.toLowerCase();
        });
        localStorage.setItem('users', JSON.stringify(filteredUsers));
        
        sessionStorage.clear();
        
        return { success: true, message: 'Account deleted successfully' };
        
    } catch (error) {
        throw error;
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

describe('Settings Page Critical Functions', () => {
    beforeEach(() => {
        // Clear all mocks and data
        localStorageMock.data = {};
        sessionStorageMock.data = {};
        
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        sessionStorageMock.getItem.mockClear();
        sessionStorageMock.setItem.mockClear();
        sessionStorageMock.clear.mockClear();
        
        mockGetElementById.mockClear();
        mockAddEventListener.mockClear();
        window.alert = jest.fn();
        window.confirm = jest.fn();
        window.location.href = '';
    });

    describe('loadUserProfile - CRITICAL for User Experience', () => {
        test('should redirect to login when no user is logged in', () => {
            sessionStorage.getItem.mockReturnValue(null);
            
            loadUserProfile();
            
            expect(window.location.href).toBe('login.html');
        });

        test('should populate form fields with existing user data', () => {
            // Setup
            const mockUser = {
                name: 'John Doe',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                role: 'manager',
                profileImage: 'data:image/jpeg;base64,test'
            };
            
            sessionStorage.getItem.mockReturnValue('John Doe');
            localStorage.getItem.mockReturnValue(JSON.stringify([mockUser]));
            
            // Mock DOM elements
            const mockElements = {
                firstName: createMockElement('firstName'),
                lastName: createMockElement('lastName'),
                email: createMockElement('email'),
                role: createMockElement('role'),
                profileImage: createMockElement('profileImage', '', 'img')
            };
            
            mockGetElementById.mockImplementation((id) => mockElements[id]);
            
            loadUserProfile();
            
            expect(mockElements.firstName.value).toBe('John');
            expect(mockElements.lastName.value).toBe('Doe');
            expect(mockElements.email.value).toBe('john@example.com');
            expect(mockElements.role.value).toBe('manager');
            expect(mockElements.profileImage.src).toBe('data:image/jpeg;base64,test');
        });
    });

    describe('saveProfileData - CRITICAL for Data Integrity', () => {
        test('should successfully update user profile data', () => {
            // Setup
            const existingUser = {
                name: 'John Doe',
                password: 'hashedPassword123',
                firstName: 'John',
                lastName: 'Doe',
                createdAt: '2023-01-01T00:00:00.000Z'
            };
            
            localStorage.getItem.mockReturnValue(JSON.stringify([existingUser]));
            
            const result = saveProfileData('John Doe', 'Jane', 'Smith', 'jane@example.com', 'admin', 'data:image/jpeg;base64,newimage');
            
            expect(result.success).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalledWith('users', expect.stringContaining('Jane Smith'));
            expect(sessionStorage.setItem).toHaveBeenCalledWith('loggedInUser', 'Jane Smith');
        });

        test('should throw error when user not found', () => {
            localStorage.getItem.mockReturnValue(JSON.stringify([]));
            
            expect(() => {
                saveProfileData('NonExistentUser', 'Jane', 'Smith', 'jane@example.com', 'admin', '');
            }).toThrow('User not found');
        });

        test('should preserve user password when updating profile', () => {
            const existingUser = {
                name: 'John Doe',
                password: 'originalHashedPassword',
                firstName: 'John',
                lastName: 'Doe'
            };
            
            localStorage.getItem.mockReturnValue(JSON.stringify([existingUser]));
            
            saveProfileData('John Doe', 'Jane', 'Smith', 'jane@example.com', 'admin', '');
            
            const savedUsers = JSON.parse(localStorage.setItem.mock.calls[0][1]);
            expect(savedUsers[0].password).toBe('originalHashedPassword');
        });
    });


    beforeEach(() => {
  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    },
    writable: true
  });

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    },
    writable: true
  });

  // Mock window.location
  delete window.location;
  window.location = { href: '' };
});


  describe('handleDeleteAccount - CRITICAL for Data Security', () => {
        test('should successfully delete user account and clear session', () => {
            const users = [
                { name: 'John Doe', password: 'hash1' },
                { name: 'Jane Smith', password: 'hash2' }
            ];
            
            sessionStorage.getItem.mockReturnValue('John Doe');
            localStorage.getItem.mockReturnValue(JSON.stringify(users));
            
            const result = handleDeleteAccount();
            
            expect(result.success).toBe(true);
            expect(sessionStorage.clear).toHaveBeenCalled();
            
            const remainingUsers = JSON.parse(localStorage.setItem.mock.calls[0][1]);
            expect(remainingUsers).toHaveLength(1);
            expect(remainingUsers[0].name).toBe('Jane Smith');
        });

        test('should redirect to login when no user is logged in', () => {
            sessionStorage.getItem.mockReturnValue(null);
            
            const result = handleDeleteAccount();
            
            expect(result).toBeUndefined(); // Function returns nothing when no user
            expect(window.location.href).toBe('login.html');
        });
    });


    describe('handleProfilePhotoUpload - CRITICAL for Security', () => {
        test('should reject non-image files', () => {
            const mockEvent = {
                target: {
                    files: [{ type: 'text/plain', size: 1000 }]
                }
            };
            
            expect(() => {
                handleProfilePhotoUpload(mockEvent);
            }).toThrow('Please select a valid image file');
        });

        test('should reject files larger than 5MB', () => {
            const mockEvent = {
                target: {
                    files: [{ type: 'image/jpeg', size: 6 * 1024 * 1024 }]
                }
            };
            
            expect(() => {
                handleProfilePhotoUpload(mockEvent);
            }).toThrow('File size must be less than 5MB');
        });

        test('should accept valid image files', () => {
            const mockEvent = {
                target: {
                    files: [{ type: 'image/jpeg', size: 1024 * 1024 }]
                }
            };
            
            const result = handleProfilePhotoUpload(mockEvent);
            
            expect(result.success).toBe(true);
            expect(result.file.type).toBe('image/jpeg');
        });
    });

    describe('isValidEmail - CRITICAL for Data Validation', () => {
        test('should validate correct email formats', () => {
            expect(isValidEmail('user@example.com')).toBe(true);
            expect(isValidEmail('test.email+tag@domain.co.uk')).toBe(true);
            expect(isValidEmail('user123@test-domain.com')).toBe(true);
        });

        test('should reject invalid email formats', () => {
            expect(isValidEmail('invalid-email')).toBe(false);
            expect(isValidEmail('user@')).toBe(false);
            expect(isValidEmail('@domain.com')).toBe(false);
            expect(isValidEmail('user..name@domain.com')).toBe(false);
            expect(isValidEmail('')).toBe(false);
        });
    });
});