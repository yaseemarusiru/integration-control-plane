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
import BiAutomationBody from './BiAutomationBody';

// Scheduled work on MI: tasks.
const MI_KINDS = ['Task'] as const;

/**
 * Automation body.
 *
 * BI automations get devant's card shape (`BiAutomationBody`). MI tasks do not:
 * their status toggle and Trigger control are real — the MI management API backs
 * both — and they arrive with the entry-point detail panel, so an MI task keeps
 * the picker rather than losing working controls to match a card devant renders
 * from data ICP does not have.
 */
export default function EnvCardBody(props: EnvCardBodyProps): JSX.Element {
  const { component, env, projectId, isOnline, onOpenDrawerForTab, onEntryPointChange } = props;
  if (component.componentType !== 'MI') return <BiAutomationBody />;

  return (
    <EntryPointsList
      envId={env.id}
      componentId={component.id}
      projectId={projectId}
      componentType={component.componentType}
      kinds={MI_KINDS}
      isOnline={isOnline}
      emptyMessage="No scheduled tasks found for this automation. Add a runtime to get started."
      emptyHint={WRONG_TYPE_HINT}
      onOpenDrawer={onOpenDrawerForTab}
      onSelectionChange={onEntryPointChange}
    />
  );
}
