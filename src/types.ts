export type Stream<A> = Generator<A, any, any>;
export type StreamFactory<A> = (a?: any) => Stream<A>;
export type StringGenerator = Stream<string>;

export type Effect = void;

export const enum Action {
    TOGGLE_FEATURE = "toggle-feature",
    TOGGLE_TOC = "toggle-toc",
    REFRESH_TOC = "refresh-toc",
    TOGGLE_TOC_MODE = "toggle-toc-mode",
    TOGGLE_SUBTREES = "toggle-subtrees",
    RESET_STATE = "reset-state",
}

export const enum SubTreeAction {
    CLOSE_LOCAL = "CLOSE_LOCAL",
    OPEN_LOCAL = "OPEN_LOCAL",
    CLOSE_ALL = "CLOSE_ALL",
    OPEN_ALL = "OPEN_ALL",
}

export const enum TocType {
    FLAT = 0,
    TREE = 1,
}

export type State = {
    featureOpen: boolean;
    tocListOpen: boolean;
    subTreesExpanded: boolean;
    tocType: TocType;
};

export type Reducer = Generator<State, void, Action>;

export const enum SubTreeState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    PINNED_OPEN = "PINNED_OPEN",
}

export type GroupedHeadings = HTMLHeadingElement[][];

export type TocStateHandler = (target: EventTarget, state: State) => TocStateHandler;

export type HTMLTocStateElement = HTMLElement & {
    tocStateHandler: TocStateHandler;
};

export type SubTreeStateMachine = {
    readonly [key in SubTreeState]: {
        readonly [key in SubTreeAction]: SubTreeState;
    };
};
