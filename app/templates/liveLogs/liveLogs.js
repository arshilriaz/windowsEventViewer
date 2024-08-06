var tooltipOptions = {
    enabled: true,
    mode: 'point',
    intersect: true,
    callbacks: {
        label: function(tooltipItem, data) {
            var label = data.datasets[tooltipItem.datasetIndex].label || '';
            if (label) {
                label += ': ';
            }
            label += parseInt(tooltipItem.yLabel).toLocaleString();
            return label + ' events';
        }
    }
};

var ctx1 = document.getElementById('logChart1').getContext('2d');
var logChart = new Chart(ctx1, {
    type: 'bar',
    data: {
        labels: ['Critical', 'Warning', 'Verbose', 'Error', 'Information'],
        datasets: [{
            label: 'Number of Logs',
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
        }]
    }
});


var ctx2 = document.getElementById('logChart2').getContext('2d');
var logYearChart = new Chart(ctx2, {
    type: 'line',
    data: {
        labels: [2020, 2021, 2022, 2023, 2024],
        datasets: [{
            label: 'Logs by Year',
            data: [],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            pointBackgroundColor: 'rgba(54, 162, 235, 0.8)'  
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        },
        tooltips: tooltipOptions
    }
});


var formData = document.getElementById('formData');
var hostname = formData.getAttribute('data-hostname');
var username = formData.getAttribute('data-username');
var password = formData.getAttribute('data-password');

var eventSource = new EventSource('/liveLogs?hostname=' + hostname + '&username=' + username + '&password=' + password);
eventSource.onmessage = function(event) {
    var data = JSON.parse(event.data);
    logChart.data.datasets[0].data = data.counts;
    logChart.update();

    if (data.yearCounts) {
        logYearChart.data.labels = Object.keys(data.yearCounts);
        logYearChart.data.datasets[0].data = Object.values(data.yearCounts);
        logYearChart.update();
    }

    document.querySelector(".status-item:nth-child(1) .status-count").textContent = data.counts[0]; // Critical
    document.querySelector(".status-item:nth-child(2) .status-count").textContent = data.counts[1]; // Warning
    document.querySelector(".status-item:nth-child(3) .status-count").textContent = data.counts[2]; // Verbose
    document.querySelector(".status-item:nth-child(4) .status-count").textContent = data.counts[3]; // Error
    document.querySelector(".status-item:nth-child(5) .status-count").textContent = data.counts[4]; // Information
};
