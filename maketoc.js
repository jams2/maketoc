"use strict";

(function () {
    const TOGGLE_FEATURE = "toggle-feature";
    const TOGGLE_TOC = "toggle-toc";
    const REFRESH_TOC = "refresh-toc";
    const TOGGLE_MODE = "toggle-toc-mode";
    const TOGGLE_SUB_TOCS = "toggle-sub-tocs";
    const RESET_STATE = "reset-state";

    const TYPE_TREE = true;
    const TYPE_FLAT = false;

    const TITLE_MAX_LENGTH = 50;
    const RIGHT_ARROW = "→";

    const CONTAINER_CLASSES = `
mktc-font-sans
mktc-top-8 mktc-left-8 mktc-fixed
mktc-bg-white mktc-prose mktc-prose-sm
mktc-rounded-md mktc-shadow-md hover:mktc-shadow-lg mktc-transition-shadow mktc-duration-300
mktc-max-h-3/4 mktc-overflow-x-hidden mktc-overflow-y-hidden
mktc-z-max`;

    const TOC_CLASSES = `
mktc-hidden mktc-pb-4 mktc-pr-8 mktc-pl-2 mktc-mt-0
mktc-text-sm mktc-text-gray-900 mktc-mt-1`;

    const TITLE_CLASSES = `
mktc-block mktc-cursor-pointer mktc-w-auto
mktc-mr-auto mktc-px-4 mktc-py-2
mktc-bg-green-100 mktc-text-green-900 mktc-font-bold`;

    const OL_CLASSES = `mktc-p-0 mktc-pl-8`;

    const LI_CLASSES = `
mktc-p-0 mktc-py-2 last-of-type:mktc-pb-0
mktc-border-b-2 last-of-type:mktc-border-b-0`;

    const SUMMARY_CLASSES = ``;

    const initialState = { featureOpen: false, tocOpen: false, subNavExpanded: false, tocType: TYPE_TREE };

    function* sequence() {
        let val = 1;
        while (true)
            yield val++;
    }

    function* _reducer(initial = initialState) {
        const sequenceGenerator = sequence();
        let currentState = initial;
        let message = yield currentState;

        while (true) {
            console.group(`MAKETOC REDUCER (${sequenceGenerator.next().value})`)
            console.debug(message);
            console.debug(currentState);
            switch (message) {
                case TOGGLE_FEATURE:
                    currentState = { ...currentState, featureOpen: !currentState.featureOpen };
                    break;
                case TOGGLE_TOC:
                    if (!currentState.featureOpen && !currentState.tocOpen) {
                        currentState = { ...currentState, tocOpen: true, featureOpen: true };
                    } else {
                        currentState = { ...currentState, tocOpen: !currentState.tocOpen };
                    }
                    break;
                case TOGGLE_SUB_TOCS:
                    currentState = { ...currentState, subNavExpanded: !currentState.subNavExpanded };
                    break;
                case TOGGLE_MODE:
                    currentState = { ...currentState, tocType: !currentState.tocType };
                    break;
                case RESET_STATE:
                    currentState = initialState;
                    break;
            }
            console.debug(currentState);
            console.groupEnd()
            message = yield currentState;
        }
    }

    function initReducer() {
        const reducer = _reducer();
        console.debug(reducer.next().value);
        return { reducer, state: "foo" };
    }

    function _updateState(reducer, message) {
        const nextState = reducer.next(message).value;
        const event = new CustomEvent("updatetocstate", { detail: { state: nextState } });
        document.querySelectorAll("[data-toc-listen]").forEach(element => element.dispatchEvent(event));
        return nextState;
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


    const { reducer } = initReducer();
    const updateState = partial(_updateState, reducer);
    const getState = updateState;


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
                className: TITLE_CLASSES,
                textContent: "Table Of Contents",
                onclick: () => updateState(TOGGLE_TOC),
            },
            { tocListen: true },
        );
    }

    function createTocContents(nextState) {
        const { tocType } = nextState;
        let tocList;
        if (tocType == TYPE_TREE) {
            tocList = makeTreeToc(groupBy(getHeaders(), eqTagName));
        } else {
            tocList = makeFlatToc(getHeaders());
        }
        return tocList;
    }

    function createToc(nextState) {
        const wrapped = appendChildren(
            createElement(
                "div",
                { className: TOC_CLASSES, id: "mktc-toc-list-wrapper" },
                { tocListen: true },
            ),
            createTocContents(nextState),
        );
        const cmp = (a, b) => a.tocType - b.tocType;
        wrapped.tocStateHandler = binaryStateHandler(cmp, initialState, rebuildTocList).bind(wrapped);
        return wrapped;
    }

    function binaryStateHandler(cmp, prevState, onChange) {
        return function (nextState) {
            if (cmp(prevState, nextState) !== 0)
                onChange(nextState);
            return binaryStateHandler(cmp, nextState, onChange);
        }
    }

    function createContainer() {
        const cmp = (a, b) => a.tocOpen - b.tocOpen;
        const container = createElement(
            "div",
            { className: CONTAINER_CLASSES, id: "mktc-container" },
            { tocListen: true, tocStateKey: "tocOpen" },
        );
        container.tocStateHandler = binaryStateHandler(cmp, initialState, toggleToc).bind(container);
        return container;
    }

    function elementStateHandler({ target, detail: { state } }) {
        if (target.tocStateHandler)
            target.tocStateHandler = target.tocStateHandler(state).bind(target);
    }

    function initToc() {
        const container = createContainer();
        appendChildren(
            document.body,
            appendChildren(container, createPlaceHolder(), createToc(initialState)),
        );
        document.querySelectorAll("[data-toc-listen]").forEach(node => (
            node.addEventListener("updatetocstate", elementStateHandler)
        ));
        return container;
    }

    function destroyToc() {
        const container = getContainer();
        if (container !== null) {
            container.remove();
        }
    }

    function rebuildTocList(nextState) {
        const wrapper = getTocListWrapper();
        if (wrapper === null) {
            return;
        }
        const newContents = createTocContents(nextState);
        wrapper.firstChild.replaceWith(newContents);
    }

    function toggleFeature({ featureOpen }) {
        return featureOpen ? initToc() : destroyToc();
    }

    function toggleToc({ tocOpen }) {
        const container = getContainer();
        const tocListWrapper = getTocListWrapper();
        if (tocOpen) {
            container.classList.add("mktc-overflow-y-hidden", "mktc-overflow-y-scroll");
            tocListWrapper.classList.remove("mktc-hidden");
        } else {
            container.classList.remove("mktc-overflow-y-hidden", "mktc-overflow-y-scroll");
            tocListWrapper.classList.add("mktc-hidden");
        }
    }

    function toggleSubTocs() {
        document.querySelectorAll("#mktc-container details").forEach(elt => (
            elt.open = !elt.open
        ));
    }

    function receiveMessage({ message }) {
        switch (message) {
            case REFRESH_TOC:
                return rebuildTocList(getState());
            default:
                return updateState(message);
        }
    }

    document.body.tocStateHandler = binaryStateHandler(
        (a, b) => a.featureOpen - b.featureOpen,
        initialState,
        toggleFeature,
    ).bind(document.body);
    document.body.dataset.tocListen = true;
    document.body.addEventListener("updatetocstate", elementStateHandler);

    browser.runtime.onMessage.addListener(receiveMessage);
})();
