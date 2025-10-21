// Mock global objects with proper Jest spies
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

// Assign to global
global.localStorage = localStorageMock;
global.sessionStorage = sessionStorageMock;

// Mock SweetAlert
global.Swal = {
  fire: jest.fn().mockResolvedValue({ isConfirmed: true })
};

// Mock TextEncoder for Node.js environment
global.TextEncoder = class TextEncoder {
  encode(input) {
    return Buffer.from(input, 'utf8');
  }
};

// Mock crypto.subtle for password hashing
global.crypto = {
  subtle: {
    digest: jest.fn((algorithm, data) => {
      // Simple mock hash based on input data
      const hash = Array.from(data).reduce((acc, byte) => acc + byte, 0);
      const hashBuffer = new ArrayBuffer(32);
      const view = new Uint8Array(hashBuffer);
      for (let i = 0; i < 32; i++) {
        view[i] = (hash + i) % 256;
      }
      return Promise.resolve(hashBuffer);
    })
  }
};

// Hash password function from your code
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = "YourSecureSalt";
  const saltedPassword = password + salt;
  const saltedData = encoder.encode(saltedPassword);
  
  // Mock hash for testing
  const mockHash = Array.from(saltedData).map(b => b.toString(16).padStart(2, '0')).join('');
  return mockHash;
}

// Login function extracted from your code
async function performLogin(name, password) {
  if (!name || !password) {
    throw new Error("Please enter both name and password");
  }
  
  const users = JSON.parse(localStorage.getItem('users')) || [];
  const hashedPassword = await hashPassword(password);
  
  const user = users.find(u => 
    u.name.toLowerCase() === name.toLowerCase() && 
    u.password === hashedPassword
  );
  
  if (user) {
    // Store user info in session storage
    const sessionId = Date.now().toString();
    sessionStorage.setItem(`loggedInUser_${sessionId}`, user.name);
    sessionStorage.setItem('loggedInUser', user.name);
    sessionStorage.setItem('userPassword', user.password);
    sessionStorage.setItem(`loginTime_${user.name}`, new Date().toISOString());
    localStorage.setItem('lastLogin', Date.now().toString());
    
    return { success: true, user };
  } else {
    throw new Error("Invalid name or password");
  }
}

describe('Login System Tests', () => {
  beforeEach(() => {
    // Clear storage data and reset mocks
    localStorageMock.data = {};
    sessionStorageMock.data = {};
    
    // Clear all mock calls
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    
    sessionStorageMock.getItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    sessionStorageMock.removeItem.mockClear();
    sessionStorageMock.clear.mockClear();
  });

  describe('Successful Login', () => {
    test('should log in user with correct credentials', async () => {
      // Setup: Create a test user in localStorage
      const testUser = {
        name: 'testuser',
        password: await hashPassword('testpassword')
      };
      localStorage.setItem('users', JSON.stringify([testUser]));

      // Act: Attempt login
      const result = await performLogin('testuser', 'testpassword');

      // Assert: Login should be successful
      expect(result.success).toBe(true);
      expect(result.user.name).toBe('testuser');
    });

    test('should save user session data to sessionStorage on successful login', async () => {
      // Setup
      const testUser = {
        name: 'johnDoe',
        password: await hashPassword('password123')
      };
      localStorage.setItem('users', JSON.stringify([testUser]));

      // Act
      await performLogin('johnDoe', 'password123');

      // Assert: Check if user data is saved to sessionStorage
      expect(sessionStorage.setItem).toHaveBeenCalledWith('loggedInUser', 'johnDoe');
      expect(sessionStorage.setItem).toHaveBeenCalledWith('userPassword', testUser.password);
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/^loginTime_johnDoe$/),
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
      );
    });

    test('should handle case-insensitive login', async () => {
      // Setup
      const testUser = {
        name: 'TestUser',
        password: await hashPassword('mypassword')
      };
      localStorage.setItem('users', JSON.stringify([testUser]));

      // Act: Login with lowercase name
      const result = await performLogin('testuser', 'mypassword');

      // Assert
      expect(result.success).toBe(true);
      expect(sessionStorage.setItem).toHaveBeenCalledWith('loggedInUser', 'TestUser');
    });

    test('should update lastLogin in localStorage on successful login', async () => {
      // Setup
      const testUser = {
        name: 'user123',
        password: await hashPassword('securepass')
      };
      localStorage.setItem('users', JSON.stringify([testUser]));

      // Act
      await performLogin('user123', 'securepass');

      // Assert
      expect(localStorage.setItem).toHaveBeenCalledWith('lastLogin', expect.any(String));
    });

    test('should create session ID for logged in user', async () => {
      // Setup
      const testUser = {
        name: 'sessionuser',
        password: await hashPassword('sessionpass')
      };
      localStorage.setItem('users', JSON.stringify([testUser]));

      // Mock Date.now for consistent testing
      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      // Act
      await performLogin('sessionuser', 'sessionpass');

      // Assert
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        `loggedInUser_${mockTimestamp}`,
        'sessionuser'
      );

      Date.now.mockRestore();
    });
  });

  describe('Failed Login', () => {
    test('should fail with invalid password', async () => {
      // Setup
      const testUser = {
        name: 'testuser',
        password: await hashPassword('correctpassword')
      };
      localStorage.setItem('users', JSON.stringify([testUser]));

      // Act & Assert
      await expect(performLogin('testuser', 'wrongpassword')).rejects.toThrow('Invalid name or password');
    });

    test('should fail with invalid username', async () => {
      // Setup
      const testUser = {
        name: 'testuser',
        password: await hashPassword('password123')
      };
      localStorage.setItem('users', JSON.stringify([testUser]));

      // Act & Assert
      await expect(performLogin('wronguser', 'password123')).rejects.toThrow('Invalid name or password');
    });

    test('should fail with empty credentials', async () => {
      // Act & Assert
      await expect(performLogin('', 'password')).rejects.toThrow('Please enter both name and password');
      await expect(performLogin('user', '')).rejects.toThrow('Please enter both name and password');
    });

    test('should not save to sessionStorage on failed login', async () => {
      // Setup
      const testUser = {
        name: 'testuser',
        password: await hashPassword('correctpassword')
      };
      localStorage.setItem('users', JSON.stringify([testUser]));

      // Act
      try {
        await performLogin('testuser', 'wrongpassword');
      } catch (error) {
        // Expected to fail
      }

      // Assert: sessionStorage setItem should not be called (except for the initial setup)
      // We need to filter out the setup call
      const sessionStorageCalls = sessionStorage.setItem.mock.calls.filter(
        call => !call[0].includes('users')
      );
      expect(sessionStorageCalls).toHaveLength(0);
    });
  });

  describe('Multiple Users', () => {
    test('should login correct user from multiple users', async () => {
      // Setup
      const users = [
        { name: 'user1', password: await hashPassword('pass1') },
        { name: 'user2', password: await hashPassword('pass2') },
        { name: 'user3', password: await hashPassword('pass3') }
      ];
      localStorage.setItem('users', JSON.stringify(users));

      // Act
      const result = await performLogin('user2', 'pass2');

      // Assert
      expect(result.success).toBe(true);
      expect(result.user.name).toBe('user2');
      
      // Check if sessionStorage.setItem was called with the expected arguments
      expect(sessionStorage.setItem).toHaveBeenCalledWith('loggedInUser', 'user2');
    });
  });
});