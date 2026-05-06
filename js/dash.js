
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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

// Helper function to check if date is today - IMPROVED VERSION
function isToday(date) {
    if (!date) return false;

    try {
        // Handle different date formats
        let checkDate;
        if (typeof date === 'string') {
            // Try to parse as ISO string or timestamp
            checkDate = new Date(date);
        } else if (typeof date === 'number') {
            // Assume it's a timestamp
            checkDate = new Date(date);
        } else {
            console.log('Unknown date format:', date);
            return false;
        }

        // Check if the date is valid
        if (isNaN(checkDate.getTime())) {
            console.log('Invalid date:', date);
            return false;
        }

        const today = new Date();

        return checkDate.getDate() === today.getDate() &&
            checkDate.getMonth() === today.getMonth() &&
            checkDate.getFullYear() === today.getFullYear();
    } catch (error) {
        console.error('Error checking if date is today:', error, date);
        return false;
    }
}

// Helper function to check if date is within today (for reports) - IMPROVED VERSION
function isTodayTimestamp(timestamp) {
    if (!timestamp) return false;

    try {
        const today = new Date();
        const checkDate = new Date(timestamp);

        if (isNaN(checkDate.getTime())) {
            console.log('Invalid timestamp:', timestamp);
            return false;
        }

        return checkDate.getDate() === today.getDate() &&
            checkDate.getMonth() === today.getMonth() &&
            checkDate.getFullYear() === today.getFullYear();
    } catch (error) {
        console.error('Error checking if timestamp is today:', error, timestamp);
        return false;
    }
}

// Global variables for quick upload
let selectedUploadFiles = [];
let currentGalleryImages = [];
let currentGalleryIndex = 0;

// Load statistics from Firebase - FIXED VERSION
function loadStatisticsFromFirebase() {
    console.log('Loading statistics from Firebase...');

    // Load total users (Barangay Captain, Barangay Officials, and Response Team - approved)
    const barangayCaptainRef = database.ref('users/barangay_captain');
    const barangayOfficialRef = database.ref('users/barangay_official');
    const responseTeamRef = database.ref('users/response_team');

    Promise.all([
        new Promise((resolve) => barangayCaptainRef.once('value', resolve)),
        new Promise((resolve) => barangayOfficialRef.once('value', resolve)),
        new Promise((resolve) => responseTeamRef.once('value', resolve))
    ]).then(([captainSnapshot, officialSnapshot, responseSnapshot]) => {
        const captains = captainSnapshot.val();
        const officials = officialSnapshot.val();
        const responseTeam = responseSnapshot.val();

        let totalUsers = 0;
        let todayUsers = 0;

        // Count approved barangay captains
        if (captains) {
            Object.values(captains).forEach(user => {
                if (user.status === 'approved') {
                    totalUsers++;

                    // Check if user was approved today - FIXED LOGIC
                    if (user.approvedAt && isToday(user.approvedAt)) {
                        todayUsers++;
                    } else if (user.lastUpdated && isToday(user.lastUpdated) && user.status === 'approved') {
                        todayUsers++;
                    } else if (user.createdAt && isToday(user.createdAt) && user.status === 'approved') {
                        todayUsers++;
                    }
                }
            });
        }

        // Count approved barangay officials
        if (officials) {
            Object.values(officials).forEach(user => {
                if (user.status === 'approved') {
                    totalUsers++;

                    // Check if user was approved today - FIXED LOGIC
                    if (user.approvedAt && isToday(user.approvedAt)) {
                        todayUsers++;
                    } else if (user.lastUpdated && isToday(user.lastUpdated) && user.status === 'approved') {
                        todayUsers++;
                    } else if (user.createdAt && isToday(user.createdAt) && user.status === 'approved') {
                        todayUsers++;
                    }
                }
            });
        }

        // Count approved response team members
        if (responseTeam) {
            Object.values(responseTeam).forEach(user => {
                if (user.status === 'approved') {
                    totalUsers++;

                    // Check if user was approved today - FIXED LOGIC
                    if (user.approvedAt && isToday(user.approvedAt)) {
                        todayUsers++;
                    } else if (user.lastUpdated && isToday(user.lastUpdated) && user.status === 'approved') {
                        todayUsers++;
                    } else if (user.createdAt && isToday(user.createdAt) && user.status === 'approved') {
                        todayUsers++;
                    }
                }
            });
        }

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalUsersToday').textContent = `+${todayUsers} Today`;
    }).catch(error => {
        console.error('Error loading users:', error);
        document.getElementById('totalUsers').textContent = '0';
        document.getElementById('totalUsersToday').textContent = '+0 Today';
    });

    // Load response team statistics
    loadResponseTeamStats();

    // Load incidents statistics
    loadIncidentsStats();

    // Load mapping success statistics
    loadMappingSuccess();
}

// Load response team statistics - FIXED VERSION
function loadResponseTeamStats() {
    const responseTeamRef = database.ref('users/response_team');
    responseTeamRef.once('value').then((snapshot) => {
        const responseTeam = snapshot.val();
        let totalResponseTeam = 0;
        let todayResponseTeam = 0;

        if (responseTeam) {
            Object.values(responseTeam).forEach(member => {
                if (member.status === 'approved') {
                    totalResponseTeam++;

                    // Check if member was approved today - FIXED LOGIC
                    if (member.approvedAt && isToday(member.approvedAt)) {
                        todayResponseTeam++;
                    } else if (member.lastUpdated && isToday(member.lastUpdated) && member.status === 'approved') {
                        todayResponseTeam++;
                    } else if (member.createdAt && isToday(member.createdAt) && member.status === 'approved') {
                        todayResponseTeam++;
                    }
                }
            });
        }

        document.getElementById('responseTeam').textContent = totalResponseTeam;
        document.getElementById('responseTeamToday').textContent = `+${todayResponseTeam} Today`;
    }).catch((error) => {
        console.error('Error loading response team stats:', error);
        document.getElementById('responseTeam').textContent = '0';
        document.getElementById('responseTeamToday').textContent = '+0 Today';
    });
}

// Load incidents statistics
function loadIncidentsStats() {
    const reportsRef = database.ref('reports');
    reportsRef.on('value', (snapshot) => {
        const reports = snapshot.val();
        let totalIncidents = 0;
        let todayIncidents = 0;

        if (reports) {
            Object.values(reports).forEach(report => {
                totalIncidents++;

                // Check if incident was reported today
                if (report.createdAt && isTodayTimestamp(report.createdAt)) {
                    todayIncidents++;
                }
            });
        }

        document.getElementById('totalIncidents').textContent = totalIncidents;
        document.getElementById('incidentsToday').textContent = `+${todayIncidents} Today`;
    }, (error) => {
        console.error('Error loading incidents stats:', error);
        document.getElementById('totalIncidents').textContent = '0';
        document.getElementById('incidentsToday').textContent = '+0 Today';
    });
}

// Load mapping success statistics
function loadMappingSuccess() {
    const reportsRef = database.ref('reports');

    reportsRef.on('value', (snapshot) => {
        const reports = snapshot.val();
        let totalReports = 0;
        let mappedReports = 0;

        if (reports) {
            Object.values(reports).forEach(report => {
                totalReports++;

                // Count reports that have been mapped (status is "mapped")
                if (report.status === 'resolved') {
                    mappedReports++;
                }
            });
        }

        const successRate = totalReports > 0 ? Math.round((mappedReports / totalReports) * 100) : 0;
        document.getElementById('mappingSuccess').textContent = mappedReports;
        document.getElementById('successRate').textContent = `${successRate}% Success Rate`;
    }, (error) => {
        console.error('Error loading mapping success:', error);
        document.getElementById('mappingSuccess').textContent = '0';
        document.getElementById('successRate').textContent = '0% Success Rate';
    });
}

// Load recent approved users - limited to 5
function loadRecentApprovedUsers() {
    const barangayCaptainRef = database.ref('users/barangay_captain');
    const barangayOfficialRef = database.ref('users/barangay_official');
    const responseTeamRef = database.ref('users/response_team');

    Promise.all([
        new Promise((resolve) => barangayCaptainRef.once('value', resolve)),
        new Promise((resolve) => barangayOfficialRef.once('value', resolve)),
        new Promise((resolve) => responseTeamRef.once('value', resolve))
    ]).then(([captainSnapshot, officialSnapshot, responseSnapshot]) => {
        const captains = captainSnapshot.val();
        const officials = officialSnapshot.val();
        const responseTeam = responseSnapshot.val();

        const allUsers = [];

        // Add approved barangay captains
        if (captains) {
            Object.values(captains).forEach(user => {
                if (user.status === 'approved') {
                    allUsers.push({
                        ...user,
                        role: 'Barangay Captain',
                        timestamp: user.lastUpdated ? new Date(user.lastUpdated).getTime() : 0
                    });
                }
            });
        }

        // Add approved barangay officials
        if (officials) {
            Object.values(officials).forEach(user => {
                if (user.status === 'approved') {
                    allUsers.push({
                        ...user,
                        role: 'Barangay Official',
                        timestamp: user.lastUpdated ? new Date(user.lastUpdated).getTime() : 0
                    });
                }
            });
        }

        // Add approved response team members
        if (responseTeam) {
            Object.values(responseTeam).forEach(user => {
                if (user.status === 'approved') {
                    allUsers.push({
                        ...user,
                        role: 'Response Team',
                        timestamp: user.lastUpdated ? new Date(user.lastUpdated).getTime() : 0
                    });
                }
            });
        }

        // Sort by timestamp (newest first) and get top 5
        const recentUsers = allUsers
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);

        const recentUsersList = document.getElementById('recentApprovedUsers');
        recentUsersList.innerHTML = '';

        if (recentUsers.length === 0) {
            recentUsersList.innerHTML = '<li>No approved users yet</li>';
            return;
        }

        recentUsers.forEach(user => {
            const userElement = document.createElement('li');
            userElement.innerHTML = `
                        <i class="fas fa-user-circle"></i> ${user.fullname || 'Unknown User'} - ${user.role}
                    `;
            recentUsersList.appendChild(userElement);
        });
    }).catch(error => {
        console.error('Error loading recent users:', error);
        const recentUsersList = document.getElementById('recentApprovedUsers');
        recentUsersList.innerHTML = '<li>Error loading users</li>';
    });
}

// Load notifications from Firebase
function loadNotificationsFromFirebase() {
    const notificationsRef = database.ref('notifications');

    console.log('Loading notifications from Firebase...');

    notificationsRef.orderByChild('timestamp').limitToLast(5).on('value', (snapshot) => {
        const notifications = snapshot.val();
        const notificationsList = document.getElementById('notificationsList');

        // Clear existing notifications
        notificationsList.innerHTML = '';

        if (notifications) {
            // Convert to array and sort by timestamp (newest first)
            const notificationsArray = Object.entries(notifications)
                .map(([id, notification]) => ({ id, ...notification }))
                .sort((a, b) => b.timestamp - a.timestamp);

            console.log(`Found ${notificationsArray.length} notifications`);

            if (notificationsArray.length === 0) {
                notificationsList.innerHTML = `
                            <div class="notification-card">
                                <div class="notification-content">
                                    <h4 class="notification-title">No notifications yet</h4>
                                    <p class="notification-message">When emergency reports are submitted, they will appear here.</p>
                                </div>
                            </div>
                        `;
                return;
            }

            notificationsArray.forEach(notification => {
                const notificationElement = createNotificationElement(notification);
                notificationsList.appendChild(notificationElement);
            });
        } else {
            // Show no notifications message
            console.log('No notifications found in database');
            notificationsList.innerHTML = `
                        <div class="notification-card">
                            <div class="notification-content">
                                <h4 class="notification-title">No notifications yet</h4>
                                <p class="notification-message">When emergency reports are submitted, they will appear here.</p>
                            </div>
                        </div>
                    `;
        }
    }, (error) => {
        console.error('Error loading notifications:', error);
        const notificationsList = document.getElementById('notificationsList');
        notificationsList.innerHTML = `
                    <div class="notification-card">
                        <div class="notification-content">
                            <h4 class="notification-title">Error loading notifications</h4>
                            <p class="notification-message">Please check your connection and try again</p>
                        </div>
                    </div>
                `;
    });
}

// Create notification element
function createNotificationElement(notification) {
    const notificationCard = document.createElement('div');
    const isUnread = notification.status === 'unread';
    notificationCard.className = `notification-card ${isUnread ? 'unread' : ''}`;
    notificationCard.setAttribute('data-notification-id', notification.id);

    // Get appropriate icon based on emergency type
    const iconClass = getNotificationIconClass(notification.type);
    const icon = getNotificationIcon(notification.type);

    notificationCard.innerHTML = `
                <div class="notification-icon ${iconClass}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-content">
                    <h4 class="notification-title">${notification.title || 'New Emergency Report'}</h4>
                    <p class="notification-message">${notification.message || 'Emergency situation reported'}</p>
                    <div class="notification-meta">
                        <span class="notification-time">${formatTime(notification.timestamp)}</span>
                        <div class="notification-actions">
                            <button class="notification-btn view-details" data-report-id="${notification.reportId}">View on Map</button>
                            <button class="notification-btn ${isUnread ? 'mark-read' : 'mark-unread'}" data-notification-id="${notification.id}">
                                ${isUnread ? 'Mark as Read' : 'Mark as Unread'}
                            </button>
                        </div>
                    </div>
                </div>
                ${notification.priority === 'high' ? '<span class="emergency-badge">SOS</span>' : ''}
            `;

    return notificationCard;
}

// Helper functions for notifications
function getNotificationIcon(emergencyType) {
    const icons = {
        fire: 'fa-fire',
        flood: 'fa-water',
        ems: 'fa-ambulance',
        landslide: 'fa-mountain',
        earthquake: 'fa-house-crack',
        storm: 'fa-wave-square'
    };
    return icons[emergencyType] || 'fa-exclamation-triangle';
}

function getNotificationIconClass(emergencyType) {
    return `${emergencyType}-icon` || 'default-icon';
}

function formatTime(timestamp) {
    if (!timestamp) return 'Unknown time';

    const now = new Date().getTime();
    const diff = now - timestamp;

    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diff / 86400000);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

// Mark notification as read/unread
function toggleNotificationStatus(notificationId, currentStatus) {
    const newStatus = currentStatus === 'unread' ? 'read' : 'unread';

    console.log(`Updating notification ${notificationId} to ${newStatus}`);

    database.ref('notifications/' + notificationId + '/status').set(newStatus)
        .then(() => {
            console.log(`Notification ${notificationId} marked as ${newStatus}`);
            // Update the UI immediately
            const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationElement) {
                if (newStatus === 'read') {
                    notificationElement.classList.remove('unread');
                } else {
                    notificationElement.classList.add('unread');
                }

                // Update the button text
                const button = notificationElement.querySelector('.notification-btn.mark-read, .notification-btn.mark-unread');
                if (button) {
                    if (newStatus === 'read') {
                        button.textContent = 'Mark as Unread';
                        button.classList.remove('mark-read');
                        button.classList.add('mark-unread');
                    } else {
                        button.textContent = 'Mark as Read';
                        button.classList.remove('mark-unread');
                        button.classList.add('mark-read');
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error updating notification status:', error);
            alert('Error updating notification status. Please try again.');
        });
}

// View report details
function viewReportDetails(reportId) {
    console.log('Viewing report details for:', reportId);
    // Redirect to interactive map page with report parameter
    window.location.href = `interactivemap.html?report=${reportId}`;
}

// Handle notification actions
function handleNotificationAction(e) {
    if (e.target.classList.contains('mark-read') || e.target.classList.contains('mark-unread')) {
        const notificationId = e.target.getAttribute('data-notification-id');
        const currentStatus = e.target.classList.contains('mark-read') ? 'unread' : 'read';
        toggleNotificationStatus(notificationId, currentStatus);
    }

    if (e.target.classList.contains('view-details')) {
        const reportId = e.target.getAttribute('data-report-id');
        if (reportId && reportId !== 'undefined') {
            viewReportDetails(reportId);
        } else {
            alert('Report details not available for this notification.');
        }
    }
}

// Global variables for map
let map;
let userLocation = null;
let markers = [];
let reports = {};
let currentZoom = 1;
let currentRotation = 0;

// Emergency type colors mapping
const emergencyColors = {
    'landslide': '#8B4513',
    'fire': '#FF4500',
    'earthquake': '#FFA500',
    'flood': '#1E90FF',
    'storm': '#20B2AA',
    'ems': '#32CD32'
};

// Emergency type display names
const emergencyTypeNames = {
    'landslide': 'Landslide',
    'fire': 'Fire',
    'earthquake': 'Earthquake',
    'flood': 'Flood',
    'storm': 'Storm Surge',
    'ems': 'Emergency Medical Services'
};

// Map Functions
// Replace this with your actual Google Maps API key
const API_KEY = "AIzaSyDd2_QgxGXWa4Vs_xKl5cJg6gpZQxC3sNk"; // Make sure to put your actual key between the quotes

// Function to load Google Maps API
function loadGoogleMapsAPI() {
    return new Promise((resolve, reject) => {
        // Check if API is already loaded
        if (window.google && window.google.maps) {
            initMap();
            resolve();
            return;
        }

        // Create script element
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=geometry,places`;
        script.async = true;
        script.defer = true;

        // Handle script load
        script.onload = () => {
            initMap();
            resolve();
        };
        script.onerror = reject;

        // Add script to document
        document.head.appendChild(script);
    });
}

// Initialize map function
function initMap() {
    const defaultLocation = { lat: 7.782395222681719, lng: 122.58682618154891 };

    // Create map
    map = new google.maps.Map(document.getElementById('googleMap'), {
        zoom: 12,
        center: defaultLocation,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_LEFT,
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
        },
        zoomControl: true,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        styles: [
            {
                "featureType": "administrative",
                "elementType": "geometry",
                "stylers": [{ "visibility": "off" }]
            },
            {
                "featureType": "poi",
                "stylers": [{ "visibility": "simplified" }]
            },
            {
                "featureType": "road",
                "elementType": "labels.icon",
                "stylers": [{ "visibility": "off" }]
            },
            {
                "featureType": "transit",
                "stylers": [{ "visibility": "off" }]
            }
        ]
    });

    // Add CSS to ensure map container is visible
    const mapContainer = document.getElementById('googleMap');
    mapContainer.style.width = '100%';
    mapContainer.style.height = '100%';
    mapContainer.style.minHeight = '400px';
    mapContainer.style.borderRadius = '6px';

    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // Center map on user's location
                map.setCenter(userLocation);

                // Add marker for user's location
                new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: 'Your Location',
                    icon: {
                        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    }
                });
            },
            (error) => {
                console.log('Location access denied or unavailable:', error);
                // Center on default location
                map.setCenter(defaultLocation);
            }
        );
    }

    // Load reports from Firebase
    loadReportsFromFirebase();
}

// Function to get marker icon based on emergency type
function getMarkerIcon(emergencyType) {
    const color = emergencyColors[emergencyType] || '#000000';

    // Create a custom pin icon using SVG
    const svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
                    <path fill="${color}" d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25c0-8.284-6.716-15-15-15z"/>
                    <circle cx="15" cy="15" r="8" fill="#ffffff"/>
                </svg>
            `;

    // Convert SVG to data URL
    const svgBlob = new Blob([svgIcon], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return {
        url: svgUrl,
        scaledSize: new google.maps.Size(30, 40),
        anchor: new google.maps.Point(15, 40)
    };
}

// Function to add marker to map
function addMarker(reportData, reportId) {
    const position = {
        lat: parseFloat(reportData.latitude),
        lng: parseFloat(reportData.longitude)
    };

    const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: reportData.title,
        icon: getMarkerIcon(reportData.emergencyType)
    });

    // Add click event to show modal
    marker.addListener('click', () => {
        showReportDetails(reportId);
    });

    markers.push(marker);
    return marker;
}

// Function to load reports from Firebase and add markers
function loadReportsFromFirebase() {
    console.log('Loading reports from Firebase...');

    const reportsRef = database.ref('reports');

    reportsRef.on('value', (snapshot) => {
        // Clear existing markers
        markers.forEach(marker => marker.setMap(null));
        markers = [];

        const reportsData = snapshot.val();
        reports = reportsData || {};

        if (reportsData) {
            console.log(`Found ${Object.keys(reportsData).length} reports`);

            // Process each report
            Object.entries(reportsData).forEach(([reportId, report]) => {
                // Check if report has valid coordinates
                if (report.latitude && report.longitude) {
                    console.log('Adding marker for report:', reportId, report);
                    addMarker(report, reportId);
                } else {
                    console.log('Report missing coordinates:', reportId);
                }
            });
        } else {
            console.log('No reports found in database');
        }
    }, (error) => {
        console.error('Error loading reports:', error);
    });
}

// Show report details in modal
function showReportDetails(reportId) {
    const report = reports[reportId];
    if (!report) return;

    const modal = document.getElementById('reportModal');
    const modalMediaContainer = document.getElementById('modalMediaContainer');
    const modalTitle = document.getElementById('modalTitle');
    const modalType = document.getElementById('modalType');
    const modalStatus = document.getElementById('modalStatus');
    const modalDate = document.getElementById('modalDate');
    const modalTime = document.getElementById('modalTime');
    const modalLat = document.getElementById('modalLat');
    const modalLng = document.getElementById('modalLng');
    const modalReporter = document.getElementById('modalReporter');
    const modalDescription = document.getElementById('modalDescription');

    // Set modal content
    modalTitle.textContent = report.title || 'Emergency Report';
    modalType.textContent = emergencyTypeNames[report.emergencyType] || report.emergencyType || 'Unknown';
    modalStatus.textContent = report.status ? report.status.charAt(0).toUpperCase() + report.status.slice(1) : 'Reported';
    modalDate.textContent = report.date || 'Unknown';
    modalTime.textContent = report.formattedTime || report.time || 'Unknown';
    modalLat.textContent = parseFloat(report.latitude).toFixed(6);
    modalLng.textContent = parseFloat(report.longitude).toFixed(6);
    modalReporter.textContent = report.createdByName || 'Unknown';
    modalDescription.textContent = report.description || 'No description provided';

    // Clear previous media
    modalMediaContainer.innerHTML = '';

    // Set media - handle both single image and multiple images
    const mediaUrls = report.mediaUrls || (report.mediaUrl ? [report.mediaUrl] : []);

    if (mediaUrls.length > 0) {
        if (mediaUrls.length === 1) {
            // Single image
            modalMediaContainer.innerHTML = `<img id="modalMedia" class="modal-media" src="${mediaUrls[0]}" alt="Report Media">`;

            // Add click event to open full screen
            document.getElementById('modalMedia').addEventListener('click', function () {
                document.getElementById('fullscreenMedia').src = mediaUrls[0];
                document.getElementById('fullscreenModal').style.display = 'flex';
                resetFullscreenImage();
            });
        } else {
            // Multiple images - show first image with gallery indicator
            modalMediaContainer.innerHTML = `
                        <img id="modalMedia" class="modal-media" src="${mediaUrls[0]}" alt="Report Media" style="cursor: pointer;">
                        <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 20px; font-size: 0.8rem;">
                            <i class="fas fa-images"></i> ${mediaUrls.length} images
                        </div>
                    `;

            // Add click event to open gallery
            document.getElementById('modalMedia').addEventListener('click', function () {
                openGalleryModal(mediaUrls, 0);
            });
        }
    } else {
        modalMediaContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f5f5f5;color:#999;"><i class="fas fa-image" style="font-size:3rem;"></i></div>';
    }

    // Show modal
    modal.style.display = 'flex';

    // Center map on this report
    map.setCenter({ lat: parseFloat(report.latitude), lng: parseFloat(report.longitude) });
    map.setZoom(15);
}

// Function to reset fullscreen image transformations
function resetFullscreenImage() {
    currentZoom = 1;
    currentRotation = 0;
    updateFullscreenImage();
}

// Function to update fullscreen image with transformations
function updateFullscreenImage() {
    const fullscreenMedia = document.getElementById('fullscreenMedia');
    fullscreenMedia.style.transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`;
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

// Function to initialize and update the incident trends graph
function initializeIncidentTrendsGraph() {
    const graphContainer = document.querySelector('.graph-placeholder');

    // Clear the placeholder content
    graphContainer.innerHTML = '<canvas id="incidentTrendsChart" style="width:100%; height:100%;"></canvas>';

    const ctx = graphContainer.querySelector('#incidentTrendsChart').getContext('2d');

    // Create the chart with bar style like the statistics page
    const incidentTrendsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    label: 'Landslide',
                    data: [],
                    backgroundColor: 'rgba(255, 107, 107, 0.7)',
                    borderColor: 'rgba(255, 107, 107, 1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(255, 107, 107, 1)'
                },
                {
                    label: 'Fire',
                    data: [],
                    backgroundColor: 'rgba(255, 165, 2, 0.7)',
                    borderColor: 'rgba(255, 165, 2, 1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(255, 165, 2, 1)'
                },
                {
                    label: 'Flood',
                    data: [],
                    backgroundColor: 'rgba(32, 178, 170, 0.7)',
                    borderColor: 'rgba(32, 178, 170, 1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(32, 178, 170, 1)'
                },
                {
                    label: 'Earthquake',
                    data: [],
                    backgroundColor: 'rgba(128, 0, 0, 0.7)',
                    borderColor: 'rgba(128, 0, 0, 1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(128, 0, 0, 1)'
                },
                {
                    label: 'Storm Surge',
                    data: [],
                    backgroundColor: 'rgba(30, 144, 255, 0.7)',
                    borderColor: 'rgba(30, 144, 255, 1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(30, 144, 255, 1)'
                },
                {
                    label: 'Medical Services',
                    data: [],
                    backgroundColor: 'rgba(123, 237, 159, 0.7)',
                    borderColor: 'rgba(123, 237, 159, 1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(123, 237, 159, 1)',
                    hidden: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            weight: 'bold'
                        },
                        padding: 10,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: {
                        size: 12,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 11
                    },
                    padding: 8,
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 10
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });

    // Load real data from Firebase - ONLY MAPPED STATUS
    loadIncidentTrendsData(incidentTrendsChart);
}

// Function to load real incident trends data from Firebase - ONLY MAPPED STATUS
function loadIncidentTrendsData(chart) {
    const reportsRef = database.ref('reports');

    reportsRef.on('value', (snapshot) => {
        const reports = snapshot.val();
        const monthlyData = {
            landslide: Array(12).fill(0),
            fire: Array(12).fill(0),
            flood: Array(12).fill(0),
            earthquake: Array(12).fill(0),
            stormSurge: Array(12).fill(0),
            medical: Array(12).fill(0)
        };

        if (reports) {
            Object.values(reports).forEach(report => {
                // ONLY COUNT REPORTS WITH STATUS "MAPPED"
                if (report.createdAt && report.status === 'resolved') {
                    const reportDate = new Date(report.createdAt);
                    const month = reportDate.getMonth(); // 0-11

                    switch (report.emergencyType) {
                        case 'landslide':
                            monthlyData.landslide[month]++;
                            break;
                        case 'fire':
                            monthlyData.fire[month]++;
                            break;
                        case 'flood':
                            monthlyData.flood[month]++;
                            break;
                        case 'earthquake':
                            monthlyData.earthquake[month]++;
                            break;
                        case 'storm':
                            monthlyData.stormSurge[month]++;
                            break;
                        case 'ems':
                            monthlyData.medical[month]++;
                            break;
                    }
                }
            });
        }

        // Update chart with real data
        chart.data.datasets[0].data = monthlyData.landslide;
        chart.data.datasets[1].data = monthlyData.fire;
        chart.data.datasets[2].data = monthlyData.flood;
        chart.data.datasets[3].data = monthlyData.earthquake;
        chart.data.datasets[4].data = monthlyData.stormSurge;
        chart.data.datasets[5].data = monthlyData.medical;

        chart.update();

    }, (error) => {
        console.error('Error loading incident trends data:', error);
    });
}

// NEW: Quick Upload Functionality
function initializeQuickUpload() {
    const fileUpload = document.getElementById('fileUpload');
    const uploadBtn = document.getElementById('uploadSubmitBtn');
    const uploadPreviews = document.getElementById('uploadPreviews');

    // File selection
    fileUpload.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);

        if (files.length > 0) {
            // Filter only image files
            const imageFiles = files.filter(file => file.type.startsWith('image/'));

            if (imageFiles.length > 0) {
                selectedUploadFiles = selectedUploadFiles.concat(imageFiles);
                updateUploadPreviews();
            } else {
                alert('Please select valid image files.');
            }
        }
    });

    // Upload button click
    uploadBtn.addEventListener('click', handleQuickUpload);
}

// NEW: Function to create upload preview
function createUploadPreview(file, index) {
    const previewContainer = document.createElement('div');
    previewContainer.className = 'image-preview';
    previewContainer.dataset.index = index;

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-preview';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', () => {
        removeUploadPreview(index);
    });

    previewContainer.appendChild(img);
    previewContainer.appendChild(removeBtn);

    return previewContainer;
}

// NEW: Function to remove upload preview
function removeUploadPreview(index) {
    // Remove from files array
    selectedUploadFiles.splice(index, 1);

    // Update previews
    updateUploadPreviews();
}

// NEW: Function to update upload previews
function updateUploadPreviews() {
    const uploadPreviews = document.getElementById('uploadPreviews');
    uploadPreviews.innerHTML = '';

    selectedUploadFiles.forEach((file, index) => {
        const preview = createUploadPreview(file, index);
        uploadPreviews.appendChild(preview);
    });
}

// NEW: Function to upload images to Supabase
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

// NEW: Function to handle quick upload
async function handleQuickUpload() {
    const message = document.getElementById('uploadMessage').value.trim();

    if (!message && selectedUploadFiles.length === 0) {
        alert('Please add either a message or images to upload.');
        return;
    }

    const originalText = document.getElementById('uploadSubmitBtn').innerHTML;

    try {
        document.getElementById('uploadSubmitBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        document.getElementById('uploadSubmitBtn').disabled = true;

        let imageUrls = [];

        // Upload images if selected
        if (selectedUploadFiles.length > 0) {
            imageUrls = await uploadImagesToSupabase(selectedUploadFiles);
        }

        const userId = localStorage.getItem('adminId');
        const username = localStorage.getItem('adminUsername');
        const fullname = localStorage.getItem('adminFullname');

        // Get admin profile picture
        const profilePicture = await getAdminProfilePicture(userId);

        const uploadData = {
            text: message,
            imageUrls: imageUrls,
            createdBy: userId,
            createdByName: fullname || username || 'Admin User',
            createdByProfilePicture: profilePicture,
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
            commentsList: {}
        };

        // Save to Firebase - CORRECTED: Use 'announcements' node instead of 'quick_uploads'
        const announcementsRef = database.ref('announcements');
        await announcementsRef.push(uploadData);

        showUploadStatus('Announcement published successfully!', 'success');

        // Reset form
        document.getElementById('uploadMessage').value = '';
        selectedUploadFiles = [];
        document.getElementById('uploadPreviews').innerHTML = '';
        document.getElementById('fileUpload').value = '';

    } catch (error) {
        console.error('Error uploading announcement:', error);
        showUploadStatus('Error publishing announcement: ' + error.message, 'error');
    } finally {
        document.getElementById('uploadSubmitBtn').innerHTML = originalText;
        document.getElementById('uploadSubmitBtn').disabled = false;
    }
}

// NEW: Function to get admin profile picture from Firebase
async function getAdminProfilePicture(adminId) {
    try {
        const adminRef = database.ref('admins/' + adminId);
        const snapshot = await adminRef.once('value');
        const adminData = snapshot.val();

        if (adminData && adminData.profilePicture) {
            return adminData.profilePicture;
        }

        // Return default avatar if no profile picture
        const adminName = localStorage.getItem('adminFullname') || localStorage.getItem('adminUsername') || 'Admin User';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=B80F0A&color=fff`;
    } catch (error) {
        console.error('Error fetching admin profile picture:', error);
        const adminName = localStorage.getItem('adminFullname') || localStorage.getItem('adminUsername') || 'Admin User';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=B80F0A&color=fff`;
    }
}

// NEW: Function to show upload status
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

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    const auth = checkAuth();
    if (!auth) return;

    // Menu toggle functionality
    const menuToggle = document.getElementById('menuToggle');
    const navbar = document.getElementById('navbar');

    menuToggle.addEventListener('click', () => {
        navbar.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navbar.classList.contains('active') &&
            !navbar.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            navbar.classList.remove('active');
        }
    });

    // Load statistics from Firebase
    loadStatisticsFromFirebase();

    // Load recent approved users
    loadRecentApprovedUsers();

    // Load notifications from Firebase
    loadNotificationsFromFirebase();

    // Initialize incident trends graph
    initializeIncidentTrendsGraph();

    // Initialize quick upload functionality
    initializeQuickUpload();

    // Add event listener for notification actions using event delegation
    document.getElementById('notificationsList').addEventListener('click', handleNotificationAction);

    // Map control buttons functionality
    document.getElementById('currentLocationBtn').addEventListener('click', function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(pos);
                map.setZoom(15);
            });
        }
    });

    document.getElementById('layersBtn').addEventListener('click', function () {
        const currentType = map.getMapTypeId();
        const newType = currentType === 'satellite' ? 'roadmap' : 'satellite';
        map.setMapTypeId(newType);
    });

    // Modal close functionality
    document.getElementById('closeModal').addEventListener('click', function () {
        document.getElementById('reportModal').style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        const modal = document.getElementById('reportModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Full screen modal functionality
    document.getElementById('fullscreenClose').addEventListener('click', function () {
        document.getElementById('fullscreenModal').style.display = 'none';
        resetFullscreenImage();
    });

    // Close full screen modal when clicking outside
    document.getElementById('fullscreenModal').addEventListener('click', function (event) {
        if (event.target === this) {
            this.style.display = 'none';
            resetFullscreenImage();
        }
    });

    // Media controls for full screen modal
    document.getElementById('zoomInBtn').addEventListener('click', function () {
        currentZoom += 0.2;
        updateFullscreenImage();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', function () {
        if (currentZoom > 0.4) {
            currentZoom -= 0.2;
            updateFullscreenImage();
        }
    });

    document.getElementById('rotateBtn').addEventListener('click', function () {
        currentRotation += 90;
        updateFullscreenImage();
    });

    document.getElementById('downloadBtn').addEventListener('click', function () {
        const imageUrl = document.getElementById('fullscreenMedia').src;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'emergency-report.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // NEW: Gallery modal functionality
    const galleryModal = document.getElementById('galleryModal');
    const galleryClose = document.querySelector('.gallery-close');
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

    // Load the Google Maps API
    if (API_KEY && API_KEY !== "YOUR_GOOGLE_MAPS_API_KEY") {
        loadGoogleMapsAPI()
            .then(() => {
                console.log('Google Maps API loaded successfully');
            })
            .catch((error) => {
                console.error('Failed to load Google Maps API:', error);
                document.getElementById('googleMap').innerHTML =
                    '<div style="padding: 20px; text-align: center; color: #666; background: #f5f5f5; border-radius: 6px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">' +
                    '<i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>' +
                    '<p>Failed to load Google Maps</p>' +
                    '<p style="font-size: 0.8rem;">Please check your API key and internet connection</p>' +
                    '</div>';
            });
    } else {
        document.getElementById('googleMap').innerHTML =
            '<div style="padding: 20px; text-align: center; color: #666; background: #f5f5f5; border-radius: 6px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">' +
            '<i class="fas fa-key" style="font-size: 2rem; margin-bottom: 10px;"></i>' +
            '<p>Google Maps API Key Required</p>' +
            '<p style="font-size: 0.8rem;">Please add your Google Maps API key to the code</p>' +
            '</div>';
    }
});