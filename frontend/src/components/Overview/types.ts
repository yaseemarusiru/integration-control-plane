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

import type { ComponentType } from 'react';
import type { GqlArtifact, GqlComponentDetail, GqlEnvironment, GqlRuntime } from '../../api/queries';

/** An entry point the body has selected: the artifact plus its artifact type. */
export interface SelectedEntryPoint {
  artifact: GqlArtifact;
  type: string;
}

/**
 * The data + callbacks the shared `EnvCardShell` passes to every per-type slot.
 *
 * The shell owns the generic concerns — the per-env runtime fetch, refresh, the
 * settings drawer and the MI supporting-artifacts view. Each slot reads what it
 * needs from here and fetches its own *type-specific* data (artifacts, logs,
 * executions) via the existing query hooks; react-query de-dupes.
 */
export interface EnvCardSlotProps {
  component: GqlComponentDetail;
  env: GqlEnvironment;
  projectId: string;
  /** Runtimes registered for this component in this env — fetched once by the shell. */
  runtimes: GqlRuntime[];
  /**
   * At least one runtime is RUNNING. Artifact queries are gated on this: a
   * component with no live runtime has no artifacts to report.
   */
  isOnline: boolean;
  onSelectArtifact: (a: GqlArtifact, type: string, envId: string) => void;
  onOpenDrawerForTab: (a: GqlArtifact, type: string, envId: string, tab: string) => void;
}

/**
 * Body slot: the type's content only — entry-point pickers, tables, log
 * streams. No Card/header chrome; that's the shell's frame.
 */
export interface EnvCardBodyProps extends EnvCardSlotProps {
  /**
   * Reports the body's current selection up to the shell, which shares it with
   * the actions slot (View Source / View Runtimes act on the selected entry
   * point). A body with no selection concept never calls it.
   */
  onEntryPointChange: (entry: SelectedEntryPoint | null) => void;
}

/**
 * Right-header slot: the type's action buttons, rendered before the Refresh
 * icon. Receives the body's current selection via the shell.
 */
export interface EnvCardActionsProps extends EnvCardSlotProps {
  currentEntryPoint: SelectedEntryPoint | null;
}

/**
 * The contract each integration type fulfils for the Overview surface.
 *
 * `EnvCardBody` is the type's content (the shell wraps it in the Card frame);
 * `EnvCardActions` is optional. A type that needs neither is not a type — it
 * uses the `default` module.
 */
export interface OverviewModule {
  EnvCardBody: ComponentType<EnvCardBodyProps>;
  EnvCardActions?: ComponentType<EnvCardActionsProps>;
}
