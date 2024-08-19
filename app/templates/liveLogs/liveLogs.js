// Retrieve data attributes for hostname, username, and password
const formData = document.getElementById('formData');
const hostname = formData.getAttribute('data-hostname');
const username = formData.getAttribute('data-username');
const password = formData.getAttribute('data-password');

const seeLogsValue = seeLogsCheck.getAttribute('see-logs');

var eventSource = new EventSource('/liveLogs?hostname=' + hostname + '&username=' + username + '&password=' + password + '&seeLogsValue=' + seeLogsValue);

eventSource.onerror = function(event) {
    console.error("An error occurred while connecting to the EventSource.", event);

    // Display a toast notification for the error
    $(document).Toasts('create', {
        class: 'bg-danger', 
        title: 'Error',
        body: 'An error occurred while retrieving live logs. Please try again.',
        autohide: true,
        delay: 5000 // Adjust the delay as needed
    });

    // Optionally, close the EventSource connection
    eventSource.close();
};

// Define a consistent color mapping for log levels
const cardColors = {
    'Critical': { bgColor: 'bg-danger', color: 'rgba(255, 99, 132, 0.6)', borderColor: 'rgba(255, 99, 132, 1)' },
    'Warning': { bgColor: 'bg-warning', color: 'rgba(255, 206, 86, 0.6)', borderColor: 'rgba(255, 206, 86, 1)' },
    'Error': { bgColor: 'bg-danger', color: 'rgba(255, 69, 0, 0.6)', borderColor: 'rgba(255, 69, 0, 1)' }, // Explicit danger color
    'Information': { bgColor: 'bg-info', color: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)' },
    'Default': { bgColor: 'bg-secondary', color: 'rgba(153, 102, 255, 0.6)', borderColor: 'rgba(153, 102, 255, 1)' }
};

const cardIcons = {
    'Critical': { icon: 'fas fa-times-circle' },
    'Warning': { icon: 'fas fa-exclamation-triangle' },
    'Error': { icon: 'fas fa-times-circle' }, // Explicit danger color
    'Information': { icon: 'fas fa-info-circle' },
    'Default': { icon: 'fas fa-info-circle' }
};

$(document).ready(function () {
    $('#collapseButton').on('click', function () {
        const icon = $('#collapse-icon');
        const isCollapsed = $('#logDetailsCollapse').hasClass('show');

        if (isCollapsed) {
            icon.removeClass('fa-minus').addClass('fa-plus');
        } else {
            icon.removeClass('fa-plus').addClass('fa-minus');
        }
    });
});

// Event listener to handle incoming log data
eventSource.onmessage = function(event) {
    var data = JSON.parse(event.data);

    // Update counts in the cards
    document.getElementById("info-count").textContent = data.counts[0]     // Information
    document.getElementById("warning-count").textContent = data.counts[1];  // Warning
    document.getElementById("error-count").textContent = data.counts[2];    // Error
    document.getElementById("total-count").textContent = data.counts[0] + data.counts[1] + data.counts[2]

    // Update Pie chart data
    const reorderedData = [data.counts[1], data.counts[2], data.counts[0]];
    logPieChart.data.datasets[0].data = reorderedData;
    logPieChart.update();

    generateLogCards(data.allLogs);

    const yearlyEventCounts = data.yearCounts;

    const yearSelect = document.getElementById('yearSelect');
    yearSelect.removeEventListener('change', handleYearChange); // Remove existing listener if any

    function handleYearChange() {
        const selectedYear = this.value;

        if (selectedYear === 'all') {
            // Load the existing line graph for all years
            logLineChart.data = prepareYearlyLineChartData(yearlyEventCounts);
            logLineChart.update();

            // Update donut charts for all years
            updateDonutCharts(data.all_year_split_counts.all_years);
        } else {
            // Load a time series graph for the selected year
            const dailyEventData = data.dailyEventCounts[selectedYear] || {};
            logLineChart.data = prepareTimeSeriesData(dailyEventData);
            logLineChart.update();

            // Update donut charts for the selected year
            updateDonutCharts(data.all_year_split_counts[selectedYear]);
        }
    }

    // Ensure that data is correctly assigned to the chart and then updated
    // if (logLineChart) {
    //     logLineChart.destroy();
    // }

    // if (infoChart) {
    //     infoChart.destroy();
    // }

    // Call the function to populate the dropdown
    populateYearDropdown(yearlyEventCounts);

    // Reinitialize the selectpicker after updating the dropdown
    $('#yearSelect').selectpicker('refresh');

    document.getElementById('yearSelect').addEventListener('change', function () {
        const selectedYear = this.value;

        if (selectedYear === 'all') {
            // Load the existing line graph for all years
            logLineChart.data = prepareYearlyLineChartData(yearlyEventCounts);
            logLineChart.update();

            // Update donut charts for all years
            updateDonutCharts(data.all_year_split_counts.all_years);
        } else {
            // Load a time series graph for the selected year
            const dailyEventData = data.dailyEventCounts[selectedYear] || {};
            logLineChart.data = prepareTimeSeriesData(dailyEventData);
            logLineChart.update();

            // Update donut charts for the selected year
            updateDonutCharts(data.all_year_split_counts[selectedYear]);
        }
    });

    // Prepare data for the line chart
    const lineChartData = prepareYearlyLineChartData(yearlyEventCounts);

    // Create gradient fill
    const ctx = document.getElementById('logLineChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(75, 192, 192, 0.4)'); // Top color
    gradient.addColorStop(1, 'rgba(75, 192, 192, 0)');   // Bottom color

    // Assign the gradient as the background color
    lineChartData.datasets[0].backgroundColor = gradient;

    // Ensure that data is correctly assigned to the chart and then updated
    logLineChart.data = lineChartData;
    logLineChart.update();  // Update the chart to reflect new data

    // Assuming `data` is the object containing all necessary event data
    const totalEvents = data.all_year_split_counts.all_years.Information +
                        data.all_year_split_counts.all_years.Warning +
                        data.all_year_split_counts.all_years.Error; // Calculate total events for normalization

    updateDonutCharts(data.all_year_split_counts.all_years);

    function updateDonutCharts(splitCounts) {
        const totalLogs = splitCounts.Information + splitCounts.Warning + splitCounts.Error;

        // Update Information Chart
        updateChart(infoChart, splitCounts.Information, totalLogs, 'Information');

        // Update Warning Chart
        updateChart(warningChart, splitCounts.Warning, totalLogs, 'Warning');

        // Update Error Chart
        updateChart(errorChart, splitCounts.Error, totalLogs, 'Error');
    }

    // Function to update individual charts
    function updateChart(chartInstance, eventCount, totalCount, label) {
        const proportion = (eventCount / totalCount) * 100;
        const remaining = 100 - proportion; // Remaining percentage

        chartInstance.data.datasets[0].data = [proportion, remaining];
        chartInstance.data.labels = [label, 'Other'];

        chartInstance.update();
    }

    const eventTypeCounts = data.nameCounts;

    const labels = Object.keys(eventTypeCounts);
    const dataValues = Object.values(eventTypeCounts);

    // Update the dropdown with new labels
    const eventSelector = $('#eventSelector');
    eventSelector.empty(); // Clear existing options
    labels.forEach(label => {
        eventSelector.append(new Option(label, label)); // Add new options dynamically
    });
    eventSelector.selectpicker('refresh'); // Refresh to apply the changes

    // Update the chart labels and data
    eventTypeChart.data.labels = labels;
    eventTypeChart.data.datasets[0].data = dataValues;

    // Get the currently selected events
    const selectedEvents = $('#eventSelector').val();

    // Update the colors of the bars based on the selected events
    eventTypeChart.data.datasets[0].backgroundColor = labels.map(label => {
        return selectedEvents.includes(label) ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 0.6)'; // Highlight selected, default color for others
    });

    eventTypeChart.data.datasets[0].borderColor = labels.map(label => {
        return selectedEvents.includes(label) ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 0.6)'; // Border color to match
    });

    $('#eventSelector').on('changed.bs.select', function () {
        const selectedEvents = $(this).val(); // Get selected event types

        // Update the chart colors
        eventTypeChart.data.datasets[0].backgroundColor = labels.map(label => {
            return selectedEvents.includes(label) ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)'; // Highlight selected
        });

        eventTypeChart.data.datasets[0].borderColor = labels.map(label => {
            return selectedEvents.includes(label) ? 'rgba(255, 99, 132, 0.4)' : 'rgba(75, 192, 192, 0.4)'; // Highlight selected
        });

        eventTypeChart.update(); // Update the chart
    });

    // Add this after the existing code or within your document ready function
    $('#clearAllButton').click(function() {
        // Clear the dropdown selections
        $('#eventSelector').val([]).selectpicker('refresh');

        // Reset the chart colors to the default for all bars
        eventTypeChart.data.datasets[0].backgroundColor = labels.map(label => 'rgba(75, 192, 192, 0.6)');
        eventTypeChart.data.datasets[0].borderColor = labels.map(label => 'rgba(75, 192, 192, 0.6)');

        eventTypeChart.update(); // Update the chart to reflect the changes
    });

    eventTypeChart.update();

    displayLogsForLevel(globalLevel || 'Total', false);
};

$(document).on('click', '[data-card-widget="maximize"]', function() {
    const card = $(this).closest('.card');
    const canvas = card.find('canvas')[0];

    if (!card.hasClass('maximized')) {
        // If the card is not maximized, maximize it
        card.addClass('maximized');
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        $(this).find('i').removeClass('fa-expand').addClass('fa-compress');
    } else {
        // If the card is already maximized, minimize it back
        card.removeClass('maximized');
        canvas.style.width = '';
        canvas.style.height = '';
        $(this).find('i').removeClass('fa-compress').addClass('fa-expand');
    }

    // Resize the chart instance after the canvas size change
    setTimeout(() => {
        const chartInstance = Chart.getChart(canvas.id);
        if (chartInstance) {
            chartInstance.resize();
        }
    }, 300);  // Adjust timeout if necessary to sync with CSS transitions
});

function prepareYearlyLineChartData(yearlyEventCounts) {
    const labels = Object.keys(yearlyEventCounts).sort(); // Sorting years
    const data = labels.map(year => yearlyEventCounts[year]);

    const ctx = document.getElementById('logLineChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(75, 192, 192, 0.4)'); // Top color
    gradient.addColorStop(1, 'rgba(75, 192, 192, 0)');   // Bottom color

    return {
        labels: labels, // X-axis labels (years)
        datasets: [{
            label: 'Event Counts',
            data: data, // Y-axis data (counts per year)
            fill: true,
            backgroundColor: gradient, // Apply gradient fill here
            borderColor: 'rgba(75, 192, 192, 1)', // Line color
            tension: 0.1
        }]
    };
}

$(document).ready(function() {
    $('#eventSelector').selectpicker({
        liveSearch: true,  // Ensure live search is enabled
        liveSearchNormalize: true,  // Allow substring matching
        liveSearchStyle: 'contains',  // Search for any part of the option text
        size: 10  // Number of options to display before scrolling
    });
});

function populateYearDropdown(yearlyEventCounts) {
    const yearSelect = document.getElementById('yearSelect');

    // Clear existing options except the "All Years" option
    yearSelect.innerHTML = '<option value="all">All Years</option>';

    Object.keys(yearlyEventCounts).forEach(year => {
        if (yearlyEventCounts[year] !== 0) {  // Only add years with events
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    });

    // Apply Bootstrap Select styling for better appearance
    $(document).ready(function () {
        $('#yearSelect').selectpicker({
            style: 'btn-primary',
            size: 4
        });
    });
}

function prepareTimeSeriesData(dailyEventData) {
    // Extract unique months from the dates
    const monthSet = new Set();
    const labels = Object.keys(dailyEventData).map(date => {
        const dateObj = new Date(date);
        const monthYear = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
        monthSet.add(monthYear);
        return monthYear;
    });

    const uniqueLabels = Array.from(monthSet);

    // Aggregate data by month
    const monthData = uniqueLabels.map(month => {
        return Object.keys(dailyEventData).reduce((total, date) => {
            const dateObj = new Date(date);
            const monthYear = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
            return monthYear === month ? total + dailyEventData[date] : total;
        }, 0);
    });

    return {
        labels: uniqueLabels,  // X-axis labels (unique months)
        datasets: [{
            label: 'Monthly Event Counts',
            data: monthData,  // Y-axis data (aggregated event counts per month)
            fill: false,
            borderColor: 'rgba(75, 192, 192, 1)',  // Line color
            tension: 0.1
        }]
    };
}



// Example for the Pie chart
const ctx = document.getElementById('logPieChart').getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 0, 400);
gradient.addColorStop(0, 'rgba(75, 192, 192, 0.2)');
gradient.addColorStop(1, 'rgba(75, 192, 192, 0.8)');

const logPieChart = new Chart(ctx, {
type: 'pie',
data: {
    labels: ['Warning', 'Error', 'Information'],
    datasets: [{
        data: [5, 3, 15], // Replace with actual log counts
        backgroundColor: [
            'rgba(255, 206, 86, 0.6)',
            'rgba(255, 102, 102, 0.6)',
            'rgba(54, 162, 235, 0.6)'
        ],
        borderColor: [
            'rgba(255, 206, 86, 1)',
            'rgba(255, 102, 102, 1)',
            'rgba(54, 162, 235, 1)'
        ],
        borderWidth: 1
    }]
},
options: {
    responsive: true,
    animation: {
        duration: 2000, // Animation duration in milliseconds
        easing: 'easeInOutQuad', // Easing function for the animation
    },
    plugins: {
        legend: {
            position: 'top',
        },
        tooltip: {
            callbacks: {
                label: function(tooltipItem) {
                    let label = tooltipItem.label || '';
                    if (label) {
                        label += ': ';
                    }
                    label += tooltipItem.raw;

                    // Calculate percentage
                    const total = tooltipItem.chart.data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                    const percentage = ((tooltipItem.raw / total) * 100).toFixed(2); // Rounded to 2 decimal places

                    // Append percentage to the label
                    return `${label} logs (${percentage}%)`;
                }

            }
        }
    }
}
});


const lineCtx = document.getElementById('logLineChart').getContext('2d');
const logLineChart = new Chart(lineCtx, {
type: 'line',
data: {
    labels: ['2020', '2021', '2022', '2023', '2024'],
    datasets: [{
        data: [0, 1100, 800, 900, 1400], // Replace with actual log counts
        backgroundColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(75, 192, 192, 1)'
        ],
        borderColor: [
            'rgba(75, 192, 192, 0.4)',
            'rgba(75, 192, 192, 0.4)',
            'rgba(75, 192, 192, 0.4)',
            'rgba(75, 192, 192, 0.4)',
            'rgba(75, 192, 192, 0.4)'
        ],
        borderWidth: 1
    }]
},
options: {
    responsive: true,
    plugins: {
        legend: {
            position: 'top',
        },
        tooltip: {
            callbacks: {
                label: function(tooltipItem) {
                    let label = tooltipItem.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    label += tooltipItem.raw;
                    return label + ' events';
                },
                title: function(tooltipItems) {
                    return 'Year: ' + tooltipItems[0].label;
                }
            },
            displayColors: true, // Optionally show color boxes next to labels
            backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darken background for better readability
            titleFont: {
                size: 14,
                weight: 'bold'
            },
            bodyFont: {
                size: 12,
                style: 'italic'
            },
            padding: 10, // Add some padding to the tooltip
            caretPadding: 5, // Distance between the tooltip and the element being hovered
        }
    },
    scales: {
        x: {
            title: {
                display: true,
                text: 'Year'
            }
        },
        y: {
            title: {
                display: true,
                text: 'Number of Events'
            }
        }
    }
}
});

// Initialize Dummy Data
const dummyInfoProportion = 30;  // Example dummy data: 30% Information
const dummyWarningProportion = 50;  // Example dummy data: 50% Warning
const dummyErrorProportion = 20;  // Example dummy data: 20% Error

// Information Chart
const ctxInfo = document.getElementById('infoChart').getContext('2d');
const infoChart = new Chart(ctxInfo, {
    type: 'doughnut',
    data: {
        datasets: [{
            data: [dummyInfoProportion, 100 - dummyInfoProportion], // Initialize with dummy data
            backgroundColor: [
                'rgba(54, 162, 235, 0.6)',  // Active color
                'rgba(220, 220, 220, 0.6)'  // Inactive color
            ],
            hoverBackgroundColor: [
                'rgba(54, 162, 235, 1)',
                'rgba(220, 220, 220, 0.8)'
            ],
            borderColor: 'white'
        }]
    },
    options: {
        responsive: true,
        cutout: '50%',
        plugins: {
            legend: {
                display: false
            }
        }
    }
});

// Repeat similarly for the Warning and Error Charts
const ctxWarning = document.getElementById('warningChart').getContext('2d');
const warningChart = new Chart(ctxWarning, {
    type: 'doughnut',
    data: {
        datasets: [{
            data: [dummyWarningProportion, 100 - dummyWarningProportion], // Dummy data
            backgroundColor: [
                'rgba(255, 206, 86, 0.6)',  // Active color
                'rgba(220, 220, 220, 0.6)'  // Inactive color
            ],
            hoverBackgroundColor: [
                'rgba(255, 206, 86, 1)',
                'rgba(220, 220, 220, 0.8)'
            ],
            borderColor: 'white'
        }]
    },
    options: {
        responsive: true,
        cutout: '50%',
        plugins: {
            legend: {
                display: false
            }
        }
    }
});

// Error Chart
const ctxError = document.getElementById('errorChart').getContext('2d');
const errorChart = new Chart(ctxError, {
    type: 'doughnut',
    data: {
        datasets: [{
            data: [dummyErrorProportion, 100 - dummyErrorProportion], // Dummy data
            backgroundColor: [
                'rgba(255, 99, 132, 0.6)',  // Active color
                'rgba(220, 220, 220, 0.6)'  // Inactive color
            ],
            hoverBackgroundColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(220, 220, 220, 0.8)'
            ],
            borderColor: 'white'
        }]
    },
    options: {
        responsive: true,
        cutout: '50%',
        plugins: {
            legend: {
                display: false
            }
        }
    }
});

const barCtx = document.getElementById('eventTypeChart').getContext('2d');
const eventTypeChart = new Chart(barCtx, {
    type: 'bar',
    data: {
        labels: ['VSS', 'SecurityCenter', 'ESENT', 'Microsoft-Windows-Security-SPP', 'edgeupdate'],
        datasets: [{
            data: [27, 104, 60, 1084, 45], // Replace with actual log counts
            backgroundColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(75, 192, 192, 1)'
            ],
            borderColor: [
                'rgba(75, 192, 192, 0.4)',
                'rgba(75, 192, 192, 0.4)',
                'rgba(75, 192, 192, 0.4)',
                'rgba(75, 192, 192, 0.4)',
                'rgba(75, 192, 192, 0.4)'
            ],
            borderWidth: 1
        }]
    },
    options: {
        indexAxis: 'y', // This makes the bar chart horizontal
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                beginAtZero: true
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(tooltipItem) {
                        return tooltipItem.label + ': ' + tooltipItem.raw;
                    }
                }
            }
        }
    },
    plugins: [{
        afterDraw: chart => {
            const ctx = chart.ctx;
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((bar, index) => {
                    const value = dataset.data[index];
                    ctx.fillStyle = '#444';
                    ctx.font = 'bold 12px Arial';
                    ctx.fillText(value, bar.x + 5, bar.y + 5); // Adjust this to place the text as needed
                });
            });
        }
    }]
});

var storedLogs = {};
var globalLevel = "";

function generateLogCards(allLogs) {
    storedLogs = allLogs; // Update the global variable

    // Add click event listeners to each card
    // Select all the cards using the class 'small-box'
    const cards = document.querySelectorAll('.small-box');

    cards.forEach(card => {
        card.addEventListener('click', function () {
            // Perform any necessary actions here
            storedLogs = allLogs;
            const logLevel = this.getAttribute('data-log-level');
            displayLogsForLevel(logLevel, false);  // Assuming this function is defined elsewhere
        });
    });
}
 
document.getElementById('timeFilter').addEventListener('change', function () {
    const activeCard = document.querySelector('.small-box.active');
    const logLevel = activeCard.getAttribute('data-log-level');
    displayLogsForLevel(logLevel, false);
});

document.getElementById('numberFilter').addEventListener('input', function () {
    const logLevel = document.querySelector('.small-box.active')?.getAttribute('data-log-level');
    displayLogsForLevel(logLevel, true);
});
 
function displayLogsForLevel(level, changeNumber) {
    const logDetails = document.getElementById('log-details');
    const logDetailsBody = document.getElementById('log-details-body');
    const timeFilter = document.getElementById('timeFilter').value;
    const numberFilter = parseInt(document.getElementById('numberFilter').value);

    // Clear previous logs
    logDetailsBody.innerHTML = '';
    let filteredLogs = storedLogs

    if(level != 'Total') {
        // Work on a filtered copy of storedLogs
        filteredLogs = storedLogs.filter(log => log.LevelDisplayName === level);
    }

    // Apply time filter
    const now = new Date();
    if (timeFilter === 'last24hours') {
        const last24Hours = now - (24 * 60 * 60 * 1000);
        filteredLogs = filteredLogs.filter(log => parseInt(log.TimeCreated.match(/\d+/)[0]) >= last24Hours);
    } else if (timeFilter === 'last7days') {
        const last7Days = now - (7 * 24 * 60 * 60 * 1000);
        filteredLogs = filteredLogs.filter(log => parseInt(log.TimeCreated.match(/\d+/)[0]) >= last7Days);
    } else if (timeFilter === 'last30days') {
        const last30Days = now - (30 * 24 * 60 * 60 * 1000);
        filteredLogs = filteredLogs.filter(log => parseInt(log.TimeCreated.match(/\d+/)[0]) >= last30Days);
    }

    if(!changeNumber) {
        const number_Filter = document.getElementById('numberFilter');
        roundedNumber = Math.ceil(filteredLogs.length / 10) * 10;
        number_Filter.max = roundedNumber;
        number_Filter.value = roundedNumber; // Set the initial value to the max (total logs)
        updateNumberFilterLabel(roundedNumber)
    }

    // Apply the number filter
    filteredLogs = filteredLogs.slice(0, numberFilter);

    // Sort based on newest
    filteredLogs.sort((a, b) => new Date(b.TimeCreatedLocal.DateTime) - new Date(a.TimeCreatedLocal.DateTime));

    // Populate the table with logs
    filteredLogs.forEach(log => {
        const row = `
        <tr class="log-row" data-toggle="modal" data-target="#logDetailModal" data-log-id="${log.RecordId}">
            <td>${log.LevelDisplayName}</td>
            <td>${log.Id}</td>
            <td>${log.TimeCreatedLocal.DateTime}</td>
            <td>${log.ProviderName}</td>
        </tr>
        `;
        logDetailsBody.insertAdjacentHTML('beforeend', row);
    });

    // Show the log details section
    logDetails.style.display = 'block';

    // Add event listener to rows to trigger modal with log details
    const logRows = document.querySelectorAll('.log-row');

    logRows.forEach(row => {
        row.addEventListener('click', function () {
            const logId = this.getAttribute('data-log-id');
            displayLogDetailsModal(logId);
        });
    });

    updateLogCount();
}

function displayLogDetailsModal(logId) {
    // Find the log with the matching ID from storedLogs
    const logFind = storedLogs.find(log => log.RecordId == logId);

    // // Check if the log is found
    // if (!logFind) {
    //     console.error(`Log with ID ${logId} not found.`);
    //     return;
    // }

    // Populate the modal with log details
    console.log(logFind)
    const modalLogDetails = document.getElementById('modal-log-details');
    modalLogDetails.innerHTML = `
        <p><strong>Event ID:</strong> ${logFind.Id}</p>
        <p><strong>Event Level:</strong> ${logFind.LevelDisplayName}</p>
        <p><strong>Time Created:</strong> ${logFind.TimeCreatedLocal.DateTime}</p>
        <p><strong>Provider Name:</strong> ${logFind.ProviderName}</p>
        <p><strong>Message:</strong> ${logFind.Message}</p>
    `;
}

function updateNumberFilterLabel(value) {
    document.getElementById('numberFilterLabel').textContent = value;
}

function makeActive(element) {
    // Remove active class from all small-box elements
    document.querySelectorAll('.small-box').forEach(function(box) {
        box.classList.remove('active');
    });

    // Add active class to the clicked element
    element.classList.add('active');
}

function updateLogCount() {
    var logCount = document.getElementById('log-details-body').getElementsByTagName('tr').length;
    document.getElementById('log-count').textContent = logCount;
}

$('.card').on('shown.bs.collapse', function () {
    $(this).find('.card-body').css({
        'max-height': '400px',
        'overflow-y': 'auto'
    });
});

document.getElementById('logSearch').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    const logRows = document.querySelectorAll('.log-row');

    logRows.forEach(row => {
        const rowText = row.textContent.toLowerCase();
        if (rowText.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

$(document).ready(function () {
    $('#collapseButton').on('click', function () {
        const icon = $('#collapse-icon');
        const collapseElement = $('#logDetailsCollapse');

        collapseElement.collapse('toggle');

        collapseElement.on('shown.bs.collapse', function () {
            icon.removeClass('fa-plus').addClass('fa-minus');
        }).on('hidden.bs.collapse', function () {
            icon.removeClass('fa-minus').addClass('fa-plus');
        });
    });
});
