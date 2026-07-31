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

import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Select, Snackbar, Stack, Tooltip, Typography } from '@wso2/oxygen-ui';
import { Play, Sliders, Square } from '@wso2/oxygen-ui-icons-react';
import { useMemo, useState, type JSX } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useArtifacts, type GqlArtifact } from '../../../api/queries';
import { useUpdateArtifactStatus, useUpdateListenerState } from '../../../api/mutations';
import Authorized from '../../Authorized';
import { Permissions } from '../../../constants/permissions';
import type { EnvCardActionsProps } from '../types';
import { EMPTY_ARTIFACTS, toEnabled } from './entryPointUtils';

interface BoundListener {
  name: string;
  package?: string;
  port?: number;
}

/**
 * Header slot for file- and event-integration: the listening artifact, its
 * status, and the control that starts or stops it — devant's status dot +
 * Stop/Start, in the terms ICP actually has.
 *
 * Owns its own artifact fetch rather than reading the shell's selection, because
 * these two types have no entry-point list in the body (the body is the log
 * stream). The Enable/Disable target depends on the runtime:
 *   - MI: the inbound endpoint's own status.
 *   - BI: the listeners bound to the service — stopping a listener stops the
 *     service it feeds, which is the equivalent lever.
 */
export default function FileEventActions({ component, env, isOnline, onOpenDrawerForTab }: EnvCardActionsProps): JSX.Element | null {
  const isMI = component.componentType === 'MI';
  const kind = isMI ? 'InboundEndpoint' : 'Service';
  const queryClient = useQueryClient();
  const [selectedName, setSelectedName] = useState('');
  const [pending, setPending] = useState<{ enable: boolean } | null>(null);
  const [inFlight, setInFlight] = useState<'START' | 'STOP' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: artifacts = EMPTY_ARTIFACTS } = useArtifacts(kind, env.id, component.id, { enabled: isOnline, active: isOnline });
  const updateArtifactStatus = useUpdateArtifactStatus();
  const updateListenerState = useUpdateListenerState();

  const selected = useMemo(() => artifacts.find((a) => a.name?.toString() === selectedName) ?? artifacts[0], [artifacts, selectedName]);

  // On BI the listener is reported as a binding on its service; on MI the
  // inbound endpoint is itself the listener.
  const boundListeners: BoundListener[] = useMemo(() => {
    if (isMI || !selected) return [];
    return ((selected.listeners as BoundListener[] | undefined) ?? []).filter((l) => !!l?.name);
  }, [isMI, selected]);

  if (!selected) return null;

  const artifactName = selected.name?.toString() ?? '';
  const enabled = toEnabled(selected.state);
  const runtimeIds = ((selected.runtimes as Array<{ runtimeId: string }> | undefined) ?? []).map((r) => r.runtimeId);
  // BI can only be toggled through a bound listener, so a service reporting none
  // has no lever here — the button stays disabled and says why.
  const canToggle = isMI ? runtimeIds.length > 0 : boundListeners.length > 0 && runtimeIds.length > 0;
  const disabledReason = runtimeIds.length === 0 ? 'No runtimes available' : !isMI && boundListeners.length === 0 ? 'This service reports no bound listener to stop' : '';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['artifacts', kind, env.id, component.id] });
    if (!isMI) queryClient.invalidateQueries({ queryKey: ['artifacts', 'Listener', env.id, component.id] });
  };

  const confirm = () => {
    if (!pending) return;
    const enable = pending.enable;
    setPending(null);
    setInFlight(enable ? 'START' : 'STOP');
    setError(null);
    const done = {
      onError: (err: unknown) => {
        setInFlight(null);
        setError(err instanceof Error ? err.message : 'Failed to update the listening endpoint');
      },
      onSuccess: () => setInFlight(null),
      onSettled: invalidate,
    };

    if (isMI) {
      updateArtifactStatus.mutate({ envId: env.id, componentId: component.id, artifactType: kind, artifactName, status: enable ? 'active' : 'inactive' }, done);
      return;
    }
    // Every bound listener is toggled, so a service fed by two listeners stops
    // as a whole rather than half-stopping.
    boundListeners.forEach((listener) => {
      updateListenerState.mutate({ runtimeIds, listenerName: listener.name, listenerPackage: listener.package, port: typeof listener.port === 'number' ? listener.port : undefined, action: enable ? 'START' : 'STOP' }, done);
    });
  };

  return (
    <>
      {artifacts.length > 1 && (
        <Select size="small" value={artifactName} onChange={(e) => setSelectedName(e.target.value)} inputProps={{ 'aria-label': isMI ? 'Inbound endpoint' : 'Service' }} sx={{ fontSize: '13px', maxWidth: 200 }} renderValue={(v) => v}>
          {artifacts.map((a: GqlArtifact) => (
            <MenuItem key={a.name?.toString()} value={a.name?.toString()} sx={{ fontSize: '13px' }}>
              {a.name?.toString()}
            </MenuItem>
          ))}
        </Select>
      )}

      <Stack direction="row" alignItems="center" gap={0.75}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: enabled ? 'success.main' : 'text.disabled' }} />
        <Typography variant="body2" color="text.secondary">
          {enabled ? 'Enabled' : 'Disabled'}
        </Typography>
      </Stack>

      <Authorized permissions={[Permissions.INTEGRATION_EDIT, Permissions.INTEGRATION_MANAGE]}>
        <Tooltip title={disabledReason || (enabled ? 'Stop this listening endpoint' : 'Start this listening endpoint')}>
          <span>
            <Button
              variant="outlined"
              size="small"
              color={enabled ? 'error' : 'success'}
              startIcon={inFlight ? <CircularProgress size={12} color="inherit" /> : enabled ? <Square size={14} /> : <Play size={14} />}
              disabled={!canToggle || inFlight !== null}
              onClick={() => setPending({ enable: !enabled })}>
              {inFlight === 'STOP' ? 'Disabling…' : inFlight === 'START' ? 'Enabling…' : enabled ? 'Disable' : 'Enable'}
            </Button>
          </span>
        </Tooltip>
      </Authorized>

      {/* Parameters is an inbound-endpoint drawer tab; BI services have no equivalent. */}
      {isMI && (
        <Button variant="text" size="small" startIcon={<Sliders size={14} />} onClick={() => onOpenDrawerForTab(selected, kind, env.id, 'Parameters')} sx={{ textTransform: 'none' }}>
          View Parameters
        </Button>
      )}

      <Dialog open={pending !== null} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{pending?.enable ? 'Enable Listening Endpoint' : 'Disable Listening Endpoint'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {pending?.enable ? 'enable' : 'disable'} <strong>{artifactName}</strong>?
          </DialogContentText>
          {!isMI && (
            <DialogContentText sx={{ mt: 1.5, fontSize: 13, color: 'text.secondary' }}>
              This acts on {boundListeners.length === 1 ? 'the listener' : `all ${boundListeners.length} listeners`} bound to this service, so the service stops receiving messages.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>Cancel</Button>
          <Button variant="contained" color={pending?.enable ? 'success' : 'error'} onClick={confirm}>
            {pending?.enable ? 'Enable' : 'Disable'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={error !== null} autoHideDuration={6000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
