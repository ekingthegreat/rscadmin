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
const auth = firebase.auth();

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

// Function to show notification
function showNotification(message, type) {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Show success modal
function showSuccessModal() {
    const successModal = document.getElementById('successModal');
    successModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Hide success modal
function hideSuccessModal() {
    const successModal = document.getElementById('successModal');
    successModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Update profile picture in the UI
function updateProfilePicture(imageUrl) {
    const sidebarAvatarIcon = document.getElementById('sidebarAvatarIcon');
    const sidebarAvatar = document.getElementById('sidebarAvatar');

    if (imageUrl) {
        // Hide the default icon
        if (sidebarAvatarIcon) sidebarAvatarIcon.style.display = 'none';

        // Create and set the image for sidebar avatar
        const sidebarImg = document.createElement('img');
        sidebarImg.src = imageUrl;
        sidebarImg.alt = 'Profile Picture';

        // Clear existing content and add the image to sidebar avatar
        sidebarAvatar.innerHTML = '';
        sidebarAvatar.appendChild(sidebarImg);

        // Also set the modal image source
        document.getElementById('modalProfileImage').src = imageUrl;
    }
}

// Function to load user data
function loadUserData(userId, userRole) {
    // Reference to the users node in the database
    const userRef = database.ref(`users/${userRole}/${userId}`);

    userRef.once('value')
        .then((snapshot) => {
            const userData = snapshot.val();

            if (userData) {
                // Update the UI with user data
                document.getElementById('currentUsername').textContent = userData.fullname || 'ADMIN';
                document.getElementById('currentPhone').textContent = userData.phone || '0900-000-0000';

                // Update profile picture if available
                if (userData.profilePicture) {
                    updateProfilePicture(userData.profilePicture);
                }

                // Store user info for later use
                window.currentUser = {
                    uid: userId,
                    role: userRole,
                    data: userData
                };
            } else {
                showNotification('User data not found', 'error');
            }
        })
        .catch((error) => {
            console.error('Error loading user data:', error);
            showNotification('Error loading user data', 'error');
        });
}

// Function to change password using Firebase Authentication
function changePassword(currentPassword, newPassword) {
    const user = auth.currentUser;

    if (!user) {
        throw new Error('No authenticated user found');
    }

    // Re-authenticate the user with their current password
    const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        currentPassword
    );

    return user.reauthenticateWithCredential(credential)
        .then(() => {
            // Update password in Firebase Authentication
            return user.updatePassword(newPassword);
        });
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
    const sidebarAvatar = document.getElementById('sidebarAvatar');

    // Function to open profile picture modal
    function openProfileModal() {
        profileModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Open profile picture modal when avatar is clicked
    if (sidebarAvatar) {
        sidebarAvatar.addEventListener('click', openProfileModal);
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

    function showLogoutModal(e) {
        e.preventDefault();
        logoutModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function hideLogoutModal() {
        logoutModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    logoutLinks.forEach(link => {
        link.addEventListener('click', showLogoutModal);
    });

    closeModal.addEventListener('click', hideLogoutModal);
    cancelBtn.addEventListener('click', hideLogoutModal);
    logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) hideLogoutModal();
    });

    document.querySelector('.btn-confirm').addEventListener('click', () => {
        // Logout function
        clearAdminSession();
        window.location.href = "login.html";
    });

    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function () {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });

    // Password strength indicator
    const newPassword = document.getElementById('new-password');
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text span');

    newPassword.addEventListener('input', function () {
        const strength = calculatePasswordStrength(this.value);
        strengthMeter.style.width = strength.percentage + '%';
        strengthMeter.style.backgroundColor = strength.color;
        strengthText.textContent = strength.text;
        strengthText.style.color = strength.color;
    });

    function calculatePasswordStrength(password) {
        let strength = 0;
        if (password.length > 0) strength += 10;
        if (password.length >= 8) strength += 20;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 20;
        if (/[^A-Za-z0-9]/.test(password)) strength += 30;

        if (strength < 30) return { percentage: strength, color: '#ff4d4d', text: 'weak' };
        if (strength < 70) return { percentage: strength, color: '#ffa500', text: 'moderate' };
        return { percentage: strength, color: '#4CAF50', text: 'strong' };
    }

    // Password match checker
    const confirmPassword = document.getElementById('confirm-password');
    const passwordMatch = document.querySelector('.password-match');

    confirmPassword.addEventListener('input', function () {
        if (this.value && this.value === newPassword.value) {
            passwordMatch.style.display = 'flex';
        } else {
            passwordMatch.style.display = 'none';
        }
    });

    // Form submission handler
    document.getElementById('changePasswordForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPasswordValue = document.getElementById('new-password').value;
        const confirmPasswordValue = document.getElementById('confirm-password').value;

        // Basic validation
        if (!currentPassword || !newPasswordValue || !confirmPasswordValue) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        if (newPasswordValue !== confirmPasswordValue) {
            showNotification('New passwords do not match', 'error');
            return;
        }

        if (newPasswordValue.length < 6) {
            showNotification('New password must be at least 6 characters', 'error');
            return;
        }

        // Disable button to prevent multiple clicks
        const saveBtn = document.getElementById('savePasswordBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Updating...';

        // Update password using Firebase Authentication
        changePassword(currentPassword, newPasswordValue)
            .then(() => {
                // Show success modal instead of notification
                showSuccessModal();

                // Clear form fields
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';

                // Reset strength meter
                strengthMeter.style.width = '0%';
                strengthText.textContent = 'weak';
                strengthText.style.color = '';

                // Hide password match indicator
                passwordMatch.style.display = 'none';
            })
            .catch((error) => {
                console.error('Error changing password:', error);

                let errorMessage = 'Error updating password. Please try again.';

                switch (error.code) {
                    case 'auth/wrong-password':
                        errorMessage = 'Current password is incorrect';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'New password is too weak';
                        break;
                    case 'auth/requires-recent-login':
                        errorMessage = 'Please log in again to change your password';
                        break;
                    case 'auth/user-not-found':
                        errorMessage = 'User not found';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Network error. Please check your connection';
                        break;
                }

                showNotification(errorMessage, 'error');
            })
            .finally(() => {
                // Re-enable button
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            });
    });

    // Success Modal functionality
    const successModal = document.getElementById('successModal');
    const closeSuccessModal = document.querySelector('.close-success-modal');
    const successModalOkButton = document.getElementById('successModalOkButton');

    // Close success modal when clicking X, OK button, or outside the modal
    closeSuccessModal.addEventListener('click', hideSuccessModal);
    successModalOkButton.addEventListener('click', hideSuccessModal);
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) {
            hideSuccessModal();
        }
    });
});