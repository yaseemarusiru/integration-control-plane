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

import type { JSX } from 'react';
import EntryPointsList from '../_shared/EntryPointsList';
import { WRONG_TYPE_HINT } from '../_shared/entryPointUtils';
import type { EnvCardBodyProps } from '../types';

// The kinds that expose an API: REST APIs and proxy services on MI, services on
// BI. Tasks, inbound endpoints and workflows belong to other types.
const MI_KINDS = ['RestApi', 'ProxyService'] as const;
const BI_KINDS = ['Service'] as const;

/**
 * Integration as API body: the API-shaped entry points, whose detail panel
 * carries the resource list, the OpenAPI docs entry and the tracing/statistics
 * controls. devant's equivalent shows endpoint URLs + swagger operations; ICP's
 * resource list and packed OpenAPI definitions are the same information from the
 * runtime's artifact report.
 */
export default function EnvCardBody({ component, env, projectId, isOnline, onOpenDrawerForTab, onEntryPointChange }: EnvCardBodyProps): JSX.Element {
  const isMI = component.componentType === 'MI';
  return (
    <EntryPointsList
      envId={env.id}
      componentId={component.id}
      projectId={projectId}
      componentType={component.componentType}
      kinds={isMI ? MI_KINDS : BI_KINDS}
      isOnline={isOnline}
      emptyMessage={isMI ? 'No APIs or proxy services found for this integration. Add a runtime to get started.' : 'No services found for this integration. Add a runtime to get started.'}
      emptyHint={WRONG_TYPE_HINT}
      onOpenDrawer={onOpenDrawerForTab}
      onSelectionChange={onEntryPointChange}
    />
  );
}
