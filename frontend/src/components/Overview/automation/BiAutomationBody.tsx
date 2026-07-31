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
import AutomationExecutions, { type AutomationExecution } from './AutomationExecutions';

/**
 * BI automation body, matching devant's automation card: a divider, then the
 * executions table (Status · Triggered At · Duration · Commit ID · Latest Logs),
 * falling back to devant's centered line when there are no runs to show.
 *
 * The list is empty because nothing in ICP records a run. What exists is
 * `bi_automation_execution_history`, which takes one row per heartbeat stamped
 * with the heartbeat's own timestamp (`heartbeat_repository.bal:802`) — at a 10s
 * heartbeat that is ~8,600 rows a day for one automation, and it carries no
 * status, no start/end pair and no commit. Rendering it as executions would
 * invent all four columns, so it is not used.
 *
 * To fill this table, a runtime has to report real runs — the four fields on
 * {@link AutomationExecution}. That is a `wso2/icp.runtime.bridge` change
 * (`MainDetail` carries only package coords today), then persistence in
 * `icp_server`. Once a query exists, it replaces the empty list below and
 * nothing else here changes.
 *
 * devant's schedule banner is absent for the same reason: no cron is reported.
 */
export default function BiAutomationBody(): JSX.Element {
  const executions: AutomationExecution[] = [];

  return (
    <>
      <Divider sx={{ my: 2 }} />
      <AutomationExecutions executions={executions} />
    </>
  );
}
