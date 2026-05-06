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
    localStorage.removeItem('adminProfilePicture');
}

// Global variables
let selectedImageFiles = [];
let editingEventKey = null;
let currentGalleryImages = [];
let currentGalleryIndex = 0;

// NEW: Function to create images grid for blocked posts
function createBlockedImagesGrid(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) {
        return '';
    }

    if (imageUrls.length === 1) {
        return `
                    <div class="blocked-post-images-grid">
                        <img src="${imageUrls[0]}" class="blocked-post-image" alt="Blocked Post Image" 
                             data-images='${JSON.stringify(imageUrls)}' data-index="0">
                    </div>
                `;
    }

    if (imageUrls.length === 2) {
        return `
                    <div class="blocked-images-grid">
                        ${imageUrls.map((url, index) => `
                            <img src="${url}" class="blocked-post-image" alt="Blocked Post Image" 
                                 data-images='${JSON.stringify(imageUrls)}' data-index="${index}">
                        `).join('')}
                    </div>
                `;
    }

    if (imageUrls.length === 3) {
        return `
                    <div class="blocked-images-grid three-images">
                        ${imageUrls.map((url, index) => `
                            <img src="${url}" class="blocked-post-image" alt="Blocked Post Image" 
                                 data-images='${JSON.stringify(imageUrls)}' data-index="${index}">
                        `).join('')}
                    </div>
                `;
    }

    // For 4 or more images
    return `
                <div class="blocked-images-grid four-or-more">
                    ${imageUrls.slice(0, 4).map((url, index) => `
                        <div class="${index === 3 && imageUrls.length > 4 ? 'blocked-more-images-overlay' : ''}">
                            <img src="${url}" class="blocked-post-image" alt="Blocked Post Image" 
                                 data-images='${JSON.stringify(imageUrls)}' data-index="${index}">
                            ${index === 3 && imageUrls.length > 4 ? `
                                <div class="blocked-more-images-count">+${imageUrls.length - 4}</div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
}

// ENHANCED: Profile Picture Functions
// NEW: Function to generate avatar initials
function getAvatarInitials(fullname) {
    if (!fullname || fullname.trim() === '') {
        return 'U'; // Default for users with no name
    }

    const names = fullname.trim().split(' ');
    if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
    } else {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
}

// NEW: Function to get avatar color based on user ID or name
function getAvatarColor(userId) {
    const colors = [
        '#4a6fa5', '#2c3e50', '#3498db', '#e74c3c',
        '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c',
        '#34495e', '#16a085', '#27ae60', '#2980b9',
        '#8e44ad', '#2c3e50', '#f1c40f', '#e67e22'
    ];
    const index = userId ? userId.charCodeAt(0) % colors.length : 0;
    return colors[index];
}

// ENHANCED: Function to validate image URL
function isValidImageUrl(url) {
    if (!url || url.trim() === '') return false;

    // Check if it's a data URL (SVG default avatar)
    if (url.startsWith('data:image/svg+xml') || url.startsWith('data:image/')) {
        return true;
    }

    // Check if it's a valid URL format and points to an image
    try {
        const parsedUrl = new URL(url);
        const validProtocols = ['http:', 'https:'];
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const validDomains = ['supabase.co', 'ui-avatars.com', 'avatars.githubusercontent.com'];

        if (!validProtocols.includes(parsedUrl.protocol)) {
            return false;
        }

        // Check if domain is in allowed list (optional security check)
        if (!validDomains.some(domain => parsedUrl.hostname.includes(domain))) {
            console.warn('Image URL from untrusted domain:', parsedUrl.hostname);
            // You might want to return false here for security, or true if you trust the source
        }

        // Check file extension
        const pathname = parsedUrl.pathname.toLowerCase();
        if (validExtensions.some(ext => pathname.endsWith(ext))) {
            return true;
        }

        // If no extension but has image in path (like Supabase storage)
        if (pathname.includes('storage') && pathname.includes('object')) {
            return true;
        }

        return false;
    } catch (e) {
        console.warn('Invalid URL format for profile picture:', url);
        return false;
    }
}

// ENHANCED: Function to create default avatar with better styling
function getDefaultAvatar(userId, userName = null) {
    const colors = [
        '#4a6fa5', '#2c3e50', '#3498db', '#e74c3c',
        '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c',
        '#34495e', '#16a085', '#27ae60', '#2980b9',
        '#8e44ad', '#2c3e50', '#f1c40f', '#e67e22'
    ];

    // Use userId hash for consistent color, fallback to random if no userId
    const colorIndex = userId ?
        userId.charCodeAt(0) % colors.length :
        Math.floor(Math.random() * colors.length);

    const color = colors[colorIndex];

    // Get user name from parameter or use fallback
    let userInitial = 'U';
    if (userName && userName.trim() !== '') {
        userInitial = getAvatarInitials(userName);
    } else {
        const currentUserName = localStorage.getItem('adminFullname') ||
            localStorage.getItem('adminUsername') ||
            'Admin User';
        userInitial = getAvatarInitials(currentUserName);
    }

    // Create SVG avatar
    const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 45 45">
                    <circle cx="22.5" cy="22.5" r="22.5" fill="${color}"/>
                    <text x="22.5" y="28" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle" font-weight="bold">
                        ${userInitial}
                    </text>
                </svg>
            `;

    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// ENHANCED: Function to get user profile image with better error handling and database lookup
async function getUserProfileImage(userId, userName = null) {
    try {
        if (!userId) {
            console.warn('No user ID provided for profile picture');
            return getDefaultAvatar(userId, userName);
        }

        // First, try to get the profile picture from the database
        const userRoles = ['response_team', 'barangay_official', 'barangay_captain', 'admin'];

        for (const role of userRoles) {
            try {
                const userRef = database.ref(`users/${role}/${userId}`);
                const snapshot = await userRef.once('value');
                const userData = snapshot.val();

                if (userData && userData.profilePicture && userData.profilePicture.trim() !== '') {
                    // Validate the URL before returning
                    if (isValidImageUrl(userData.profilePicture)) {
                        console.log(`Found profile picture for ${userId} in ${role}:`, userData.profilePicture);
                        return userData.profilePicture;
                    } else {
                        console.warn(`Invalid profile picture URL for user ${userId}:`, userData.profilePicture);
                        // Continue to next role or use default
                    }
                }
            } catch (error) {
                console.warn(`Error checking ${role} for user ${userId}:`, error);
                // Continue to next role
            }
        }

        // If no valid profile picture found in any role, generate a default avatar
        console.log(`No profile picture found for ${userId}, using default avatar`);
        return getDefaultAvatar(userId, userName);
    } catch (error) {
        console.error('Error fetching profile picture:', error);
        return getDefaultAvatar(userId, userName);
    }
}

// NEW: Function to handle image loading errors
function handleImageError(imgElement, userId, userName = null) {
    console.warn('Image failed to load, using default avatar');
    imgElement.onerror = null; // Prevent infinite loop
    imgElement.src = getDefaultAvatar(userId, userName);
    imgElement.alt = "Default Avatar";

    // Update styling for the fallback
    imgElement.style.objectFit = 'cover';
    imgElement.style.borderRadius = '50%';
}

// ENHANCED: Function to create user avatar element with robust fallback
function createUserAvatar(userId, userName, profilePicture = null) {
    const color = getAvatarColor(userId);
    const initials = getAvatarInitials(userName);

    // If we have a valid profile picture, use it with error handling
    if (profilePicture && isValidImageUrl(profilePicture)) {
        return `
                    <div class="user-avatar">
                        <img src="${profilePicture}" 
                             alt="${userName}" 
                             onerror="this.onerror=null; this.src='${getDefaultAvatar(userId, userName)}';"
                             style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border);">
                    </div>
                `;
    }

    // Otherwise use the default avatar
    return `
                <div class="user-avatar" style="background-color: ${color}; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 10px; font-size: 14px;">
                    ${initials}
                </div>
            `;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    const auth = checkAuth();
    if (!auth) return;

    // Initialize functionality
    initializeMenuToggle();
    initializeFormToggles();
    initializeImageUpload();
    initializeEventForm();
    initializeModal();
    initializeGalleryModal();
    initializeBlocklistToggle();

    // Load data
    loadAnnouncements();
    loadEvents();
});

// Menu toggle functionality
function initializeMenuToggle() {
    const menuToggle = document.getElementById("menuToggle");
    const navbar = document.getElementById("navbar");

    if (menuToggle && navbar) {
        menuToggle.addEventListener("click", () => {
            navbar.classList.toggle("active");
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navbar.classList.contains('active') &&
            !navbar.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            navbar.classList.remove('active');
        }
    });
}

// Form toggle functionality
function initializeFormToggles() {
    const newEventBtn = document.getElementById('newEventBtn');
    const newAnnouncementBtn = document.getElementById('newAnnouncementBtn');
    const announcementForm = document.getElementById('announcementForm');
    const eventForm = document.getElementById('eventForm');
    const eventFields = document.querySelectorAll('.event-field');

    // Initially hide the forms
    announcementForm.style.display = 'none';
    eventForm.style.display = 'none';

    newEventBtn.addEventListener('click', () => {
        if (eventForm.style.display === 'none') {
            eventForm.style.display = 'block';
            announcementForm.style.display = 'none';
            newEventBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
            newAnnouncementBtn.style.display = 'none';

            // Show event form fields
            eventFields.forEach(field => {
                field.style.display = 'block';
            });

            // Set minimum date to today
            setMinDate();

            // Reset to create mode
            resetEventForm();
        } else {
            eventForm.style.display = 'none';
            newEventBtn.innerHTML = '<i class="fas fa-calendar-plus"></i> New Event';
            newAnnouncementBtn.style.display = 'flex';
        }
    });

    newAnnouncementBtn.addEventListener('click', () => {
        if (announcementForm.style.display === 'none') {
            announcementForm.style.display = 'block';
            eventForm.style.display = 'none';
            newAnnouncementBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
            newEventBtn.style.display = 'none';
        } else {
            announcementForm.style.display = 'none';
            newAnnouncementBtn.innerHTML = '<i class="fas fa-bullhorn"></i> New Announcement';
            newEventBtn.style.display = 'flex';
        }
    });
}

// NEW: Initialize blocklist toggle
function initializeBlocklistToggle() {
    const viewBlockedBtn = document.getElementById('viewBlockedBtn');
    const blocklistSection = document.getElementById('blocklistSection');
    const postsContainer = document.getElementById('postsContainer');
    const announcementForm = document.getElementById('announcementForm');
    const eventForm = document.getElementById('eventForm');

    viewBlockedBtn.addEventListener('click', () => {
        if (blocklistSection.style.display === 'none') {
            // Show blocklist
            blocklistSection.style.display = 'block';
            postsContainer.style.display = 'none';
            announcementForm.style.display = 'none';
            eventForm.style.display = 'none';
            viewBlockedBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Announcements';

            // Hide other buttons
            document.getElementById('newEventBtn').style.display = 'none';
            document.getElementById('newAnnouncementBtn').style.display = 'none';

            // Load blocked posts
            loadBlockedPosts();
        } else {
            // Show normal announcements
            blocklistSection.style.display = 'none';
            postsContainer.style.display = 'grid';
            viewBlockedBtn.innerHTML = '<i class="fas fa-ban"></i> View Blocked Posts';

            // Show other buttons
            document.getElementById('newEventBtn').style.display = 'flex';
            document.getElementById('newAnnouncementBtn').style.display = 'flex';
        }
    });
}

// NEW: Load blocked posts
function loadBlockedPosts() {
    const blockedPostsRef = database.ref('blocked_posts');
    const blockedPostsList = document.getElementById('blockedPostsList');

    blockedPostsRef.on('value', async (snapshot) => {
        const blockedPosts = [];
        snapshot.forEach((childSnapshot) => {
            blockedPosts.push({
                ...childSnapshot.val(),
                key: childSnapshot.key
            });
        });

        // Sort by block date (newest first)
        blockedPosts.sort((a, b) => new Date(b.blockedAt) - new Date(a.blockedAt));
        await displayBlockedPosts(blockedPosts);
    });
}

// NEW: Display blocked posts with images
async function displayBlockedPosts(blockedPosts) {
    const blockedPostsList = document.getElementById('blockedPostsList');
    blockedPostsList.innerHTML = '';

    if (blockedPosts.length === 0) {
        blockedPostsList.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-light);">No blocked posts found.</p>';
        return;
    }

    for (const blockedPost of blockedPosts) {
        const blockedDate = new Date(blockedPost.blockedAt);
        const formattedBlockDate = blockedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const postDate = new Date(blockedPost.createdAt);
        const formattedPostDate = postDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const displayTime = blockedPost.formattedTime ||
            new Date(blockedPost.createdAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            });

        // Get profile images for both post creator and blocker
        const creatorProfileImage = await getUserProfileImage(
            blockedPost.createdBy,
            blockedPost.createdByName
        );

        const blockerProfileImage = await getUserProfileImage(
            blockedPost.blockedBy,
            blockedPost.blockedByName
        );

        // Handle both single image (backward compatibility) and multiple images
        const imageUrls = blockedPost.imageUrls ||
            (blockedPost.imageUrl ? [blockedPost.imageUrl] : []);

        let blockedPostHTML = `
                    <div class="blocked-post">
                        <div class="blocked-post-header">
                            <div class="blocked-post-info">
                                <div class="blocked-post-author">${blockedPost.createdByName}</div>
                                <div class="blocked-post-meta">${formattedPostDate} | ${displayTime}</div>
                                <div class="block-info">
                                    <strong>Blocked by:</strong> ${blockedPost.blockedByName} on ${formattedBlockDate}
                                </div>
                            </div>
                        </div>
                `;

        // Add text content
        if (blockedPost.text) {
            blockedPostHTML += `
                        <div class="blocked-post-content">
                            ${blockedPost.text}
                        </div>
                    `;
        }

        // Add images if they exist
        if (imageUrls.length > 0) {
            blockedPostHTML += `
                        <div class="blocked-post-images">
                            ${createBlockedImagesGrid(imageUrls)}
                        </div>
                    `;
        }

        // Add unblock button
        blockedPostHTML += `
                        <div class="blocked-post-actions">
                            <button class="unblock-btn" data-key="${blockedPost.key}">
                                <i class="fas fa-check"></i> Unblock Post
                            </button>
                        </div>
                    </div>
                `;

        blockedPostsList.innerHTML += blockedPostHTML;
    }

    // Add event listeners to unblock buttons
    document.querySelectorAll('.unblock-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            unblockPost(key);
        });
    });

    // Add event listeners to blocked post images for gallery view
    document.querySelectorAll('.blocked-post-image').forEach(img => {
        img.addEventListener('click', (e) => {
            const images = JSON.parse(e.target.getAttribute('data-images'));
            const index = parseInt(e.target.getAttribute('data-index'));
            openGalleryModal(images, index);
        });
    });
}

// NEW: Unblock post function
function unblockPost(blockedPostKey) {
    if (confirm('Are you sure you want to unblock this post?')) {
        const currentUserId = localStorage.getItem('adminId');
        const currentUserName = localStorage.getItem('adminFullname') || localStorage.getItem('adminUsername') || 'Admin';

        // Get the blocked post data first
        const blockedPostRef = database.ref('blocked_posts/' + blockedPostKey);
        blockedPostRef.once('value').then((snapshot) => {
            const blockedPost = snapshot.val();
            if (!blockedPost) return;

            // Remove from blocked_posts
            blockedPostRef.remove()
                .then(() => {
                    // Update the original post to remove blocked status
                    const originalPostRef = database.ref('announcements/' + blockedPost.originalPostKey);
                    originalPostRef.update({
                        blocked: false,
                        unblockedBy: currentUserId,
                        unblockedByName: currentUserName,
                        unblockedAt: new Date().toISOString()
                    }).then(() => {
                        alert('Post unblocked successfully!');
                        // Reload blocked posts to reflect changes
                        loadBlockedPosts();
                    });
                })
                .catch(error => {
                    console.error('Error unblocking post:', error);
                    alert('Error unblocking post: ' + error.message);
                });
        });
    }
}

// Image upload functionality
function initializeImageUpload() {
    const uploadBtn = document.getElementById('uploadBtn');
    const imageUpload = document.getElementById('imageUpload');
    const imagePreviews = document.getElementById('imagePreviews');
    const uploadSection = document.getElementById('uploadSection');

    // Click to upload
    uploadBtn.addEventListener('click', () => {
        imageUpload.click();
    });

    // File selection
    imageUpload.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);

        if (files.length > 0) {
            // Filter only image files
            const imageFiles = files.filter(file => file.type.startsWith('image/'));

            if (imageFiles.length > 0) {
                selectedImageFiles = selectedImageFiles.concat(imageFiles);
                updateImagePreviews();
            } else {
                alert('Please select valid image files.');
            }
        }
    });

    // Drag and drop functionality
    uploadSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadSection.style.backgroundColor = '#f0f0f0';
    });

    uploadSection.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadSection.style.backgroundColor = '';
    });

    uploadSection.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadSection.style.backgroundColor = '';

        const files = Array.from(e.dataTransfer.files);

        if (files.length > 0) {
            // Filter only image files
            const imageFiles = files.filter(file => file.type.startsWith('image/'));

            if (imageFiles.length > 0) {
                selectedImageFiles = selectedImageFiles.concat(imageFiles);
                updateImagePreviews();
            } else {
                alert('Please drop valid image files.');
            }
        }
    });

    // Publish announcement
    document.getElementById('publishAnnouncementBtn').addEventListener('click', publishAnnouncement);
}

// NEW: Function to create image preview
function createImagePreview(file, index) {
    const previewContainer = document.createElement('div');
    previewContainer.className = 'image-preview';
    previewContainer.dataset.index = index;

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-preview';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', () => {
        removeImagePreview(index);
    });

    previewContainer.appendChild(img);
    previewContainer.appendChild(removeBtn);

    return previewContainer;
}

// NEW: Function to remove image preview
function removeImagePreview(index) {
    // Remove from files array
    selectedImageFiles.splice(index, 1);

    // Update previews
    updateImagePreviews();
}

// NEW: Function to update image previews
function updateImagePreviews() {
    const imagePreviews = document.getElementById('imagePreviews');
    imagePreviews.innerHTML = '';

    selectedImageFiles.forEach((file, index) => {
        const preview = createImagePreview(file, index);
        imagePreviews.appendChild(preview);
    });
}

// NEW: Function to upload multiple images to Supabase
async function uploadImagesToSupabase(files) {
    try {
        const userId = localStorage.getItem('adminId');
        const uploadPromises = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = `announcements/${userId}_${Date.now()}_${i}.jpg`;

            const uploadPromise = supabaseClient.storage
                .from(supabaseConfig.bucketName)
                .upload(fileName, file);

            uploadPromises.push(uploadPromise);
        }

        const results = await Promise.all(uploadPromises);

        // Check for errors
        for (const result of results) {
            if (result.error) {
                throw new Error(result.error.message);
            }
        }

        // Get public URLs for all uploaded images
        const urlPromises = results.map(result => {
            return supabaseClient.storage
                .from(supabaseConfig.bucketName)
                .getPublicUrl(result.data.path);
        });

        const urlResults = await Promise.all(urlPromises);
        const imageUrls = urlResults.map(result => result.data.publicUrl);

        return imageUrls;
    } catch (error) {
        console.error('Error uploading images:', error);
        throw error;
    }
}

// Function to show upload status
function showUploadStatus(message, type) {
    const statusElement = document.createElement('div');
    statusElement.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                z-index: 10000;
                max-width: 80%;
                text-align: center;
                background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
            `;
    statusElement.textContent = message;
    document.body.appendChild(statusElement);

    setTimeout(() => {
        statusElement.remove();
    }, 3000);
}

// ENHANCED: Publish announcement to Firebase with enhanced profile picture handling
async function publishAnnouncement() {
    const announcementText = document.getElementById('announcementText').value.trim();

    if (!announcementText && selectedImageFiles.length === 0) {
        alert('Please add either text or images to your announcement.');
        return;
    }

    const originalText = document.getElementById('publishAnnouncementBtn').innerHTML;

    try {
        document.getElementById('publishAnnouncementBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
        document.getElementById('publishAnnouncementBtn').disabled = true;

        let imageUrls = [];

        // Upload images if selected
        if (selectedImageFiles.length > 0) {
            imageUrls = await uploadImagesToSupabase(selectedImageFiles);
        }

        const userId = localStorage.getItem('adminId');
        const username = localStorage.getItem('adminUsername');
        const fullname = localStorage.getItem('adminFullname');

        // ENHANCED: Get profile picture with enhanced error handling
        const profilePicture = await getUserProfileImage(userId, fullname || username);

        const announcementData = {
            text: announcementText,
            imageUrls: imageUrls, // Now storing array of URLs
            createdBy: userId,
            createdByName: fullname || username || 'Admin User',
            createdByProfilePicture: profilePicture, // Store profile picture with announcement
            createdAt: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            formattedTime: new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            }),
            likes: 0,
            likedBy: {},
            comments: 0,
            views: 0,
            viewedBy: {},
            commentsList: {},
            blocked: false // NEW: Track if post is blocked
        };

        // Save to Firebase
        const announcementsRef = database.ref('announcements');
        await announcementsRef.push(announcementData);

        showUploadStatus('Announcement published successfully!', 'success');

        // Reset form
        document.getElementById('announcementText').value = '';
        selectedImageFiles = [];
        document.getElementById('imagePreviews').innerHTML = '';
        document.getElementById('imageUpload').value = '';

        // Hide form
        document.getElementById('announcementForm').style.display = 'none';
        document.getElementById('newAnnouncementBtn').innerHTML = '<i class="fas fa-bullhorn"></i> New Announcement';
        document.getElementById('newEventBtn').style.display = 'flex';
    } catch (error) {
        console.error('Error publishing announcement:', error);
        showUploadStatus('Error publishing announcement: ' + error.message, 'error');
    } finally {
        document.getElementById('publishAnnouncementBtn').innerHTML = originalText;
        document.getElementById('publishAnnouncementBtn').disabled = false;
    }
}

// Event form functionality
function initializeEventForm() {
    document.getElementById('createEventBtn').addEventListener('click', createEvent);
    document.getElementById('updateEventBtn').addEventListener('click', updateEvent);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
}

// Modal functionality
function initializeModal() {
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeModal = document.querySelector('.close-modal');

    // Close modal when clicking X
    closeModal.addEventListener('click', () => {
        imageModal.style.display = 'none';
    });

    // Close modal when clicking outside
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.style.display = 'none';
        }
    });
}

// NEW: Initialize gallery modal
function initializeGalleryModal() {
    const galleryModal = document.getElementById('galleryModal');
    const galleryClose = document.querySelector('.gallery-close');
    const galleryMainImage = document.getElementById('galleryMainImage');
    const galleryCount = document.getElementById('galleryCount');
    const galleryThumbnails = document.getElementById('galleryThumbnails');
    const galleryPrev = document.querySelector('.gallery-prev');
    const galleryNext = document.querySelector('.gallery-next');

    // Close gallery modal
    galleryClose.addEventListener('click', () => {
        galleryModal.style.display = 'none';
    });

    galleryModal.addEventListener('click', (e) => {
        if (e.target === galleryModal) {
            galleryModal.style.display = 'none';
        }
    });

    // Gallery navigation
    galleryPrev.addEventListener('click', () => {
        navigateGallery('prev');
    });

    galleryNext.addEventListener('click', () => {
        navigateGallery('next');
    });

    // Keyboard navigation for gallery
    document.addEventListener('keydown', (e) => {
        if (galleryModal.style.display === 'flex') {
            if (e.key === 'ArrowLeft') {
                navigateGallery('prev');
            } else if (e.key === 'ArrowRight') {
                navigateGallery('next');
            } else if (e.key === 'Escape') {
                galleryModal.style.display = 'none';
            }
        }
    });
}

// NEW: Function to open gallery modal
function openGalleryModal(images, startIndex = 0) {
    currentGalleryImages = images;
    currentGalleryIndex = startIndex;

    updateGalleryDisplay();
    document.getElementById('galleryModal').style.display = 'flex';
}

// NEW: Function to update gallery display
function updateGalleryDisplay() {
    if (currentGalleryImages.length === 0) return;

    const galleryMainImage = document.getElementById('galleryMainImage');
    const galleryCount = document.getElementById('galleryCount');
    const galleryThumbnails = document.getElementById('galleryThumbnails');

    galleryMainImage.src = currentGalleryImages[currentGalleryIndex];
    galleryCount.textContent = `${currentGalleryIndex + 1} / ${currentGalleryImages.length}`;

    // Update thumbnails
    galleryThumbnails.innerHTML = '';
    currentGalleryImages.forEach((image, index) => {
        const thumbnail = document.createElement('img');
        thumbnail.src = image;
        thumbnail.className = `gallery-thumbnail ${index === currentGalleryIndex ? 'active' : ''}`;
        thumbnail.addEventListener('click', () => {
            currentGalleryIndex = index;
            updateGalleryDisplay();
        });
        galleryThumbnails.appendChild(thumbnail);
    });
}

// NEW: Function to navigate gallery
function navigateGallery(direction) {
    if (direction === 'prev') {
        currentGalleryIndex = currentGalleryIndex > 0 ? currentGalleryIndex - 1 : currentGalleryImages.length - 1;
    } else {
        currentGalleryIndex = currentGalleryIndex < currentGalleryImages.length - 1 ? currentGalleryIndex + 1 : 0;
    }
    updateGalleryDisplay();
}

// Set minimum date to today
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('eventDate').min = today;
}

// Reset event form to create mode
function resetEventForm() {
    document.getElementById('eventFormTitle').textContent = 'Create New Event';
    document.getElementById('createEventBtn').style.display = 'block';
    document.getElementById('updateEventBtn').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDate').value = '';
    document.getElementById('eventTime').value = '';
    document.getElementById('eventLocation').value = '';
    document.getElementById('eventParticipants').value = '';
    editingEventKey = null;
}

// Create new event
function createEvent() {
    const eventTitle = document.getElementById('eventTitle').value.trim();
    const eventDate = document.getElementById('eventDate').value;
    const eventTime = document.getElementById('eventTime').value;
    const eventLocation = document.getElementById('eventLocation').value.trim();
    const eventParticipants = document.getElementById('eventParticipants').value.trim();

    if (!eventTitle || !eventDate || !eventTime || !eventLocation) {
        alert('Please fill in all required fields');
        return;
    }

    // Validate date is not in the past
    const now = new Date();
    const selectedDateTime = new Date(eventDate + 'T' + eventTime);
    if (selectedDateTime < now) {
        alert('Please select a date and time in the future');
        return;
    }

    const userId = localStorage.getItem('adminId');
    const username = localStorage.getItem('adminUsername');

    const eventData = {
        title: eventTitle,
        date: eventDate,
        time: eventTime,
        formattedTime: new Date('1970-01-01T' + eventTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }),
        location: eventLocation,
        participant: eventParticipants,
        createdBy: userId,
        createdByName: username || 'Admin User',
        createdAt: new Date().toISOString()
    };

    // Save to Firebase
    const eventsRef = database.ref('events');
    eventsRef.push(eventData)
        .then(() => {
            alert('Event created successfully!');
            resetEventForm();
            document.getElementById('eventForm').style.display = 'none';
            document.getElementById('newEventBtn').innerHTML = '<i class="fas fa-calendar-plus"></i> New Event';
            document.getElementById('newAnnouncementBtn').style.display = 'flex';
        })
        .catch(error => {
            console.error('Error creating event:', error);
            alert('Error creating event: ' + error.message);
        });
}

// Update event
function updateEvent() {
    if (!editingEventKey) return;

    const eventTitle = document.getElementById('eventTitle').value.trim();
    const eventDate = document.getElementById('eventDate').value;
    const eventTime = document.getElementById('eventTime').value;
    const eventLocation = document.getElementById('eventLocation').value.trim();
    const eventParticipants = document.getElementById('eventParticipants').value.trim();

    if (!eventTitle || !eventDate || !eventTime || !eventLocation) {
        alert('Please fill in all required fields');
        return;
    }

    const eventData = {
        title: eventTitle,
        date: eventDate,
        time: eventTime,
        formattedTime: new Date('1970-01-01T' + eventTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }),
        location: eventLocation,
        participant: eventParticipants,
        updatedAt: new Date().toISOString()
    };

    // Update in Firebase
    const eventRef = database.ref('events/' + editingEventKey);
    eventRef.update(eventData)
        .then(() => {
            alert('Event updated successfully!');
            resetEventForm();
            document.getElementById('eventForm').style.display = 'none';
            document.getElementById('newEventBtn').innerHTML = '<i class="fas fa-calendar-plus"></i> New Event';
            document.getElementById('newAnnouncementBtn').style.display = 'flex';
        })
        .catch(error => {
            console.error('Error updating event:', error);
            alert('Error updating event: ' + error.message);
        });
}

// Cancel edit mode
function cancelEdit() {
    resetEventForm();
}

// Load announcements from Firebase
function loadAnnouncements() {
    const announcementsRef = database.ref('announcements');

    announcementsRef.on('value', async (snapshot) => {
        const announcements = [];
        snapshot.forEach((childSnapshot) => {
            const announcement = childSnapshot.val();
            // Only include non-blocked announcements
            if (!announcement.blocked) {
                announcements.push({
                    ...announcement,
                    key: childSnapshot.key
                });
            }
        });

        // Sort by creation date (newest first)
        announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        await displayAnnouncements(announcements);
    });
}

// NEW: Function to display multiple images in a grid layout
function createImagesGrid(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) {
        return '';
    }

    if (imageUrls.length === 1) {
        return `
                    <div class="post-images-container">
                        <img src="${imageUrls[0]}" class="post-image" alt="Announcement Image" 
                             data-images='${JSON.stringify(imageUrls)}' data-index="0">
                    </div>
                `;
    }

    if (imageUrls.length === 2) {
        return `
                    <div class="post-images-grid">
                        ${imageUrls.map((url, index) => `
                            <img src="${url}" class="post-image" alt="Announcement Image" 
                                 data-images='${JSON.stringify(imageUrls)}' data-index="${index}">
                        `).join('')}
                    </div>
                `;
    }

    if (imageUrls.length === 3) {
        return `
                    <div class="post-images-grid three-images">
                        ${imageUrls.map((url, index) => `
                            <img src="${url}" class="post-image" alt="Announcement Image" 
                                 data-images='${JSON.stringify(imageUrls)}' data-index="${index}">
                        `).join('')}
                    </div>
                `;
    }

    // For 4 or more images
    return `
                <div class="post-images-grid four-or-more">
                    ${imageUrls.slice(0, 4).map((url, index) => `
                        <div class="${index === 3 && imageUrls.length > 4 ? 'more-images-overlay' : ''}">
                            <img src="${url}" class="post-image" alt="Announcement Image" 
                                 data-images='${JSON.stringify(imageUrls)}' data-index="${index}">
                            ${index === 3 && imageUrls.length > 4 ? `
                                <div class="more-images-count">+${imageUrls.length - 4}</div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
}

// ENHANCED: Display announcements with enhanced profile picture handling
async function displayAnnouncements(announcements) {
    const postsContainer = document.getElementById('postsContainer');
    postsContainer.innerHTML = '';

    if (announcements.length === 0) {
        postsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-light);">No announcements yet.</p>';
        return;
    }

    const currentUserId = localStorage.getItem('adminId');
    const currentUserRole = localStorage.getItem('adminRole');

    // Process announcements one by one to handle async operations
    for (const announcement of announcements) {
        const announcementDate = new Date(announcement.createdAt);
        const formattedDate = announcementDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const displayTime = announcement.formattedTime ||
            new Date(announcement.createdAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            });

        const isAnnouncementCreator = announcement.createdBy === currentUserId;
        const isAdmin = currentUserRole === 'admin';

        // ENHANCED: Get profile image with better error handling
        let profileImageUrl;
        try {
            profileImageUrl = await getUserProfileImage(
                announcement.createdBy,
                announcement.createdByName
            );
        } catch (error) {
            console.error('Error loading profile image:', error);
            profileImageUrl = getDefaultAvatar(announcement.createdBy, announcement.createdByName);
        }

        // Handle both single image (backward compatibility) and multiple images
        const imageUrls = announcement.imageUrls ||
            (announcement.imageUrl ? [announcement.imageUrl] : []);

        // Create user avatar with the retrieved profile picture
        const userAvatarHTML = createUserAvatar(
            announcement.createdBy,
            announcement.createdByName,
            profileImageUrl
        );

        let announcementHTML = `
                    <div class="post" data-announcement-key="${announcement.key}">
                        <div class="post-header">
                            ${userAvatarHTML}
                            <div class="post-info">
                                <div class="post-author">${announcement.createdByName}</div>
                                <div class="post-meta">
                                    ${formattedDate} | ${displayTime}
                                </div>
                            </div>
                `;

        // Add kebab menu for announcement creator or admin
        if (isAnnouncementCreator || isAdmin) {
            announcementHTML += `
                        <div class="kebab-menu">
                            <div class="kebab-dots">
                                <div class="kebab-dot"></div>
                                <div class="kebab-dot"></div>
                                <div class="kebab-dot"></div>
                            </div>
                            <div class="kebab-dropdown">
                    `;

            // Show edit/delete options for creator
            if (isAnnouncementCreator) {
                announcementHTML += `
                                <div class="kebab-item edit-announcement" data-key="${announcement.key}">
                                    <i class="fas fa-edit"></i> Edit
                                </div>
                                <div class="kebab-item delete delete-announcement" data-key="${announcement.key}">
                                    <i class="fas fa-trash"></i> Delete
                                </div>
                        `;
            }

            // Show block option for admin (and not the creator's own post)
            if (isAdmin && !isAnnouncementCreator) {
                announcementHTML += `
                                <div class="kebab-item block block-announcement" data-key="${announcement.key}">
                                    <i class="fas fa-ban"></i> Block Post
                                </div>
                        `;
            }

            announcementHTML += `</div></div>`;
        }

        announcementHTML += `</div>`;

        // Add images grid if there are images
        if (imageUrls.length > 0) {
            announcementHTML += createImagesGrid(imageUrls);
        }

        // Add text content
        if (announcement.text) {
            announcementHTML += `
                        <div class="post-body">
                            ${announcement.text}
                        </div>
                    `;
        }

        // Add footer with stats
        announcementHTML += `
                        <div class="post-footer">
                            <div class="post-stats">
                                <div class="stat likes" data-key="${announcement.key}">
                                    <i class="fas fa-thumbs-up"></i> <span class="like-count">${announcement.likes || 0}</span>
                                </div>
                                <div class="stat comments" data-key="${announcement.key}">
                                    <i class="fas fa-comment"></i> <span class="comment-count">${announcement.comments || 0}</span>
                                </div>
                                <div class="stat views" data-key="${announcement.key}">
                                    <i class="fas fa-eye"></i> <span class="view-count">${announcement.views || 0}</span>
                                </div>
                            </div>
                        </div>
                        <div class="comments-section" id="comments-${announcement.key}">
                            <div class="comments-list" id="comments-list-${announcement.key}">
                                <!-- Comments will be loaded here -->
                            </div>
                            <div class="comment-input">
                                <input type="text" placeholder="Add a comment..." id="comment-input-${announcement.key}">
                                <button class="submit-comment" data-key="${announcement.key}">Post</button>
                            </div>
                        </div>
                    </div>
                `;

        postsContainer.innerHTML += announcementHTML;
    }

    // Add event listeners after rendering
    addAnnouncementEventListeners();

    // Track views for all loaded announcements
    trackAnnouncementViews(announcements);
}

// NEW: Block announcement function
function blockAnnouncement(announcementKey) {
    if (confirm('Are you sure you want to block this post? It will be hidden from the main feed.')) {
        const currentUserId = localStorage.getItem('adminId');
        const currentUserName = localStorage.getItem('adminFullname') || localStorage.getItem('adminUsername') || 'Admin';

        // Get the announcement data first
        const announcementRef = database.ref('announcements/' + announcementKey);
        announcementRef.once('value').then((snapshot) => {
            const announcement = snapshot.val();
            if (!announcement) return;

            // Mark as blocked in the original announcement
            announcementRef.update({
                blocked: true,
                blockedBy: currentUserId,
                blockedByName: currentUserName,
                blockedAt: new Date().toISOString()
            }).then(() => {
                // Also save a copy to blocked_posts for easy retrieval
                const blockedPostsRef = database.ref('blocked_posts');
                blockedPostsRef.push({
                    ...announcement,
                    originalPostKey: announcementKey,
                    blockedBy: currentUserId,
                    blockedByName: currentUserName,
                    blockedAt: new Date().toISOString()
                }).then(() => {
                    alert('Post blocked successfully!');
                    // Reload announcements to reflect changes
                    loadAnnouncements();
                });
            }).catch(error => {
                console.error('Error blocking announcement:', error);
                alert('Error blocking announcement: ' + error.message);
            });
        });
    }
}

// NEW: Track individual post view when user interacts with it
function trackPostView(announcementKey) {
    const currentUserId = localStorage.getItem('adminId');
    const announcementRef = database.ref('announcements/' + announcementKey);

    announcementRef.once('value').then((snapshot) => {
        const announcement = snapshot.val();
        if (!announcement) return;

        const viewedBy = announcement.viewedBy || {};

        // Only count view if user hasn't viewed this post yet
        if (!viewedBy[currentUserId]) {
            viewedBy[currentUserId] = true;
            const newViews = (announcement.views || 0) + 1;

            announcementRef.update({
                views: newViews,
                viewedBy: viewedBy
            }).then(() => {
                // Update the view count display
                const viewCountElement = document.querySelector(`.post[data-announcement-key="${announcementKey}"] .view-count`);
                if (viewCountElement) {
                    viewCountElement.textContent = newViews;
                }
            }).catch(error => {
                console.error('Error updating view count:', error);
            });
        }
    });
}

// Add event listeners to announcements - UPDATED with view tracking
function addAnnouncementEventListeners() {
    // Image click for gallery view
    document.querySelectorAll('.post-image').forEach(img => {
        img.addEventListener('click', (e) => {
            const announcementKey = e.target.closest('.post').getAttribute('data-announcement-key');
            trackPostView(announcementKey);

            const images = JSON.parse(e.target.getAttribute('data-images'));
            const index = parseInt(e.target.getAttribute('data-index'));
            openGalleryModal(images, index);
        });
    });

    // Text content click - track view
    document.querySelectorAll('.post-body').forEach(body => {
        body.addEventListener('click', (e) => {
            const announcementKey = e.target.closest('.post').getAttribute('data-announcement-key');
            trackPostView(announcementKey);
        });
    });

    // Kebab menu functionality
    document.querySelectorAll('.kebab-menu').forEach(menu => {
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = menu.querySelector('.kebab-dropdown');
            dropdown.classList.toggle('show');
        });
    });

    // Close dropdowns when clicking elsewhere
    document.addEventListener('click', () => {
        document.querySelectorAll('.kebab-dropdown').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    });

    // Like functionality
    document.querySelectorAll('.stat.likes').forEach(likeBtn => {
        likeBtn.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            toggleLike(key);
        });
    });

    // Comment functionality
    document.querySelectorAll('.stat.comments').forEach(commentBtn => {
        commentBtn.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            toggleComments(key);
        });
    });

    // Block announcement functionality
    document.querySelectorAll('.block-announcement').forEach(blockBtn => {
        blockBtn.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            blockAnnouncement(key);
        });
    });

    // View tracking for post clicks (excluding interactive elements)
    document.querySelectorAll('.post').forEach(post => {
        post.addEventListener('click', (e) => {
            // Don't track views when clicking on interactive elements
            if (!e.target.closest('.kebab-menu') &&
                !e.target.closest('.stat') &&
                !e.target.closest('.comments-section') &&
                !e.target.closest('.post-image')) {
                const key = post.getAttribute('data-announcement-key');
                trackPostView(key);
            }
        });
    });

    // Edit announcement
    document.querySelectorAll('.edit-announcement').forEach(editBtn => {
        editBtn.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            editAnnouncement(key);
        });
    });

    // Delete announcement
    document.querySelectorAll('.delete-announcement').forEach(deleteBtn => {
        deleteBtn.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            deleteAnnouncement(key);
        });
    });

    // Submit comment
    document.querySelectorAll('.submit-comment').forEach(button => {
        button.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            addComment(key);
        });
    });
}

// Toggle like on announcement
function toggleLike(announcementKey) {
    const announcementRef = database.ref('announcements/' + announcementKey);
    const currentUserId = localStorage.getItem('adminId');

    announcementRef.once('value').then((snapshot) => {
        const announcement = snapshot.val();
        if (!announcement) return;

        const likedBy = announcement.likedBy || {};
        const isLiked = likedBy[currentUserId];
        let newLikes = announcement.likes || 0;

        if (isLiked) {
            // Unlike
            delete likedBy[currentUserId];
            newLikes = Math.max(0, newLikes - 1);
        } else {
            // Like
            likedBy[currentUserId] = true;
            newLikes += 1;
        }

        // Update the database
        announcementRef.update({
            likes: newLikes,
            likedBy: likedBy
        }).then(() => {
            // Update the like count display
            const likeCountElement = document.querySelector(`.post[data-announcement-key="${announcementKey}"] .like-count`);
            if (likeCountElement) {
                likeCountElement.textContent = newLikes;
            }
        });
    });
}

// Toggle comments section
function toggleComments(announcementKey) {
    const commentsSection = document.getElementById(`comments-${announcementKey}`);
    commentsSection.classList.toggle('show');

    // Load comments if showing
    if (commentsSection.classList.contains('show')) {
        loadComments(announcementKey);
    }
}

// Load comments for an announcement
function loadComments(announcementKey) {
    const announcementRef = database.ref('announcements/' + announcementKey + '/commentsList');

    announcementRef.on('value', (snapshot) => {
        const commentsList = document.getElementById(`comments-list-${announcementKey}`);
        commentsList.innerHTML = '';

        const comments = snapshot.val();
        if (comments) {
            Object.keys(comments).forEach(commentId => {
                const comment = comments[commentId];
                const commentElement = document.createElement('div');
                commentElement.className = 'comment';
                commentElement.innerHTML = `
                            <div class="comment-author">${comment.authorName}</div>
                            <div class="comment-text">${comment.text}</div>
                        `;
                commentsList.appendChild(commentElement);
            });
        }
    });
}

// Add comment to announcement
function addComment(announcementKey) {
    const commentInput = document.getElementById(`comment-input-${announcementKey}`);
    const commentText = commentInput.value.trim();

    if (!commentText) return;

    const currentUserId = localStorage.getItem('adminId');
    const currentUserName = localStorage.getItem('adminFullname') || localStorage.getItem('adminUsername') || 'Admin';

    const announcementRef = database.ref('announcements/' + announcementKey);

    announcementRef.once('value').then((snapshot) => {
        const announcement = snapshot.val();
        if (!announcement) return;

        const commentsList = announcement.commentsList || {};
        const commentId = `comment_${Date.now()}`;

        commentsList[commentId] = {
            text: commentText,
            authorId: currentUserId,
            authorName: currentUserName,
            timestamp: new Date().toISOString()
        };

        const commentCount = Object.keys(commentsList).length;

        // Update the database
        announcementRef.update({
            commentsList: commentsList,
            comments: commentCount
        }).then(() => {
            commentInput.value = '';
            // Update the comment count display
            const commentCountElement = document.querySelector(`.post[data-announcement-key="${announcementKey}"] .comment-count`);
            if (commentCountElement) {
                commentCountElement.textContent = commentCount;
            }
        });
    });
}

// Edit announcement
function editAnnouncement(announcementKey) {
    const announcementRef = database.ref('announcements/' + announcementKey);

    announcementRef.once('value').then((snapshot) => {
        const announcement = snapshot.val();
        if (!announcement) return;

        // For now, we'll just show a simple edit prompt
        const newText = prompt('Edit your announcement:', announcement.text);
        if (newText !== null) {
            announcementRef.update({
                text: newText,
                updatedAt: new Date().toISOString()
            }).then(() => {
                alert('Announcement updated successfully!');
                // Reload announcements to reflect changes
                loadAnnouncements();
            });
        }
    });
}

// Delete announcement
function deleteAnnouncement(announcementKey) {
    if (confirm('Are you sure you want to delete this announcement?')) {
        const announcementRef = database.ref('announcements/' + announcementKey);
        announcementRef.remove()
            .then(() => {
                alert('Announcement deleted successfully!');
            })
            .catch(error => {
                console.error('Error deleting announcement:', error);
                alert('Error deleting announcement: ' + error.message);
            });
    }
}

// Load events from Firebase
function loadEvents() {
    const eventsRef = database.ref('events');

    eventsRef.on('value', (snapshot) => {
        const events = [];
        snapshot.forEach((childSnapshot) => {
            events.push({
                ...childSnapshot.val(),
                key: childSnapshot.key
            });
        });

        // Sort by date (soonest first)
        events.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
        displayEvents(events);
    });
}

// Display events
function displayEvents(events) {
    const desktopEventsList = document.getElementById('desktopEventsList');
    const mobileEventsList = document.getElementById('mobileEventsList');

    // Filter out past events
    const now = new Date();
    const upcomingEvents = events.filter(event => {
        const eventDateTime = new Date(event.date + 'T' + event.time);
        return eventDateTime >= now;
    });

    if (upcomingEvents.length === 0) {
        desktopEventsList.innerHTML = '<p style="color: var(--text-light); text-align: center;">No upcoming events</p>';
        mobileEventsList.innerHTML = '<p style="color: var(--text-light); text-align: center;">No upcoming events</p>';
        return;
    }

    desktopEventsList.innerHTML = '';
    mobileEventsList.innerHTML = '';

    const currentUserId = localStorage.getItem('adminId');

    upcomingEvents.forEach(event => {
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const displayTime = event.formattedTime ||
            new Date('1970-01-01T' + event.time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            });

        const isEventCreator = event.createdBy === currentUserId;

        let eventHTML = `
                    <div class="upcoming-event" data-event-key="${event.key}">
                        <h4>${event.title}</h4>
                        <p><i class="far fa-calendar"></i> ${formattedDate} • ${displayTime}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                `;

        if (event.participant) {
            eventHTML += `<p><i class="fas fa-users"></i> ${event.participant}</p>`;
        }

        eventHTML += `<p><small>Created by: ${event.createdByName}</small></p>`;

        // Add edit/delete buttons for event creator
        if (isEventCreator) {
            eventHTML += `
                        <div style="margin-top: 10px; display: flex; gap: 8px;">
                            <button class="edit-event" data-key="${event.key}" style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="delete-event" data-key="${event.key}" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    `;
        }

        eventHTML += `</div>`;

        desktopEventsList.innerHTML += eventHTML;
        mobileEventsList.innerHTML += eventHTML;
    });

    // Add event listeners
    addEventEventListeners();
}

// Add event listeners to events
function addEventEventListeners() {
    // Edit event
    document.querySelectorAll('.edit-event').forEach(editBtn => {
        editBtn.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            editEvent(key);
        });
    });

    // Delete event
    document.querySelectorAll('.delete-event').forEach(deleteBtn => {
        deleteBtn.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            deleteEvent(key);
        });
    });
}

// Edit event
function editEvent(eventKey) {
    const eventRef = database.ref('events/' + eventKey);

    eventRef.once('value').then((snapshot) => {
        const event = snapshot.val();
        if (!event) return;

        // Populate form with event data
        document.getElementById('eventFormTitle').textContent = 'Edit Event';
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventDate').value = event.date;
        document.getElementById('eventTime').value = event.time;
        document.getElementById('eventLocation').value = event.location;
        document.getElementById('eventParticipants').value = event.participant || '';

        // Show update buttons
        document.getElementById('createEventBtn').style.display = 'none';
        document.getElementById('updateEventBtn').style.display = 'block';
        document.getElementById('cancelEditBtn').style.display = 'block';

        // Show form
        document.getElementById('eventForm').style.display = 'block';
        document.getElementById('announcementForm').style.display = 'none';
        document.getElementById('newEventBtn').innerHTML = '<i class="fas fa-times"></i> Cancel';
        document.getElementById('newAnnouncementBtn').style.display = 'none';

        // Show event form fields
        document.querySelectorAll('.event-field').forEach(field => {
            field.style.display = 'block';
        });

        // Set editing key
        editingEventKey = eventKey;
    });
}

// Delete event
function deleteEvent(eventKey) {
    if (confirm('Are you sure you want to delete this event?')) {
        const eventRef = database.ref('events/' + eventKey);
        eventRef.remove()
            .then(() => {
                alert('Event deleted successfully!');
                // Reload events to reflect changes
                loadEvents();
            })
            .catch(error => {
                console.error('Error deleting event:', error);
                alert('Error deleting event: ' + error.message);
            });
    }
}