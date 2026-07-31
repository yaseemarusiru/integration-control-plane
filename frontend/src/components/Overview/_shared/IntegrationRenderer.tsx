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

import { Card, CardContent, Skeleton, Stack } from '@wso2/oxygen-ui';
import type { JSX } from 'react';
import type { GqlArtifact, GqlComponentDetail, GqlEnvironment } from '../../../api/queries';
import { useOverviewModule } from '../../../hooks/useOverviewModule';
import { overviewModuleKey } from '../registry';
import EnvCardShell from './EnvCardShell';

/**
 * The Overview's single dispatch point, used by `pages/Component.tsx`.
 *
 * Resolves the module key once (`overviewModuleKey`, which wraps the same
 * `integrationTypeFromStored` the header label and edit flows use — never
 * re-derived per card), lazily loads that key's module, and renders one
 * `EnvCardShell` per environment with the module's slots filled.
 *
 * While the module chunk loads it shows one frame-shaped skeleton per
 * environment, so the cards take their final shape immediately instead of
 * flashing a spinner and then popping in.
 */
export default function IntegrationRenderer({
  component,
  environments,
  projectId,
  onSelectArtifact,
  onOpenDrawerForTab,
}: {
  component: GqlComponentDetail;
  environments: GqlEnvironment[];
  projectId: string;
  onSelectArtifact: (a: GqlArtifact, type: string, envId: string) => void;
  onOpenDrawerForTab: (a: GqlArtifact, type: string, envId: string, tab: string) => void;
}): JSX.Element {
  const module = useOverviewModule(overviewModuleKey(component.displayType, component.componentSubType));

  if (!module) {
    return (
      <>
        {environments.map((env) => (
          <Card key={env.id} variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Skeleton variant="text" width="30%" height={32} />
              <Stack gap={1} sx={{ mt: 2 }}>
                <Skeleton variant="rounded" height={40} />
                <Skeleton variant="rounded" height={72} />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  return (
    <>
      {environments.map((env) => (
        <EnvCardShell key={env.id} component={component} env={env} projectId={projectId} module={module} onSelectArtifact={onSelectArtifact} onOpenDrawerForTab={onOpenDrawerForTab} />
      ))}
    </>
  );
}
