// Form submission with manual bundling
document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent normal form submission

    var hostname = document.querySelector('input[name="hostname"]').value;
    var username = document.querySelector('input[name="username"]').value;
    var password = document.querySelector('input[name="password"]').value;
    var confirmPassword = document.querySelector('input[name="confirm-password"]').value;
    var evtxCheck = document.getElementById('evtxCheck').checked;
    var evtxFile = document.querySelector('input[name="evtxfile"]').files[0];

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    // Bundle the data as JSON
    var details = {
        hostname: hostname,
        username: username,
        password: password,
    };

    var formData = new FormData();
    formData.append('hostfile', new Blob([JSON.stringify({ details: [details] })], { type: "application/json" }));

    if (evtxCheck && evtxFile) {
        formData.append('evtxfile', evtxFile);
    }

    fetch(evtxCheck ? '/upload_evtx' : '/upload', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.ok) {
            // Reset the form and redirect
            document.getElementById('uploadForm').reset();
            window.location.href = "hosts";
        
            // Show success toast
            $(document).Toasts('create', {
                class: 'bg-success', // Set the background color to success (green)
                title: 'Success',
                body: 'Upload completed successfully!',
                autohide: true,
                delay: 3000 // The toast will disappear after 3 seconds
            });
        } else {
            return response.json().then(errorMsg => {  // Change .text() to .json()
                showError(errorMsg.message); // Use the 'message' key from the JSON response
            });
        }
    }).catch(error => {
        console.error("Error:", error);
        showError("Upload failed due to an error!");
    });
});

// Toggle EVTX file input based on checkbox
document.getElementById('evtxCheck').addEventListener('change', function() {
    var evtxFileInput = document.getElementById('evtxFileInput');
    if (this.checked) {
        evtxFileInput.style.display = 'block';
    } else {
        evtxFileInput.style.display = 'none';
        evtxFileInput.querySelector('input').value = ''; // Clear file input when disabled
    }
});

function showError(message) {
    var errorDiv = document.getElementById('uploadError');
    var errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorDiv.style.display = 'block';
}

document.getElementById('evtxCheck').addEventListener('change', function() {
    var evtxFileInput = document.querySelector('input[name="evtxfile"]');
    if (this.checked) {
        evtxFileInput.disabled = false; // Enable the file input when checkbox is checked
    } else {
        evtxFileInput.disabled = true; // Disable the file input when checkbox is unchecked
        evtxFileInput.value = ''; // Clear the file input value
    }
});