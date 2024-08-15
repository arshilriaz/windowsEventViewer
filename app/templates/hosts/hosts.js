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

function setRemoveAction(hostname, username, password, evtx) {
    document.getElementById('confirmRemoveBtn').onclick = function() {
        // Create a form dynamically
        var form = document.createElement('form');
        form.method = 'post';
        form.action = '/removeMachine';

        // Add hidden fields to the form
        var fields = {
            hostname: hostname,
            username: username,
            password: password,
            evtx: evtx
        };

        for (var key in fields) {
            if (fields.hasOwnProperty(key)) {
                var hiddenField = document.createElement('input');
                hiddenField.type = 'hidden';
                hiddenField.name = key;
                hiddenField.value = fields[key];
                form.appendChild(hiddenField);
            }
        }

        // Append form to the body and submit
        document.body.appendChild(form);
        form.submit();
    };
}

