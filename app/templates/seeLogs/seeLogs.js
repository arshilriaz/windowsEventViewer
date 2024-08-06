function parseDotNetDate(dotNetDateString) {
    const timestamp = parseInt(dotNetDateString.match(/\d+/)[0], 10);
    const date = new Date(timestamp);
    return date.toLocaleString(); // Customize the format as needed
}

function filterLogs() {
    const filters = {
        Information: document.getElementById('informationFilter').checked,
        Warning: document.getElementById('warningFilter').checked,
        Error: document.getElementById('errorFilter').checked
    };

    const rows = document.querySelectorAll('.log-row');
    rows.forEach(row => {
        const level = row.getAttribute('data-level');
        if (filters[level]) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function selectAllFilters() {
    document.querySelectorAll('.dropdown-content input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    filterLogs();
}

document.getElementById('informationFilter').addEventListener('change', filterLogs);
document.getElementById('warningFilter').addEventListener('change', filterLogs);
document.getElementById('errorFilter').addEventListener('change', filterLogs);

// Initial filtering
filterLogs();

// Modal Functionality
const modal = document.getElementById('logModal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementsByClassName('close')[0];

document.querySelectorAll('.log-row').forEach(row => {
    row.addEventListener('click', function() {
        const logData = JSON.parse(this.getAttribute('data-json'));
        modalContent.textContent = JSON.stringify(logData, null, 4);
        modal.style.display = 'block';
    });
});

closeModal.onclick = function() {
    modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Parse .NET JSON dates and update the table
document.querySelectorAll('.log-time').forEach(cell => {
    const date = cell.getAttribute('data-time');
    if (date.startsWith("/Date")) {
        cell.textContent = parseDotNetDate(date);
    } else {
        cell.textContent = new Date(date).toLocaleString();
    }
});