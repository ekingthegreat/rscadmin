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



// Initialize Firebase
let app;
try {
    app = firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    if (error.code === 'app/duplicate-app') {
        app = firebase.app();
    } else {
        console.error("Firebase initialization error:", error);
        showError("Firebase initialization failed. Please try again later.");
    }
}

// Get Auth and Database references
const auth = firebase.auth();
const database = firebase.database();

// Enhanced session management with proper expiration
function setAdminSession(firebaseUser, userDataFromDB) {
    // Store session data in localStorage
    localStorage.setItem('isAdminLoggedIn', 'true');
    localStorage.setItem('adminId', userDataFromDB.userId);
    localStorage.setItem('adminUsername', userDataFromDB.userData.username);
    localStorage.setItem('adminFullname', userDataFromDB.userData.fullname || '');
    localStorage.setItem('adminEmail', firebaseUser.email);
    localStorage.setItem('adminRole', userDataFromDB.userData.role);
    localStorage.setItem('userType', userDataFromDB.userType);

    // Set expiration time (24 hours from now - longer duration)
    const expirationTime = new Date().getTime() + (24 * 60 * 60 * 1000);
    localStorage.setItem('adminSessionExpiration', expirationTime.toString());

    // Store Firebase ID token
    firebaseUser.getIdToken().then(token => {
        localStorage.setItem('firebaseIdToken', token);
    });

    console.log('Admin session created for user:', userDataFromDB.userData.username);
    console.log('Session expires at:', new Date(parseInt(expirationTime)).toLocaleString());
}

// Function to check if admin session is valid
function checkAdminSession() {
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
    const expirationTime = localStorage.getItem('adminSessionExpiration');

    if (!isAdminLoggedIn || !expirationTime) {
        return false;
    }

    // Check if session has expired
    if (new Date().getTime() > parseInt(expirationTime)) {
        console.log('Session expired, clearing storage');
        clearAdminSession();
        return false;
    }

    return true;
}

// Function to clear admin session data
function clearAdminSession() {
    const keys = [
        'isAdminLoggedIn', 'adminId', 'adminUsername',
        'adminFullname', 'adminEmail', 'adminRole',
        'userType', 'adminSessionExpiration', 'firebaseIdToken'
    ];

    keys.forEach(key => localStorage.removeItem(key));

    // Also sign out from Firebase
    if (auth) {
        auth.signOut().catch(error => {
            console.log('Firebase signout error:', error);
        });
    }
}

// Toggle password visibility
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const showPasswordCheckbox = document.getElementById('show-password');

    if (showPasswordCheckbox.checked) {
        passwordInput.type = 'text';
    } else {
        passwordInput.type = 'password';
    }
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.innerHTML = `<strong>Error:</strong> ${message}`;
    errorElement.style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';

    // Scroll to error message
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Show success message
function showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    successElement.innerHTML = `<strong>Success:</strong> ${message}`;
    successElement.style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}

// Hide messages
function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

// Find user by username in database and return email
async function findUserByUsername(username) {
    try {
        // Search in all user types
        const userTypes = ['admin', 'barangay_captain', 'barangay_official', 'response_team'];

        for (const userType of userTypes) {
            const snapshot = await database.ref('users/' + userType)
                .orderByChild('username')
                .equalTo(username)
                .once('value');

            if (snapshot.exists()) {
                let userData = null;
                let userId = null;

                snapshot.forEach(user => {
                    userData = user.val();
                    userId = user.key;
                    return true; // Break after first match
                });

                if (userData) {
                    return {
                        userData: userData,
                        userId: userId,
                        userType: userType,
                        email: userData.email
                    };
                }
            }
        }
        return null; // User not found
    } catch (error) {
        console.error("Error finding user by username:", error);
        throw error;
    }
}

// Listen for form submit
document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const submitBtn = this.querySelector('button[type="submit"]');

    if (!username || !password) {
        showError("Please enter both username and password.");
        return;
    }

    // Show loading state
    submitBtn.innerHTML = '<div class="spinner"></div> Signing in...';
    submitBtn.disabled = true;
    hideMessages();

    try {
        // Step 1: Find user by username in database to get email
        const userFromDB = await findUserByUsername(username);

        if (!userFromDB) {
            showError("Invalid username. User not found.");
            submitBtn.innerHTML = 'Sign In';
            submitBtn.disabled = false;
            return;
        }

        // Step 2: Check if user has admin role
        if (userFromDB.userData.role !== "admin") {
            showError("Access denied. You do not have admin privileges.");
            submitBtn.innerHTML = 'Sign In';
            submitBtn.disabled = false;
            return;
        }

        // Step 3: Authenticate with Firebase using the email from database
        const userCredential = await auth.signInWithEmailAndPassword(userFromDB.email, password);
        const firebaseUser = userCredential.user;

        // Step 4: Set session and redirect
        setAdminSession(firebaseUser, userFromDB);

        showSuccess("Login successful! Redirecting...");

        // Redirect to dashboard after short delay
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);

    } catch (error) {
        // Handle Firebase Auth errors and other errors
        let errorMsg = "Login failed. Please try again.";

        switch (error.code) {
            case 'auth/user-not-found':
                errorMsg = "No account found with this username.";
                break;
            case 'auth/wrong-password':
                errorMsg = "Invalid password. Please try again.";
                break;
            case 'auth/invalid-email':
                errorMsg = "Invalid email configuration for this user.";
                break;
            case 'auth/user-disabled':
                errorMsg = "This account has been disabled.";
                break;
            case 'auth/too-many-requests':
                errorMsg = "Too many failed attempts. Please try again later.";
                break;
            case 'auth/network-request-failed':
                errorMsg = "Network error. Please check your connection.";
                break;
        }

        showError(errorMsg);
        submitBtn.innerHTML = 'Sign In';
        submitBtn.disabled = false;
    }
});

// Set up authentication state observer
auth.onAuthStateChanged((user) => {
    if (user && checkAdminSession()) {
        console.log("User is already authenticated:", user.email);
    } else if (user && !checkAdminSession()) {
        // User is authenticated but session expired
        console.log("Session expired, signing out Firebase user");
        clearAdminSession();
        auth.signOut();
    }
});

// Check if admin is already logged in when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log('Checking admin session on page load...');
    console.log('localStorage contents:', localStorage);

    if (checkAdminSession()) {
        console.log('Admin session is valid, redirecting to dashboard');
        // Admin is already logged in, redirect to dashboard
        window.location.href = "dashboard.html";
    } else {
        console.log('No valid admin session found, staying on login page');
    }
});

// Add debug function to check localStorage
function debugLocalStorage() {
    console.log('=== localStorage Debug Info ===');
    console.log('isAdminLoggedIn:', localStorage.getItem('isAdminLoggedIn'));
    console.log('adminId:', localStorage.getItem('adminId'));
    console.log('adminUsername:', localStorage.getItem('adminUsername'));
    console.log('adminRole:', localStorage.getItem('adminRole'));
    console.log('adminSessionExpiration:', localStorage.getItem('adminSessionExpiration'));

    const expirationTime = localStorage.getItem('adminSessionExpiration');
    if (expirationTime) {
        console.log('Session expires:', new Date(parseInt(expirationTime)).toLocaleString());
        console.log('Current time:', new Date().toLocaleString());
        console.log('Is expired:', new Date().getTime() > parseInt(expirationTime));
    }
    console.log('===============================');
}
