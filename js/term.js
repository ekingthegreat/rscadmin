  
 

        // Initialize Firebase
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

                        // Update adminName variable with actual admin name
                        adminName = userData.fullname || 'System Admin';

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

            if (imageUrl) {
                // Hide the default icon
                if (avatarIcon) avatarIcon.style.display = 'none';

                // Create and set the image for sidebar avatar
                const profileImg = document.createElement('img');
                profileImg.src = imageUrl;
                profileImg.alt = 'Profile Picture';

                // Clear existing content and add the image to sidebar
                profileAvatar.innerHTML = '';
                profileAvatar.appendChild(profileImg);
            }
        }

        // Default content for policies
        const defaultPrivacyPolicy = [
            {
                id: 1,
                title: "1. Information We Collect",
                content: `<h3>Personal Information</h3>
                <p>When you register for our emergency disaster response service, we collect:</p>
                <ul>
                  <li><strong>Account Information:</strong> Full name, username, email address, phone number, and role</li>
                  <li><strong>Location Data:</strong> GPS coordinates when reporting incidents</li>
                  <li><strong>Media Content:</strong> Photos and videos you upload as evidence</li>
                  <li><strong>Incident Reports:</strong> Details about emergency situations you report</li>
                </ul>
                
                <h3>Automatically Collected Information</h3>
                <ul>
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage data and analytics</li>
                  <li>Cookies and similar technologies</li>
                </ul>`,
                lastEditedBy: "System Admin",
                lastEditedAt: new Date().toISOString()
            },
            {
                id: 2,
                title: "2. How We Use Your Information",
                content: `<ul>
                  <li>Provide emergency response services and coordinate rescue efforts</li>
                  <li>Verify user identities and maintain account security</li>
                  <li>Display incident locations on maps for responders</li>
                  <li>Send emergency alerts and notifications</li>
                  <li>Improve our services and user experience</li>
                  <li>Comply with legal obligations</li>
                </ul>`,
                lastEditedBy: "System Admin",
                lastEditedAt: new Date().toISOString()
            }
        ];

        const defaultTermsOfService = [
            {
                id: 1,
                title: "1. Acceptance of Terms",
                content: `<p>By accessing or using the RSC (Ready to Serve the Community) emergency disaster response platform, you agree to be bound by these Terms of Service and our Privacy Policy.</p>`,
                lastEditedBy: "System Admin",
                lastEditedAt: new Date().toISOString()
            },
            {
                id: 2,
                title: "2. Service Description",
                content: `<p>RSC is a web-based emergency response platform that enables:</p>
                <ul>
                  <li>Real-time incident reporting with location tracking</li>
                  <li>Media upload (photos/videos) for evidence</li>
                  <li>Coordination between community members and emergency responders</li>
                  <li>Announcement and event management for authorized users</li>
                  <li>Web mapping for incident visualization</li>
                </ul>`,
                lastEditedBy: "System Admin",
                lastEditedAt: new Date().toISOString()
            }
        ];

        // DOM elements
        const privacyContent = document.getElementById('privacy-content');
        const termsContent = document.getElementById('terms-content');
        const privacyLastUpdated = document.getElementById('privacy-last-updated');
        const termsLastUpdated = document.getElementById('terms-last-updated');
        
        const addPrivacySectionBtn = document.getElementById('add-privacy-section');
        const addTermsSectionBtn = document.getElementById('add-terms-section');
        
        const editModal = document.getElementById('edit-modal');
        const closeEditModal = document.getElementById('close-edit-modal');
        const editModalTitle = document.getElementById('edit-modal-title');
        const editSectionTitle = document.getElementById('edit-section-title');
        const editSectionContent = document.getElementById('edit-section-content');
        const editSectionInfo = document.getElementById('edit-section-info');
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        const saveEditBtn = document.getElementById('save-edit-btn');
        
        const confirmationModal = document.getElementById('confirmation-modal');
        const closeConfirmModal = document.getElementById('close-confirm-modal');
        const modalCancelBtn = document.getElementById('modal-cancel-btn');
        const modalConfirmBtn = document.getElementById('modal-confirm-btn');
        const modalDetails = document.getElementById('modal-details');
        
        const successModal = document.getElementById('success-modal');
        const closeSuccessModal = document.getElementById('close-success-modal');
        const successOkBtn = document.getElementById('success-ok-btn');
        const successMessage = document.getElementById('success-message');

        // State variables
        let currentEditingPolicy = null; // 'privacy' or 'terms'
        let currentEditingSection = null; // section object being edited
        let isNewSection = false;
        let adminName = "System Admin"; // Will be updated with actual admin name

        // Initialize the app
        function init() {
            const auth = checkAuth();
            if (!auth) return;

            const { userId, userRole } = auth;
            loadUserData(userId, userRole);
            loadPoliciesFromDatabase();
            setupEventListeners();
            setupMenuToggle();
            setupLogoutModal();
        }

        // Load policies from Firebase or use defaults
        function loadPoliciesFromDatabase() {
            // Try to load from Firebase
            database.ref('policies/privacy').once('value').then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    renderPrivacyPolicy(data.sections);
                    privacyLastUpdated.textContent = `Last Updated: ${formatDate(data.lastUpdated)}`;
                } else {
                    // Use default content
                    renderPrivacyPolicy(defaultPrivacyPolicy);
                    savePolicyToDatabase('privacy', defaultPrivacyPolicy);
                }
            });

            database.ref('policies/terms').once('value').then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    renderTermsOfService(data.sections);
                    termsLastUpdated.textContent = `Last Updated: ${formatDate(data.lastUpdated)}`;
                } else {
                    // Use default content
                    renderTermsOfService(defaultTermsOfService);
                    savePolicyToDatabase('terms', defaultTermsOfService);
                }
            });
        }

        // Save policy to Firebase
        function savePolicyToDatabase(policyType, sections) {
            const now = new Date();
            const policyData = {
                sections: sections,
                lastUpdated: now.toISOString(),
                lastEditor: adminName
            };

            database.ref(`policies/${policyType}`).set(policyData)
                .then(() => {
                    console.log(`${policyType} policy saved successfully`);
                })
                .catch((error) => {
                    console.error(`Error saving ${policyType} policy:`, error);
                });
        }

        // Render Privacy Policy
        function renderPrivacyPolicy(sections) {
            privacyContent.innerHTML = '';
            
            sections.forEach(section => {
                const sectionElement = createSectionElement(section, 'privacy');
                privacyContent.appendChild(sectionElement);
            });
        }

        // Render Terms of Service
        function renderTermsOfService(sections) {
            termsContent.innerHTML = '';
            
            sections.forEach(section => {
                const sectionElement = createSectionElement(section, 'terms');
                termsContent.appendChild(sectionElement);
            });
        }

        // Create section element - FIXED to ensure only one attribution per section
        function createSectionElement(section, policyType) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = policyType === 'privacy' ? 'policy-section' : 'terms-section';
            sectionDiv.dataset.id = section.id;
            
            // Clean the content by removing any existing admin attributions
            let cleanContent = section.content;
            
            // Remove any existing admin attribution HTML from the content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cleanContent;
            const existingAttributions = tempDiv.querySelectorAll('.last-edited');
            existingAttributions.forEach(attr => attr.remove());
            cleanContent = tempDiv.innerHTML;
            
            // Create admin attribution if available - ONLY ONE per section
            const adminAttribution = section.lastEditedBy ? 
                `<div class="last-edited">
                    <i class="fas fa-user-edit"></i>
                    Last edited by ${section.lastEditedBy} on ${formatDate(section.lastEditedAt)}
                </div>` : '';
            
            sectionDiv.innerHTML = `
                <h2>
                    ${section.title}
                    <div class="edit-controls">
                        <button class="btn btn-edit edit-section-btn" data-policy="${policyType}" data-id="${section.id}" title="Edit this section">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </h2>
                <div class="view-container">
                    ${cleanContent}
                    ${adminAttribution}
                </div>
            `;
            
            return sectionDiv;
        }

        // Set up event listeners
        function setupEventListeners() {
            // Add section buttons
            addPrivacySectionBtn.addEventListener('click', () => {
                openEditModal('privacy', null, true);
            });
            
            addTermsSectionBtn.addEventListener('click', () => {
                openEditModal('terms', null, true);
            });
            
            // Edit modal buttons
            closeEditModal.addEventListener('click', () => {
                editModal.style.display = 'none';
            });
            
            cancelEditBtn.addEventListener('click', () => {
                editModal.style.display = 'none';
            });
            
            saveEditBtn.addEventListener('click', () => {
                saveSectionChanges();
            });
            
            // Confirmation modal buttons
            closeConfirmModal.addEventListener('click', () => {
                confirmationModal.style.display = 'none';
            });
            
            modalCancelBtn.addEventListener('click', () => {
                confirmationModal.style.display = 'none';
            });
            
            modalConfirmBtn.addEventListener('click', () => {
                confirmSave();
            });
            
            // Success modal buttons
            closeSuccessModal.addEventListener('click', () => {
                successModal.style.display = 'none';
            });
            
            successOkBtn.addEventListener('click', () => {
                successModal.style.display = 'none';
            });
            
            // Close modals when clicking outside
            window.addEventListener('click', (event) => {
                if (event.target === editModal) {
                    editModal.style.display = 'none';
                }
                if (event.target === confirmationModal) {
                    confirmationModal.style.display = 'none';
                }
                if (event.target === successModal) {
                    successModal.style.display = 'none';
                }
            });
            
            // Event delegation for edit buttons
            document.addEventListener('click', (event) => {
                if (event.target.classList.contains('edit-section-btn') || 
                    event.target.parentElement.classList.contains('edit-section-btn')) {
                    
                    const button = event.target.classList.contains('edit-section-btn') ? 
                        event.target : event.target.parentElement;
                    
                    const policyType = button.dataset.policy;
                    const sectionId = parseInt(button.dataset.id);
                    
                    openEditModal(policyType, sectionId, false);
                }
            });
        }

        // Set up menu toggle
        function setupMenuToggle() {
            const menuToggle = document.getElementById('menuToggle');
            const navbar = document.getElementById('navbar');
            const profileMenuToggle = document.getElementById('profileMenuToggle');
            const profileNav = document.getElementById('profileNav');

            if (menuToggle && navbar) {
                menuToggle.addEventListener('click', () => {
                    navbar.classList.toggle('active');
                });
            }

            if (profileMenuToggle && profileNav) {
                profileMenuToggle.addEventListener('click', () => {
                    profileNav.classList.toggle('active');
                });
            }

            // Close menus when clicking outside
            document.addEventListener('click', function(event) {
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
        }

        // Set up logout modal
        function setupLogoutModal() {
            const logoutLinks = document.querySelectorAll('[data-logout]');
            const logoutModal = document.getElementById('logoutModal');
            const logoutCancelBtn = logoutModal.querySelector('.btn-cancel');
            const logoutConfirmBtn = logoutModal.querySelector('.btn-save');
            const logoutCloseBtn = logoutModal.querySelector('.close-modal');

            // Add click event to all logout links
            logoutLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    logoutModal.style.display = 'flex';
                });
            });

            // Close modal when clicking X, Cancel, or outside the modal
            logoutCloseBtn.addEventListener('click', () => {
                logoutModal.style.display = 'none';
            });
            
            logoutCancelBtn.addEventListener('click', () => {
                logoutModal.style.display = 'none';
            });
            
            logoutModal.addEventListener('click', (e) => {
                if (e.target === logoutModal) {
                    logoutModal.style.display = 'none';
                }
            });

            // Confirm logout button action
            logoutConfirmBtn.addEventListener('click', () => {
                logout();
            });
        }

        // Open edit modal - FIXED to ensure clean content without attributions
        function openEditModal(policyType, sectionId, isNew) {
            currentEditingPolicy = policyType;
            isNewSection = isNew;
            
            if (isNew) {
                // Create a new section
                currentEditingSection = {
                    id: Date.now(), // Use timestamp as ID for new sections
                    title: "",
                    content: "",
                    lastEditedBy: adminName,
                    lastEditedAt: new Date().toISOString()
                };
                
                editModalTitle.textContent = `Add New Section to ${policyType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}`;
                editSectionTitle.value = "";
                editSectionContent.value = "";
                editSectionInfo.textContent = "Creating new section";
            } else {
                // Find the section to edit
                const policyContent = policyType === 'privacy' ? privacyContent : termsContent;
                const sectionElement = policyContent.querySelector(`[data-id="${sectionId}"]`);
                
                if (!sectionElement) return;
                
                // Get the section data from the view - EXCLUDE the admin attribution
                const title = sectionElement.querySelector('h2').textContent.trim();
                const viewContainer = sectionElement.querySelector('.view-container');
                
                // Clone the container to avoid modifying the original
                const tempContainer = viewContainer.cloneNode(true);
                
                // Remove ALL admin attributions from the cloned content
                const adminAttributions = tempContainer.querySelectorAll('.last-edited');
                adminAttributions.forEach(attr => attr.remove());
                
                currentEditingSection = {
                    id: sectionId,
                    title: title,
                    content: tempContainer.innerHTML.trim(),
                    lastEditedBy: adminName,
                    lastEditedAt: new Date().toISOString()
                };
                
                editModalTitle.textContent = `Edit Section in ${policyType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}`;
                editSectionTitle.value = title;
                editSectionContent.value = tempContainer.innerHTML.trim();
                editSectionInfo.textContent = `Editing section ${sectionId}`;
            }
            
            editModal.style.display = 'flex';
        }

        // Save section changes
        function saveSectionChanges() {
            const title = editSectionTitle.value.trim();
            const content = editSectionContent.value.trim();
            
            if (!title || !content) {
                alert('Please fill in both title and content');
                return;
            }
            
            // Update the section object
            currentEditingSection.title = title;
            currentEditingSection.content = content;
            currentEditingSection.lastEditedBy = adminName;
            currentEditingSection.lastEditedAt = new Date().toISOString();
            
            // Show confirmation modal
            modalDetails.textContent = `This will ${isNewSection ? 'add a new section to' : 'update a section in'} the ${currentEditingPolicy === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}.`;
            confirmationModal.style.display = 'flex';
        }

        // Confirm and save changes - FIXED to ensure each section has its own attribution
        function confirmSave() {
            confirmationModal.style.display = 'none';
            editModal.style.display = 'none';
            
            // Get current sections from the UI
            const policyContent = currentEditingPolicy === 'privacy' ? privacyContent : termsContent;
            const sections = [];
            
            // Collect existing sections
            const sectionElements = policyContent.querySelectorAll('.policy-section, .terms-section');
            sectionElements.forEach(element => {
                const id = parseInt(element.dataset.id);
                const title = element.querySelector('h2').textContent.trim();
                const viewContainer = element.querySelector('.view-container');
                
                // Clone the container to avoid modifying the original
                const tempContainer = viewContainer.cloneNode(true);
                
                // Remove ALL admin attributions from the cloned content
                const adminAttributions = tempContainer.querySelectorAll('.last-edited');
                adminAttributions.forEach(attr => attr.remove());
                
                // If this is the section we're editing, use the new content
                let content = tempContainer.innerHTML.trim();
                let lastEditedBy = adminName;
                let lastEditedAt = new Date().toISOString();
                
                if (id === currentEditingSection.id) {
                    content = currentEditingSection.content;
                } else {
                    // For existing sections, preserve their original editor info
                    const existingSection = Array.from(sectionElements).find(el => parseInt(el.dataset.id) === id);
                    if (existingSection) {
                        const existingAttribution = existingSection.querySelector('.last-edited');
                        if (existingAttribution) {
                            // Extract the existing editor info from the attribution text
                            const attributionText = existingAttribution.textContent;
                            const editedByMatch = attributionText.match(/Last edited by (.+?) on/);
                            if (editedByMatch && editedByMatch[1]) {
                                lastEditedBy = editedByMatch[1];
                            }
                        }
                    }
                }
                
                sections.push({
                    id: id,
                    title: title,
                    content: content,
                    lastEditedBy: lastEditedBy,
                    lastEditedAt: lastEditedAt
                });
            });
            
            // Add or update the section
            if (isNewSection) {
                sections.push(currentEditingSection);
            } else {
                const index = sections.findIndex(s => s.id === currentEditingSection.id);
                if (index !== -1) {
                    sections[index] = currentEditingSection;
                }
            }
            
            // Sort sections by ID (assuming IDs represent order)
            sections.sort((a, b) => a.id - b.id);
            
            // Save to database
            savePolicyToDatabase(currentEditingPolicy, sections);
            
            // Update UI
            if (currentEditingPolicy === 'privacy') {
                renderPrivacyPolicy(sections);
                privacyLastUpdated.textContent = `Last Updated: ${formatDate(new Date())}`;
            } else {
                renderTermsOfService(sections);
                termsLastUpdated.textContent = `Last Updated: ${formatDate(new Date())}`;
            }
            
            // Show success message
            successMessage.textContent = `Section ${isNewSection ? 'added to' : 'updated in'} ${currentEditingPolicy === 'privacy' ? 'Privacy Policy' : 'Terms of Service'} successfully.`;
            successModal.style.display = 'flex';
        }

        // Format date for display
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Logout function
        function logout() {
            clearAdminSession();
            window.location.href = "login.html";
        }

        // Initialize the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', init);