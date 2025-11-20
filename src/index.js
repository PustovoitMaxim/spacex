import { SpaceX } from "./api/spacex";
import * as d3 from "d3";
import * as Geo from './geo.json';

document.addEventListener("DOMContentLoaded", setup);

let svg;
let launchpads_map = new Map();
let tooltip;
let launchDetailsDiv;

function setup() {
    const spaceX = new SpaceX();
    launchDetailsDiv = document.getElementById("details");

    drawMap();

    spaceX.launchpads().then(pads => {
        const padCoords = prepareLaunchpads(pads);
        drawLaunchpads(padCoords);
        spaceX.launches().then(launches => {
            renderLaunches(launches, document.getElementById("listContainer"));
        });
    });
}

function renderLaunches(launches, container) {
    const list = document.createElement("ul");
    launches.forEach(launch => {
        const item = document.createElement("li");
        item.classList.add('hoverable');
        item.innerHTML = launch.name;
        item.dataset.launchpad = launch.launchpad;
        item.dataset.success = launch.success;
        item.dataset.rocket = launch.rocket;
        item.dataset.date = launch.date_utc;

        list.appendChild(item);

        item.addEventListener("mouseover", () => {
            highlightLaunchpad(launch.launchpad, true, launch);
        });

        item.addEventListener("mouseout", () => {
            highlightLaunchpad(launch.launchpad, false);
        });
    });
    container.replaceChildren(list);
}

function prepareLaunchpads(launchpads) {
    let arr = [];
    launchpads.forEach(p => {
        const coord = [p.longitude, p.latitude];
        arr.push({ id: p.id, coord, name: p.name });
        launchpads_map.set(p.id, coord);
    });
    return arr;
}

function drawMap() {
    const width = 640;
    const height = 480;
    const margin = { top: 20, right: 10, bottom: 40, left: 10 };

    const projection = d3.geoMercator()
        .scale(140)
        .center([0, 20])
        .translate([width / 2 - margin.left, height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    svg = d3.select('#map').append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    svg.append("g")
        .selectAll("path")
        .data(Geo.features)
        .join("path")
        .attr("class", "topo")
        .attr("d", pathGenerator)
        .attr("fill", "#cce5df")
        .style("stroke", "#333")
        .style("opacity", 0.7);

    tooltip = d3.select("body").append("div")
        .attr("class", "tooltip");
}

function drawLaunchpads(data) {
    const projection = d3.geoMercator().scale(140).center([0,20]).translate([640/2 - 10, 480/2]);

    svg.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => projection(d.coord)[0])
        .attr("cy", d => projection(d.coord)[1])
        .attr("r", 5)
        .attr("fill", "black") // изначально все черные
        .attr("data-id", d => d.id)
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`${d.name}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 0);
        });
}

function highlightLaunchpad(id, hover, launch) {
    svg.selectAll("circle")
        .filter(d => d.id === id)
        .transition()
        .duration(150)
        .attr("r", hover ? 8 : 5)
        .attr("fill", d => hover ? getLaunchColor(launch.success) : "black");

    if (hover && launch) {
        launchDetailsDiv.innerHTML = `
            <p><strong>Launch name:</strong> ${launch.name}</p>
            <p><strong>Rocket ID:</strong> ${launch.rocket}</p>
            <p><strong>Date (UTC):</strong> ${new Date(launch.date_utc).toLocaleString()}</p>
            <p><strong>Success:</strong> ${launch.success === true ? '✅' : launch.success === false ? '❌' : '❓'}</p>
        `;
    } else if (!hover) {
        launchDetailsDiv.innerHTML = "";
    }
}

function getLaunchColor(success) {
    if (success === true) return "green";
    if (success === false) return "red";
    return "blue";
}
