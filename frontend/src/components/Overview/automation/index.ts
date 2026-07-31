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
 * Automation module: scheduled tasks (MI) / automations (BI).
 *
 * devant's automation card additionally carries a cron description banner, a
 * next-run countdown, Schedule/Run buttons and per-env insights. None of them are
 * rendered here, and none are faked: the runtime bridge reports an automation as
 * `MainDetail { packageOrg, packageName, packageVersion }` only — no schedule, no
 * execution history — and its `ControlAction` enum has no trigger, so there is
 * nothing to describe, count down to, or run. Those need a bridge release first.
 *
 * MI tasks are better served: their status toggle and Trigger control are real
 * (MI management API) and come from the detail panel.
 */
const automationModule: OverviewModule = {
  EnvCardBody,
  EnvCardActions: EntryPointActions,
};

export default automationModule;
