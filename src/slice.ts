// I like Python's idea of string slicing. Let's do more of that.
// https://docs.python.org/3/tutorial/introduction.html#strings

// allows referencing end of object using negative or undefined offset
export interface AbstractSlice {
    start?: number; // inclusive
    end?: number; // exclusive
}

// concrete offsets are always non-negative integers
export interface ConcreteSlice {
    start: number; // inclusive
    end: number; // exclusive
}

export type Slice = AbstractSlice | ConcreteSlice;

export type SliceResolver = (slice: Slice) => ConcreteSlice;

// TODO: it would be ideal to support Pythonic ranges like 1..-1
export function slicer(size: number): SliceResolver {
    return (slice: Slice) => {
        function fx(x: number | undefined, def: number, scope: number) {
            if (x === undefined) {
                return def;
            } else if (x < 0) {
                return scope + x;
            } else {
                return x;
            }
        }
        return {
            start: fx(slice.start, 0, size),
            end: fx(slice.end, size, size),
        }
    }
}

export function slice(input: string, slice: Slice) {
    const s = slicer(input.length)(slice);
    return input.slice(s.start, s.end);
}

function compareSlices(a: ConcreteSlice, b: ConcreteSlice) {
    if (a.start < b.start) {
        return -1;
    } else if (a.start > b.start) {
        return 1;
    } else {
        if (a.end < b.end) {
            return -1;
        } else if (a.end > b.end) {
            return 1;
        } else {
            return 0;
        }
    }
}

// Return an ordered list of non-overlapping slices
export function linearSlices(size: number, slices: Slice[]): ConcreteSlice[] {
    const resolved = slices.map(slicer(size))
    const sorted = resolved.sort(compareSlices);
    let cursor = 0;
    for (const slice of sorted) {
        if (slice.start < cursor || slice.end < cursor) {
            throw Error(`found overlapping slice: ${slice.start}..${slice.end}`)
        } else {
            cursor = slice.end;
        }
    }
    return sorted;
}
