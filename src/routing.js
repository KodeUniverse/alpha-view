import { loadMarketsContent } from "./content_scripts/markets/content";

const routes = {
    '#/': loadHomeContent,
    '#/markets': loadMarketsContent,
    '#/about': loadAboutContent,
    '#/notebook': loadNotebook
};


function loadHomeContent() {
    return "<h1>Home</h1>"
}

function loadAboutContent() {
    return "<h1>About AlphaView</h1>"
}

function loadNotebook() {
    return "<h1>Notebook</h1>"
}

function handleRoute() {
    const page = window.location.hash || '#/';
    const content = routes[page] ? routes[page]() : '<h1>404: Page not found.</h1>';
    document.getElementById('main-content').innerHTML = content
}

console.log('Routing script loaded!');
window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);

document.getElementById('navbar').addEventListener("click",(e) => {
    const route = e.target.dataset.route;

    if (route) {
        e.preventDefault();
        window.location.hash = route;
    }
});

