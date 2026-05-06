const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DB_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

firebase.initializeApp(firebaseConfig);

const database = firebase.database();

// Check if admin is logged in
function checkAuth() {
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
    const adminId = localStorage.getItem('adminId');
    const adminRole = localStorage.getItem('adminRole');
    const expirationTime = localStorage.getItem('adminSessionExpiration');

    if (!isAdminLoggedIn || !adminId || !adminRole || !expirationTime) {
        window.location.href = "login.html";
        return false;
    }

    // Check if session has expired
    if (new Date().getTime() > parseInt(expirationTime)) {
        clearAdminSession();
        window.location.href = "login.html";
        return false;
    }

    return { userId: adminId, userRole: adminRole };
}

// Clear admin session
function clearAdminSession() {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminFullname');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminSessionExpiration');
}

// Load user data from Firebase
function loadUserData(userId, userRole) {
    // Based on your database structure, we need to access the correct path
    database.ref(`users/${userRole}/${userId}`).once('value')
        .then((snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                // Update profile display
                document.getElementById('profileFullname').textContent = userData.fullname || 'ADMIN';
                document.getElementById('profilePhone').textContent = userData.phone || '0900-000-0000';

                // Update account information
                document.getElementById('accountFullname').textContent = userData.fullname || '';
                document.getElementById('accountUsername').textContent = userData.username || '';
                document.getElementById('accountPhone').textContent = userData.phone || '';
                document.getElementById('accountEmail').textContent = userData.email || '';
                document.getElementById('accountRole').textContent = userData.role || '';
                document.getElementById('accountId').textContent = userData.id || '';

                // Update profile picture if available
                if (userData.profilePicture) {
                    updateProfilePicture(userData.profilePicture);
                }
            } else {
                console.error('User data not found');
            }
        })
        .catch((error) => {
            console.error('Error loading user data:', error);
        });
}

// Update profile picture in the UI
function updateProfilePicture(imageUrl) {
    const avatarIcon = document.getElementById('avatarIcon');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileCardIcon = document.getElementById('profileCardIcon');
    const profileCardAvatar = document.getElementById('profileCardAvatar');

    if (imageUrl) {
        // Hide the default icons
        if (avatarIcon) avatarIcon.style.display = 'none';
        if (profileCardIcon) profileCardIcon.style.display = 'none';

        // Create and set the image for sidebar avatar
        const profileImg = document.createElement('img');
        profileImg.src = imageUrl;
        profileImg.alt = 'Profile Picture';

        // Clear existing content and add the image to sidebar
        profileAvatar.innerHTML = '';
        profileAvatar.appendChild(profileImg);

        // Create and set the image for profile card avatar
        const profileCardImg = document.createElement('img');
        profileCardImg.src = imageUrl;
        profileCardImg.alt = 'Profile Picture';

        // Clear existing content and add the image to profile card
        profileCardAvatar.innerHTML = '';
        profileCardAvatar.appendChild(profileCardImg);

        // Also set the modal image source
        document.getElementById('modalProfileImage').src = imageUrl;
    }
}

// Logout function
function logout() {
    clearAdminSession();
    window.location.href = "login.html";
}

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    const auth = checkAuth();
    if (!auth) return;

    const { userId, userRole } = auth;

    // Load user data
    loadUserData(userId, userRole);

    // Menu toggle functionality for main navbar
    const menuToggle = document.getElementById('menuToggle');
    const navbar = document.getElementById('navbar');

    if (menuToggle && navbar) {
        menuToggle.addEventListener('click', () => {
            navbar.classList.toggle('active');
        });
    }

    // Menu toggle functionality for profile navigation
    const profileMenuToggle = document.getElementById('profileMenuToggle');
    const profileNav = document.getElementById('profileNav');

    if (profileMenuToggle && profileNav) {
        profileMenuToggle.addEventListener('click', () => {
            profileNav.classList.toggle('active');
        });
    }

    // Close menus when clicking outside
    document.addEventListener('click', function (event) {
        // Close main navbar if clicked outside
        if (navbar && navbar.classList.contains('active') &&
            !navbar.contains(event.target) &&
            !menuToggle.contains(event.target)) {
            navbar.classList.remove('active');
        }

        // Close profile nav if clicked outside
        if (profileNav && profileNav.classList.contains('active') &&
            !profileNav.contains(event.target) &&
            !profileMenuToggle.contains(event.target)) {
            profileNav.classList.remove('active');
        }
    });

    // Profile picture modal functionality
    const profileModal = document.getElementById('profileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileCardAvatar = document.getElementById('profileCardAvatar');

    // Function to open profile picture modal
    function openProfileModal() {
        profileModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Open profile picture modal when avatar is clicked
    if (profileAvatar) {
        profileAvatar.addEventListener('click', openProfileModal);
    }

    // Open profile picture modal when profile card avatar is clicked
    if (profileCardAvatar) {
        profileCardAvatar.addEventListener('click', openProfileModal);
    }

    // Close profile picture modal
    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', () => {
            profileModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }

    // Close profile picture modal when clicking outside the image
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Logout Modal functionality
    const logoutModal = document.getElementById('logoutModal');
    const logoutLinks = document.querySelectorAll('[data-logout]');
    const closeModal = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.btn-cancel');

    // Function to show modal
    function showLogoutModal() {
        logoutModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // Function to hide modal
    function hideLogoutModal() {
        logoutModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Add click event to all logout links
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showLogoutModal();
        });
    });

    // Close modal when clicking X, Cancel, or outside the modal
    closeModal.addEventListener('click', hideLogoutModal);
    cancelBtn.addEventListener('click', hideLogoutModal);
    logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) {
            hideLogoutModal();
        }
    });

    // Confirm logout button action
    document.querySelector('.btn-confirm').addEventListener('click', () => {
        logout();
    });
});