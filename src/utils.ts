import { HTMLTocStateElement } from "./types";

export function compose<A, B, C>(second: (y: B) => C, first: (x: A) => B): (z: A) => C {
    return function (x) {
        return second(first(x));
    };
}

export function partial(
    func: (...args: any[]) => any,
    ...args: any[]
): (...rest: any[]) => any {
    return function (...rest): any {
        return func(args[0], ...[...args.slice(1, -1), ...rest]);
    };
}

export function bindTocStateHandler(
    element: HTMLElement,
    value: Function
): HTMLTocStateElement {
    const _element = <HTMLTocStateElement>element;
    _element.tocStateHandler = value.bind(_element);
    return _element;
}

export function* sequence(): Generator<number, void, unknown> {
    let val = 1;
    while (true) yield val++;
}
