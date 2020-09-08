import { ConcreteSlice, linearSlices, Slice, slice, slicer } from '../slice';

describe('positive offsets', () => {

    test('gets whole string by default', () => {
        const haystack = 'hello-world';
        const needle = 'hello-world';
        const selector: Slice = {};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 0,
            end: 11,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });

    test('gets whole string from start', () => {
        const haystack = 'hello-world';
        const needle = 'hello-world';
        const selector: Slice = {start: 0};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 0,
            end: 11,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });

    test('skips first character', () => {
        const haystack = 'hello-world';
        const needle = 'ello-world';
        const selector: Slice = {start: 1};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 1,
            end: 11,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });

    test('gets last character', () => {
        const haystack = 'hello-world';
        const needle = 'd';
        const selector: Slice = {start: 10};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 10,
            end: 11,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });

    test('gets empty prefix', () => {
        const haystack = 'hello-world';
        const needle = '';
        const selector: Slice = {start: 0, end: 0};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 0,
            end: 0,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });

    test('gets empty prefix, ambiguous start', () => {
        const haystack = 'hello-world';
        const needle = '';
        const selector: Slice = {end: 0};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 0,
            end: 0,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });

    test('gets empty suffix', () => {
        const haystack = 'hello-world';
        const needle = '';
        const selector: Slice = {start: haystack.length};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 11,
            end: 11,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });

    test('gets first character', () => {
        const haystack = 'hello-world';
        const needle = 'h';
        const selector: Slice = {end: 1};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 0,
            end: 1,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });

    test('skips last character', () => {
        const haystack = 'hello-world';
        const needle = 'hello-worl';
        const selector: Slice = {end: 10};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 0,
            end: 10,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });
});

describe('negative offsets', () => {
    test('gets last character', () => {
        const haystack = 'hello-world';
        const needle = 'd';
        const selector: Slice = {start: -1};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 10,
            end: 11,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });

    test('skips last character', () => {
        const haystack = 'hello-world';
        const needle = 'hello-worl';
        const selector: Slice = {end: -1};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 0,
            end: 10,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });

    test('gets second-last character', () => {
        const haystack = 'hello-world';
        const needle = 'l';
        const selector: Slice = {start: -2, end: -1};
        const concrete: ConcreteSlice = slicer(haystack.length)(selector);
        expect(concrete).toEqual({
            start: 9,
            end: 10,
        })
        expect(slice(haystack, concrete)).toEqual(needle);
    });
});

describe('linear', () => {
    test('accepts adjacent slices', () => {
        const haystack = 'hello-world';
        const linear = linearSlices(haystack.length, [
            {start: 0, end: 1},
            {start: 1, end: 2},
        ]);
        expect(linear).toEqual([
            {start: 0, end: 1},
            {start: 1, end: 2},
        ]);
    });

    test('reorders slices', () => {
        const haystack = 'hello-world';
        const linear = linearSlices(haystack.length, [
            {start: 1, end: 2},
            {start: 0, end: 1},
        ]);
        expect(linear).toEqual([
            {start: 0, end: 1},
            {start: 1, end: 2},
        ]);
    });

    test('rejects repeated slice', () => {
        const haystack = 'hello-world';
        expect(() => {
            const linear = linearSlices(haystack.length, [
                {start: 0, end: 1},
                {start: 0, end: 1},
            ]);
        }).toThrow();
    });

    test('rejects overlapping leading slices', () => {
        const haystack = 'hello-world';
        expect(() => {
            const linear = linearSlices(haystack.length, [
                {end: 4},
                {end: 6},
            ]);
        }).toThrow();
    });


    test('rejects overlapping trailing slices', () => {
        const haystack = 'hello-world';
        expect(() => {
            const linear = linearSlices(haystack.length, [
                {start: 4},
                {start: 6},
            ]);
        }).toThrow();
    });

});
