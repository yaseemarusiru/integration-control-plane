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
import type { EnvCardBodyProps } from '../types';

// Every kind the runtime reports as an entry point — the pre-per-type list.
const MI_KINDS = ['RestApi', 'ProxyService', 'InboundEndpoint', 'Task'] as const;
const BI_KINDS = ['Service', 'Workflow', 'Automation'] as const;

/**
 * The default body: every entry point the runtime reports, with the selected
 * one's detail panel.
 */
export default function EnvCardBody({ component, env, projectId, isOnline, onOpenDrawerForTab, onEntryPointChange }: EnvCardBodyProps): JSX.Element {
  return (
    <EntryPointsList
      envId={env.id}
      componentId={component.id}
      projectId={projectId}
      componentType={component.componentType}
      kinds={component.componentType === 'MI' ? MI_KINDS : BI_KINDS}
      isOnline={isOnline}
      onOpenDrawer={onOpenDrawerForTab}
      onSelectionChange={onEntryPointChange}
    />
  );
}
