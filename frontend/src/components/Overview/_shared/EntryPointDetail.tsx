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

import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, Snackbar, Stack, Tooltip, Typography } from '@wso2/oxygen-ui';
import { BookOpen, FileText, LayoutGrid, Link as LinkIcon, Play, Sliders, Square } from '@wso2/oxygen-ui-icons-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useUpdateArtifactTracingStatus, useUpdateArtifactStatisticsStatus } from '../../../api/artifactToggleMutations';
import { useUpdateArtifactStatus, useUpdateListenerState, useTriggerTask } from '../../../api/mutations';
import { ArtifactApiDefinition, ServiceResources, ServiceListeners, ProxyApiReference } from '../../ArtifactTabs';
import { SchemaDisclosure } from '../../workflow/shared';
import { StartWorkflowDialog, type Toast as WorkflowToast } from '../../workflow/AdminPortal';
import Authorized from '../../Authorized';
import { Permissions } from '../../../constants/permissions';
import { resourceUrl, useScope } from '../../../nav';
import { ENTRY_POINT_CONFIG, ENTRY_POINT_DETAIL_TABS, type SelectedArtifact, type TabProps } from '../../artifact-config';
import SyncSwitch from '../../SyncSwitch';
import { toEnabled } from './entryPointUtils';

// swagger-ui-react is ~1.3MB gzipped - code-split it out of the main bundle since it's only
// needed when a user actually opens the API docs drawer for a BI service.
const OpenApiDefinitionsDrawer = lazy(() => import('../../OpenApiDefinitionsDrawer').then((m) => ({ default: m.OpenApiDefinitionsDrawer })));

/**
 * The detail panel under the entry-point picker: per-artifact-type controls
 * (status / tracing / statistics toggles, listener start-stop, task trigger,
 * workflow actions) plus the type's inline content (resources, WSDL reference,
 * executions). Shared by every integration type's body.
 */
export default function EntryPointDetail({ selected, onOpenDrawerTab }: { selected: SelectedArtifact; onOpenDrawerTab: (tab: string) => void }) {
  const [tracingEnabled, setTracingEnabled] = useState(false);
  const [statisticsEnabled, setStatisticsEnabled] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<{ type: 'tracing' | 'statistics' | 'status'; checked: boolean } | null>(null);
  const [listenerEnabled, setListenerEnabled] = useState(false);
  const [pendingListenerToggle, setPendingListenerToggle] = useState<{ checked: boolean } | null>(null);
  // Which direction is actually in flight — drives each button's own busy label, so a
  // Disable action in progress can't make the (now-visible) Enable button say "Enabling…".
  const [pendingListenerAction, setPendingListenerAction] = useState<'START' | 'STOP' | null>(null);
  const [listenerToggleError, setListenerToggleError] = useState<string | null>(null);
  const [triggerConfirmDialogOpen, setTriggerConfirmDialogOpen] = useState(false);
  const [triggerSuccessMessage, setTriggerSuccessMessage] = useState<string | null>(null);
  const [startWorkflowOpen, setStartWorkflowOpen] = useState(false);
  const [workflowToast, setWorkflowToast] = useState<WorkflowToast>(null);
  const { artifact, artifactType, envId, componentId, projectId } = selected;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const scope = useScope();
  const updateTracingStatus = useUpdateArtifactTracingStatus();
  const updateStatisticsStatus = useUpdateArtifactStatisticsStatus();
  const updateArtifactStatus = useUpdateArtifactStatus();
  const updateListenerState = useUpdateListenerState();
  const triggerTask = useTriggerTask();
  const config = ENTRY_POINT_CONFIG[artifactType];
  const tabProps: TabProps = { artifact, artifactType, envId, componentId, projectId };
  const compositeApp = artifact.compositeApp?.toString();
  const artifactState = artifact.state?.toString();
  const overviewFields = (config?.overviewFields ?? '').split(', ').filter(Boolean);
  const showTracingToggle = ['RestApi', 'ProxyService', 'InboundEndpoint'].includes(artifactType);
  const showParametersButton = artifactType === 'InboundEndpoint';
  const showInstancesButton = artifactType === 'Workflow';
  const showWsdlButton = artifactType === 'ProxyService';
  const showStatisticsToggle = ['RestApi', 'ProxyService', 'InboundEndpoint'].includes(artifactType);
  const showStatusToggle = ['ProxyService', 'InboundEndpoint'].includes(artifactType);
  const showStatusChip = artifactType === 'RestApi' || artifactType === 'Listener';
  const showListenerToggle = artifactType === 'Listener';
  const showTaskToggle = artifactType === 'Task';
  const showTaskTrigger = artifactType === 'Task';
  const hasRuntimes = artifact.runtimes && Array.isArray(artifact.runtimes) && artifact.runtimes.length > 0;
  const artifactRuntimes = (artifact.runtimes as Array<{ runtimeId: string; status: string }> | undefined) ?? [];
  const showApiDocsButton = artifactType === 'Service' && Boolean(hasRuntimes);
  // A Service can have multiple runtime instances (e.g. one per environment/replica); they all
  // run the same deployed code, so any instance's packed OpenAPI docs are representative. Prefer
  // a RUNNING one so the "Try it out" requests in the drawer have somewhere to actually land.
  const apiDocsRuntimeId = artifactRuntimes.find((r) => r.status === 'RUNNING')?.runtimeId ?? artifactRuntimes[0]?.runtimeId;
  const [viewingApiDocs, setViewingApiDocs] = useState(false);

  // Track if any preceding controls are visible for proper divider placement
  const hasPrecedingControls = compositeApp || showStatusToggle || showStatusChip || showTracingToggle || showStatisticsToggle || showListenerToggle;
  const hasHeaderControls =
    !!compositeApp ||
    showStatusChip ||
    showStatusToggle ||
    showTracingToggle ||
    showStatisticsToggle ||
    showListenerToggle ||
    showParametersButton ||
    showWsdlButton ||
    showInstancesButton ||
    showTaskToggle ||
    showTaskTrigger ||
    (showApiDocsButton && !!apiDocsRuntimeId);

  const artifactName = artifactType === 'Automation' ? (artifact.packageName?.toString() ?? '') : (artifact.name?.toString() ?? '');
  const artifactKey = `${artifactType}-${artifactName}`;
  useEffect(() => {
    setTracingEnabled(toEnabled(artifact.tracing));
    setStatisticsEnabled(toEnabled(artifact.statistics));
    setStatusEnabled(toEnabled(artifact.state));
  }, [artifactKey, artifact.tracing, artifact.statistics, artifact.state]);

  useEffect(() => {
    if (showListenerToggle && !pendingListenerAction) {
      setListenerEnabled(toEnabled(artifact.state));
    }
  }, [showListenerToggle, artifact.state, pendingListenerAction]);

  // Clear the busy state as soon as `state` itself reflects the requested change — the
  // same field the status indicator below already uses, so both update in lockstep.
  useEffect(() => {
    if (!showListenerToggle || !pendingListenerAction) return;
    const targetEnabled = pendingListenerAction === 'START';
    if (toEnabled(artifact.state) === targetEnabled) {
      setPendingListenerAction(null);
    }
  }, [showListenerToggle, artifact.state, pendingListenerAction]);

  const handleToggleTracing = (checked: boolean) => {
    if (!showTracingToggle) return;
    setPendingToggle({ type: 'tracing', checked });
  };

  const handleToggleStatistics = (checked: boolean) => {
    if (!showStatisticsToggle) return;
    setPendingToggle({ type: 'statistics', checked });
  };

  const handleToggleStatus = (checked: boolean) => {
    if (!showStatusToggle && !showTaskToggle) return;
    setPendingToggle({ type: 'status', checked });
  };

  const handleTriggerTask = () => {
    if (!showTaskTrigger) return;
    setTriggerConfirmDialogOpen(true);
  };

  const handleConfirmTrigger = () => {
    setTriggerConfirmDialogOpen(false);
    triggerTask.mutate(
      { componentId, taskName: artifactName },
      {
        onSuccess: () => {
          setTriggerSuccessMessage(`Successfully triggered task ${artifactName}`);
        },
        onSettled: () => {
          const artifactQueryKey = ['artifacts', artifactType, envId, componentId];
          queryClient.invalidateQueries({ queryKey: artifactQueryKey });
        },
      },
    );
  };

  const handleConfirmToggle = () => {
    if (!pendingToggle) return;
    const artifactQueryKey = ['artifacts', artifactType, envId, componentId];
    if (pendingToggle.type === 'tracing') {
      const previousValue = tracingEnabled;
      setTracingEnabled(pendingToggle.checked);
      updateTracingStatus.mutate(
        { envId, componentId, artifactType, artifactName, trace: pendingToggle.checked ? 'enable' : 'disable' },
        {
          onError: () => setTracingEnabled(previousValue),
          onSettled: () => queryClient.invalidateQueries({ queryKey: artifactQueryKey }),
        },
      );
    } else if (pendingToggle.type === 'statistics') {
      const previousValue = statisticsEnabled;
      setStatisticsEnabled(pendingToggle.checked);
      updateStatisticsStatus.mutate(
        { envId, componentId, artifactType, artifactName, statistics: pendingToggle.checked ? 'enable' : 'disable' },
        {
          onError: () => setStatisticsEnabled(previousValue),
          onSettled: () => queryClient.invalidateQueries({ queryKey: artifactQueryKey }),
        },
      );
    } else {
      const previousValue = statusEnabled;
      setStatusEnabled(pendingToggle.checked);
      updateArtifactStatus.mutate(
        { envId, componentId, artifactType, artifactName, status: pendingToggle.checked ? 'active' : 'inactive' },
        {
          onError: () => setStatusEnabled(previousValue),
          onSettled: () => queryClient.invalidateQueries({ queryKey: artifactQueryKey }),
        },
      );
    }
    setPendingToggle(null);
  };

  const handleToggleListener = (checked: boolean) => {
    if (!showListenerToggle) return;
    setPendingListenerToggle({ checked });
  };

  const handleConfirmListenerToggle = () => {
    const runtimes = artifact.runtimes as Array<{ runtimeId: string }> | undefined;
    if (!pendingListenerToggle || !runtimes || runtimes.length === 0) {
      setPendingListenerToggle(null);
      return;
    }

    const runtimeIds = runtimes.map((r) => r.runtimeId);
    const action = pendingListenerToggle.checked ? 'START' : 'STOP';
    const artifactQueryKey = ['artifacts', artifactType, envId, componentId];

    // Don't optimistically flip listenerEnabled here — that would swap which button is
    // visible before the backend has confirmed anything. The clicked button stays put
    // and shows its own busy label until the sync effect above updates listenerEnabled
    // from the real (confirmed) artifact state once pendingListenerAction clears.
    setPendingListenerAction(action);
    setListenerToggleError(null);

    updateListenerState.mutate(
      {
        runtimeIds,
        listenerName: artifactName,
        listenerPackage: artifact.package?.toString(),
        port: typeof artifact.port === 'number' ? artifact.port : undefined,
        action,
      },
      {
        onError: (err) => {
          setPendingListenerAction(null);
          setListenerToggleError(err instanceof Error ? err.message : 'Failed to update listener state');
        },
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: artifactQueryKey });
        },
      },
    );

    setPendingListenerToggle(null);
  };

  const listenerToggleAction = pendingListenerToggle?.checked ? 'enable' : 'disable';

  const toggleLabel = pendingToggle?.type ?? 'status';
  const toggleAction = pendingToggle?.checked ? 'enable' : 'disable';

  return (
    <>
      <Dialog open={pendingToggle !== null} onClose={() => setPendingToggle(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Confirm {toggleAction === 'enable' ? 'Enable' : 'Disable'} {toggleLabel.charAt(0).toUpperCase() + toggleLabel.slice(1)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {toggleAction} {toggleLabel} for <strong>{artifactName}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingToggle(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmToggle}>
            {toggleAction === 'enable' ? 'Enable' : 'Disable'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={pendingListenerToggle !== null} onClose={() => setPendingListenerToggle(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{listenerToggleAction === 'enable' ? 'Enable Listener' : 'Disable Listener'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {listenerToggleAction} the listener <strong>{artifactName}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingListenerToggle(null)}>Cancel</Button>
          <Button variant="contained" color={listenerToggleAction === 'disable' ? 'error' : 'success'} onClick={handleConfirmListenerToggle}>
            {listenerToggleAction === 'enable' ? 'Enable' : 'Disable'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={triggerConfirmDialogOpen} onClose={() => setTriggerConfirmDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Trigger Task</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to trigger task <strong>{artifactName}</strong>?
          </DialogContentText>
          <DialogContentText sx={{ mt: 1.5, fontSize: 13, color: 'text.secondary' }}>This will send a trigger command to all runtimes associated with this task.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTriggerConfirmDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmTrigger}>
            Trigger
          </Button>
        </DialogActions>
      </Dialog>
      <Box sx={{ mt: hasHeaderControls ? 2 : 0 }}>
        {/* Header row — hidden when this artifact type has no controls (e.g. a BI service) */}
        {hasHeaderControls && (
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, py: 1.5 }}>
            {compositeApp && <Chip label={`Composite App: ${compositeApp}`} size="small" variant="outlined" sx={{ bgcolor: '#e8eaf6', color: '#3949ab', fontSize: 11 }} />}
            {compositeApp && <Divider orientation="vertical" flexItem />}
            {showStatusChip && artifactState && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  Status
                </Typography>
                {artifactType === 'Listener' || artifactType === 'RestApi' ? (
                  <Stack direction="row" alignItems="center" gap={0.75}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: toEnabled(artifact.state) ? 'success.main' : 'text.disabled' }} />
                    <Typography variant="body2">{toEnabled(artifact.state) ? 'Enabled' : 'Disabled'}</Typography>
                  </Stack>
                ) : (
                  <Chip label={artifactState.charAt(0).toUpperCase() + artifactState.slice(1).toLowerCase()} size="small" variant="outlined" color={toEnabled(artifact.state) ? 'success' : 'default'} sx={{ fontSize: '0.875rem' }} />
                )}
              </Box>
            )}
            {showStatusChip && artifactState && (showStatusToggle || showTracingToggle || showStatisticsToggle || showListenerToggle) && <Divider orientation="vertical" flexItem />}
            {showStatusToggle && <SyncSwitch name="status" label="Status" checked={statusEnabled} inSync={artifact.stateInSync as boolean | null} onChange={handleToggleStatus} disabled={updateArtifactStatus.isPending} />}
            {showStatusToggle && showTracingToggle && <Divider orientation="vertical" flexItem />}
            {showTracingToggle && <SyncSwitch label="Tracing" checked={tracingEnabled} inSync={artifact.tracingInSync as boolean | null} onChange={handleToggleTracing} disabled={updateTracingStatus.isPending} />}
            {showTracingToggle && showStatisticsToggle && <Divider orientation="vertical" flexItem />}
            {showStatisticsToggle && <SyncSwitch label="Statistics" checked={statisticsEnabled} inSync={artifact.statisticsInSync as boolean | null} onChange={handleToggleStatistics} disabled={updateStatisticsStatus.isPending} />}
            {showListenerToggle && !listenerEnabled && (
              <Tooltip title={!hasRuntimes ? 'No runtimes available' : 'Enable listener'}>
                <span style={{ marginLeft: 'auto' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    color="success"
                    startIcon={pendingListenerAction === 'START' ? <CircularProgress size={12} color="inherit" /> : <Play size={14} />}
                    disabled={pendingListenerAction !== null || !hasRuntimes}
                    onClick={() => handleToggleListener(true)}>
                    {pendingListenerAction === 'START' ? 'Enabling…' : 'Enable'}
                  </Button>
                </span>
              </Tooltip>
            )}
            {showListenerToggle && listenerEnabled && (
              <Tooltip title={!hasRuntimes ? 'No runtimes available' : 'Disable listener'}>
                <span style={{ marginLeft: 'auto' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={pendingListenerAction === 'STOP' ? <CircularProgress size={12} color="inherit" /> : <Square size={14} />}
                    disabled={pendingListenerAction !== null || !hasRuntimes}
                    onClick={() => handleToggleListener(false)}>
                    {pendingListenerAction === 'STOP' ? 'Disabling…' : 'Disable'}
                  </Button>
                </span>
              </Tooltip>
            )}
            {showTaskToggle && (
              <>
                {hasPrecedingControls && <Divider orientation="vertical" flexItem />}
                <SyncSwitch label="Status" checked={statusEnabled} inSync={artifact.stateInSync as boolean | null} onChange={handleToggleStatus} disabled={updateArtifactStatus.isPending || !hasRuntimes} />
              </>
            )}
            {showTaskTrigger && (
              <>
                {(hasPrecedingControls || showTaskToggle) && <Divider orientation="vertical" flexItem />}
                <Tooltip title={!hasRuntimes ? 'No runtimes available' : 'Trigger task'}>
                  <Box>
                    <IconButton size="small" onClick={handleTriggerTask} disabled={triggerTask.isPending || !hasRuntimes} aria-label="Trigger task" sx={{ color: hasRuntimes ? 'primary.main' : 'text.disabled' }}>
                      <Play size={16} />
                    </IconButton>
                  </Box>
                </Tooltip>
              </>
            )}
            {showParametersButton && (
              <Button variant="contained" size="small" startIcon={<Sliders size={14} />} onClick={() => onOpenDrawerTab('Parameters')} sx={{ ml: 'auto' }}>
                View Parameters
              </Button>
            )}
            {showWsdlButton && (
              <Button variant="text" size="small" startIcon={<LinkIcon size={14} />} onClick={() => onOpenDrawerTab('Endpoints')} sx={{ textTransform: 'none', ml: showParametersButton ? 0 : 'auto' }}>
                View Endpoints
              </Button>
            )}
            {showWsdlButton && (
              <Button variant="text" size="small" startIcon={<FileText size={14} />} onClick={() => onOpenDrawerTab('WSDL')} sx={{ textTransform: 'none' }}>
                View WSDL
              </Button>
            )}
            {showInstancesButton && (
              <Button
                variant="contained"
                size="small"
                startIcon={<LayoutGrid size={14} />}
                onClick={() => navigate(`${resourceUrl(scope, 'workflows')}?tab=admin&type=${encodeURIComponent(artifactName)}&env=${encodeURIComponent(envId)}`)}
                sx={{ ml: showParametersButton || showWsdlButton ? 0 : 'auto' }}>
                View Instances
              </Button>
            )}
            {showInstancesButton && (
              <Authorized permissions={[Permissions.WORKFLOW_MANAGE_WORKFLOWS]}>
                <Button variant="contained" size="small" startIcon={<Play size={14} />} onClick={() => setStartWorkflowOpen(true)}>
                  Start Workflow
                </Button>
              </Authorized>
            )}
            {showApiDocsButton && apiDocsRuntimeId && (
              <Button variant="contained" size="small" startIcon={<BookOpen size={14} />} onClick={() => setViewingApiDocs(true)} sx={{ ml: 'auto' }}>
                View API Docs
              </Button>
            )}
          </Stack>
        )}
        {/* Overview columns */}
        {overviewFields.length > 0 && artifactType !== 'Service' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${overviewFields.length}, 1fr)` }}>
            {overviewFields.map((f, i) => (
              <Box key={f} sx={{ px: 2, py: 1.5, ...(i < overviewFields.length - 1 && { borderRight: '1px solid', borderColor: 'divider' }) }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10, fontWeight: 600, display: 'block' }}>
                  {f.toUpperCase()}
                </Typography>
                {f === 'state' ? (
                  <Chip
                    label={artifact[f] ? artifact[f].toString().charAt(0).toUpperCase() + artifact[f].toString().slice(1).toLowerCase() : '—'}
                    size="small"
                    variant="outlined"
                    color={artifact[f]?.toString().toLowerCase() === 'enabled' ? 'success' : 'default'}
                    sx={{ mt: 0.5, fontSize: 13 }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {artifact[f] ? artifact[f].toString() : '—'}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
        {artifactType === 'Workflow' && (
          <Box sx={{ px: 2, py: 1.5 }}>
            {artifact.inputSchema ? (
              <SchemaDisclosure schema={String(artifact.inputSchema)} />
            ) : (
              <Typography variant="caption" color="text.secondary">
                No input schema defined for this workflow.
              </Typography>
            )}
          </Box>
        )}
        {/* pt: 0 for Service — it's the first block rendered (no header/overview above it here), so
            the grid's own mb above already provides the gap; adding padding-top on top of that
            margin doesn't collapse the way devant's stacked margins do, and reads as too much space. */}
        {(ENTRY_POINT_DETAIL_TABS[artifactType] ?? []).includes('Resources') && (
          <Box sx={{ px: 2, pt: artifactType === 'Service' ? 0 : 1.5, pb: 1.5 }}>{artifactType === 'RestApi' ? <ArtifactApiDefinition {...tabProps} /> : <ServiceResources {...tabProps} />}</Box>
        )}
        {(ENTRY_POINT_DETAIL_TABS[artifactType] ?? []).includes('Listeners') && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <ServiceListeners {...tabProps} />
          </Box>
        )}
        {artifactType === 'ProxyService' && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <ProxyApiReference {...tabProps} />
          </Box>
        )}
        {/* No execution history for BI automations: `bi_automation_artifacts` rows are
            written once per heartbeat that reports a `main` artifact, stamped with the
            heartbeat's own timestamp (heartbeat_repository.bal:791) — they count
            heartbeats, not runs. Showing them as an executions table implied a signal
            that does not exist. The runtime bridge would have to report real execution
            data (`MainDetail` carries none) before this can come back. */}
      </Box>
      <Snackbar open={triggerSuccessMessage !== null} autoHideDuration={4000} onClose={() => setTriggerSuccessMessage(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setTriggerSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {triggerSuccessMessage}
        </Alert>
      </Snackbar>
      <Snackbar open={listenerToggleError !== null} autoHideDuration={6000} onClose={() => setListenerToggleError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setListenerToggleError(null)} severity="error" sx={{ width: '100%' }}>
          {listenerToggleError}
        </Alert>
      </Snackbar>
      {startWorkflowOpen && <StartWorkflowDialog scope={{ componentId, environmentId: envId }} initialWorkflowType={artifactName} onClose={() => setStartWorkflowOpen(false)} onToast={setWorkflowToast} />}
      {viewingApiDocs && apiDocsRuntimeId && (
        <Suspense fallback={null}>
          <OpenApiDefinitionsDrawer runtimeId={apiDocsRuntimeId} onClose={() => setViewingApiDocs(false)} serviceBasePath={artifact.basePath?.toString()} />
        </Suspense>
      )}
      <Snackbar open={workflowToast !== null} autoHideDuration={4000} onClose={() => setWorkflowToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {/* Alert stays mounted so the Snackbar's exit transition can play after the toast clears. */}
        <Alert severity={workflowToast?.severity ?? 'success'} onClose={() => setWorkflowToast(null)} sx={{ width: '100%' }}>
          {workflowToast?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
