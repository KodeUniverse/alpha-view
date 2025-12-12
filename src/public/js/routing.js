import { loadMarketsContent } from "./page_content/markets/content.js";
import { loadNotebookContent } from "./page_content/notebook/content.js";
import { loadHomeContent } from "./page_content/home/content.js";
import { loadAboutContent } from "./page_content/about/content.js";

const routes = {    
    '#/': loadHomeContent,
    '#/markets': loadMarketsContent,
    '#/about': loadAboutContent,
    '#/notebook': loadNotebookContent
};

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