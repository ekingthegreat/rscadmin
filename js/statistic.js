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

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    const auth = checkAuth();
    if (!auth) return;

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const navbar = document.getElementById('navbar');

    menuToggle.addEventListener('click', () => {
        navbar.classList.toggle('active');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!navbar.contains(event.target) && !menuToggle.contains(event.target)) {
            navbar.classList.remove('active');
        }
    });

    // Initialize chart with responsive options
    const ctx = document.getElementById('incidentChart').getContext('2d');
    let incidentChart = new Chart(ctx, {
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
                    hoverBackgroundColor: 'rgba(123, 237, 159, 1)'
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
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 12
                    },
                    padding: 12,
                    cornerRadius: 8,
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
                        color: '#6b7280'
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });

    // Load data from Firebase
    loadReportsData();

    // Time filter change handler
    document.getElementById('timeFilter').addEventListener('change', function () {
        const customDateRange = document.getElementById('customDateRange');
        if (this.value === 'custom') {
            customDateRange.style.display = 'flex';
            // Set default date values
            const today = new Date();
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(today.getMonth() - 1);

            document.getElementById('fromDate').valueAsDate = oneMonthAgo;
            document.getElementById('toDate').valueAsDate = today;

            // Load data with default custom range
            loadReportsData();
        } else {
            customDateRange.style.display = 'none';
            loadReportsData();
        }
    });

    // Date input change handlers for immediate filtering
    document.getElementById('fromDate').addEventListener('change', function () {
        if (document.getElementById('timeFilter').value === 'custom') {
            loadReportsData();
        }
    });

    document.getElementById('toDate').addEventListener('change', function () {
        if (document.getElementById('timeFilter').value === 'custom') {
            loadReportsData();
        }
    });

    // Incident filter change handler
    document.getElementById('incidentFilter').addEventListener('change', function () {
        loadReportsData();
    });

    // Export PDF functionality
    document.getElementById('exportPDF').addEventListener('click', function () {
        exportToPDF();
    });

    // Load reports data from Firebase
    function loadReportsData() {
        const timeFilter = document.getElementById('timeFilter').value;
        const incidentFilter = document.getElementById('incidentFilter').value;

        database.ref('reports').once('value').then(snapshot => {
            const reports = snapshot.val();
            const filteredReports = filterReports(reports, timeFilter, incidentFilter);
            updateStatistics(filteredReports);
            updateChart(filteredReports, timeFilter);
        }).catch(error => {
            console.error('Error fetching reports:', error);
            alert('Error loading data from database');
        });
    }

    // Filter reports based on time and incident type
    function filterReports(reports, timeFilter, incidentFilter) {
        const now = new Date();
        let startDate = new Date(0); // Default to all time
        let endDate = new Date(); // Default to current date/time

        // Set start date based on time filter
        if (timeFilter === 'last12') {
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        } else if (timeFilter === 'last6') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        } else if (timeFilter === 'last3') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        } else if (timeFilter === 'current') {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else if (timeFilter === 'custom') {
            const fromDateInput = document.getElementById('fromDate').value;
            const toDateInput = document.getElementById('toDate').value;

            if (fromDateInput && toDateInput) {
                startDate = new Date(fromDateInput);
                endDate = new Date(toDateInput);
                // Set end date to end of day
                endDate.setHours(23, 59, 59, 999);
            } else {
                // If custom dates are not set, default to last 30 days
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            }
        }

        const filteredReports = {};

        for (const key in reports) {
            const report = reports[key];

            // Only count mapped reports
            if (report.status !== 'resolved') continue;

            // Filter by date
            const reportDate = new Date(report.createdAt);
            if (reportDate < startDate || reportDate > endDate) continue;

            // Filter by incident type
            if (incidentFilter !== 'all' && report.emergencyType !== incidentFilter) continue;

            filteredReports[key] = report;
        }

        return filteredReports;
    }

    // Update statistics display
    function updateStatistics(reports) {
        let landslideCount = 0;
        let fireCount = 0;
        let floodCount = 0;
        let earthquakeCount = 0;
        let stormCount = 0;
        let emsCount = 0;

        for (const key in reports) {
            const report = reports[key];

            switch (report.emergencyType) {
                case 'landslide':
                    landslideCount++;
                    break;
                case 'fire':
                    fireCount++;
                    break;
                case 'flood':
                    floodCount++;
                    break;
                case 'earthquake':
                    earthquakeCount++;
                    break;
                case 'storm':
                    stormCount++;
                    break;
                case 'ems':
                    emsCount++;
                    break;
            }
        }

        // Update UI
        document.getElementById('landslide-count').textContent = landslideCount;
        document.getElementById('fire-count').textContent = fireCount;
        document.getElementById('flood-count').textContent = floodCount;
        document.getElementById('earthquake-count').textContent = earthquakeCount;
        document.getElementById('storm-count').textContent = stormCount;
        document.getElementById('ems-count').textContent = emsCount;
    }

    // Update chart with filtered data - FIXED VERSION
    function updateChart(reports, timeFilter) {
        const monthlyData = {
            landslide: Array(12).fill(0),
            fire: Array(12).fill(0),
            flood: Array(12).fill(0),
            earthquake: Array(12).fill(0),
            stormSurge: Array(12).fill(0),
            medical: Array(12).fill(0)
        };

        // Always use January to December for the full year view
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // For "All Time" or "Current Year", show all 12 months in order
        if (timeFilter === 'all' || timeFilter === 'current' || timeFilter === 'custom') {
            incidentChart.data.labels = monthNames;

            // Count incidents by month and type
            for (const key in reports) {
                const report = reports[key];
                const reportDate = new Date(report.createdAt);
                const monthIndex = reportDate.getMonth();

                // For current year filter, only count reports from current year
                if (timeFilter === 'current') {
                    const currentYear = new Date().getFullYear();
                    if (reportDate.getFullYear() !== currentYear) continue;
                }

                switch (report.emergencyType) {
                    case 'landslide':
                        monthlyData.landslide[monthIndex]++;
                        break;
                    case 'fire':
                        monthlyData.fire[monthIndex]++;
                        break;
                    case 'flood':
                        monthlyData.flood[monthIndex]++;
                        break;
                    case 'earthquake':
                        monthlyData.earthquake[monthIndex]++;
                        break;
                    case 'storm':
                        monthlyData.stormSurge[monthIndex]++;
                        break;
                    case 'ems':
                        monthlyData.medical[monthIndex]++;
                        break;
                }
            }

            // Update chart data
            const incidentFilter = document.getElementById('incidentFilter').value;

            incidentChart.data.datasets.forEach(dataset => {
                // Show/hide datasets based on incident filter
                if (incidentFilter === 'all') {
                    // All datasets are visible now, including Medical Services
                    dataset.hidden = false;
                } else {
                    dataset.hidden = !dataset.label.toLowerCase().includes(incidentFilter);
                }

                // Set data in January-December order
                if (dataset.label === 'Landslide') dataset.data = monthlyData.landslide;
                else if (dataset.label === 'Fire') dataset.data = monthlyData.fire;
                else if (dataset.label === 'Flood') dataset.data = monthlyData.flood;
                else if (dataset.label === 'Earthquake') dataset.data = monthlyData.earthquake;
                else if (dataset.label === 'Storm Surge') dataset.data = monthlyData.stormSurge;
                else if (dataset.label === 'Medical Services') dataset.data = monthlyData.medical;
            });
        } else {
            // For other time filters (last 12, 6, 3 months), show rolling months
            const now = new Date();
            let monthsToShow = 12;
            if (timeFilter === 'last6') monthsToShow = 6;
            else if (timeFilter === 'last3') monthsToShow = 3;

            // Generate labels for rolling months
            let labels = [];
            for (let i = monthsToShow - 1; i >= 0; i--) {
                const monthIndex = (now.getMonth() - i + 12) % 12;
                labels.push(monthNames[monthIndex]);
            }

            incidentChart.data.labels = labels;

            // Count incidents by month and type
            for (const key in reports) {
                const report = reports[key];
                const reportDate = new Date(report.createdAt);
                const monthIndex = reportDate.getMonth();

                // Skip if outside the time range
                const monthsAgo = (now.getMonth() - monthIndex + 12) % 12;
                if (monthsAgo >= monthsToShow) continue;

                switch (report.emergencyType) {
                    case 'landslide':
                        monthlyData.landslide[monthIndex]++;
                        break;
                    case 'fire':
                        monthlyData.fire[monthIndex]++;
                        break;
                    case 'flood':
                        monthlyData.flood[monthIndex]++;
                        break;
                    case 'earthquake':
                        monthlyData.earthquake[monthIndex]++;
                        break;
                    case 'storm':
                        monthlyData.stormSurge[monthIndex]++;
                        break;
                    case 'ems':
                        monthlyData.medical[monthIndex]++;
                        break;
                }
            }

            // Update chart data
            const incidentFilter = document.getElementById('incidentFilter').value;

            incidentChart.data.datasets.forEach(dataset => {
                // Show/hide datasets based on incident filter
                if (incidentFilter === 'all') {
                    // All datasets are visible now, including Medical Services
                    dataset.hidden = false;
                } else {
                    dataset.hidden = !dataset.label.toLowerCase().includes(incidentFilter);
                }

                // Reorder data based on time filter
                let dataArray = [];
                if (dataset.label === 'Landslide') dataArray = monthlyData.landslide;
                else if (dataset.label === 'Fire') dataArray = monthlyData.fire;
                else if (dataset.label === 'Flood') dataArray = monthlyData.flood;
                else if (dataset.label === 'Earthquake') dataArray = monthlyData.earthquake;
                else if (dataset.label === 'Storm Surge') dataArray = monthlyData.stormSurge;
                else if (dataset.label === 'Medical Services') dataArray = monthlyData.medical;

                const reorderedData = [];
                for (let i = monthsToShow - 1; i >= 0; i--) {
                    const monthIndex = (now.getMonth() - i + 12) % 12;
                    reorderedData.push(dataArray[monthIndex]);
                }
                dataset.data = reorderedData;
            });
        }

        incidentChart.update();
    }

    // Export to PDF
    function exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Add header
        doc.setFontSize(20);
        doc.setTextColor(184, 15, 10);
        doc.text('RSC - Incident Statistics Report', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });

        // Add current filter info
        const timeFilter = document.getElementById('timeFilter').options[document.getElementById('timeFilter').selectedIndex].text;
        const incidentFilter = document.getElementById('incidentFilter').options[document.getElementById('incidentFilter').selectedIndex].text;

        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`Time Period: ${timeFilter}`, 20, 45);

        // Add custom date range if applicable
        if (timeFilter === 'Custom Range') {
            const fromDate = document.getElementById('fromDate').value;
            const toDate = document.getElementById('toDate').value;
            if (fromDate && toDate) {
                doc.text(`Date Range: ${fromDate} to ${toDate}`, 20, 52);
            }
        }

        doc.text(`Incident Type: ${incidentFilter}`, 20, timeFilter === 'Custom Range' ? 59 : 52);

        // Add statistics
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Incident Statistics Summary', 20, 70);

        doc.setFontSize(12);
        let yPosition = 80;

        // Get all statistics
        const allStats = [
            { label: 'Landslide', value: document.getElementById('landslide-count').textContent, type: 'landslide' },
            { label: 'Fire', value: document.getElementById('fire-count').textContent, type: 'fire' },
            { label: 'Flood', value: document.getElementById('flood-count').textContent, type: 'flood' },
            { label: 'Earthquake', value: document.getElementById('earthquake-count').textContent, type: 'earthquake' },
            { label: 'Storm Surge', value: document.getElementById('storm-count').textContent, type: 'storm' },
            { label: 'Medical Services', value: document.getElementById('ems-count').textContent, type: 'ems' }
        ];

        // Filter stats based on current incident filter
        const currentIncidentFilter = document.getElementById('incidentFilter').value;
        let statsToShow;

        if (currentIncidentFilter === 'all') {
            // Show all statistics
            statsToShow = allStats;
        } else {
            // Show only the selected incident type
            statsToShow = allStats.filter(stat => stat.type === currentIncidentFilter);
        }

        // Display the filtered statistics
        statsToShow.forEach(stat => {
            doc.text(`${stat.label}: ${stat.value}`, 30, yPosition);
            yPosition += 8;
        });

        // Add chart image
        const chartCanvas = document.getElementById('incidentChart');
        html2canvas(chartCanvas).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 20, yPosition + 10, pageWidth - 40, 100);

            // Save the PDF
            doc.save(`RSC_Statistics_${new Date().toISOString().slice(0, 10)}.pdf`);
        });
    }
});