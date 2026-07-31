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

import { Divider } from '@wso2/oxygen-ui';
import type { JSX } from 'react';
import InlineLogs from '../InlineLogs';
import type { EnvCardBodyProps } from '../../types';

/**
 * Shared env-card body for the two log-shaped integration types —
 * **file-integration** and **event-integration**.
 *
 * The body *is* the log stream, matching devant: neither type exposes a request
 * contract, so there is no endpoint list worth showing. The listening artifact
 * itself, its status and its start/stop control live in the header slot
 * (`_shared/FileEventActions`), which is where devant puts them too.
 */
export default function FileEventBody({ component, env }: EnvCardBodyProps): JSX.Element {
  return (
    <>
      <Divider sx={{ my: 2 }} />
      <InlineLogs componentId={component.id} envId={env.id} />
    </>
  );
}
