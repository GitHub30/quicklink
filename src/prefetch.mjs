/**
 * Portions copyright 2018 Google Inc.
 * Inspired by Gatsby's prefetching logic, with those portions
 * remaining MIT. Additions include support for Fetch API,
 * XHR switching, SaveData and Effective Connection Type checking.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
**/
const preFetched = {};

/**
 * Checks if a feature on `link` is natively supported.
 * Examples of features include `prefetch` and `preload`.
 * @param {string} feature - name of the feature to test
 * @return {Boolean} whether the feature is supported
 */
function support(feature) {
  if (typeof document === `undefined`) {
    return false;
  }
  const fakeLink = document.createElement(`link`);
  try {
    if (fakeLink.relList && typeof fakeLink.relList.supports === `function`) {
      return fakeLink.relList.supports(feature);
    }
  } catch (err) {
    return false;
  }
};

/**
 * Fetches a given URL using `<link rel=prefetch>`
 * @param {string} url - the URL to fetch
 * @return {Object} a Promise
 */
function linkPrefetchStrategy(url) {
  return new Promise((resolve, reject) => {
    if (typeof document === `undefined`) {
      reject();
      return;
    }

    const link = document.createElement(`link`);
    link.setAttribute(`rel`, `prefetch`);
    link.setAttribute(`href`, url);

    link.onload = resolve;
    link.onerror = reject;

    const parentElement =
      document.getElementsByTagName(`head`)[0] ||
      document.getElementsByName(`script`)[0].parentNode;
    parentElement.appendChild(link);
  });
};

/**
 * Fetches a given URL using XMLHttpRequest
 * @param {string} url - the URL to fetch
 * @return {Object} a Promise
 */
function xhrPrefetchStrategy(url) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open(`GET`, url, true);
    req.withCredentials = true;

    req.onload = () => {
      if (req.status === 200) {
        resolve();
      } else {
        reject();
      }
    };

    req.send(null);
  });
};

/**
 * Fetches a given URL using the Fetch API. Falls back
 * to XMLHttpRequest if the API is not supported.
 * @param {string} url - the URL to fetch
 * @return {Object} a Promise
 */
function highPriFetchStrategy(url) {
  // TODO: Investigate using preload for high-priority
  // fetches. May have to sniff file-extension to provide
  // valid 'as' values. In the future, we may be able to
  // use Priority Hints here.
  if (self.fetch === undefined) {
    return xhrPrefetchStrategy(url);
  } else {
    // As of 2018, fetch() is high-priority in Chrome
    // and medium-priority in Safari.
    return fetch(url, {credentials: `include`});
  }
};

const supportedPrefetchStrategy = support(`prefetch`)
  ? linkPrefetchStrategy
  : xhrPrefetchStrategy;

/**
 * Prefetch a given URL with an optional preferred fetch priority
 * @param {string} url - the URL to fetch
 * @param {string} priority - preferred fetch priority (`low` or `high`)
 * @return {Object} a Promise
 */
async function prefetcher(url, priority) {
  if (preFetched[url]) {
    return;
  }

  if ('connection' in navigator) {
    // Don't prefetch if the user is on 2G..
    if ((navigator.connection.effectiveType || '').includes('2g')) {
      return;
    }
    // Don't prefetch if Save-Data is enabled..
    if (navigator.connection.saveData) {
      return;
    }
  }

  try {
    if (priority && priority === `high`) {
      await highPriFetchStrategy(url);
    } else {
      await supportedPrefetchStrategy(url);
    };
    preFetched[url] = true;
  } catch (e) {
    // Wanna do something?
  }
};

export default prefetcher;
