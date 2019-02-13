export type PromiseCreator = () => Promise<any>;

/**
 * DuplicateCallTracker maintains active calls against a particular key
 */
export class DeDupeCallTracker {
  /**
   * Onload callbacks cache. Used to ensure we don't
   * issue multiple in-parallel requests for the same
   * class metadata.
   */
  promises: { [key: string]: Promise<any> } = {};

  /**
   * Generalization of duplicate request consolidation:
   *
   * @key: key to use to track the duplicate requests
   * @promiseCreator: function that will return an initial promise, e.g. () => fetch(...)
   * @return a Promise
   */
  dedupe(key: string, promiseCreator: PromiseCreator) {
    // get active or create
    return (
      this.promises[key] ||
      (this.promises[key] = promiseCreator()
        .then(data => {
          delete this.promises[key];
          return data;
        })
        .catch(err => {
          delete this.promises[key];
          return Promise.reject(err);
        }))
    );
  }
}

const deDupeCallTracker = new DeDupeCallTracker();

/**
 * Generalization of duplicate request consolidation:
 *
 * @key: key to use to track the duplicate requests
 * @promiseCreator: function that will return an initial promise, e.g. () => fetch(...)
 * @return a Promise
 */
export function dedupe(key: string, promiseCreator: PromiseCreator) {
  return deDupeCallTracker.dedupe(key, promiseCreator);
}
