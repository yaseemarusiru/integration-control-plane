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

import { Button } from '@wso2/oxygen-ui';
import { Code, Server } from '@wso2/oxygen-ui-icons-react';
import type { JSX } from 'react';
import type { EnvCardActionsProps } from '../types';

// Only the MI artifact kinds carry a source view; a BI service's source is not
// packed into the runtime's artifact report.
const SOURCE_VIEWABLE_TYPES = ['RestApi', 'ProxyService', 'InboundEndpoint', 'Task'];

/**
 * Header actions for any type whose body is an entry-point list: View Source and
 * View Runtimes for the current selection, both opening the artifact drawer on
 * that tab. Shared because every entry-point-shaped type wants exactly these —
 * a type needing more composes its own slot instead.
 */
export default function EntryPointActions({ env, currentEntryPoint, onOpenDrawerForTab }: EnvCardActionsProps): JSX.Element | null {
  if (!currentEntryPoint) return null;
  const showSource = SOURCE_VIEWABLE_TYPES.includes(currentEntryPoint.type);

  return (
    <>
      {showSource && (
        <Button variant="text" size="small" startIcon={<Code size={14} />} onClick={() => onOpenDrawerForTab(currentEntryPoint.artifact, currentEntryPoint.type, env.id, 'Source')} sx={{ textTransform: 'none' }}>
          View Source
        </Button>
      )}
      <Button variant="text" size="small" startIcon={<Server size={14} />} onClick={() => onOpenDrawerForTab(currentEntryPoint.artifact, currentEntryPoint.type, env.id, 'Runtimes')} sx={{ textTransform: 'none' }}>
        View Runtimes
      </Button>
    </>
  );
}
