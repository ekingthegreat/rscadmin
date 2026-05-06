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

        // Load statistics from Firebase
        function loadStatisticsFromFirebase() {
            const usersRef = database.ref('users');
            const reportsRef = database.ref('reports');
            
            console.log('Loading statistics from Firebase...');
            
            // Get current date information for filtering
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime();
            
            // Load response team users
            usersRef.child('response_team').once('value', (snapshot) => {
                const responseTeamUsers = snapshot.val();
                let todayUsers = 0, weekUsers = 0, monthUsers = 0;
                
                if (responseTeamUsers) {
                    Object.values(responseTeamUsers).forEach(user => {
                        // Check if user has lastUpdated field
                        if (user.lastUpdated) {
                            const userDate = new Date(user.lastUpdated).getTime();
                            
                            if (userDate >= today) {
                                todayUsers++;
                            }
                            if (userDate >= weekAgo) {
                                weekUsers++;
                            }
                            if (userDate >= monthAgo) {
                                monthUsers++;
                            }
                        }
                    });
                    
                    // Update UI with user counts
                    document.getElementById('todayUsers').textContent = todayUsers;
                    document.getElementById('weekUsers').textContent = weekUsers;
                    document.getElementById('monthUsers').textContent = monthUsers;
                } else {
                    // No response team users found
                    document.getElementById('todayUsers').textContent = 0;
                    document.getElementById('weekUsers').textContent = 0;
                    document.getElementById('monthUsers').textContent = 0;
                }
            }, (error) => {
                console.error('Error loading response team users:', error);
            });
            
            // Load incident reports - ONLY MAPPED INCIDENTS
            reportsRef.once('value', (snapshot) => {
                const reports = snapshot.val();
                let todayIncidents = 0, weekIncidents = 0, monthIncidents = 0;
                
                if (reports) {
                    Object.values(reports).forEach(report => {
                        // Only count incidents with status "mapped"
                        if (report.createdAt && report.status === "mapped") {
                            const reportDate = new Date(report.createdAt).getTime();
                            
                            if (reportDate >= today) {
                                todayIncidents++;
                            }
                            if (reportDate >= weekAgo) {
                                weekIncidents++;
                            }
                            if (reportDate >= monthAgo) {
                                monthIncidents++;
                            }
                        }
                    });
                    
                    // Update UI with incident counts
                    document.getElementById('todayIncidents').textContent = todayIncidents;
                    document.getElementById('weekIncidents').textContent = weekIncidents;
                    document.getElementById('monthIncidents').textContent = monthIncidents;
                } else {
                    // No reports found
                    document.getElementById('todayIncidents').textContent = 0;
                    document.getElementById('weekIncidents').textContent = 0;
                    document.getElementById('monthIncidents').textContent = 0;
                }
            }, (error) => {
                console.error('Error loading incident reports:', error);
            });
        }

        // Load notifications from Firebase
        function loadNotificationsFromFirebase() {
            const notificationsRef = database.ref('notifications');
            
            console.log('Loading notifications from Firebase...');
            
            notificationsRef.orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
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
            return `${emergencyType}-icon`;
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

        // Initialize page
        document.addEventListener('DOMContentLoaded', function() {
            // Check authentication
            const auth = checkAuth();
            if (!auth) return;
            
            const menuToggle = document.getElementById('menuToggle');
            const navbar = document.getElementById('navbar');

            menuToggle.addEventListener('click', () => {
                navbar.classList.toggle('active');
            });

            // Load statistics from Firebase
            loadStatisticsFromFirebase();

            // Load notifications from Firebase
            loadNotificationsFromFirebase();

            // Add event listener for notification actions using event delegation
            document.getElementById('notificationsList').addEventListener('click', handleNotificationAction);
        });
    