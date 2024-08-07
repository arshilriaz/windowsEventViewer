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
            data: [0, 0, 0, 0, 0],  // Placeholder data
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
        plugins: {
            tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false,
                callbacks: {
                    title: function(tooltipItems, data) {
                        return 'Year: ' + tooltipItems[0].label;
                    },
                    label: function(tooltipItem, data) {
                        var label = data.datasets[tooltipItem.datasetIndex].label || '';
                        if (label) {
                            label += ': ';
                        }
                        label += parseInt(tooltipItem.parsed.y).toLocaleString();
                        return label + ' events';
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            intersect: true
        }
    }
});


var ctx4 = document.getElementById('logChart4').getContext('2d');
var logChart10Hours = new Chart(ctx4, {
    type: 'bar',
    data: {
        labels: ['24h', '23h', '22h', '21h', '20h', '19h', '18h', '17h', '16h', '15h', '14h', '13h', '12h', '11h', '10h', '9h', '8h', '7h', '6h', '5h', '4h', '3h', '2h', '1h'],
        datasets: [{
            label: 'Logs in the Last 24 Hours',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            backgroundColor: [
                'rgba(255, 159, 64, 0.2)',
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 255, 128, 0.2)',
                'rgba(235, 159, 64, 0.2)',
                'rgba(54, 99, 235, 0.2)',
                'rgba(255, 159, 192, 0.2)',
                'rgba(255, 159, 64, 0.2)',
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 255, 128, 0.2)',
                'rgba(235, 159, 64, 0.2)',
                'rgba(54, 99, 235, 0.2)',
                'rgba(255, 159, 192, 0.2)',
                'rgba(255, 159, 64, 0.2)',
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(75, 192, 192, 0.2)'
            ],
            borderColor: [
                'rgba(255, 159, 64, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 255, 128, 1)',
                'rgba(235, 159, 64, 1)',
                'rgba(54, 99, 235, 1)',
                'rgba(255, 159, 192, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 255, 128, 1)',
                'rgba(235, 159, 64, 1)',
                'rgba(54, 99, 235, 1)',
                'rgba(255, 159, 192, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(75, 192, 192, 1)'
            ],
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        },
        plugins: {
            tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        var labelHour = context.label; // Extract the label for the hovered bar
                        var hourNumber = labelHour.replace('h', ''); // Remove the 'h' to get just the number

                        var label = 'Logs in the last ' + hourNumber + 'th Hour: ';
                        label += context.raw;
                        return label + ' events';
                    }
                }
            }
        },
        interaction: {
            mode: 'point',
            intersect: false
        }
    }
});

function updateTreeMap(nameCounts) {
    // Convert nameCounts object to the needed array format
    var treeData = {
        name: "root",
        children: Object.keys(nameCounts).map(key => ({ name: key, value: nameCounts[key] }))
    };

    // Select the SVG for the tree map, if it doesn't exist, create one
    var svg = d3.select("#treeMap").selectAll("svg").data([null]);
    svg = svg.enter().append("svg")
            .merge(svg)
            .attr("width", 960)
            .attr("height", 500);

    // Create a color scale
    var colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create a tree map layout
    var treemap = d3.treemap()
        .size([960, 500])
        .padding(1)
        .round(true);

    var root = d3.hierarchy(treeData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    treemap(root);

    var leaf = svg.selectAll("g")
        .data(root.leaves(), d => d.data.name);

    // Enter new nodes
    var leafEnter = leaf.enter().append("g").attr("transform", d => `translate(${d.x0},${d.y0})`);
    leafEnter.append("rect")
             .attr("width", d => d.x1 - d.x0)
             .attr("height", d => d.y1 - d.y0)
             .attr("fill", d => colorScale(d.data.name));  // Use the color scale here

    leafEnter.append("text")
             .attr("x", 5)
             .attr("y", 20)
             .text(d => d.data.name)
             .attr("font-size", "10px")
             .attr("fill", "white");

    var tooltip = d3.select("body").append("div")
             .attr("class", "tooltip")
             .style("opacity", 0);
         
    leafEnter.on("mouseover", function(event, d) {
        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html("Name: " + d.data.name + "<br/>" + "Logs: " + d.data.value)
            .style("left", (event.pageX) + "px")
            .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    });

    // Update existing nodes
    leaf.select("rect").transition().duration(750)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0);

    leaf.transition().duration(750)
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    leaf.select("text")
        .text(d => d.data.name);

    // Exit old nodes
    leaf.exit().remove();
}

// function adjustBorder() {
//     const treeMap = document.getElementById('treeMap');
//     if (treeMap) {
//         const bbox = treeMap.querySelector('svg').getBBox(); // Get the bounding box of the SVG
//         const contentWidth = bbox.width; // Use the width from the bounding box of the SVG content
//         treeMap.style.border = `${contentWidth}px solid #000000`; // Set the border with dynamic width based on SVG content
//         console.log("Border adjusted to: " + contentWidth + "px");
//     }
// }

var formData = document.getElementById('formData');
var hostname = formData.getAttribute('data-hostname');
var username = formData.getAttribute('data-username');
var password = formData.getAttribute('data-password');

var eventSource = new EventSource('/liveLogs?hostname=' + hostname + '&username=' + username + '&password=' + password);
eventSource.onmessage = function(event) {
    var data = JSON.parse(event.data);
    logChart.data.datasets[0].data = data.counts;
    logChart.update();

    document.querySelector(".status-item:nth-child(1) .status-count").textContent = data.counts[0]; // Critical
    document.querySelector(".status-item:nth-child(2) .status-count").textContent = data.counts[1]; // Warning
    document.querySelector(".status-item:nth-child(3) .status-count").textContent = data.counts[2]; // Verbose
    document.querySelector(".status-item:nth-child(4) .status-count").textContent = data.counts[3]; // Error
    document.querySelector(".status-item:nth-child(5) .status-count").textContent = data.counts[4]; // Information

    if (data.yearCounts) {
        logYearChart.data.labels = Object.keys(data.yearCounts);
        logYearChart.data.datasets[0].data = Object.values(data.yearCounts);
        logYearChart.update();
    }

    if (data.tenHourCount) {
        var last10HoursData = Object.values(data.tenHourCount).reverse(); // Ensure this key matches the one from your server
        logChart10Hours.data.datasets[0].data = last10HoursData;
        logChart10Hours.update();
    }

    if(data.nameCounts) {
        updateTreeMap(data.nameCounts);
        updateCharts(data);
        // Assuming this function is called after D3 has rendered the tree map
        // adjustBorder();
    }
};
