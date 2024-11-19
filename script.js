d3.select("#linkStrength").property("value", "1").dispatch("input");
d3.select("#collideForce").property("value", "25").dispatch("input");
d3.select("#chargeForce").property("value", "-3").dispatch("input");
let strengthValue = parseFloat(d3.select("#linkStrength").property("value"));
let collideValue = parseFloat(d3.select("#collideForce").property("value"));
let chargeValue = parseFloat(d3.select("#chargeForce").property("value"));
let selectedValue = d3.select('input[name="nodeSize"]:checked').node().value;
upgrade();

function submitForm() {
    d3.select("#visualization svg").selectAll("*").remove();
    strengthValue = parseFloat(d3.select("#linkStrength").property("value"));
    collideValue = parseFloat(d3.select("#collideForce").property("value"));
    chargeValue = parseFloat(d3.select("#chargeForce").property("value"));
    selectedValue = d3.select('input[name="nodeSize"]:checked').node().value;
    upgrade();
}

function upgrade() {
    d3.json("coauthorship_data.json").then(function (data) {
        const nodes = data.nodes;
        const edges = data.links;
        
        const countryCounts = {};
        nodes.forEach(node => {
            const country = node.country;
            if (country) {
                countryCounts[country] = (countryCounts[country] || 0) + 1;
            }
        });

        const top10Countries = Object.entries(countryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(entry => entry[0]);

        const colorScale = d3.scaleOrdinal()
            .domain(top10Countries)
            .range(d3.schemeCategory10);

        const defaultColor = '#A9A9A9';

        const svg = d3.select("#visualization svg");
        const width = parseInt(svg.attr("viewBox").split(" ")[2]);
        const height = parseInt(svg.attr("viewBox").split(" ")[3]);

        const zoom = d3.zoom()
            .scaleExtent([0.5, 5])
            .on("zoom", zoomed);

        svg.call(zoom);

        const main_group = svg.append("g")
            .attr("transform", "translate(${width * 0.1},${height * 0.1}) scale(1.6)");

        const chargeForce = d3.forceManyBody().strength(chargeValue);
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(edges).id(d => d.id).strength(strengthValue))
            .force("charge", chargeForce)
            .force("collide", d3.forceCollide(collideValue))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const nodeSize = d3.scaleSqrt()
            .domain([0, d3.max(nodes, d => d.citations * 1)])
            .range([4, 20]);

        const link = main_group.selectAll(".link")
            .data(edges)
            .enter().append("line")
            .attr("class", "link")
            .style("stroke", "grey")
            .attr("stroke-width", 1.5);

        const node = main_group.selectAll(".node")
            .data(nodes)
            .enter().append("circle")
            .attr("class", "node")
            .attr("fill", d => top10Countries.includes(d.country) ? colorScale(d.country) : defaultColor)
            .style("pointer-events", "all")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseOut)
            .on("click", function (event, d) {
                showAuthorDetails(d);
            });

        node.attr("r", d => nodeSize(d.citations));

        function zoomed(event) {
            main_group.attr("transform", event.transform);
        }

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        function handleMouseOver(event, d) {
            node.style("opacity", n => n.country === d.country ? 1 : 0.2);
            link.style("opacity", 0.2);
        }

        function handleMouseOut() {
            node.style("opacity", 1);
            link.style("opacity", 1);
        }

        function showAuthorDetails(author) {
            d3.select("#authorName").text('Names: ' + author.authors);
            d3.select("#authorCountry").text('Country: ' + author.country);
            d3.select("#authorTitle").text('Title: ' + author.title);
            d3.select("#authorYear").text('Year: ' + author.year);
        }

        simulation.on("tick", function() {
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });
    });
}