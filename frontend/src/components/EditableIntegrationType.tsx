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

import { Alert, Box, ButtonBase, CircularProgress, Menu, MenuItem, Snackbar, Stack, Tooltip, Typography } from '@wso2/oxygen-ui';
import { Check, ChevronDown } from '@wso2/oxygen-ui-icons-react';
import { useState, type JSX } from 'react';
import { useUpdateComponent } from '../api/mutations';
import type { GqlComponent } from '../api/queries';
import { INTEGRATION_TYPES, integrationTypeFromStored, integrationTypeLabel, resolveComponentSubType, resolveDisplayType, type IntegrationType } from '../constants/integrationTypes';
import type { Technology } from '../constants/technologies';
import { Permissions } from '../constants/permissions';
import Authorized from './Authorized';

/**
 * The integration type shown under the integration name, matching the devant
 * overview header. Users who may edit the integration change it in place from a
 * dropdown of the same types the create/edit flows offer.
 *
 * The trigger carries a permanent chevron rather than a hover-revealed pencil:
 * an affordance that only appears once the pointer is already on it does not tell
 * anyone the type is editable in the first place.
 */
export default function EditableIntegrationType({ component }: { component: GqlComponent }): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdateComponent();

  const current = integrationTypeFromStored(component.displayType, component.componentSubType);

  const select = (next: IntegrationType) => {
    setAnchor(null);
    if (next === current) return;
    // The runtime an integration is built on is not editable, so the new type is
    // encoded against the persisted one — the same pair the edit page sends.
    const technology = component.componentType as Technology;
    mutation.mutate(
      {
        id: component.id,
        displayName: component.displayName,
        description: component.description ?? '',
        componentType: technology,
        displayType: resolveDisplayType(technology, next),
        componentSubType: resolveComponentSubType(technology, next),
      },
      {
        onError: (e) => setError(e.message === 'Failed to fetch' ? 'Unable to connect to the server. Please check that the server is running and try again.' : e.message || 'Failed to update the integration type.'),
      },
    );
  };

  const label = integrationTypeLabel(component.displayType, component.componentSubType);

  return (
    <Stack direction="row" alignItems="center">
      {/* Read-only users get the plain devant label — no control they cannot use. */}
      <Authorized
        permissions={[Permissions.INTEGRATION_EDIT, Permissions.INTEGRATION_MANAGE]}
        fallback={
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        }>
        <Tooltip title="Change integration type">
          {/* Wrapper span so the tooltip still has a hover target while the save is in flight. */}
          <Box component="span" sx={{ display: 'inline-flex' }}>
            <ButtonBase
              aria-label={`Integration type: ${label}. Change integration type`}
              aria-haspopup="menu"
              aria-expanded={!!anchor}
              disabled={mutation.isPending}
              onClick={(e) => setAnchor(e.currentTarget)}
              sx={{
                // Negative left margin cancels the padding so the label still lines
                // up with the integration name above it.
                ml: -0.75,
                px: 0.75,
                py: 0.25,
                gap: 0.5,
                borderRadius: 1,
                color: 'text.secondary',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: 'action.hover' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1 },
              }}>
              <Typography variant="body2" color="inherit">
                {label}
              </Typography>
              {mutation.isPending ? <CircularProgress size={12} color="inherit" /> : <ChevronDown size={14} style={{ transform: anchor ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 120ms ease' }} />}
            </ButtonBase>
          </Box>
        </Tooltip>
      </Authorized>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ list: { dense: true, 'aria-label': 'Integration Type' } }}>
        {INTEGRATION_TYPES.map((opt) => (
          <MenuItem key={opt.id} selected={opt.id === current} onClick={() => select(opt.id)}>
            {/* Fixed-width slot so the titles stay aligned whether or not the row is the current one. */}
            <Box sx={{ width: 20, display: 'inline-flex', alignItems: 'center', color: 'primary.main' }}>{opt.id === current && <Check size={14} />}</Box>
            <Typography variant="body2">{opt.title}</Typography>
          </MenuItem>
        ))}
      </Menu>

      <Snackbar open={error !== null} autoHideDuration={6000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {/* Alert stays mounted so the Snackbar's exit transition can play after the toast clears. */}
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
