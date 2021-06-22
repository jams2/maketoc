"use strict";

(function () {
    const TOGGLE_FEATURE = "toggle-feature";
    const TOGGLE_TOC = "toggle-toc";
    const REFRESH_TOC = "refresh-toc";
    const TOGGLE_MODE = "toggle-toc-mode";
    const TOGGLE_SUB_TOCS = "toggle-sub-tocs";

    const TYPE_FLAT = "flat";
    const TYPE_TREE = "tree";

    const TITLE_MAX_LENGTH = 50;
    const RIGHT_ARROW = "→";

    const CONTAINER_CLASSES = `
mktc-font-sans
mktc-top-8 mktc-left-8 mktc-fixed
mktc-bg-white mktc-prose mktc-prose-sm
mktc-rounded-lg mktc-shadow-md hover:mktc-shadow-lg mktc-transition-shadow mktc-duration-300
mktc-max-h-3/4 mktc-overflow-x-hidden mktc-overflow-y-hidden
mktc-z-max`;

    const TOC_CLASSES = `
mktc-hidden mktc-pb-4 mktc-pr-8 mktc-pl-2 mktc-mt-0
mktc-text-sm mktc-text-gray-900`;

    const PLACEHOLDER_CLASSES = `
mktc-block
mktc-text-5xl mktc-font-bold mktc-cursor-pointer mktc-w-min
mktc-mr-auto mktc-py-1 mktc-px-3
mktc-transform mktc-transition-transform mktc-duration-300`;

    const OL_CLASSES = `mktc-p-0 mktc-pl-8`;

    const LI_CLASSES = `
mktc-p-0 mktc-py-2 last-of-type:mktc-pb-0
mktc-border-b-2 last-of-type:mktc-border-b-0`;

    const SUMMARY_CLASSES = ``;

    const initialState = { tocOpen: false, subNavExpanded: false }

    function* state(initial = initialState) {
        let currentState = initialState;
        yield currentState;
    }

    function compose(g, f) {
        return function (x) {
            return g(f(x));
        }
    }

    function partial(f, ...args) {
        return function (...rest) {
            return f(...args, ...rest);
        }
    }

    function createElement(tagName, attrs = {}, dataset = {}) {
        const elt = Object.assign(document.createElement(tagName), attrs);
        Object.keys(dataset).forEach(key => elt.dataset[key] = dataset[key]);
        return elt;
    }

    function appendChildren(parent, ...children) {
        parent.append(...children);
        return parent;
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

    function groupBy(
        elements,
        predicate,
        initial = [],
        appendToLastGroup = (accum, next) => last(accum).push(next),
        addNewGroup = (accum, next) => accum.push([next]),
    ) {
        return elements.reduce((accum, next) => {
            if (accum.length === 0 || !predicate(last(last(accum)), next)) {
                addNewGroup(accum, next);
            } else {
                appendToLastGroup(accum, next);
            }
            return accum;
        }, initial);
    }

    function depth(header) {
        return header.tagName;
    }

    function toLink(header) {
        return createElement(
            "a",
            { href: `#${header.id}`, textContent: renderTitle(header.textContent) },
        );
    }

    function wrapInListItem(node) {
        return appendChildren(
            createElement("li", { className: LI_CLASSES }),
            node,
        );
    }

    function makeList(container, headers) {
        const makeListItem = compose(wrapInListItem, toLink);
        headers.forEach(header => {
            container.appendChild(makeListItem(header));
        });
        return container;
    }

    function makeOl() {
        return createElement("ol", { className: OL_CLASSES });
    }

    function makeTreeToc(groups) {
        const root = makeOl();
        let current = root;
        groups.forEach((group, i, xs) => {
            let nextLevel = depth(group[0]);
            if (i === 0 || nextLevel === depth(xs[i - 1][0])) {
                // insert all at current level
            } else if (depth(group[0]) > depth(xs[i - 1][0])) {
                // go deeper
                const summary = appendChildren(
                    createElement("summary", { className: SUMMARY_CLASSES }),
                    current.lastChild.firstChild.cloneNode(true),  // anchor in last <li>
                )
                const details = appendChildren(createElement("details"), summary);
                const newList = makeOl();
                details.appendChild(newList);
                current.lastChild.replaceWith(wrapInListItem(details));
                current = newList;
            } else {
                // back up
                current = current.parentNode.parentNode.parentNode;
            }
            makeList(current, group);
        });
        return root;
    }

    function makeFlatToc(headers) {
        return makeList(createElement("ol", { className: OL_CLASSES }), headers);
    }

    function getContainer() {
        return document.getElementById("mktc-container");
    }

    function getTocListWrapper() {
        return document.getElementById("mktc-toc-list-wrapper");
    }

    function getPlaceHolder() {
        return document.getElementById("mktc-placeholder");
    }

    function createPlaceHolder() {
        return createElement(
            "div",
            {
                tabIndex: "0",
                id: "mktc-placeholder",
                className: PLACEHOLDER_CLASSES,
                textContent: RIGHT_ARROW,
                onclick: toggleToc,
            },
        );
    }

    function createToc(tocType = TYPE_TREE) {
        let tocList;
        if (tocType == TYPE_TREE) {
            tocList = makeTreeToc(groupBy(getHeaders(), eqTagName));
        } else {
            tocList = makeFlatToc(getHeaders());
        }
        return appendChildren(
            createElement(
                "div",
                { className: TOC_CLASSES, id: "mktc-toc-list-wrapper" },
                { tocType },
            ),
            tocList,
        );
    }

    function createContainer() {
        return createElement("div", { className: CONTAINER_CLASSES, id: "mktc-container" });
    }

    function initToc() {
        const container = createContainer();
        appendChildren(
            document.body,
            appendChildren(container, createPlaceHolder(), createToc()),
        );
        return container;
    }

    function destroyToc() {
        const container = getContainer();
        if (container !== null) {
            container.remove();
        }
    }

    function rebuildTocList(tocType) {
        const oldToc = getTocListWrapper();
        if (oldToc === null) {
            return;
        }
        const newToc = createToc(tocType === undefined ? oldToc.dataset.tocType : tocType);
        if (!oldToc.classList.contains("mktc-hidden")) {
            newToc.classList.remove("mktc-hidden");
        }
        oldToc.replaceWith(newToc);
    }

    function toggleTocMode() {
        const oldToc = getTocListWrapper()
        if (oldToc === null) {
            return;
        }
        rebuildTocList(oldToc.dataset.tocType === TYPE_TREE ? TYPE_FLAT : TYPE_TREE);
    }

    function toggleFeature() {
        return getContainer() === null ? initToc() : destroyToc();
    }

    function toggleToc(_) {
        const container = getContainer() === null ? initToc() : getContainer();

        container.classList.toggle("mktc-rounded-lg");
        container.classList.toggle("mktc-rounded-md");
        container.classList.toggle("mktc-overflow-y-hidden");
        container.classList.toggle("mktc-overflow-y-scroll");

        const tocListWrapper = getTocListWrapper();
        tocListWrapper.classList.toggle("mktc-hidden");

        const placeHolder = getPlaceHolder();
        placeHolder.classList.toggle("mktc--rotate-180");
    }

    function toggleSubTocs() {
        document.querySelectorAll("#mktc-container details").forEach(elt => (
            elt.open = !elt.open
        ));
    }

    function receiveMessage({ message }) {
        switch (message) {
            case TOGGLE_FEATURE:
                return toggleFeature();
            case TOGGLE_TOC:
                return toggleToc();
            case REFRESH_TOC:
                return rebuildTocList();
            case TOGGLE_MODE:
                return toggleTocMode();
            case TOGGLE_SUB_TOCS:
                return toggleSubTocs();
            default:
                console.error(`maketoc.js: unknown message (${message})`);
        }
    }

    browser.runtime.onMessage.addListener(receiveMessage);
    let gen = state();
    console.log(gen.next());
})();
