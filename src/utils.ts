import { HTMLTocStateElement, Stream, StreamFactory, StringGenerator } from "./types";

export function compose<A, B, C>(second: (y: B) => C, first: (x: A) => B): (z: A) => C {
    return function (x) {
        return second(first(x));
    };
}

export function partial(
    f: (...args: any[]) => any,
    ...args: any[]
): (...rest: any[]) => any {
    return function (...rest): any {
        return f(...[...args, ...rest]);
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

export function stringCat(xs: string[]): string {
    return xs.reduce((l: string, r: string) => l.concat(r), "");
}

function* _cartesianProduct<A>(
    initial: A[],
    streamFactory: StreamFactory<A>,
    ...rest: StreamFactory<A>[]
): Stream<A[]> {
    for (const x of streamFactory()) {
        if (rest.length === 0) {
            yield [...initial, x];
        } else {
            yield* _cartesianProduct([...initial, x], rest[0], ...rest.slice(1));
        }
    }
}

export const product = partial(_cartesianProduct, []);

export function* lazyMap<A, B>(f: (a: A) => B, xs: Iterable<A>): Stream<B> {
    for (const x of xs) {
        yield f(x);
    }
}

export function* flatMap<A, B>(f: (a: A) => Iterable<B>, xs: Iterable<A>): Stream<B> {
    for (const x of xs) {
        for (const result of f(x)) {
            yield result;
        }
    }
}

export function* flatten<A>(xs: Iterable<Iterable<A>>): Stream<A> {
    for (const x of xs) {
        for (const y of x) {
            yield y;
        }
    }
}

export function* zipWith<A, B, C>(
    f: (a: A, b: B) => C,
    xs: Stream<A>,
    ys: Stream<B>
): Stream<C> {
    let x = xs.next();
    let y = ys.next();
    while (!x.done && !y.done) {
        yield f(x.value, y.value);
        x = xs.next();
        y = ys.next();
    }
}

export function* take<A>(n: number, xs: Stream<A>): Stream<A> {
    for (let i = 0; i < n; i++) {
        const x = xs.next();
        if (x.done) return;
        yield x.value;
    }
}

export function* generateForever<A>(x: A): Stream<A> {
    while (true) {
        yield x;
    }
}

export function* emptyString(): StringGenerator {
    yield "";
}

export function stringCombinations(
    stringGenerators: StringGenerator[]
): StringGenerator {
    return lazyMap(stringCat, product(...stringGenerators));
}

export function* generateLowerCaseLetters(): StringGenerator {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    for (const char of chars) {
        yield char;
    }
}

export function slugify(s: string): string {
    // https://gist.github.com/hagemann/382adfc57adbd5af078dc93feef01fe1
    const a =
        "àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;";
    const b =
        "aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------";
    const p = new RegExp(a.split("").join("|"), "g");

    return s
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, "-and-") // Replace & with 'and'
        .replace(/[^\w\-]+/g, "") // Remove all non-word characters
        .replace(/\-\-+/g, "-") // Replace multiple - with single -
        .replace(/^-+/, "") // Trim - from start of text
        .replace(/-+$/, ""); // Trim - from end of text
}
