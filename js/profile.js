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

const supabaseClient = supabase.createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_KEY
);

const supabaseConfig = {
    bucketName: import.meta.env.VITE_SUPABASE_BUCKET
};

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
    database.ref(`users/${userRole}/${userId}`).once('value')
        .then((snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                // Update profile display
                document.getElementById('profileFullname').textContent = userData.fullname || 'ADMIN';
                document.getElementById('profilePhone').textContent = userData.phone || '0900-000-0000';

                // Update profile picture section
                document.getElementById('profileName').textContent = userData.fullname || 'Michael Martinez';
                document.getElementById('profileContact').textContent = userData.phone || '888-889-8989';

                // Fill form fields
                document.getElementById('fullname').value = userData.fullname || '';
                document.getElementById('username').value = userData.username || '';
                document.getElementById('contact').value = userData.phone || '';
                document.getElementById('email').value = userData.email || '';

                // Update profile picture if available
                if (userData.profilePicture) {
                    updateProfilePicture(userData.profilePicture);
                }
            } else {
                showMessage('User data not found', 'error');
            }
        })
        .catch((error) => {
            console.error('Error loading user data:', error);
            showMessage('Error loading profile data', 'error');
        });
}

// Update profile picture in the UI
function updateProfilePicture(imageUrl) {
    const avatarIcon = document.getElementById('avatarIcon');
    const profileAvatar = document.getElementById('profileAvatar');
    const sidebarAvatarIcon = document.getElementById('sidebarAvatarIcon');
    const sidebarAvatar = document.getElementById('sidebarAvatar');

    if (imageUrl) {
        // Hide the default icons
        if (avatarIcon) avatarIcon.style.display = 'none';
        if (sidebarAvatarIcon) sidebarAvatarIcon.style.display = 'none';

        // Create and set the image for profile avatar
        const profileImg = document.createElement('img');
        profileImg.src = imageUrl;
        profileImg.alt = 'Profile Picture';

        // Clear existing content and add the image to profile avatar
        profileAvatar.innerHTML = '';
        profileAvatar.appendChild(profileImg);

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

// Upload file to Supabase
async function uploadFile(file, userId) {
    if (!supabaseClient) {
        showUploadStatus('Error: Supabase client not initialized.', 'error');
        return;
    }

    // Show uploading state
    showUploadStatus('Uploading...', 'uploading');

    // Disable the upload button during upload
    const uploadBtn = document.getElementById('uploadBtn');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<span class="loading"></span> Uploading...';
    uploadBtn.style.pointerEvents = 'none';

    try {
        // Generate a unique file name using userId and timestamp
        const fileExt = file.name.split('.').pop();
        const fileName = `profile-pictures/${userId}_${Date.now()}.${fileExt}`;

        // Upload to Supabase storage
        const { data, error } = await supabaseClient.storage
            .from(supabaseConfig.bucketName)
            .upload(fileName, file);

        if (error) {
            throw new Error(error.message);
        }

        // Get the public URL
        const { data: urlData } = supabaseClient.storage
            .from(supabaseConfig.bucketName)
            .getPublicUrl(data.path);

        // Update the profile picture in Firebase
        await updateProfilePictureInFirebase(urlData.publicUrl, userId);

        // Show success message
        showUploadStatus('Profile picture updated successfully!', 'success');

        // Reset upload button after 3 seconds
        setTimeout(() => {
            uploadBtn.innerHTML = originalText;
            uploadBtn.style.pointerEvents = 'auto';
            document.getElementById('uploadStatus').style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error('Error uploading file:', error);
        showUploadStatus('Error uploading file: ' + error.message, 'error');

        // Reset upload button
        uploadBtn.innerHTML = '<i class="fas fa-camera"></i> Change Profile';
        uploadBtn.style.pointerEvents = 'auto';
    }
}

// Show upload status
function showUploadStatus(message, type) {
    const uploadStatus = document.getElementById('uploadStatus');
    uploadStatus.textContent = message;
    uploadStatus.className = 'upload-status ' + (type === 'uploading' ? 'success' : type);
    uploadStatus.style.display = 'block';
}

// Update profile picture in Firebase
function updateProfilePictureInFirebase(imageUrl, userId) {
    return new Promise((resolve, reject) => {
        const auth = checkAuth();
        if (!auth) {
            reject(new Error("User not authenticated"));
            return;
        }

        const { userRole } = auth;

        // Update the profile picture in Firebase
        const userRef = database.ref(`users/${userRole}/${userId}`);
        userRef.update({
            profilePicture: imageUrl,
            lastUpdated: new Date().toISOString()
        })
            .then(() => {
                console.log("Profile picture updated in Firebase");

                // Update the UI immediately
                updateProfilePicture(imageUrl);

                resolve();
            })
            .catch(error => {
                console.error("Error updating profile picture in Firebase:", error);
                reject(error);
            });
    });
}

// Update user profile
function updateProfile(userId, userRole, updatedData) {
    database.ref(`users/${userRole}/${userId}`).update(updatedData)
        .then(() => {
            // Show success modal
            showSuccessModal();

            // Update session storage if username or fullname changed
            if (updatedData.username) {
                localStorage.setItem('adminUsername', updatedData.username);
            }
            if (updatedData.fullname) {
                localStorage.setItem('adminFullname', updatedData.fullname);
            }

            // Update profile picture section
            document.getElementById('profileName').textContent = updatedData.fullname || 'Michael Martinez';
            document.getElementById('profileContact').textContent = updatedData.phone || '888-889-8989';

            // Reload user data to reflect changes
            loadUserData(userId, userRole);
        })
        .catch((error) => {
            console.error('Error updating profile:', error);
            showMessage('Error updating profile', 'error');
        });
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

// Show message
function showMessage(message, type) {
    const messageDiv = document.getElementById('updateMessage');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    // Hide message after 3 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
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

    // Handle form submission
    document.getElementById('profileForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const updatedData = {
            fullname: document.getElementById('fullname').value,
            username: document.getElementById('username').value,
            phone: document.getElementById('contact').value,
            email: document.getElementById('email').value
        };

        updateProfile(userId, userRole, updatedData);
    });

    // File input change handler
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            // Immediately upload the file
            uploadFile(file, userId);
        } else {
            showUploadStatus('Please select a valid image file.', 'error');
        }
    });

    // Profile picture modal functionality
    const profileModal = document.getElementById('profileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const profileAvatar = document.getElementById('profileAvatar');

    // Function to open profile picture modal
    function openProfileModal() {
        profileModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Open profile picture modal when avatar is clicked
    if (profileAvatar) {
        profileAvatar.addEventListener('click', openProfileModal);
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