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

import EntryPointActions from '../_shared/EntryPointActions';
import type { OverviewModule } from '../types';
import EnvCardBody from './EnvCardBody';

/**
 * The runtime-shaped Overview: every entry point the runtime reports, whatever
 * the integration type. Types that have no module of their own render this —
 * today AI Agent and MCP Server, whose real bodies (agent chat, tool list) need
 * a server-side proxy to the deployed service that does not exist yet.
 */
const defaultModule: OverviewModule = {
  EnvCardBody,
  EnvCardActions: EntryPointActions,
};

export default defaultModule;
