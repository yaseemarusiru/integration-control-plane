/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useEffect, useState } from 'react';
import { overviewModuleLoaders, type OverviewModuleKey } from '../components/Overview/registry';
import type { OverviewModule } from '../components/Overview/types';

/**
 * Lazily loads the Overview module (one chunk per integration type) for a
 * resolved module key. Returns `null` while the chunk loads, so the caller can
 * show a skeleton. The dynamic import is an external system, so an effect is the
 * right tool here — not a render-time derivation.
 */
export function useOverviewModule(key: OverviewModuleKey | null | undefined): OverviewModule | null {
  const [module, setModule] = useState<OverviewModule | null>(null);

  useEffect(() => {
    if (!key) {
      setModule(null);
      return;
    }
    let cancelled = false;
    setModule(null);
    overviewModuleLoaders[key]()
      .then((loaded) => {
        if (!cancelled) setModule(loaded.default);
      })
      .catch(() => {
        // The registry points every type at a real loader, so a failure here means
        // a broken bundle — a build gate would catch it. Leave the module null and
        // let the caller keep showing its skeleton rather than crash the page.
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return module;
}
