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

import { integrationTypeFromStored, type IntegrationType } from '../../constants/integrationTypes';
import type { OverviewModule } from './types';

type ModuleLoader = () => Promise<{ default: OverviewModule }>;

/**
 * What the Overview dispatches on: an integration type, or `untyped` for rows
 * that never had a type set.
 */
export type OverviewModuleKey = IntegrationType | 'untyped';

/**
 * `"service"` is the server's `displayType` default — every integration created
 * before integration types existed, and anything created by a client that sends
 * no `displayType`, carries it (`component_repository.bal` createComponent).
 *
 * Those rows read back as Integration as API for *labelling*, but their real
 * shape is unknown: an untyped MI integration may well expose tasks or inbound
 * endpoints. Narrowing them to APIs would hide those entry points, so they get
 * the runtime-shaped `default` module — the exact Overview they had before
 * per-type rendering. Setting the type from the header dropdown opts a row in.
 */
export function overviewModuleKey(displayType: string, componentSubType?: string | null): OverviewModuleKey {
  if (!displayType || displayType === 'service') return 'untyped';
  return integrationTypeFromStored(displayType, componentSubType);
}

/**
 * Maps each integration type to the dynamic import that produces its Overview
 * module. Each distinct entry becomes its own bundle chunk, so a user viewing an
 * Automation never downloads another type's code.
 *
 * `ai-agent` and `mcp-server` still point at `default`: their real bodies (an
 * inline agent chat, the deployed server's tool list) both need a server-side
 * proxy to the deployed service, which ICP does not have yet. Until then they
 * render the runtime-shaped Overview rather than a stub.
 *
 * The `Record<>` keeps adding a type a compile-time obligation, not a runtime hope.
 */
export const overviewModuleLoaders: Record<OverviewModuleKey, ModuleLoader> = {
  service: () => import('./integration-as-api'),
  automation: () => import('./automation'),
  'file-integration': () => import('./file-integration'),
  'event-integration': () => import('./event-integration'),
  'ai-agent': () => import('./default'),
  'mcp-server': () => import('./default'),
  untyped: () => import('./default'),
};
