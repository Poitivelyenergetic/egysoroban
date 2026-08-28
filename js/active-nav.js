/* Marks the header link for the page you're currently on, so the nav shows
   where you are. Driven off the URL rather than a per-page flag in the markup,
   which keeps the nav block identical across every page. */

function currentFile() {
    var path = window.location.pathname || "";
    var last = path.split("/").pop();
    return last === "" ? "index.html" : last.toLowerCase();
}

function fileFromHref(href) {
    if (!href) return "";
    var withoutHash = href.split("#")[0].split("?")[0];
    var last = withoutHash.split("/").pop();
    return last.toLowerCase();
}

var here = currentFile();
var links = document.querySelectorAll("#main-nav a");
for (var i = 0; i < links.length; i++) {
    if (fileFromHref(links[i].getAttribute("href")) === here) {
        links[i].setAttribute("aria-current", "page");
    }
}
