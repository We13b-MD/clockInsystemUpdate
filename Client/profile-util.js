// profile-utils.js - Shared profile image functionality

// Function to get user profile image with fallback
function getUserProfileImage(user) {
    if (user && user.profileImage && user.profileImage.startsWith('data:')) {
        return user.profileImage;
    }
    
    // Generate avatar as fallback using user's name
    const firstName = user?.firstName || user?.name?.split(' ')[0] || 'User';
    const lastName = user?.lastName || user?.name?.split(' ')[1] || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&size=128&length=2&bold=true`;
}

// Function to update profile image in UI
function updateProfileImageInUI(user) {
    const profileImageUrl = getUserProfileImage(user);
    
    // Update all profile image elements
    const profileImageElements = document.querySelectorAll('#dashboardProfileImage, #profileImage, [data-profile-image]');
    
    profileImageElements.forEach(element => {
        if (element.tagName === 'IMG') {
            element.src = profileImageUrl;
            element.onerror = function() {
                // If image fails to load, use fallback avatar
                const firstName = user?.firstName || user?.name?.split(' ')[0] || 'User';
                const lastName = user?.lastName || user?.name?.split(' ')[1] || '';
                const fullName = `${firstName} ${lastName}`.trim();
                this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&size=128`;
            };
        }
    });
}

// Function to load current user data
function getCurrentUser() {
    const currentUser = sessionStorage.getItem('loggedInUser');
    if (!currentUser) return null;
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    return users.find(u => u.name.toLowerCase() === currentUser.toLowerCase());
}

// Function to load and display user profile
function loadUserProfileDisplay() {
    const user = getCurrentUser();
    if (user) {
        updateProfileImageInUI(user);
    }
    return user;
}

// Listen for profile updates
function setupProfileUpdateListener() {
    // Listen for storage events (other tabs)
    window.addEventListener('storage', function(e) {
        if (e.key === 'users') {
            console.log('Profile updated from other tab');
            loadUserProfileDisplay();
        }
    });
    
    // Listen for custom events (same tab)
    window.addEventListener('userProfileUpdated', function() {
        console.log('Profile updated in same tab');
        loadUserProfileDisplay();
    });
    
    // Periodic check for profile updates
    setInterval(() => {
        const user = getCurrentUser();
        if (user && user.profileImage) {
            updateProfileImageInUI(user);
        }
    }, 2000);
}