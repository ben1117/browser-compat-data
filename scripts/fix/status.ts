/* This file is a part of @mdn/browser-compat-data
 * See LICENSE file for more information. */

import { BrowserName, Identifier } from '../../types/types.js';

import fs from 'node:fs';

import { IS_WINDOWS } from '../../test/utils.js';

import bcd from '../../index.js';
const { browsers } = bcd;

const fixStatus = (key: string, value: Identifier): Identifier => {
  const compat = value?.__compat;
  if (compat?.status) {
    if (compat.status.experimental && compat.status.deprecated) {
      compat.status.experimental = false;
    }

    if (compat.spec_url && compat.status.standard_track === false) {
      compat.status.standard_track = true;
    }

    if (compat.status.experimental) {
      const browserSupport: Set<BrowserName> = new Set();

      for (const [browser, support] of Object.entries(compat.support)) {
        // Consider only the first part of an array statement.
        const statement = Array.isArray(support) ? support[0] : support;
        // Ignore anything behind flag, prefix or alternative name
        if (statement.flags || statement.prefix || statement.alternative_name) {
          continue;
        }
        if (statement.version_added && !statement.version_removed) {
          browserSupport.add(browser as BrowserName);
        }
      }

      // Now check which of Blink, Gecko and WebKit support it.

      const engineSupport = new Set();

      for (const browser of browserSupport) {
        const currentRelease = Object.values(browsers[browser].releases).find(
          (r) => r.status === 'current',
        );
        const engine = currentRelease?.engine;
        if (engine) {
          engineSupport.add(engine);
        }
      }

      let engineCount = 0;
      for (const engine of ['Blink', 'Gecko', 'WebKit']) {
        if (engineSupport.has(engine)) {
          engineCount++;
        }
      }

      if (engineCount > 1) {
        compat.status.experimental = false;
      }
    }
  }

  return value;
};

/**
 * @param {string} filename
 */
const fixStatusFromFile = (filename: string): void => {
  let actual = fs.readFileSync(filename, 'utf-8').trim();
  let expected = JSON.stringify(JSON.parse(actual, fixStatus), null, 2);

  if (IS_WINDOWS) {
    // prevent false positives from git.core.autocrlf on Windows
    actual = actual.replace(/\r/g, '');
    expected = expected.replace(/\r/g, '');
  }

  if (actual !== expected) {
    fs.writeFileSync(filename, expected + '\n', 'utf-8');
  }
};

export default fixStatusFromFile;
