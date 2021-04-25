import type { firestore } from 'firebase-admin';
import { CollectionTraverser } from './CollectionTraverser';

interface UpdateResult {
  batchCount: number;
  updatedDocCount: number;
}

type UpdatePredicate<T> = (snapshot: firestore.QueryDocumentSnapshot<T>) => boolean;

type UpdateDataGetter<T> = (snapshot: firestore.QueryDocumentSnapshot<T>) => firestore.UpdateData;

export class CollectionMigrator<T> extends CollectionTraverser<T> {
  /**
   * Updates all documents in this collection with the provided update data. Uses batch writes so
   * the entire batch will fail if a single update isn't successful. This method uses the `.traverse()`
   * method internally to traverse the entire collection.
   * @param updateData - The data with which to update each document. Must be a non-empty object.
   * @param predicate - Optional. A function that returns a boolean indicating whether to update the current document. Takes the `QueryDocumentSnapshot` corresponding to the document as its first argument. If this is not provided, all documents will be updated.
   * @returns The number of batches and documents updated.
   */
  public update(
    updateData: firestore.UpdateData,
    predicate?: UpdatePredicate<T>
  ): Promise<UpdateResult>;

  /**
   * Updates all documents in this collection with the provided update data. Uses batch writes so
   * the entire batch will fail if a single update isn't successful. This method uses the `.traverse()`
   * method internally to traverse the entire collection.
   * @param field - The field to update in each document.
   * @param value - The value with which to update the specified field in each document.
   * @param predicate - Optional. A function that returns a boolean indicating whether to update the current document. Takes the `QueryDocumentSnapshot` corresponding to the document as its first argument. If this is not provided, all documents will be updated.
   * @returns The number of batches and documents updated.
   */
  public update(
    field: string | firestore.FieldPath,
    value: any,
    predicate?: UpdatePredicate<T>
  ): Promise<UpdateResult>;

  /**
   * Updates all documents in this collection with the provided update data. Uses batch writes so
   * the entire batch will fail if a single update isn't successful. This method uses the `.traverse()`
   * method internally to traverse the entire collection.
   * @param getUpdateData - A function that returns an object with which to update each document (i.e. the `updateData` object).
   * @param predicate - Optional. A function that returns a boolean indicating whether to update the current document. Takes the `QueryDocumentSnapshot` corresponding to the document as its first argument. If this is not provided, all documents will be updated.
   * @returns The number of batches and documents updated.
   */
  public update(
    getUpdateData: (snapshot: firestore.QueryDocumentSnapshot<T>) => firestore.UpdateData,
    predicate?: UpdatePredicate<T>
  ): Promise<UpdateResult>;

  public async update(...args: unknown[]): Promise<UpdateResult> {
    const handleUpdateBatchDoc = this.getUpdateHandlerForSignature(...args);

    const batch = this.collectionOrQuery.firestore.batch();

    const { batchCount, docCount: updatedDocCount } = await this.traverse(async (snapshots) => {
      snapshots.forEach((snapshot) => {
        handleUpdateBatchDoc(batch, snapshot);
      });
    });

    await batch.commit();

    return { batchCount, updatedDocCount };
  }

  private getUpdateHandlerForSignature(
    ...args: unknown[]
  ): (batch: firestore.WriteBatch, snapshot: firestore.QueryDocumentSnapshot<T>) => void {
    const [arg1, arg2, arg3] = args;
    const argCount = args.length;
    return (batch, snapshot) => {
      if (typeof arg1 === 'function') {
        // Signature 3
        const getUpdateData = arg1 as UpdateDataGetter<T>;
        const predicate = arg2 as UpdatePredicate<T> | undefined;
        const shouldUpdate = predicate?.(snapshot) ?? true;
        if (shouldUpdate) {
          batch.update(snapshot.ref, getUpdateData(snapshot));
        }
      } else if (argCount === 2 && typeof arg2 !== 'function') {
        // Signature 2
        const field = arg1 as string | firestore.FieldPath;
        const value = arg2 as any;
        const predicate = arg3 as UpdatePredicate<T> | undefined;
        const shouldUpdate = predicate?.(snapshot) ?? true;
        if (shouldUpdate) {
          batch.update(snapshot.ref, field, value);
        }
      } else {
        // Signature 1
        const updateData = arg1 as firestore.UpdateData;
        const predicate = arg2 as UpdatePredicate<T> | undefined;
        const shouldUpdate = predicate?.(snapshot) ?? true;
        if (shouldUpdate) {
          batch.update(snapshot.ref, updateData);
        }
      }
    };
  }
}
