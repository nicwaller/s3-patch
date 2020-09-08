import S3 from 'aws-sdk/clients/s3';
import { patch, makePlan, S3ObjectReference, patchLocal, Patch } from '../index';
const s3 = new S3();

// beforeAll(async () => {
//     const result = await s3.putObject({
//         Bucket: "random-surf",
//         Key: "test/empty.txt",
//         Body: "",
//     }).promise();
// });
//
// test('overwrites object', async () => {
//     // expect(1 + 2).toBe(3);
//     const result = await patch({
//         bucket: 'random-surf',
//         key: 'test/in.txt',
//     }, {
//         bucket: 'random-surf',
//         key: 'test/out.txt',
//     }, [{
//         slice: {
//             start: 0,
//             end: 0,
//         },
//         replacement: Buffer.from('hello-world'),
//     }]);
//     expect(result.ETag).toEqual('2095312189753de6ad47dfe20cbe97ec');
// });

describe('Planner', () => {

    test('populates empty object', async () => {
        const p = makePlan(0, [
            {
                slice: {},
                replacement: Buffer.from('hello-world'),
            }
        ])
        console.log(p);
    });

    test('truncates short object', async () => {
        const p = makePlan(10, [
            {
                slice: {},
                replacement: Buffer.concat([]),
            }
        ])
        expect(p.length).toBe(1);
        if (Buffer.isBuffer(p[0])) {
            expect(p[0].length).toBe(0);
        } else {
            throw Error('part is not buffer')
        }
    });

    test('inserts prefix', async () => {
        const haystack = Buffer.from('b');
        const prefix = Buffer.from('a');
        const patches: Patch[] = [{
            slice: {start: undefined, end: 0},
            replacement: prefix,
        }];
        const plan = makePlan(haystack.length, patches);
        expect(plan.length).toBe(2);
        expect(patchLocal(haystack, patches)).toEqual(Buffer.from('ab'));
    });

    test('appends suffix', async () => {
        const haystack = Buffer.from('a');
        const suffix = Buffer.from('b');
        const patches: Patch[] = [{
            slice: {start: haystack.length, end: undefined},
            replacement: suffix,
        }];
        const plan = makePlan(haystack.length, patches);
        expect(plan.length).toBe(2);
        expect(patchLocal(haystack, patches)).toEqual(Buffer.from('ab'));
    });

    test('prefix and suffix', async () => {
        const prefix = Buffer.from('a');
        const haystack = Buffer.from('b');
        const suffix = Buffer.from('c');
        const patches: Patch[] = [{
            slice: {start: undefined, end: 0},
            replacement: prefix,
        },{
            slice: {start: haystack.length, end: undefined},
            replacement: suffix,
        }];
        const plan = makePlan(haystack.length, patches);
        expect(plan.length).toBe(3);
        expect(patchLocal(haystack, patches)).toEqual(Buffer.from('abc'));
    });

})
