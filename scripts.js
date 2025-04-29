// scripts.js

// Wait for the DOM to fully load
document.addEventListener("DOMContentLoaded", () => {
    console.log("JavaScript is connected and running!");
});

function displayMarketNews() {
    $.getJSON("localhost:8080/scraping/data/finviz.json", function(data) {const newsArray = JSON.parse(data);
        newsArray.foreach((newsItem) => { 
            const newsDiv = document.createElement("div");
            newsDiv.classList.add("news-item");
            newsDiv.innerHTML = `
                <table>
                    <tr>
                        <th>Market News</th>
                    <\tr>
                    <tr>
                        <td><p>${newsItem.Date}</p></td>
                        <td><a href="${newsItem.URL}">${newsItem.Headline}</a>
                    </tr>
            `;
            document.getElementById("market-news").appendChild(newsDiv);
        }) });
    
}

function displayJsonInTable() {
    fetch("localhost:8080/scraping/data/finviz.json")
        .then(response => response.json())
        .then(data => {
            const table = document.createElement("table");
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Headline</th>
                        <th>URL</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;
            const tbody = table.querySelector("tbody");

            data.forEach(item => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${item.Date}</td>
                    <td>${item.Headline}</td>
                    <td><a href="${item.URL}" target="_blank">Link</a></td>
                `;
                tbody.appendChild(row);
            });

            document.getElementById("json-table").appendChild(table);
        })
        .catch(error => console.error("Error fetching JSON data:", error));
}