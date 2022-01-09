import { expectType } from 'tsd';
import { createTraverser, Traverser } from '../../src';
import { collectionRef, D } from './_helpers';

const traverser = createTraverser(collectionRef, {
  batchSize: 0,
  sleepBetweenBatches: false,
  sleepTimeBetweenBatches: 0,
  maxDocCount: 0,
  maxConcurrentBatchCount: 0,
});

expectType<Traverser<D>>(traverser);
