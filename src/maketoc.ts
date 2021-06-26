import {
    Action,
    State,
    SubTreeState,
    SubTreeAction,
    Effect,
    GroupedHeadings,
    HTMLTocStateElement,
    TocType,
} from "./types";
import {
    SUBTREE_STATE,
    elementStateHandler,
    updateState,
    binaryStateHandler,
    stateMachineHandler,
    getState,
    initialState,
} from "./state";
import { compose, bindTocStateHandler } from "./utils";
import {
    TITLE_MAX_LENGTH,
    HEAVY_X,
    CONTAINER_CLASSES,
    TOC_CLASSES,
    TITLE_CLASSES,
    OL_CLASSES,
    LI_CLASSES,
    SUMMARY_CLASSES,
    X_CLASSES,
} from "./constants";
import "./maketoc.css";
import { browser, Runtime } from "webextension-polyfill-ts";

(function () {
    function compareState(key: keyof State): (a: State, b: State) => number {
        return (a: State, b: State) => Number(a[key]) - Number(b[key]);
    }

    function createElement(
        tagName: string,
        attrs: { [key: string]: any } = {},
        dataset: { [key: string]: any } = {}
    ): HTMLElement {
        const elt = Object.assign(document.createElement(tagName), attrs);
        Object.keys(dataset).forEach((key) => (elt.dataset[key] = dataset[key]));
        return elt;
    }

    function appendChildren(
        parent: HTMLElement,
        ...children: HTMLElement[]
    ): HTMLElement {
        parent.append(...children);
        return parent;
    }

    function renderTitle(titleText: string): string {
        if (titleText.length > TITLE_MAX_LENGTH) {
            return `${titleText.substring(0, TITLE_MAX_LENGTH)}…`;
        } else {
            return titleText;
        }
    }

    function getHeaders(): HTMLHeadingElement[] {
        return Array.from(document.querySelectorAll("h2,h3,h4,h5,h6"));
    }

    function last<T>(array: T[]): T | null {
        return array.length > 0 ? array[array.length - 1] : null;
    }

    function eqTagName(a: HTMLElement, b: HTMLElement): boolean {
        return a.tagName === b.tagName;
    }

    function appendToLastGroup<T>(l: T[][], r: T): number {
        return last(l).push(r);
    }

    function addNewGroup<T>(l: T[][], r: T): number {
        return l.push([r]);
    }

    function groupBy<T>(
        elements: T[],
        predicate: (a: T, b: T) => boolean,
        grouper: (l: T[][], r: T) => number = appendToLastGroup,
        appender: (l: T[][], r: T) => number = addNewGroup
    ): T[][] {
        return elements.reduce((accum, next) => {
            if (accum.length === 0 || !predicate(last(last(accum)), next)) {
                appender(accum, next);
            } else {
                grouper(accum, next);
            }
            return accum;
        }, []);
    }

    function depth(header: HTMLElement): string {
        return header.tagName;
    }

    function toLink(header: HTMLElement): HTMLElement {
        return createElement("a", {
            href: `#${header.id}`,
            textContent: renderTitle(header.textContent),
        });
    }

    function wrapInListItem(element: HTMLElement): HTMLLIElement {
        return <HTMLLIElement>(
            appendChildren(createElement("li", { className: LI_CLASSES }), element)
        );
    }

    function makeListOfAnchorElements(
        oList: HTMLOListElement,
        headers: HTMLElement[]
    ): HTMLOListElement {
        const makeListItem = compose(wrapInListItem, toLink);
        headers.forEach((header) => {
            oList.appendChild(makeListItem(header));
        });
        return oList;
    }

    function makeOList(): HTMLOListElement {
        return <HTMLOListElement>createElement("ol", { className: OL_CLASSES });
    }

    function getSubTreeAction({ subTreesExpanded }: State): SubTreeAction {
        return subTreesExpanded ? SubTreeAction.OPEN_ALL : SubTreeAction.CLOSE_ALL;
    }

    function updateSubTree(
        element: HTMLDetailsElement,
        nextState: SubTreeState
    ): Effect {
        element.dataset.tocLocalState = nextState;
        switch (nextState) {
            case SubTreeState.CLOSED:
                element.open = false;
                break;
            case SubTreeState.OPEN:
            case SubTreeState.SUPER_OPEN:
                element.open = true;
                break;
        }
    }

    function handleSummaryClick(event: Event) {
        const details = <HTMLDetailsElement>(<HTMLElement>event.target).parentNode;
        const prev = <SubTreeState>details.dataset.tocLocalState;
        const action = details.open
            ? SubTreeAction.CLOSE_LOCAL
            : SubTreeAction.OPEN_LOCAL;
        details.dataset.tocLocalState = SUBTREE_STATE[prev][action];
    }

    function makeDetails(
        summaryContents: HTMLAnchorElement,
        nextState: State
    ): HTMLTocStateElement {
        const summary = appendChildren(
            createElement("summary", {
                className: SUMMARY_CLASSES,
                onclick: handleSummaryClick,
            }),
            summaryContents
        );
        const details = appendChildren(
            createElement(
                "details",
                { open: false },
                { tocListen: true, tocLocalState: SubTreeState.CLOSED }
            ),
            summary
        );
        return <HTMLTocStateElement>(
            bindTocStateHandler(
                <HTMLTocStateElement>appendChildren(details, makeOList()),
                stateMachineHandler(
                    SUBTREE_STATE,
                    nextState,
                    getSubTreeAction,
                    updateSubTree
                )
            )
        );
    }

    function makeTreeOrderedList(
        groups: GroupedHeadings,
        nextState: State
    ): HTMLOListElement {
        const root = makeOList();
        let current = root;
        groups.forEach((group: HTMLHeadingElement[], i: number, xs: GroupedHeadings) => {
            let nextLevel = depth(group[0]);
            if (i === 0 || nextLevel === depth(xs[i - 1][0])) {
                // insert all at current level
            } else if (depth(group[0]) > depth(xs[i - 1][0])) {
                // go deeper
                // pass makeDetails the <a> in the last <li> of the current <ol>
                const details = makeDetails(
                    <HTMLAnchorElement>current.lastChild.firstChild.cloneNode(true),
                    nextState
                );
                current.lastChild.replaceWith(wrapInListItem(details));
                current = <HTMLOListElement>details.childNodes[1]; // the contained ordered list
            } else {
                // back up
                current = <HTMLOListElement>current.parentNode.parentNode.parentNode;
            }
            makeListOfAnchorElements(current, group);
        });
        return root;
    }

    function makeFlatToc(headers: HTMLHeadingElement[]): HTMLOListElement {
        return makeListOfAnchorElements(
            <HTMLOListElement>createElement("ol", { className: OL_CLASSES }),
            headers
        );
    }

    function getContainer(): HTMLDivElement {
        return <HTMLDivElement>document.getElementById("mktc-container");
    }

    function getTocListWrapper(): HTMLDivElement {
        return <HTMLDivElement>document.getElementById("mktc-toc-list-wrapper");
    }

    function getPlaceHolder(): HTMLDivElement {
        return <HTMLDivElement>document.getElementById("mktc-placeholder");
    }

    function createPlaceHolder(): HTMLDivElement {
        const placeHolder = <HTMLDivElement>createElement("div", {
            tabIndex: "0",
            id: "mktc-placeholder",
            className: TITLE_CLASSES,
        });
        const text = createElement("span", {
            textContent: "Table Of Contents",
            className: "mktc-cursor-pointer w-min mktc-mr-2",
            onclick: () => updateState(Action.TOGGLE_TOC),
        });
        const xButton = createElement("span", {
            innerHTML: HEAVY_X,
            className: X_CLASSES,
            onclick: () => updateState(Action.TOGGLE_FEATURE),
        });
        return <HTMLDivElement>appendChildren(placeHolder, text, xButton);
    }

    function createContainer(nextState: State): HTMLTocStateElement {
        const container = <HTMLDivElement>(
            createElement(
                "div",
                { className: CONTAINER_CLASSES, id: "mktc-container" },
                { tocListen: true }
            )
        );
        return bindTocStateHandler(
            container,
            binaryStateHandler(compareState("tocListOpen"), nextState, toggleTocList)
        );
    }

    function initToc(nextState: State): HTMLTocStateElement {
        const container = createContainer(nextState);
        const wrappedTocList = createTocList(nextState);
        appendChildren(
            document.body,
            appendChildren(container, createPlaceHolder(), wrappedTocList)
        );

        if (nextState.tocListOpen) {
            showTocList();
        }

        document
            .querySelectorAll("[data-toc-listen]")
            .forEach((node: HTMLElement) =>
                node.addEventListener("updatetocstate", elementStateHandler)
            );
        return container;
    }

    function destroyToc() {
        const container = getContainer();
        if (container !== null) {
            container.remove();
        }
    }

    function createTocList(nextState: State): HTMLTocStateElement {
        const wrapped = appendChildren(
            createElement(
                "div",
                { className: TOC_CLASSES, id: "mktc-toc-list-wrapper" },
                { tocListen: true }
            ),
            createTocContents(nextState)
        );
        return bindTocStateHandler(
            wrapped,
            binaryStateHandler(compareState("tocType"), nextState, rebuildTocList)
        );
    }

    function rebuildTocList(nextState: State): Effect {
        const wrapper = getTocListWrapper();
        if (wrapper === null) return;
        const newContents = createTocContents(nextState);
        newContents
            .querySelectorAll("[data-toc-listen]")
            .forEach((node: HTMLTocStateElement) =>
                node.addEventListener("updatetocstate", elementStateHandler)
            );
        wrapper.firstChild.replaceWith(newContents);
    }

    function createTocContents(nextState: State): HTMLOListElement {
        const { tocType } = nextState;
        let tocList: HTMLOListElement;
        if (tocType == TocType.TREE) {
            tocList = makeTreeOrderedList(
                <GroupedHeadings>groupBy(getHeaders(), eqTagName),
                nextState
            );
        } else {
            tocList = makeFlatToc(getHeaders());
        }
        return tocList;
    }

    function toggleFeature(nextState: State): Effect {
        const { featureOpen } = nextState;
        featureOpen ? initToc(nextState) : destroyToc();
    }

    function showTocList(): Effect {
        const container = getContainer();
        container.classList.add("mktc-overflow-y-hidden", "mktc-overflow-y-scroll");

        const tocListWrapper = getTocListWrapper();
        tocListWrapper.classList.remove("mktc-hidden");
    }

    function hideTocList(): Effect {
        const container = getContainer();
        if (container !== null)
            container.classList.remove(
                "mktc-overflow-y-hidden",
                "mktc-overflow-y-scroll"
            );

        const tocListWrapper = getTocListWrapper();
        if (tocListWrapper !== null) tocListWrapper.classList.add("mktc-hidden");
    }

    function toggleTocList(nextState: State): Effect {
        const { tocListOpen } = nextState;
        if (tocListOpen) {
            showTocList();
        } else {
            hideTocList();
        }
    }

    function receiveMessage(
        message: { message: string },
        _: Runtime.MessageSender
    ): void {
        const action = message.message as Action;
        switch (action) {
            case Action.REFRESH_TOC:
                rebuildTocList(getState());
                break;
            default:
                updateState(action);
        }
    }

    const body = bindTocStateHandler(
        <HTMLTocStateElement>document.body,
        binaryStateHandler(compareState("featureOpen"), initialState, toggleFeature)
    );
    body.dataset.tocListen = "true";
    body.addEventListener("updatetocstate", elementStateHandler);

    browser.runtime.onMessage.addListener(receiveMessage);
})();
