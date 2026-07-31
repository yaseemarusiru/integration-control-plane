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
 * Integration as API module — the type an integration gets by default, and the
 * one every pre-integration-type integration reads back as.
 *
 * Shows only the API-shaped entry points (REST APIs + proxy services on MI,
 * services on BI) with the shared View Source / View Runtimes actions.
 */
const integrationAsApiModule: OverviewModule = {
  EnvCardBody,
  EnvCardActions: EntryPointActions,
};

export default integrationAsApiModule;
