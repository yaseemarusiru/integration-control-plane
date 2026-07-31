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

import type { GqlArtifact } from '../../../api/queries';

// Stable reference for useArtifacts' `data` fallback — a fresh `[]` literal on every render (the
// default in `const { data: x = [] } = ...`) changes identity even when the query is disabled and
// data is genuinely unchanged, which cascades through downstream useMemo/useEffect chains and can
// trigger a render loop (e.g. EntryPointsList's onEntryPointChange effect).
export const EMPTY_ARTIFACTS: GqlArtifact[] = [];

export function toEnabled(value: unknown) {
  if (typeof value === 'boolean') return value;
  const normalized = (value ?? '').toString().toLowerCase();
  return normalized === 'enabled' || normalized === 'active' || normalized === 'true';
}

/**
 * Secondary empty-state line for the type-specific bodies. A narrowed entry-point
 * list finding nothing is often a mis-typed integration rather than an empty one,
 * and the type is editable from the header dropdown.
 */
export const WRONG_TYPE_HINT = 'If this integration exposes something else, change its type under the integration name.';
