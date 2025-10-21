// Employee Search Functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('employeeSearch');
    const searchIcon = searchInput.parentElement.querySelector('.fa-search');
    
    // Search function
    function searchEmployees() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        if (searchTerm === '') {
            // If search is empty, show all employees
            populateEmployeeDirectory();
            return;
        }
        
        // Get all users and convert to employees
        const users = getUsers();
        const employees = convertUsersToEmployees(users);
        
        // Filter employees based on search term
        const filteredEmployees = employees.filter(employee => {
            return (
                employee.name.toLowerCase().includes(searchTerm) ||
                employee.employeeId.toLowerCase().includes(searchTerm) ||
                employee.position.toLowerCase().includes(searchTerm) ||
                employee.email.toLowerCase().includes(searchTerm)
            );
        });
        
        // Populate table with filtered results
        populateEmployeeDirectoryWithData(filteredEmployees);
        
        // Show search results count
        showSearchResults(filteredEmployees.length, searchTerm);
    }
    
    // Event listeners for search
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchEmployees();
        }
    });
    
    // Click on search icon
    searchIcon.addEventListener('click', function() {
        searchEmployees();
    });
    
    // Real-time search as user types (optional - uncomment if you want live search)
    /*
    searchInput.addEventListener('input', function() {
        // Add a small delay to avoid too many searches while typing
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(searchEmployees, 300);
    });
    */
    
    // Clear search when input is cleared
    searchInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            populateEmployeeDirectory();
            hideSearchResults();
        }
    });
});

// Enhanced function to populate employee directory with specific data
function populateEmployeeDirectoryWithData(employees) {
    const tableBody = document.getElementById('employeeDirectoryTable');
    tableBody.innerHTML = '';
    
    if (employees.length === 0) {
        // Show "no results" message
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" class="py-8 px-4 text-center text-gray-500">
                <i class="fas fa-search text-3xl mb-2 block"></i>
                No employees found matching your search criteria.
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    employees.forEach(employee => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-200 hover:bg-gray-50 search-result-row';
        
        row.innerHTML = `
            <td class="py-3 px-4">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-user text-blue-600 text-sm"></i>
                    </div>
                    <span class="font-medium">${employee.name}</span>
                </div>
            </td>
            <td class="py-3 px-4">
                <span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">${employee.employeeId}</span>
            </td>
            <td class="py-3 px-4">${employee.position}</td>
            <td class="py-3 px-4">${employee.email}</td>
            <td class="py-3 px-4">
                <div class="flex space-x-2">
                    <button class="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition" 
                            onclick="editEmployee(${employee.id})" 
                            title="Edit Employee">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition" 
                            onclick="viewEmployeeDetails(${employee.id})" 
                            title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition" 
                            onclick="deleteEmployee(${employee.id})" 
                            title="Delete Employee">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Function to show search results count
function showSearchResults(count, searchTerm) {
    // Remove existing search results info
    hideSearchResults();
    
    const employeeManagementSection = document.querySelector('#employee-management .bg-white');
    const resultsInfo = document.createElement('div');
    resultsInfo.id = 'searchResultsInfo';
    resultsInfo.className = 'bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 flex items-center justify-between';
     
    resultsInfo.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-search text-blue-600 mr-2"></i>
            <span class="text-blue-800">
                Found <strong>${count}</strong> employee${count !== 1 ? 's' : ''} matching "<strong>${searchTerm}</strong>"
            </span>
        </div>
        <button onclick="clearSearch()" class="text-blue-600 hover:text-blue-800 text-sm underline">
            Clear Search
        </button>
    `;
    
    // Insert before the table
    const tableContainer = employeeManagementSection.querySelector('.overflow-x-auto');
    employeeManagementSection.insertBefore(resultsInfo, tableContainer);
}

// Function to hide search results info
function hideSearchResults() {
    const existingInfo = document.getElementById('searchResultsInfo');
    if (existingInfo) {
        existingInfo.remove();
    }
}

// Function to clear search
function clearSearch() {
    document.getElementById('employeeSearch').value = '';
    populateEmployeeDirectory();
    hideSearchResults();
}

// Function to view detailed employee information (enhanced view)
function viewEmployeeDetails(id) {
    const users = getUsers();
    const userIndex = id - 1;
    const user = users[userIndex];
    
    if (!user) return;
    
    // Get clock records for this employee
    const clockRecords = JSON.parse(localStorage.getItem('clockRecords')) || [];
    const today = new Date().toLocaleDateString('en-US');
    const employeeId = user.employeeId || `EMP${String(id).padStart(3, '0')}`;
    
    // Find today's records
    const todayRecords = clockRecords.filter(record => 
        record.employeeId === employeeId &&
        new Date(record.date).toLocaleDateString('en-US') === today
    );
    
    // Find active session
    const activeSession = todayRecords.find(record => 
        record.clockIn && !record.clockOut
    );
    
    // Calculate status and times
    let status = 'Inactive';
    let clockInTime = 'Not clocked in today';
    let duration = '0h 0m';
    let statusClass = 'bg-gray-100 text-gray-800';
    
    if (activeSession) {
        status = 'Active';
        statusClass = 'bg-green-100 text-green-800';
        const clockInDate = new Date(activeSession.clockIn);
        clockInTime = formatTime(clockInDate);
        duration = calculateDuration(activeSession.clockIn, new Date());
    } else {
        // Check for completed sessions today
        const completedSessions = todayRecords.filter(record => 
            record.clockIn && record.clockOut
        );
        
        if (completedSessions.length > 0) {
            const lastSession = completedSessions[completedSessions.length - 1];
            const clockOutDate = new Date(lastSession.clockOut);
            clockInTime = `Last clocked out at ${formatTime(clockOutDate)}`;
            duration = calculateDuration(lastSession.clockIn, lastSession.clockOut);
        }
    }
    
    // Create modal or detailed view
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.id = 'employeeDetailsModal';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-90vh overflow-y-auto">
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Employee Details</h2>
                    <button onclick="closeEmployeeDetails()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Employee Info -->
                    <div class="space-y-4">
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h3 class="text-lg font-semibold mb-3 text-gray-800">Personal Information</h3>
                            
                            <div class="space-y-3">
                                <div class="flex items-center">
                                    <i class="fas fa-user text-gray-500 w-5"></i>
                                    <span class="ml-3"><strong>Name:</strong> ${user.name}</span>
                                </div>
                                
                                <div class="flex items-center">
                                    <i class="fas fa-id-badge text-gray-500 w-5"></i>
                                    <span class="ml-3"><strong>Employee ID:</strong> ${employeeId}</span>
                                </div>
                                
                                <div class="flex items-center">
                                    <i class="fas fa-briefcase text-gray-500 w-5"></i>
                                    <span class="ml-3"><strong>Position:</strong> ${user.position || 'Employee'}</span>
                                </div>
                                
                                <div class="flex items-center">
                                    <i class="fas fa-envelope text-gray-500 w-5"></i>
                                    <span class="ml-3"><strong>Email:</strong> ${user.email || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Today's Activity -->
                    <div class="space-y-4">
                        <div class="bg-blue-50 rounded-lg p-4">
                            <h3 class="text-lg font-semibold mb-3 text-gray-800">Today's Activity</h3>
                            
                            <div class="space-y-3">
                                <div class="flex items-center justify-between">
                                    <span><strong>Status:</strong></span>
                                    <span class="${statusClass} text-xs px-2 py-1 rounded-full">${status}</span>
                                </div>
                                
                                <div class="flex items-center justify-between">
                                    <span><strong>Clock In:</strong></span>
                                    <span class="text-sm">${clockInTime}</span>
                                </div>
                                
                                <div class="flex items-center justify-between">
                                    <span><strong>Duration:</strong></span>
                                    <span class="text-sm font-mono">${duration}</span>
                                </div>
                                
                                <div class="flex items-center justify-between">
                                    <span><strong>Sessions Today:</strong></span>
                                    <span class="text-sm">${todayRecords.length}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex space-x-2 mt-4">
                            <button onclick="editEmployee(${id}); closeEmployeeDetails();" 
                                    class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">
                                <i class="fas fa-edit mr-2"></i> Edit
                            </button>
                            <button onclick="closeEmployeeDetails()" 
                                    class="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Function to close employee details modal
function closeEmployeeDetails() {
    const modal = document.getElementById('employeeDetailsModal');
    if (modal) {
        modal.remove();
    }
}

// Enhanced search with keyboard navigation (optional advanced feature)
function enhanceSearchWithKeyboardNavigation() {
    const searchInput = document.getElementById('employeeSearch');
    let selectedIndex = -1;
    
    searchInput.addEventListener('keydown', function(e) {
        const rows = document.querySelectorAll('.search-result-row');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, rows.length - 1);
            highlightRow(rows, selectedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            highlightRow(rows, selectedIndex);
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            const selectedRow = rows[selectedIndex];
            const editButton = selectedRow.querySelector('[onclick*="editEmployee"]');
            if (editButton) {
                editButton.click();
            }
        }
    });
    
    function highlightRow(rows, index) {
        rows.forEach((row, i) => {
            if (i === index) {
                row.classList.add('bg-blue-50', 'border-blue-200');
            } else {
                row.classList.remove('bg-blue-50', 'border-blue-200');
            }
        });
    }
}

// Initialize enhanced search features
document.addEventListener('DOMContentLoaded', function() {
    // Uncomment the line below to enable keyboard navigation
    // enhanceSearchWithKeyboardNavigation();
});