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

import { Box, Button, CircularProgress, MenuItem, Select, Stack, Typography } from '@wso2/oxygen-ui';
import { Layers, Link as LinkIcon, Package, Plus, Tag } from '@wso2/oxygen-ui-icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useArtifacts, type GqlArtifact } from '../../../api/queries';
import Authorized from '../../Authorized';
import { Permissions } from '../../../constants/permissions';
import { resourceUrl, useScope } from '../../../nav';
import { ENTRY_POINT_CONFIG } from '../../artifact-config';
import CopyButton from './CopyButton';
import EntryPointDetail from './EntryPointDetail';
import EntryTypeChip from './EntryTypeChip';
import { EMPTY_ARTIFACTS } from './entryPointUtils';

/**
 * The entry-point picker + detail panel: a selector over the artifact kinds that
 * count as this integration's entry points, plus the selected one's detail.
 *
 * `kinds` is the type module's decision — an Automation asks for tasks, an
 * Integration as API asks for APIs and proxies. The `default` module asks for
 * every kind the runtime reports, which is the pre-per-type behaviour. Kinds
 * that belong to the other runtime are simply never present in the data.
 */
export default function EntryPointsList({
  envId,
  componentId,
  projectId,
  componentType,
  kinds,
  isOnline,
  emptyMessage = 'No entry points found for this integration. Add runtime to get started.',
  emptyHint,
  onOpenDrawer,
  onSelectionChange,
}: {
  envId: string;
  componentId: string;
  projectId: string;
  componentType: string;
  /** Artifact kinds to treat as entry points, in the order they should be listed. */
  kinds: readonly string[];
  isOnline: boolean;
  /** Shown when no artifact of any requested kind exists — phrased per type. */
  emptyMessage?: string;
  /** Secondary line under `emptyMessage`; type modules use it to point at the type picker. */
  emptyHint?: string;
  onOpenDrawer: (a: GqlArtifact, type: string, envId: string, tab: string) => void;
  onSelectionChange?: (entry: { artifact: GqlArtifact; type: string } | null) => void;
}) {
  const [selectedKey, setSelectedKey] = useState('');
  const navigate = useNavigate();
  const scope = useScope();
  const isMI = componentType === 'MI';

  // One hook per kind, unconditionally — each is enabled only if this type asked
  // for that kind, so the queries a type doesn't need never fire.
  const wants = (kind: string) => kinds.includes(kind) && isOnline;
  const { data: apis = EMPTY_ARTIFACTS, isLoading: loadingApis } = useArtifacts('RestApi', envId, componentId, { enabled: wants('RestApi'), active: isOnline });
  const { data: proxies = EMPTY_ARTIFACTS, isLoading: loadingProxies } = useArtifacts('ProxyService', envId, componentId, { enabled: wants('ProxyService'), active: isOnline });
  const { data: inboundEps = EMPTY_ARTIFACTS, isLoading: loadingInbound } = useArtifacts('InboundEndpoint', envId, componentId, { enabled: wants('InboundEndpoint'), active: isOnline });
  const { data: tasks = EMPTY_ARTIFACTS, isLoading: loadingTasks } = useArtifacts('Task', envId, componentId, { enabled: wants('Task'), active: isOnline });
  const { data: services = EMPTY_ARTIFACTS, isLoading: loadingServices } = useArtifacts('Service', envId, componentId, { enabled: wants('Service'), active: isOnline });
  const { data: automations = EMPTY_ARTIFACTS, isLoading: loadingAutomations } = useArtifacts('Automation', envId, componentId, { enabled: wants('Automation'), active: isOnline });
  const { data: workflows = EMPTY_ARTIFACTS, isLoading: loadingWorkflows } = useArtifacts('Workflow', envId, componentId, { enabled: wants('Workflow'), active: isOnline });

  const loadingByKind: Record<string, boolean> = {
    RestApi: loadingApis,
    ProxyService: loadingProxies,
    InboundEndpoint: loadingInbound,
    Task: loadingTasks,
    Service: loadingServices,
    Automation: loadingAutomations,
    Workflow: loadingWorkflows,
  };
  const isLoading = kinds.some((kind) => loadingByKind[kind]);

  const kindsKey = kinds.join(',');
  const allEntryPoints = useMemo(() => {
    const byKind: Record<string, GqlArtifact[]> = {
      RestApi: apis,
      ProxyService: proxies,
      InboundEndpoint: inboundEps,
      Task: tasks,
      Service: services,
      Automation: automations,
      Workflow: workflows,
    };
    // Listed in the order the type declared its kinds, so the first entry — the
    // default selection — is the one that type considers primary.
    return kindsKey.split(',').flatMap((type) => (byKind[type] ?? []).map((artifact) => ({ artifact, type })));
    // kindsKey stabilises the `kinds` array ref (a new literal on every render).
  }, [kindsKey, apis, proxies, inboundEps, tasks, services, workflows, automations]);

  const allKeys = new Set(
    allEntryPoints.map(({ artifact: a, type }) => {
      const artifactKey = type === 'Automation' ? a.packageName : a.name;
      return `${type}::${artifactKey}`;
    }),
  );
  const firstKey = allEntryPoints.length > 0 ? `${allEntryPoints[0].type}::${allEntryPoints[0].type === 'Automation' ? allEntryPoints[0].artifact.packageName : allEntryPoints[0].artifact.name}` : '';
  const activeKey = selectedKey && allKeys.has(selectedKey) ? selectedKey : firstKey;
  const selectedEntry = useMemo(
    () =>
      allEntryPoints.find(({ artifact: a, type }) => {
        const artifactKey = type === 'Automation' ? a.packageName : a.name;
        return `${type}::${artifactKey}` === activeKey;
      }),
    [allEntryPoints, activeKey],
  );

  useEffect(() => {
    onSelectionChange?.(selectedEntry ? { artifact: selectedEntry.artifact, type: selectedEntry.type } : null);
  }, [selectedEntry, onSelectionChange]);

  if (isLoading) return <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', py: 4 }} />;
  if (allEntryPoints.length === 0)
    return (
      <Stack alignItems="center" sx={{ py: 4 }} gap={2}>
        <Stack gap={0.5} alignItems="center">
          <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
            {emptyMessage}
          </Typography>
          {/* A narrowed view that finds nothing may just be the wrong type, so say
              so — otherwise a mis-typed integration reads as an empty one. */}
          {emptyHint && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {emptyHint}
            </Typography>
          )}
        </Stack>
        <Authorized permissions={[Permissions.INTEGRATION_MANAGE]}>
          <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={() => navigate(`${resourceUrl(scope, 'runtimes')}?action=add-runtime&environmentId=${encodeURIComponent(envId)}`)}>
            Add Runtime
          </Button>
        </Authorized>
      </Stack>
    );

  // Which pair of fields to show depends on the selected entry's artifact type: Tasks have
  // no URL/Context, only group/class; Proxies have neither; the remaining MI types (API/Inbound) do.
  const isTask = selectedEntry?.type === 'Task';
  const isProxy = selectedEntry?.type === 'ProxyService';
  const primaryLabel = isProxy ? '' : isTask ? 'Class' : isMI ? 'URL' : 'Package';
  const secondaryLabel = isProxy ? '' : isTask ? 'Group' : isMI ? 'Context' : 'API';

  return (
    <>
      {/* Endpoint / Package / API grid — mirrors devant's endpoint panel layout. MI components
          don't have a package/API concept, so they show URL/Context instead (or group/class for Tasks). */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', columnGap: 2, rowGap: 0.75, alignItems: 'start', mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Endpoint
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {primaryLabel}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {secondaryLabel}
        </Typography>

        <Select
          size="small"
          value={activeKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          inputProps={{ 'aria-label': 'Endpoint' }}
          sx={{ fontSize: '13px', width: '100%' }}
          renderValue={(val) => {
            const entry = allEntryPoints.find(({ artifact: a, type }) => `${type}::${type === 'Automation' ? a.packageName : a.name}` === val);
            if (!entry) return '';
            const cfg = ENTRY_POINT_CONFIG[entry.type];
            const raw = (cfg?.primaryDisplay && cfg.metaField ? (entry.artifact[cfg.metaField]?.toString() ?? entry.artifact.name?.toString()) : entry.type === 'Automation' ? entry.artifact.packageName?.toString() : entry.artifact.name?.toString()) ?? '';
            // Chip is intentionally omitted here (closed box) — it would eat into the fixed-width
            // box's space and truncate long names. It only shows in the open dropdown list below.
            return raw.replace(/^\//, '');
          }}>
          {allEntryPoints.map(({ artifact: a, type }) => {
            const cfg = ENTRY_POINT_CONFIG[type];
            const rawLabel = (cfg?.primaryDisplay && cfg.metaField ? (a[cfg.metaField]?.toString() ?? a.name?.toString()) : type === 'Automation' ? a.packageName?.toString() : a.name?.toString()) ?? '';
            const label = rawLabel.replace(/^\//, '');
            const key = `${type}::${type === 'Automation' ? a.packageName : a.name}`;
            return (
              <MenuItem key={key} value={key} sx={{ fontSize: '13px' }}>
                {isMI ? (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <EntryTypeChip cfg={cfg} />
                    <span>{label}</span>
                  </Stack>
                ) : (
                  label
                )}
              </MenuItem>
            );
          })}
        </Select>

        {(() => {
          if (isProxy)
            return (
              <>
                <Box />
                <Box />
              </>
            );
          const primaryValue = (isTask ? selectedEntry?.artifact.class : isMI ? selectedEntry?.artifact.url : selectedEntry?.artifact.package)?.toString();
          const secondaryValue = (isTask ? selectedEntry?.artifact.group : isMI ? selectedEntry?.artifact.context : selectedEntry?.artifact.name)?.toString();
          return (
            <>
              <Stack direction="row" alignItems="center" gap={0.75} sx={{ minWidth: 0, alignSelf: 'center' }}>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                  {isTask ? <Layers size={15} /> : isMI ? <LinkIcon size={15} /> : <Package size={15} />}
                </Box>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {primaryValue ?? '—'}
                </Typography>
                {primaryValue ? <CopyButton value={primaryValue} label={primaryLabel} /> : null}
              </Stack>

              <Stack direction="row" alignItems="center" gap={0.75} sx={{ alignSelf: 'center' }}>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                  <Tag size={15} />
                </Box>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {secondaryValue ?? '—'}
                </Typography>
              </Stack>
            </>
          );
        })()}
      </Box>
      {selectedEntry && <EntryPointDetail selected={{ artifact: selectedEntry.artifact, artifactType: selectedEntry.type, envId, componentId, projectId }} onOpenDrawerTab={(tab) => onOpenDrawer(selectedEntry.artifact, selectedEntry.type, envId, tab)} />}
    </>
  );
}
