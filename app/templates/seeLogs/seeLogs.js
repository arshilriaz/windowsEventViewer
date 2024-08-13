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


// Retrieve data attributes for hostname, username, and password
const formData = document.getElementById('formData');
const hostname = formData.getAttribute('data-hostname');
const username = formData.getAttribute('data-username');
const password = formData.getAttribute('data-password');

const seeLogsValue = seeLogsCheck.getAttribute('see-logs');

var eventSource = new EventSource('/liveLogs?hostname=' + hostname + '&username=' + username + '&password=' + password + '&seeLogsValue=' + seeLogsValue);

// Event listener to handle incoming log data
eventSource.onmessage = function(event) {
    var data = JSON.parse(event.data);

    console.log(data)

    // Update counts in the cards
    document.getElementById("warning-count").textContent = data.counts[3];  // Warning
    document.getElementById("error-count").textContent = data.counts[2];    // Error
    document.getElementById("info-count").textContent = data.counts[4] + data.counts[0];     // Information
    document.getElementById("total-count").textContent = data.counts.reduce((a, b) => a + b, 0); // Total Logs

    // Update Pie chart data
    const reorderedData = [data.counts[3], data.counts[2], data.counts[4] + data.counts[0]];
    logPieChart.data.datasets[0].data = reorderedData;
    logPieChart.update();

    const yearlyEventCounts = data.yearCounts;

    // Call the function to populate the dropdown
    populateYearDropdown(yearlyEventCounts);

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
    console.log(eventTypeCounts);

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
};

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
$(yearSelect).selectpicker({
    style: 'btn-primary',
    size: 4
});
}

function prepareTimeSeriesData(dailyEventData) {
const labels = Object.keys(dailyEventData).sort();  // Dates as labels
const data = labels.map(date => dailyEventData[date]);  // Event counts as data points

return {
    labels: labels,  // X-axis labels (dates)
    datasets: [{
        label: 'Daily Event Counts',
        data: data,  // Y-axis data (event counts per day)
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
