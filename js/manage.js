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

// Reference to the database
const database = firebase.database();

// Global variables
let allUsers = [];
let uniqueAddresses = [];
let allCaptains = [];
let currentSelectedUser = null;

// Get current admin information
function getCurrentAdmin() {
    const adminId = localStorage.getItem('adminId');
    const adminFullname = localStorage.getItem('adminFullname');
    const adminUsername = localStorage.getItem('adminUsername');

    return {
        id: adminId,
        fullname: adminFullname,
        username: adminUsername,
        timestamp: Date.now()
    };
}

// Check if admin is logged in
function checkAdminSession() {
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
    const expirationTime = localStorage.getItem('adminSessionExpiration');

    if (!isAdminLoggedIn || !expirationTime) {
        return false;
    }

    if (new Date().getTime() > parseInt(expirationTime)) {
        clearAdminSession();
        return false;
    }

    return true;
}

function clearAdminSession() {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminFullname');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminSessionExpiration');
}

function getAvatarInitials(fullname) {
    if (!fullname) return "US";
    const names = fullname.split(' ');
    if (names.length === 1) {
        return names[0].substring(0, 2).toUpperCase();
    } else {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
}

function getAvatarElement(user) {
    if (user.profilePicture) {
        return `<img src="${user.profilePicture}" alt="${user.fullname || 'User'}" class="avatar-image">`;
    } else {
        return getAvatarInitials(user.fullname);
    }
}

function getRoleDisplayName(role) {
    switch (role) {
        case "captain": return "Barangay Captain";
        case "official": return "Barangay Official";
        case "response_team": return "Response Team";
        default: return role;
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case "approved": return "status-approved";
        case "pending": return "status-pending";
        case "blocked": return "status-blocked";
        case "rejected": return "status-rejected";
        default: return "";
    }
}

// Format timestamp to readable date
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Toggle between pending and rejected sections
function toggleSections(showPending) {
    const pendingSection = document.getElementById('pendingSection');
    const rejectedSection = document.getElementById('rejectedSection');
    const pendingToggle = document.getElementById('pendingToggle');
    const rejectedToggle = document.getElementById('rejectedToggle');

    if (showPending) {
        pendingSection.style.display = 'block';
        rejectedSection.style.display = 'none';
        pendingToggle.classList.add('active');
        rejectedToggle.classList.remove('active');
    } else {
        pendingSection.style.display = 'none';
        rejectedSection.style.display = 'block';
        pendingToggle.classList.remove('active');
        rejectedToggle.classList.add('active');
        loadRejectedUsers();
    }
}

// Show full screen image
function showFullScreenImage(user) {
    if (!user.profilePicture) {
        // If no profile picture, don't show anything
        return;
    }

    const modal = document.getElementById('imageModal');
    const image = document.getElementById('fullscreenImage');
    const userName = document.getElementById('imageUserName');
    const userRole = document.getElementById('imageUserRole');

    image.src = user.profilePicture;
    userName.textContent = user.fullname || 'User';
    userRole.textContent = getRoleDisplayName(user.role);

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

// Close full screen image
function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Re-enable scrolling
}

// Extract unique addresses from users
function extractUniqueAddresses(users) {
    const addresses = new Set();

    users.forEach(user => {
        if (user.address && user.address.trim() !== '') {
            addresses.add(user.address);
        }
    });

    return Array.from(addresses).sort();
}

// Populate address filter dropdown
function populateAddressFilter(addresses) {
    const addressFilter = document.getElementById('addressFilter');

    while (addressFilter.options.length > 1) {
        addressFilter.remove(1);
    }

    addresses.forEach(address => {
        const option = document.createElement('option');
        option.value = address;
        option.textContent = address;
        addressFilter.appendChild(option);
    });
}

// Populate captain filter dropdown
function populateCaptainFilter(captains) {
    const captainFilter = document.getElementById('captainFilter');

    while (captainFilter.options.length > 1) {
        captainFilter.remove(1);
    }

    captains.forEach(captain => {
        const option = document.createElement('option');
        option.value = captain.userId;
        option.textContent = `${captain.fullname} - ${captain.address}`;
        captainFilter.appendChild(option);
    });
}

// Show user details modal
function showUserDetails(user) {
    currentSelectedUser = user;
    const modal = document.getElementById('userDetailsModal');
    const content = document.getElementById('userDetailsContent');
    const actions = document.getElementById('modalActions');

    content.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Full Name:</span>
                    <span class="detail-value">${user.fullname || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Username:</span>
                    <span class="detail-value">${user.username || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${user.email || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">${user.phone || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Address:</span>
                    <span class="detail-value">${user.address || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Role:</span>
                    <span class="detail-value">${getRoleDisplayName(user.role)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value"><span class="status-badge ${getStatusBadgeClass(user.status)}">${user.status || 'N/A'}</span></span>
                </div>
                ${user.approvedBy ? `
                <div class="detail-item">
                    <span class="detail-label">Approved By:</span>
                    <span class="detail-value">${user.approvedBy.adminName} on ${formatTimestamp(user.approvedBy.timestamp)}</span>
                </div>
                ` : ''}
                ${user.declinedBy ? `
                <div class="detail-item">
                    <span class="detail-label">Declined By:</span>
                    <span class="detail-value">${user.declinedBy.adminName} on ${formatTimestamp(user.declinedBy.timestamp)}</span>
                </div>
                ` : ''}
                ${user.blockedBy ? `
                <div class="detail-item">
                    <span class="detail-label">Blocked By:</span>
                    <span class="detail-value">${user.blockedBy.adminName} on ${formatTimestamp(user.blockedBy.timestamp)}</span>
                </div>
                ` : ''}
                ${user.unblockedBy ? `
                <div class="detail-item">
                    <span class="detail-label">Unblocked By:</span>
                    <span class="detail-value">${user.unblockedBy.adminName} on ${formatTimestamp(user.unblockedBy.timestamp)}</span>
                </div>
                ` : ''}
                ${user.captain ? `
                <div class="detail-item">
                    <span class="detail-label">Assigned Captain:</span>
                    <span class="detail-value">${user.captain}</span>
                </div>
                ` : ''}
            `;

    actions.innerHTML = '';
    if (user.status === 'blocked') {
        actions.innerHTML = `<button class="unblock-btn" onclick="toggleUserBlock('${user.userId}', '${user.category}', false)"><i class="fas fa-check-circle"></i> Unblock User</button>`;
    } else if (user.status === 'rejected') {
        actions.innerHTML = `
                    <button class="approve-btn" onclick="approveRejectedUser('${user.userId}', '${user.category}')"><i class="fas fa-check"></i> Approve User</button>
                    <button class="block-btn" onclick="toggleUserBlock('${user.userId}', '${user.category}', true)"><i class="fas fa-ban"></i> Block User</button>
                `;
    } else {
        actions.innerHTML = `<button class="block-btn" onclick="toggleUserBlock('${user.userId}', '${user.category}', true)"><i class="fas fa-ban"></i> Block User</button>`;
    }

    modal.style.display = 'flex';
}

// Close user details modal
function closeUserDetails() {
    document.getElementById('userDetailsModal').style.display = 'none';
    currentSelectedUser = null;
}

// Toggle user block status
function toggleUserBlock(userId, category, block) {
    const action = block ? 'block' : 'unblock';
    const status = block ? 'blocked' : 'approved';
    const currentAdmin = getCurrentAdmin();

    if (!confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }

    const updateData = {
        status: status
    };

    if (block) {
        updateData.blockedBy = {
            adminId: currentAdmin.id,
            adminName: currentAdmin.fullname || currentAdmin.username,
            timestamp: currentAdmin.timestamp
        };
        // Clear unblockedBy if exists
        updateData.unblockedBy = null;
    } else {
        updateData.unblockedBy = {
            adminId: currentAdmin.id,
            adminName: currentAdmin.fullname || currentAdmin.username,
            timestamp: currentAdmin.timestamp
        };
        // Clear blockedBy if exists
        updateData.blockedBy = null;
    }

    database.ref(`users/${category}/${userId}`).update(updateData)
        .then(() => {
            alert(`User ${action}ed successfully!`);
            closeUserDetails();
            loadAllUsers();
            loadPendingUsers();
            loadRejectedUsers();
        })
        .catch(error => {
            console.error(`Error ${action}ing user:`, error);
            alert(`Error ${action}ing user. Please try again.`);
        });
}

// Load pending users from Firebase - ONLY barangay_captain and response_team
function loadPendingUsers() {
    if (!checkAdminSession()) {
        window.location.href = "admin-login.html";
        return;
    }

    const pendingContainer = document.getElementById('pendingUsersContainer');
    pendingContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading pending users...</div>';

    database.ref('users').once('value')
        .then(snapshot => {
            const users = snapshot.val();
            let pendingUsers = [];

            for (const category in users) {
                if (users.hasOwnProperty(category)) {
                    // Only include barangay_captain and response_team categories
                    if (category !== 'barangay_captain' && category !== 'response_team') {
                        continue;
                    }

                    const categoryUsers = users[category];

                    for (const userId in categoryUsers) {
                        if (categoryUsers.hasOwnProperty(userId)) {
                            const user = categoryUsers[userId];

                            if (user.status === "pending") {
                                user.category = category;
                                user.userId = userId;
                                pendingUsers.push(user);
                            }
                        }
                    }
                }
            }

            if (pendingUsers.length === 0) {
                pendingContainer.innerHTML = '<div class="no-pending-users">No pending user approvals</div>';
                return;
            }

            let pendingHTML = '';
            pendingUsers.forEach(user => {
                pendingHTML += `
                            <div class="pending-user-card" data-user-id="${user.userId}" data-category="${user.category}">
                                <div class="user-info-header">
                                    <div class="user-avatar" onclick="showFullScreenImage(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                                        ${getAvatarElement(user)}
                                    </div>
                                    <div class="user-main-info">
                                        <div class="user-name">${user.fullname || 'No Name'}</div>
                                        <span class="user-role">${getRoleDisplayName(user.role)}</span>
                                    </div>
                                </div>
                                <div class="user-details">
                                    <div class="detail-row">
                                        <span class="detail-label">Email:</span>
                                        <span class="detail-value">${user.email || 'N/A'}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Phone:</span>
                                        <span class="detail-value">${user.phone || 'N/A'}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Address:</span>
                                        <span class="detail-value">${user.address || 'N/A'}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Status:</span>
                                        <span class="status-badge status-pending">Pending</span>
                                    </div>
                                </div>
                                <div class="approval-actions">
                                    <button class="approve-btn" onclick="approveUser('${user.userId}', '${user.category}')">
                                        <i class="fas fa-check"></i> Approve
                                    </button>
                                    <button class="decline-btn" onclick="declineUser('${user.userId}', '${user.category}')">
                                        <i class="fas fa-times"></i> Decline
                                    </button>
                                </div>
                            </div>
                        `;
            });

            pendingContainer.innerHTML = pendingHTML;
        })
        .catch(error => {
            console.error("Error loading pending users:", error);
            pendingContainer.innerHTML = '<div class="error-message">Error loading pending users. Please try again.</div>';
        });
}

// Load rejected users from Firebase
function loadRejectedUsers() {
    if (!checkAdminSession()) {
        window.location.href = "admin-login.html";
        return;
    }

    const rejectedContainer = document.getElementById('rejectedUsersContainer');
    rejectedContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading rejected users...</div>';

    database.ref('users').once('value')
        .then(snapshot => {
            const users = snapshot.val();
            let rejectedUsers = [];

            for (const category in users) {
                if (users.hasOwnProperty(category)) {
                    // Only include barangay_captain and response_team categories
                    if (category !== 'barangay_captain' && category !== 'response_team') {
                        continue;
                    }

                    const categoryUsers = users[category];

                    for (const userId in categoryUsers) {
                        if (categoryUsers.hasOwnProperty(userId)) {
                            const user = categoryUsers[userId];

                            if (user.status === "rejected") {
                                user.category = category;
                                user.userId = userId;
                                rejectedUsers.push(user);
                            }
                        }
                    }
                }
            }

            if (rejectedUsers.length === 0) {
                rejectedContainer.innerHTML = '<div class="no-pending-users">No rejected users</div>';
                return;
            }

            let rejectedHTML = '';
            rejectedUsers.forEach(user => {
                rejectedHTML += `
                            <div class="rejected-user-card" data-user-id="${user.userId}" data-category="${user.category}">
                                <div class="user-info-header">
                                    <div class="user-avatar" onclick="showFullScreenImage(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                                        ${getAvatarElement(user)}
                                    </div>
                                    <div class="user-main-info">
                                        <div class="user-name">${user.fullname || 'No Name'}</div>
                                        <span class="user-role">${getRoleDisplayName(user.role)}</span>
                                    </div>
                                </div>
                                <div class="user-details">
                                    <div class="detail-row">
                                        <span class="detail-label">Email:</span>
                                        <span class="detail-value">${user.email || 'N/A'}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Phone:</span>
                                        <span class="detail-value">${user.phone || 'N/A'}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Address:</span>
                                        <span class="detail-value">${user.address || 'N/A'}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">Status:</span>
                                        <span class="status-badge status-rejected">Rejected</span>
                                    </div>
                                    ${user.declinedBy ? `
                                    <div class="detail-row">
                                        <span class="detail-label">Rejected By:</span>
                                        <span class="detail-value">${user.declinedBy.adminName} on ${formatTimestamp(user.declinedBy.timestamp)}</span>
                                    </div>
                                    ` : ''}
                                </div>
                                <div class="approval-actions">
                                    <button class="approve-btn" onclick="approveRejectedUser('${user.userId}', '${user.category}')">
                                        <i class="fas fa-check"></i> Approve
                                    </button>
                                    <button class="view-btn" onclick="showUserDetails(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                                        <i class="fas fa-eye"></i> View Details
                                    </button>
                                </div>
                            </div>
                        `;
            });

            rejectedContainer.innerHTML = rejectedHTML;
        })
        .catch(error => {
            console.error("Error loading rejected users:", error);
            rejectedContainer.innerHTML = '<div class="error-message">Error loading rejected users. Please try again.</div>';
        });
}

// Function to approve a user
function approveUser(userId, category) {
    const currentAdmin = getCurrentAdmin();

    if (!confirm("Are you sure you want to approve this user?")) {
        return;
    }

    const updateData = {
        status: "approved",
        approvedBy: {
            adminId: currentAdmin.id,
            adminName: currentAdmin.fullname || currentAdmin.username,
            timestamp: currentAdmin.timestamp
        }
    };

    database.ref(`users/${category}/${userId}`).update(updateData)
        .then(() => {
            alert("User approved successfully!");
            const userCard = document.querySelector(`.pending-user-card[data-user-id="${userId}"][data-category="${category}"]`);
            if (userCard) {
                userCard.style.transform = 'scale(0.95)';
                userCard.style.opacity = '0';
                setTimeout(() => {
                    userCard.remove();
                    if (document.querySelectorAll('.pending-user-card').length === 0) {
                        document.getElementById('pendingUsersContainer').innerHTML = '<div class="no-pending-users">No pending user approvals</div>';
                    }
                }, 300);
            }
            loadAllUsers();
        })
        .catch(error => {
            console.error("Error approving user:", error);
            alert("Error approving user. Please try again.");
        });
}

// Function to approve a rejected user
function approveRejectedUser(userId, category) {
    const currentAdmin = getCurrentAdmin();

    if (!confirm("Are you sure you want to approve this rejected user?")) {
        return;
    }

    const updateData = {
        status: "approved",
        approvedBy: {
            adminId: currentAdmin.id,
            adminName: currentAdmin.fullname || currentAdmin.username,
            timestamp: currentAdmin.timestamp
        }
    };

    database.ref(`users/${category}/${userId}`).update(updateData)
        .then(() => {
            alert("User approved successfully!");
            const userCard = document.querySelector(`.rejected-user-card[data-user-id="${userId}"][data-category="${category}"]`);
            if (userCard) {
                userCard.style.transform = 'scale(0.95)';
                userCard.style.opacity = '0';
                setTimeout(() => {
                    userCard.remove();
                    if (document.querySelectorAll('.rejected-user-card').length === 0) {
                        document.getElementById('rejectedUsersContainer').innerHTML = '<div class="no-pending-users">No rejected users</div>';
                    }
                }, 300);
            }
            loadAllUsers();
            loadPendingUsers();
        })
        .catch(error => {
            console.error("Error approving user:", error);
            alert("Error approving user. Please try again.");
        });
}

// Function to decline a user
function declineUser(userId, category) {
    const currentAdmin = getCurrentAdmin();

    if (!confirm("Are you sure you want to decline this user?")) {
        return;
    }

    const updateData = {
        status: "rejected",
        declinedBy: {
            adminId: currentAdmin.id,
            adminName: currentAdmin.fullname || currentAdmin.username,
            timestamp: currentAdmin.timestamp
        }
    };

    database.ref(`users/${category}/${userId}`).update(updateData)
        .then(() => {
            alert("User declined successfully!");
            const userCard = document.querySelector(`.pending-user-card[data-user-id="${userId}"][data-category="${category}"]`);
            if (userCard) {
                userCard.style.transform = 'scale(0.95)';
                userCard.style.opacity = '0';
                setTimeout(() => {
                    userCard.remove();
                    if (document.querySelectorAll('.pending-user-card').length === 0) {
                        document.getElementById('pendingUsersContainer').innerHTML = '<div class="no-pending-users">No pending user approvals</div>';
                    }
                }, 300);
            }
            loadAllUsers();
            loadRejectedUsers();
        })
        .catch(error => {
            console.error("Error declining user:", error);
            alert("Error declining user. Please try again.");
        });
}

// Function to load all users for the tables
function loadAllUsers() {
    database.ref('users').once('value')
        .then(snapshot => {
            const users = snapshot.val();
            allUsers = [];

            for (const category in users) {
                if (users.hasOwnProperty(category)) {
                    const categoryUsers = users[category];

                    for (const userId in categoryUsers) {
                        if (categoryUsers.hasOwnProperty(userId)) {
                            const user = categoryUsers[userId];
                            user.category = category;
                            user.userId = userId;
                            allUsers.push(user);
                        }
                    }
                }
            }

            // Extract unique addresses and populate filter
            uniqueAddresses = extractUniqueAddresses(allUsers);
            populateAddressFilter(uniqueAddresses);

            // Extract all captains for the captain filter
            allCaptains = allUsers.filter(user => user.category === 'barangay_captain' && user.status === 'approved');
            populateCaptainFilter(allCaptains);

            applyFilters();
        })
        .catch(error => {
            console.error("Error loading all users:", error);
        });
}

// Function to apply all filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const addressFilter = document.getElementById('addressFilter').value;
    const captainFilter = document.getElementById('captainFilter').value;

    let filteredUsers = allUsers;

    if (statusFilter !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.status === statusFilter);
    }

    if (addressFilter !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.address === addressFilter);
    }

    // Separate users by role
    const responseTeamUsers = filteredUsers.filter(user => user.category === 'response_team');
    let captainUsers = filteredUsers.filter(user => user.category === 'barangay_captain');
    const officialUsers = filteredUsers.filter(user => user.category === 'barangay_official');

    // Apply captain filter to officials
    let filteredOfficials = officialUsers;
    if (captainFilter !== 'all') {
        // Find the selected captain
        const selectedCaptain = allCaptains.find(captain => captain.userId === captainFilter);
        if (selectedCaptain) {
            // Filter officials by the captain's address
            filteredOfficials = officialUsers.filter(official =>
                official.address === selectedCaptain.address
            );
            // Only show the selected captain
            captainUsers = captainUsers.filter(captain => captain.userId === captainFilter);
        }
    }

    // Populate hierarchical structure
    populateHierarchicalStructure(captainUsers, filteredOfficials);

    // Populate response team table
    populateResponseTeamTable(responseTeamUsers);
}

// Populate hierarchical structure with captains and their officials
function populateHierarchicalStructure(captainUsers, officialUsers) {
    const container = document.getElementById('hierarchicalContainer');

    if (captainUsers.length === 0 && officialUsers.length === 0) {
        container.innerHTML = '<div class="no-data">No users found</div>';
        return;
    }

    let html = '';

    // Group officials by address (which should match their captain's address)
    const officialsByAddress = {};
    officialUsers.forEach(official => {
        if (!officialsByAddress[official.address]) {
            officialsByAddress[official.address] = [];
        }
        officialsByAddress[official.address].push(official);
    });

    // Create captain groups
    captainUsers.forEach(captain => {
        const captainOfficials = officialsByAddress[captain.address] || [];

        html += `
                    <div class="captain-group" data-captain-id="${captain.userId}">
                        <div class="captain-header">
                            <div class="captain-info">
                                <div class="captain-avatar" onclick="showFullScreenImage(${JSON.stringify(captain).replace(/"/g, '&quot;')})">
                                    ${getAvatarElement(captain)}
                                </div>
                                <div class="captain-details">
                                    <div class="captain-name">${captain.fullname || 'N/A'}
                                        ${captain.approvedBy ? `<span class="approved-by-tag">Approved by ${captain.approvedBy.adminName}</span>` : ''}
                                    </div>
                                    <div class="captain-address">${captain.role || 'N/A'}</div>
                                </div>
                            </div>
                            <div class="captain-actions">
                                <button class="view-btn" onclick="showUserDetails(${JSON.stringify(captain).replace(/"/g, '&quot;')})">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                ${captain.status === 'blocked' ? `
                                    <button class="unblock-btn" onclick="toggleUserBlock('${captain.userId}', '${captain.category}', false)">
                                        <i class="fas fa-check-circle"></i> Unblock
                                        ${captain.blockedBy ? `<span class="admin-action-tag">by ${captain.blockedBy.adminName}</span>` : ''}
                                    </button>
                                ` : `
                                    <button class="block-btn" onclick="toggleUserBlock('${captain.userId}', '${captain.category}', true)">
                                        <i class="fas fa-ban"></i> Block
                                    </button>
                                `}
                            </div>
                        </div>
                        <div class="officials-section">
                            <div class="officials-title">
                                <i class="fas fa-users"></i> Barangay Officials
                            </div>
                            <div class="officials-list">
                `;

        if (captainOfficials.length === 0) {
            html += `<div class="no-data" style="margin-left: 20px;">No officials assigned</div>`;
        } else {
            captainOfficials.forEach((official, index) => {
                html += `
                            <div class="official-item">
                                <div class="official-info">
                                    <div class="official-avatar" onclick="showFullScreenImage(${JSON.stringify(official).replace(/"/g, '&quot;')})">
                                        ${getAvatarElement(official)}
                                    </div>
                                    <div class="official-details">
                                        <div class="official-name">${official.fullname || 'N/A'}</div>
                                        <div class="official-role">
                                            ${getRoleDisplayName(official.role)} 
                                            <span class="status-badge ${getStatusBadgeClass(official.status)}">${official.status || 'N/A'}</span>
                                            ${official.approvedBy ? `<div class="admin-action-info">Approved by ${official.approvedBy.adminName}</div>` : ''}
                                            ${official.blockedBy ? `<div class="admin-action-info">Blocked by ${official.blockedBy.adminName}</div>` : ''}
                                            ${official.unblockedBy ? `<div class="admin-action-info">Unblocked by ${official.unblockedBy.adminName}</div>` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="action-buttons">
                                    <button class="view-btn" onclick="showUserDetails(${JSON.stringify(official).replace(/"/g, '&quot;')})">
                                        <i class="fas fa-eye"></i> View
                                    </button>
                                    ${official.status === 'blocked' ? `
                                        <button class="unblock-btn" onclick="toggleUserBlock('${official.userId}', '${official.category}', false)">
                                            <i class="fas fa-check-circle"></i> Unblock
                                            ${official.blockedBy ? `<span class="admin-action-tag">by ${official.blockedBy.adminName}</span>` : ''}
                                        </button>
                                    ` : `
                                        <button class="block-btn" onclick="toggleUserBlock('${official.userId}', '${official.category}', true)">
                                            <i class="fas fa-ban"></i> Block
                                        </button>
                                    `}
                                </div>
                            </div>
                        `;
            });
        }

        html += `
                            </div>
                        </div>
                    </div>
                `;
    });

    // Add officials without captains (if any) - but only if no captain filter is applied
    const captainFilter = document.getElementById('captainFilter').value;
    if (captainFilter === 'all') {
        const officialsWithoutCaptains = officialUsers.filter(official =>
            !captainUsers.some(captain => captain.address === official.address)
        );

        if (officialsWithoutCaptains.length > 0) {
            html += `
                        <div class="captain-group">
                            <div class="captain-header">
                                <div class="captain-info">
                                    <div class="captain-avatar">NA</div>
                                    <div class="captain-details">
                                        <div class="captain-name">Unassigned Officials</div>
                                        <div class="captain-address">No Captain Assigned</div>
                                    </div>
                                </div>
                            </div>
                            <div class="officials-section">
                                <div class="officials-title">
                                    <i class="fas fa-users"></i> Barangay Officials
                                </div>
                                <div class="officials-list">
                    `;

            officialsWithoutCaptains.forEach(official => {
                html += `
                            <div class="official-item">
                                <div class="official-info">
                                    <div class="official-avatar" onclick="showFullScreenImage(${JSON.stringify(official).replace(/"/g, '&quot;')})">
                                        ${getAvatarElement(official)}
                                    </div>
                                    <div class="official-details">
                                        <div class="official-name">${official.fullname || 'N/A'}</div>
                                        <div class="official-role">
                                            ${getRoleDisplayName(official.role)} 
                                            <span class="status-badge ${getStatusBadgeClass(official.status)}">${official.status || 'N/A'}</span>
                                            ${official.approvedBy ? `<div class="admin-action-info">Approved by ${official.approvedBy.adminName}</div>` : ''}
                                            ${official.blockedBy ? `<div class="admin-action-info">Blocked by ${official.blockedBy.adminName}</div>` : ''}
                                            ${official.unblockedBy ? `<div class="admin-action-info">Unblocked by ${official.unblockedBy.adminName}</div>` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="action-buttons">
                                    <button class="view-btn" onclick="showUserDetails(${JSON.stringify(official).replace(/"/g, '&quot;')})">
                                        <i class="fas fa-eye"></i> View
                                    </button>
                                    ${official.status === 'blocked' ? `
                                        <button class="unblock-btn" onclick="toggleUserBlock('${official.userId}', '${official.category}', false)">
                                            <i class="fas fa-check-circle"></i> Unblock
                                            ${official.blockedBy ? `<span class="admin-action-tag">by ${official.blockedBy.adminName}</span>` : ''}
                                        </button>
                                    ` : `
                                        <button class="block-btn" onclick="toggleUserBlock('${official.userId}', '${official.category}', true)">
                                            <i class="fas fa-ban"></i> Block
                                        </button>
                                    `}
                                </div>
                            </div>
                        `;
            });

            html += `
                                </div>
                            </div>
                        </div>
                    `;
        }
    }

    container.innerHTML = html;
}

// Filter hierarchical structure based on search input
function filterHierarchicalStructure(searchText) {
    const container = document.getElementById('hierarchicalContainer');
    const captainGroups = container.querySelectorAll('.captain-group');
    const searchLower = searchText.toLowerCase();

    captainGroups.forEach(group => {
        const captainName = group.querySelector('.captain-name').textContent.toLowerCase();
        const captainAddress = group.querySelector('.captain-address').textContent.toLowerCase();
        const officialItems = group.querySelectorAll('.official-item');

        let captainMatches = captainName.includes(searchLower) || captainAddress.includes(searchLower);
        let anyOfficialMatches = false;

        officialItems.forEach(item => {
            const officialName = item.querySelector('.official-name').textContent.toLowerCase();
            const matches = officialName.includes(searchLower);
            item.style.display = matches ? '' : 'none';
            if (matches) anyOfficialMatches = true;
        });

        // Show group if captain matches or any official matches
        group.style.display = (captainMatches || anyOfficialMatches) ? '' : 'none';
    });
}

// Populate response team table
function populateResponseTeamTable(responseTeamUsers) {
    const tableBody = document.querySelector('#responseTeamTable tbody');
    tableBody.innerHTML = '';

    if (responseTeamUsers.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" class="no-data">No response team members found</td>`;
        tableBody.appendChild(row);
        return;
    }

    responseTeamUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
                    <td>
                        <div class="user-info-cell">
                            <div class="user-avatar-small" onclick="showFullScreenImage(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                                ${getAvatarElement(user)}
                            </div>
                            <div class="user-name-role">
                                <div class="user-display-name">${user.fullname || 'N/A'}</div>
                                <div class="user-display-role">${getRoleDisplayName(user.role)}</div>
                                ${user.approvedBy ? `<div class="admin-action-info">Approved by ${user.approvedBy.adminName}</div>` : ''}
                                ${user.blockedBy ? `<div class="admin-action-info">Blocked by ${user.blockedBy.adminName}</div>` : ''}
                                ${user.unblockedBy ? `<div class="admin-action-info">Unblocked by ${user.unblockedBy.adminName}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>${user.address || 'N/A'}</td>
                    <td><span class="status-badge ${getStatusBadgeClass(user.status)}">${user.status || 'N/A'}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="view-btn" onclick="showUserDetails(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                                <i class="fas fa-eye"></i> View
                            </button>
                            ${user.status === 'blocked' ? `
                                <button class="unblock-btn" onclick="toggleUserBlock('${user.userId}', '${user.category}', false)">
                                    <i class="fas fa-check-circle"></i> Unblock
                                    ${user.blockedBy ? `<span class="admin-action-tag">by ${user.blockedBy.adminName}</span>` : ''}
                                </button>
                            ` : `
                                <button class="block-btn" onclick="toggleUserBlock('${user.userId}', '${user.category}', true)">
                                    <i class="fas fa-ban"></i> Block
                                </button>
                            `}
                        </div>
                    </td>
                `;
        tableBody.appendChild(row);
    });
}

// Function to filter table based on search input
function filterTable(tableId, searchText) {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('tbody tr');
    const searchLower = searchText.toLowerCase();

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let found = false;

        cells.forEach(cell => {
            if (cell.textContent.toLowerCase().includes(searchLower)) {
                found = true;
            }
        });

        row.style.display = found ? '' : 'none';
    });
}

// Function to handle status filter change
function handleStatusFilter() {
    applyFilters();
}

// Function to handle address filter change
function handleAddressFilter() {
    applyFilters();
}

// Function to handle captain filter change
function handleCaptainFilter() {
    applyFilters();
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    if (!checkAdminSession()) {
        window.location.href = "login.html";
        return;
    }

    loadPendingUsers();
    loadAllUsers();

    // Set up section toggle buttons
    document.getElementById('pendingToggle').addEventListener('click', () => toggleSections(true));
    document.getElementById('rejectedToggle').addEventListener('click', () => toggleSections(false));

    document.getElementById('statusFilter').addEventListener('change', handleStatusFilter);
    document.getElementById('addressFilter').addEventListener('change', handleAddressFilter);
    document.getElementById('captainFilter').addEventListener('change', handleCaptainFilter);

    const menuToggle = document.getElementById('menuToggle');
    const navbar = document.getElementById('navbar');
    if (menuToggle && navbar) {
        menuToggle.addEventListener('click', () => {
            navbar.classList.toggle('active');
        });
    }

    // Close modals when clicking outside
    document.getElementById('userDetailsModal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeUserDetails();
        }
    });

    document.getElementById('imageModal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeImageModal();
        }
    });

    // Close image modal with Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeImageModal();
        }
    });
});