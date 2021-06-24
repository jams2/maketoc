import {
    TOGGLE_FEATURE,
    TOGGLE_TOC,
    REFRESH_TOC,
    TOGGLE_MODE,
    TOGGLE_SUBTREES,
    RESET_STATE
} from "./messages.js";
import {
    SUBTREE_STATE,
    CLOSED,
    OPEN,
    SUPER_OPEN,
    CLOSE_LOCAL,
    OPEN_LOCAL,
    OPEN_ALL,
    CLOSE_ALL,
    TYPE_TREE,
    TITLE_MAX_LENGTH,
    HEAVY_X,
    CONTAINER_CLASSES,
    TOC_CLASSES,
    TITLE_CLASSES,
    OL_CLASSES,
    LI_CLASSES,
    SUMMARY_CLASSES,
    X_CLASSES
} from "./constants.js";
import "./maketoc.css";

const browser = require("webextension-polyfill");
"use strict";

(function () {
    const initialState = { featureOpen: false, tocListOpen: false, subTreesExpanded: false, tocType: TYPE_TREE };

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
            const logHeader = `╒═════╡ MAKETOC REDUCER (${sequenceGenerator.next().value}) ╞═══`;
            console.debug(logHeader);
            console.debug(`│ message: ${message}`);
            console.debug(`│ last state: ${JSON.stringify(currentState)}`);
            switch (message) {
                case TOGGLE_FEATURE:
                    if (currentState.featureOpen && currentState.tocListOpen) {
                        currentState = { ...currentState, featureOpen: false, tocListOpen: false };
                    } else {
                        currentState = { ...currentState, featureOpen: !currentState.featureOpen };
                    }
                    break;
                case TOGGLE_TOC:
                    if (!currentState.featureOpen && !currentState.tocListOpen) {
                        currentState = { ...currentState, tocListOpen: true, featureOpen: true };
                    } else {
                        currentState = { ...currentState, tocListOpen: !currentState.tocListOpen };
                    }
                    break;
                case TOGGLE_SUBTREES:
                    currentState = { ...currentState, subTreesExpanded: !currentState.subTreesExpanded };
                    break;
                case TOGGLE_MODE:
                    currentState = { ...currentState, tocType: !currentState.tocType };
                    break;
                case RESET_STATE:
                    currentState = initialState;
                    break;
            }
            console.debug(`│ next state: ${JSON.stringify(currentState)}`);
            console.debug(`╘${"═".repeat(logHeader.length - 1)}`);
            message = yield currentState;
        }
    }

    function initReducer() {
        const reducer = _reducer();
        return { reducer, state: reducer.next().value };
    }

    function _updateState(reducer, message) {
        const nextState = reducer.next(message).value;
        const event = new CustomEvent("updatetocstate", { detail: { state: nextState } });
        document.querySelectorAll("[data-toc-listen]").forEach((element) => {
            element.dispatchEvent(event);
        });
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

    function compareState(key) {
        return (a, b) => a[key] - b[key];
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

    function getSubTreeState({ subTreesExpanded }) {
        return subTreesExpanded ? OPEN_ALL : CLOSE_ALL;
    }

    function updateSubTree(element, nextState) {
        element.dataset.tocLocalState = nextState;
        switch (nextState) {
            case CLOSED:
                element.open = false;
                break;
            case OPEN:
            case SUPER_OPEN:
                element.open = true;
                break;
        }
    }

    function handleSummaryClick(event) {
        const details = event.target.parentNode;
        const prev = details.dataset.tocLocalState;
        const action = details.open ? CLOSE_LOCAL : OPEN_LOCAL;
        details.dataset.tocLocalState = SUBTREE_STATE[prev][action];
    }

    function makeDetails(summaryContents, nextState) {
        const summary = appendChildren(
            createElement(
                "summary",
                { className: SUMMARY_CLASSES, onclick: handleSummaryClick },
            ),
            summaryContents,
        )
        const details = appendChildren(
            createElement(
                "details",
                { open: false },
                { tocListen: true, tocLocalState: CLOSED },
            ),
            summary,
        );
        return bindAttribute(
            appendChildren(details, makeOl()),
            stateMachineHandler(SUBTREE_STATE, nextState, getSubTreeState, updateSubTree),
        );
    }

    function makeTreeToc(groups, nextState) {
        const root = makeOl();
        let current = root;
        groups.forEach((group, i, xs) => {
            let nextLevel = depth(group[0]);
            if (i === 0 || nextLevel === depth(xs[i - 1][0])) {
                // insert all at current level
            } else if (depth(group[0]) > depth(xs[i - 1][0])) {
                // go deeper
                // pass makeDetails the <a> in the last <li> of the current <ol>
                const details = makeDetails(current.lastChild.firstChild.cloneNode(true), nextState);
                current.lastChild.replaceWith(wrapInListItem(details));
                current = details.childNodes[1];  // the contained ordered list
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
        const placeHolder = createElement(
            "div",
            {
                tabIndex: "0",
                id: "mktc-placeholder",
                className: TITLE_CLASSES,
            },
        );
        const text = createElement(
            "span",
            {
                className: "mktc-mr-2",
                textContent: "Table Of Contents",
                className: "mktc-cursor-pointer w-min",
                onclick: () => updateState(TOGGLE_TOC),
            },
        )
        const xButton = createElement(
            "span",
            {
                innerHTML: HEAVY_X,
                className: X_CLASSES,
                onclick: () => updateState(TOGGLE_FEATURE),
            },
        );
        return appendChildren(placeHolder, text, xButton);
    }

    function createTocContents(nextState) {
        const { tocType } = nextState;
        let tocList;
        if (tocType == TYPE_TREE) {
            tocList = makeTreeToc(groupBy(getHeaders(), eqTagName), nextState);
        } else {
            tocList = makeFlatToc(getHeaders());
        }
        return tocList;
    }

    function bindAttribute(element, value, key = "tocStateHandler") {
        element[key] = value.bind(element);
        return element;
    }

    function createTocList(nextState) {
        const wrapped = appendChildren(
            createElement(
                "div",
                { className: TOC_CLASSES, id: "mktc-toc-list-wrapper" },
                { tocListen: true },
            ),
            createTocContents(nextState),
        );
        return bindAttribute(
            wrapped,
            binaryStateHandler(compareState("tocType"), nextState, rebuildTocList),
        );
    }

    function binaryStateHandler(cmp, prevState, effect) {
        return (_, nextState) => {
            const result = cmp(prevState, nextState);
            if (result !== 0)
                effect(nextState);
            return binaryStateHandler(cmp, nextState, effect);
        }
    }

    function stateMachineHandler(machine, prevState, getAction, effect) {
        return (target, nextState) => {
            console.groupCollapsed(target.tagName);
            console.log(prevState.subTreesExpanded, nextState.subTreesExpanded);
            console.log(prevState.subTreesExpanded - nextState.subTreesExpanded);
            console.groupEnd();
            if (prevState.subTreesExpanded - nextState.subTreesExpanded !== 0) {
                const prevLocalState = target.dataset.tocLocalState;
                const action = getAction(nextState);
                const nextLocalState = machine[prevLocalState][action];
                effect(target, nextLocalState);
            }
            return stateMachineHandler(machine, nextState, getAction, effect);
        }
    }

    function createContainer(nextState) {
        const container = createElement(
            "div",
            { className: CONTAINER_CLASSES, id: "mktc-container" },
            { tocListen: true },
        );
        return bindAttribute(
            container,
            binaryStateHandler(compareState("tocListOpen"), nextState, toggleTocList),
        );
    }

    function elementStateHandler({ target, detail: { state } }) {
        if (target.tocStateHandler)
            return bindAttribute(target, target.tocStateHandler(target, state));
    }

    function initToc(nextState) {
        const container = createContainer(nextState);
        const wrappedTocList = createTocList(nextState);
        appendChildren(
            document.body,
            appendChildren(container, createPlaceHolder(), wrappedTocList),
        );

        if (nextState.tocListOpen) {
            showTocList();
        }

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

    function toggleFeature(nextState) {
        const { featureOpen } = nextState;
        return featureOpen ? initToc(nextState) : destroyToc();
    }

    function showTocList() {
        const container = getContainer();
        container.classList.add("mktc-overflow-y-hidden", "mktc-overflow-y-scroll");

        const tocListWrapper = getTocListWrapper();
        tocListWrapper.classList.remove("mktc-hidden");
    }

    function hideTocList() {
        const container = getContainer();
        if (container !== null)
            container.classList.remove("mktc-overflow-y-hidden", "mktc-overflow-y-scroll");

        const tocListWrapper = getTocListWrapper();
        if (tocListWrapper !== null)
            tocListWrapper.classList.add("mktc-hidden");
    }

    function toggleTocList(nextState) {
        const { tocListOpen } = nextState;
        if (tocListOpen) {
            showTocList();
        } else {
            hideTocList();
        }
    }

    function receiveMessage({ message }) {
        switch (message) {
            case REFRESH_TOC:
                return rebuildTocList(getState());
            default:
                return updateState(message);
        }
    }

    const body = bindAttribute(
        document.body,
        binaryStateHandler(compareState("featureOpen"), initialState, toggleFeature),
    );
    body.dataset.tocListen = true;
    body.addEventListener("updatetocstate", elementStateHandler);

    browser.runtime.onMessage.addListener(receiveMessage);
})();
