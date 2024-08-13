document.getElementById('searchInput').addEventListener('keyup', function() {
    var input = this.value.toLowerCase();
    var rows = document.querySelectorAll('table tbody tr');

    rows.forEach(function(row) {
        var hostname = row.cells[0].textContent.toLowerCase();
        var username = row.cells[1].textContent.toLowerCase();

        if (hostname.includes(input) || username.includes(input)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

document.getElementById('hostFilter').addEventListener('change', function() {
    const filterValue = this.value;
    const rows = document.querySelectorAll('table tbody tr');

    rows.forEach(row => {
        const isEvtx = row.querySelector('input[name="evtx"]').value === 'true';

        if (filterValue === 'all') {
            row.style.display = '';
        } else if (filterValue === 'evtx' && isEvtx) {
            row.style.display = '';
        } else if (filterValue === 'non-evtx' && !isEvtx) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});
