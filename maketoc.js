(function () {
    const TITLE_MAX_LENGTH = 50;
    const RIGHT_ARROW = "→";

    const CONTAINER_CLASSES = `
mktc-top-8 mktc-left-8 mktc-fixed
mktc-bg-white mktc-prose mktc-prose-sm
mktc-rounded-lg mktc-shadow-md hover:mktc-shadow-lg mktc-transition-shadow mktc-duration-300
mktc-max-h-3/4 mktc-overflow-x-hidden mktc-overflow-y-hidden`;

    const TOC_CLASSES = `
mktc-hidden mktc-pb-4 mktc-px-8 mktc-mt-0
mktc-text-sm mktc-text-gray-900`;

    const PLACEHOLDER_CLASSES = `
mktc-block
mktc-text-5xl mktc-font-bold mktc-cursor-pointer mktc-w-min
mktc-mr-auto mktc-py-1 mktc-px-3
mktc-transform mktc-transition-transform mktc-duration-300`;

    function compose(g, f) {
        return function (x) {
            return g(f(x));
        }
    }

    function renderTitle(titleText) {
        if (titleText.length > TITLE_MAX_LENGTH) {
            return `${titleText.substring(0, TITLE_MAX_LENGTH)}…`;
        } else {
            return titleText;
        }
    }

    function getHeaders() {
        return Array.from(document.querySelectorAll("h2,h3,h4,h5,h6"));
    }

    function last(array) {
        return array.length > 0 ? array[array.length - 1] : null;
    }

    function eqTagName(a, b) {
        return a.tagName === b.tagName;
    }

    function groupBy(elements, predicate, initial, append, newGroup) {
        const _append = append === undefined ? (accum, next) => last(accum).push(next) : append;
        const _newGroup = newGroup === undefined ? (accum, next) => accum.push([next]) : newGroup;
        const _initial = initial === undefined ? [] : initial;
        return elements.reduce((accum, next) => {
            if (accum.length === 0 || !predicate(last(last(accum)), next)) {
                _newGroup(accum, next);
            } else {
                _append(accum, next);
            }
            return accum;
        }, _initial);
    }

    function depth(header) {
        return header.tagName;
    }

    function toLink(header) {
        const a = document.createElement("a");
        a.href = `#${header.id}`;
        a.textContent = renderTitle(header.textContent);
        return a;
    }

    function toListItem(node) {
        const li = document.createElement("li");
        li.appendChild(node);
        return li;
    }

    function makeList(container, headers) {
        const makeListItem = compose(toListItem, toLink);
        headers.forEach(header => {
            container.appendChild(makeListItem(header));
        });
    }

    function makeToc(groups) {
        const root = document.createElement("ol");
        let current = root;
        groups.forEach((group, i, xs) => {
            let nextLevel = depth(group[0]);
            if (i === 0 || nextLevel === depth(xs[i - 1][0])) {
                // insert all at current level
            } else if (depth(group[0]) > depth(xs[i - 1][0])) {
                // go deeper
                const summary = document.createElement("summary");
                summary.appendChild(current.lastChild.firstChild.cloneNode(true));
                const details = document.createElement("details");
                details.appendChild(summary);
                const newList = document.createElement("ol");
                details.appendChild(newList);
                current.lastChild.replaceWith(toListItem(details));
                current = newList;
            } else {
                // back up
                current = current.parentNode.parentNode.parentNode;
            }
            makeList(current, group);
        });
        return root;
    }

    function toggleToc(_) {
        const container = document.getElementById("mktc-container");
        container.classList.toggle("mktc-rounded-lg");
        container.classList.toggle("mktc-rounded-md");
        container.classList.toggle("mktc-overflow-y-hidden");
        container.classList.toggle("mktc-overflow-y-scroll");

        const toc = document.getElementById("mktc-toc");
        toc.classList.toggle("mktc-hidden");

        const placeHolder = document.getElementById("mktc-placeholder");
        placeHolder.classList.toggle("mktc--rotate-180");
    }

    function createPlaceHolder() {
        const placeHolder = document.createElement("div");
        placeHolder.tabIndex = "0";
        placeHolder.id = "mktc-placeholder";
        placeHolder.className = PLACEHOLDER_CLASSES;
        placeHolder.textContent = RIGHT_ARROW;
        placeHolder.onclick = toggleToc;
        return placeHolder;
    }

    function createToc() {
        const toc = makeToc(groupBy(getHeaders(), eqTagName));
        toc.className = TOC_CLASSES;
        toc.id = "mktc-toc";
        return toc;
    }

    function createContainer() {
        const container = document.createElement("div");
        container.className = CONTAINER_CLASSES;
        container.id = "mktc-container";
        return container;
    }

    function initToc() {
        const container = createContainer();
        const placeHolder = createPlaceHolder();
        const toc = createToc();
        container.appendChild(placeHolder);
        container.appendChild(toc);
        document.body.appendChild(container);
    }

    initToc();
})();
