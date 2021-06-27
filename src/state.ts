import {
    Action,
    TocType,
    State,
    Reducer,
    SubTreeState,
    SubTreeAction,
    HTMLTocStateElement,
    TocStateHandler,
    Effect,
    SubTreeStateMachine,
    Stream,
    StringGenerator,
} from "./types";
import {
    partial,
    bindTocStateHandler,
    flatMap,
    zipWith,
    generateForever,
    generateLowerCaseLetters,
    stringCombinations,
} from "./utils";

function* incrementingIntegers(start: number = 1): Stream<number> {
    let val = start;
    while (true) yield val++;
}

export const intGenerator = incrementingIntegers();

export function alphaStream(): Stream<string> {
    return flatMap(
        stringCombinations,
        <Stream<StringGenerator[]>>(
            zipWith(
                (size, stringGenerator) => Array(size).fill(stringGenerator),
                incrementingIntegers(),
                generateForever(generateLowerCaseLetters)
            )
        )
    );
}

export const initialState: State = {
    featureOpen: false,
    tocListOpen: false,
    subTreesExpanded: false,
    tocType: TocType.TREE,
};

function* _reducer(initial = initialState): Generator<State, void, Action | void> {
    let currentState = initial;
    let action = yield currentState;

    while (true) {
        const logHeader = `╒═════╡ MAKETOC REDUCER (${intGenerator.next().value}) ╞═══`;
        console.debug(logHeader);
        console.debug(`│ action: ${action}`);
        console.debug(`│ last state: ${JSON.stringify(currentState)}`);
        switch (action) {
            case Action.TOGGLE_FEATURE:
                if (currentState.featureOpen && currentState.tocListOpen) {
                    currentState = {
                        ...currentState,
                        featureOpen: false,
                        tocListOpen: false,
                    };
                } else {
                    currentState = {
                        ...currentState,
                        featureOpen: !currentState.featureOpen,
                    };
                }
                break;
            case Action.TOGGLE_TOC:
                if (!currentState.featureOpen && !currentState.tocListOpen) {
                    currentState = {
                        ...currentState,
                        tocListOpen: true,
                        featureOpen: true,
                    };
                } else {
                    currentState = {
                        ...currentState,
                        tocListOpen: !currentState.tocListOpen,
                    };
                }
                break;
            case Action.TOGGLE_SUBTREES:
                if (currentState.tocType === TocType.TREE)
                    currentState = {
                        ...currentState,
                        subTreesExpanded: !currentState.subTreesExpanded,
                    };
                break;
            case Action.TOGGLE_TOC_MODE:
                const subTreesExpanded =
                    currentState.tocType === TocType.TREE
                        ? false
                        : currentState.subTreesExpanded;
                currentState = {
                    ...currentState,
                    tocType:
                        currentState.tocType === TocType.TREE
                            ? TocType.FLAT
                            : TocType.TREE,
                    subTreesExpanded,
                };
                break;
            case Action.RESET_STATE:
                currentState = initialState;
                break;
        }
        console.debug(`│ next state: ${JSON.stringify(currentState)}`);
        console.debug(`╘${"═".repeat(logHeader.length - 1)}`);
        action = yield currentState;
    }
}

function initReducer(): { reducer: Reducer; state: void | State } {
    const reducer = _reducer();
    return { reducer, state: reducer.next().value };
}

function _updateState(reducer: Reducer, action: Action): void | State {
    const nextState = reducer.next(action).value;
    const event = new CustomEvent("updatetocstate", {
        detail: { state: nextState },
    });
    document.querySelectorAll("[data-toc-listen]").forEach((element) => {
        element.dispatchEvent(event);
    });
    return nextState;
}

export function binaryStateHandler(
    cmp: (prevState: State, nextState: State) => number,
    prevState: State,
    effect: (state: State) => Effect
): TocStateHandler {
    return (_, nextState): TocStateHandler => {
        const result = cmp(prevState, nextState);
        if (result !== 0) effect(nextState);
        return binaryStateHandler(cmp, nextState, effect);
    };
}

export function stateMachineHandler(
    machine: SubTreeStateMachine,
    prevState: State,
    getAction: (state: State) => SubTreeAction,
    effect: (target: EventTarget, state: SubTreeState) => Effect
): TocStateHandler {
    return (target: HTMLElement, nextState: State): TocStateHandler => {
        if (prevState.subTreesExpanded !== nextState.subTreesExpanded) {
            const prevLocalState = <SubTreeState>target.dataset.tocLocalState;
            const action = getAction(nextState);
            const nextLocalState = machine[prevLocalState][action];
            effect(target, nextLocalState);
        }
        return stateMachineHandler(machine, nextState, getAction, effect);
    };
}

export function elementStateHandler({
    target,
    detail: { state },
}: CustomEvent): EventTarget {
    if ((<HTMLTocStateElement>target).tocStateHandler)
        return bindTocStateHandler(
            <HTMLElement>target,
            (<HTMLTocStateElement>target).tocStateHandler(target, state)
        );
}

export const SUBTREE_STATE: SubTreeStateMachine = {
    /* detail box states
     * 0: closed
     * 1: open - opened by local click or "open all", from 0
     * 2: pinned_open - opened by "open all" from 1
     */
    [SubTreeState.CLOSED]: {
        [SubTreeAction.CLOSE_LOCAL]: SubTreeState.CLOSED,
        [SubTreeAction.OPEN_LOCAL]: SubTreeState.OPEN,
        [SubTreeAction.CLOSE_ALL]: SubTreeState.CLOSED,
        [SubTreeAction.OPEN_ALL]: SubTreeState.OPEN,
    },
    [SubTreeState.OPEN]: {
        [SubTreeAction.CLOSE_LOCAL]: SubTreeState.CLOSED,
        [SubTreeAction.OPEN_LOCAL]: SubTreeState.OPEN,
        [SubTreeAction.CLOSE_ALL]: SubTreeState.CLOSED,
        [SubTreeAction.OPEN_ALL]: SubTreeState.PINNED_OPEN,
    },
    [SubTreeState.PINNED_OPEN]: {
        [SubTreeAction.CLOSE_LOCAL]: SubTreeState.CLOSED,
        [SubTreeAction.OPEN_LOCAL]: SubTreeState.PINNED_OPEN,
        [SubTreeAction.CLOSE_ALL]: SubTreeState.OPEN,
        [SubTreeAction.OPEN_ALL]: SubTreeState.PINNED_OPEN,
    },
};

export const { reducer } = initReducer();
export const updateState: (action?: Action) => State = partial(_updateState, reducer);
export const getState: () => State = updateState;
