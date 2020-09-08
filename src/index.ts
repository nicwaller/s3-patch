import S3, { UploadPartCopyRequest, UploadPartRequest } from 'aws-sdk/clients/s3';
import { ConcreteSlice, linearSlices, Slice, slicer } from './slice';
const s3 = new S3();

const FIVE_MiB = 5242880;

export interface S3ObjectReference {
    bucket: string;
    key: string;
}

// Flexible API for applying mutations to any number of objects
export interface Patch {
    slice: Slice;
    replacement: Buffer;
}


// type PartGenerator = Promise<UploadPartRequest | UploadPartCopyRequest>;

// in a Plan, the concrete slices are slices of the original object
type Plan = Array<ConcreteSlice | Buffer>;

function sizeOfPlan(plan: Plan) {
    return plan.map((p) => {
        if (Buffer.isBuffer(p)) {
            return p.length;
        } else {
            return p.end - p.start;
        }
    }).reduce((x, y) => x+y, 0);
}

function sizeOfSlice(slice: ConcreteSlice) {
    return slice.end - slice.start;
}

// TODO: plan should simply produce Array<Slice | Buffer>
//       then plan needs to be coalesced into parts of a minimum size
//       then when plan is applied, S3 getObject() finally happens
export function makePlan(sourceLength: number, patches: Patch[]): Plan {
    const srcCalculator = slicer(sourceLength);
    const srcPatches = patches.map((patch) => {
        return {
            slice: srcCalculator(patch.slice),
            replacement: patch.replacement,
        };
    });
    const sizeDelta = srcPatches.map((patch) => {
        return patch.replacement.length - (patch.slice.end - patch.slice.start);
    }).reduce((x, y) => x + y, 0);

    const destinationLength = sourceLength + sizeDelta;
    const dstCalculator = slicer(destinationLength);
    // console.log(sourceLength);
    // console.log(destinationLength);
    // console.log(sizeDelta);
    const dstPatches = patches.map((patch) => {
        return {
            slice: dstCalculator(patch.slice),
            replacement: patch.replacement,
        };
    });

    const plan: Plan = [];
    let cursor = 0;

    for (let i = 0; i < dstPatches.length; null) {
        const srcPatch = srcPatches[i];
        const dstPatch = dstPatches[i];
        if (cursor === dstPatch.slice.start) {
            // Add patches as we arrive at them
            plan.push(dstPatch.replacement)
            cursor += dstPatch.replacement.length;
            i++;
        } else {
            // Add slices of original (between patches)
            // while traversing toward patches
            const sliceOfOriginal: ConcreteSlice = {
                start: cursor,
                end: dstPatch.slice.start,
            }
            cursor += sizeOfSlice(sliceOfOriginal);
            plan.push(sliceOfOriginal)
        }
    }

    return plan;

    // const parts: PartGenerator[] = [];
    // const patchGroup: Patch[] = [];
    // let cursor = 0;
    //
    // // TODO: this function doesn't really know/care about bucket, key, partNumber... so remove all that.
    // function commitPatchGroup() {
    //     if (patchGroup.length === 0) {
    //         throw Error('empty patch group cannot be committed')
    //     }
    //     const firstPatch = patchGroup[0];
    //     const lastPatch = patchGroup[patchGroup.length - 1];
    //     const patchLength = lastPatch.slice.end! - firstPatch.slice.start!;
    //     if (patchLength < FIVE_MiB) {
    //         throw Error('patch group is too small to commit')
    //     }
    //     parts.push(new Promise<UploadPartRequest>((resolve, reject) => {
    //         if (patchGroup.length === 1 && firstPatch.replacement.length > FIVE_MiB) {
    //             // if we have one large (5 MiB+) patch it's easy
    //             resolve({
    //                 UploadId,
    //                 Bucket: 'bucket',
    //                 Key: 'key',
    //                 PartNumber: parts.length,
    //                 Body: firstPatch.replacement,
    //             });
    //         } else if (patchGroup.length > 1) {
    //             // but usually we have to fetch part of the original object
    //             // and do mutations in memory in this process
    //             // in order to meet the minimum size requirement (5 MiB) for multi-part uploads
    //             // TODO: move real getObject out of plan phase
    //             const head = s3.getObject({
    //                 Bucket: destination.bucket,
    //                 Key: destination.key,
    //                 // FIXME: we need offsets from the origin; this is using offsets in destination
    //                 //        so it will only ever work if patch doesn't change the size.
    //                 Range: `bytes=${firstPatch.slice.start}-${lastPatch.slice.end}`,
    //             }).promise();
    //             head.then((x) => {
    //                 if (Buffer.isBuffer(x.Body)) {
    //                     // let's build a series of slices from the object and our patches
    //                     const b: Buffer = x.Body;
    //                     const series: Buffer[] = [];
    //                     series.push(b.slice(2, 4));
    //                     resolve({
    //                         UploadId,
    //                         Bucket: 'bucket',
    //                         Key: 'key',
    //                         PartNumber: parts.length,
    //                         // PERF: maybe we're using a lot of RAM right here?
    //                         Body: Buffer.concat(series),
    //                     });
    //                 }
    //             }).catch((err) => {
    //                 console.error('oh shit, s3 getObject failed');
    //                 throw err;
    //             })
    //         }
    //         resolve({
    //             UploadId,
    //             Bucket: 'bucket',
    //             Key: 'key',
    //             PartNumber: parts.length,
    //             Body: dstPatches[i].replacement,
    //         });
    //     }))
    // }
    // for (let i = 0; i < dstPatches.length; i++) {
    //     const srcPatch = srcPatches[i];
    //     const dstPatch = dstPatches[i];
    //     if (dstPatch.slice.start > cursor + FIVE_MiB) {
    //         // if we've been accumulating patches, now is a good time to commit them
    //         commitPatchGroup();
    //         // we can do server-side copy with chunks of 5 MiB or more
    //         parts.push(new Promise<UploadPartCopyRequest>((resolve, reject) => {
    //             resolve({
    //                 UploadId,
    //                 Bucket: 'bucket',
    //                 Key: 'key',
    //                 PartNumber: parts.length,
    //                 CopySource: [source.bucket, source.key].join('/'),
    //                 CopySourceRange: `bytes=${srcPatch.slice.start}-${srcPatch.slice.end}`,
    //             });
    //         }))
    //         cursor = dstPatch.slice.end;
    //     } else if (dstPatch.slice.start > cursor && dstPatch.slice.start < cursor + FIVE_MiB) {
    //         // when patches are too close together, they need to be rolled up into a single part
    //         patchGroup.push(dstPatch);
    //         // but also, let's limit the size of in-memory patch data to something reasonable
    //         if (patchGroup[patchGroup.length-1].slice.end! - cursor > MAX_PATCH_SIZE) {
    //             commitPatchGroup();
    //         }
    //     }
    // }
    // return parts;
}

// When using multi-part uploads, the minimum part size is 5 MB
// So we need to be fairly tricky
// If the file plus patches is less than 5 MB... then we'll need to fall back on putobject
// returns an array of Plans, all guaranteed to be larger than minPartSize
export function coalesce(plan: Plan, minPartSize: number): Plan[] {
    const MAX_PATCH_SIZE = FIVE_MiB * 6; // 6 is just a random guess at a good value -NW
    throw Error('Not Yet Implemented')
}

export function patchLocal(original: Buffer, patches: Patch[]): Buffer {
    const plan = makePlan(original.length, patches);
    return Buffer.concat(plan.map((piece) => {
        if (Buffer.isBuffer(piece)) {
            return piece;
        } else {
            return original.slice(piece.start, piece.end)
        }
    }));
}

export async function exec(source: S3ObjectReference,
                           destination: S3ObjectReference,
                           parts: Plan[]): Promise<void> {
    // this is where we produce UploadId: string
    throw Error("Not yet implemented");

    // return {ETag: ""};
    // await s3.uploadPart()
    // const foo = await s3.putObject({
    //     Bucket: destination.bucket,
    //     Key: destination.key,
    //     Body: patches[0].replacement,
    // }).promise();
    // if (foo.ETag) {
    //     return {ETag: foo.ETag};
    // } else {
    //     throw Error('no ETag???');
    // }

}


// what if source == dest? does AWS let us do that? or do we need a temp file with ~tmp suffix?
export async function patch(
    source: S3ObjectReference,
    destination: S3ObjectReference,
    patches: Patch[],
): Promise<void> {
    const head = await s3.headObject({
        Bucket: destination.bucket,
        Key: destination.key,
    }).promise();
    if (head.ContentLength === undefined) {
        throw Error('Failed to get length of source object; cannot patch object of unknown length')
    }

    const sourceLength = head.ContentLength;
    const p = makePlan(sourceLength, patches);
    const destLength = sizeOfPlan(p);
    if (destLength > FIVE_MiB) {
        const c = coalesce(p, FIVE_MiB);
        await exec(source, destination, c);
    } else {
        // FIXME: if final object is less than 5 MiB we must use putObject instead
        throw Error('Not Yet Implemented')
    }
}


// IDEA: maybe allow chaining? like this
// obj.replace(2, 4, 'okey-dokey').prepend('hello').append('world')
