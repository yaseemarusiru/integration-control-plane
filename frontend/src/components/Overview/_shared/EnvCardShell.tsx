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

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@wso2/oxygen-ui';
import { LayoutGrid, ListFilter, RefreshCw, Settings, Trash2, UserPlus, X } from '@wso2/oxygen-ui-icons-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useComponentRuntimes, useRefreshEnvironmentArtifacts, type GqlArtifact, type GqlComponentDetail, type GqlEnvironment } from '../../../api/queries';
import { useListMiUsers, useCreateMiUser, useDeleteMiUser } from '../../../api/miUsers';
import { ArtifactTypeSelector } from '../../ArtifactDetail';
import Authorized from '../../Authorized';
import { Permissions } from '../../../constants/permissions';
import type { OverviewModule, SelectedEntryPoint } from '../types';

/**
 * The env-card FRAME, shared by every integration type.
 *
 * It owns only the generic concerns: the per-env runtime fetch (and the
 * online/total status it derives), refresh, the settings drawer with its MI
 * runtime-user management, and the MI supporting-artifacts view. Everything
 * type-specific lives in the module's slots, which this renders:
 *
 *   - `EnvCardActions` — right-header buttons, given the body's selection
 *   - `EnvCardBody`    — the card content
 *
 * The selected entry point is held here rather than in the body because two
 * slots need it: the body sets it, the actions act on it.
 *
 * MI's "Supporting Artifacts" view is a runtime capability, not a type one, so
 * it stays in the frame — and while it is showing, the module's surface (body
 * and actions) is replaced by the artifact browser, exactly as before.
 */
export default function EnvCardShell({
  component,
  env,
  projectId,
  module,
  onSelectArtifact,
  onOpenDrawerForTab,
}: {
  component: GqlComponentDetail;
  env: GqlEnvironment;
  projectId: string;
  /** The integration type's module, resolved by `IntegrationRenderer`. */
  module: OverviewModule;
  onSelectArtifact: (a: GqlArtifact, type: string, envId: string) => void;
  onOpenDrawerForTab: (a: GqlArtifact, type: string, envId: string, tab: string) => void;
}) {
  const componentId = component.id;
  const componentType = component.componentType;
  const refreshEnvironmentArtifacts = useRefreshEnvironmentArtifacts();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'entryPoints' | 'allArtifacts'>('entryPoints');
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [currentEntryPoint, setCurrentEntryPoint] = useState<SelectedEntryPoint | null>(null);

  // MI users state
  const [selectedRuntimeId, setSelectedRuntimeId] = useState('');
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ username: string; domain: string } | null>(null);
  const [newUserId, setNewUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDomain, setNewDomain] = useState('primary');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);

  const { data: runtimes = [], error: runtimesError, isLoading: runtimesLoading } = useComponentRuntimes(env.id, projectId, componentId, !!env.id && !!projectId && !!componentId);
  const validatedRuntimeId = runtimes.some((r) => r.runtimeId === selectedRuntimeId) ? selectedRuntimeId : '';
  const activeRuntimeId = validatedRuntimeId || (runtimes.length === 1 ? runtimes[0].runtimeId : '');
  const createMiUser = useCreateMiUser();
  const deleteMiUser = useDeleteMiUser();
  const { data: miUsers = [], error: miUsersError, isLoading: miUsersLoading } = useListMiUsers(componentId, activeRuntimeId, componentType === 'MI' && settingsPanelOpen && !!activeRuntimeId);

  const FILE_BASED_USER_STORE_ERROR = 'User management is not supported with the file-based user store. Please plug in a user store for the correct functionality';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshEnvironmentArtifacts(env.id, componentId);
      queryClient.invalidateQueries({ queryKey: ['componentRuntimes', env.id, projectId, componentId] });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const closeCreateUserDialog = () => {
    setCreateUserDialogOpen(false);
    setNewUserId('');
    setNewPassword('');
    setNewDomain('primary');
    setNewIsAdmin(false);
    setCreateUserError(null);
  };

  const onlineCount = runtimes.filter((r) => r.status === 'RUNNING').length;
  const totalCount = runtimes.length;
  const isOnline = onlineCount > 0;

  // MI's Supporting Artifacts view replaces the module's surface: while it is
  // showing, neither the type's body nor its actions are rendered.
  const showModuleSurface = componentType !== 'MI' || viewMode === 'entryPoints';
  const slotProps = { component, env, projectId, runtimes, isOnline, onSelectArtifact, onOpenDrawerForTab };
  const { EnvCardBody, EnvCardActions } = module;

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap">
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, textTransform: 'capitalize', flexShrink: 0 }}>
              {env.name}
            </Typography>
            {totalCount > 0 && (
              <Stack direction="row" alignItems="center" gap={0.75} sx={{ flexShrink: 0 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isOnline ? 'success.main' : 'text.disabled', flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary">
                  {`${onlineCount}/${totalCount} Active`}
                </Typography>
              </Stack>
            )}
          </Stack>
          <Stack direction="row" alignItems="center" gap={1} sx={{ flexShrink: 0 }}>
            {showModuleSurface && EnvCardActions && <EnvCardActions {...slotProps} currentEntryPoint={currentEntryPoint} />}
            <IconButton size="small" onClick={handleRefresh} disabled={isRefreshing} aria-label="Refresh">
              <RefreshCw
                size={16}
                style={{
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                  transformOrigin: 'center',
                }}
              />
            </IconButton>
            <Authorized permissions={[Permissions.INTEGRATION_EDIT, Permissions.INTEGRATION_MANAGE]}>
              <Tooltip title="Settings">
                <IconButton size="small" onClick={() => setSettingsPanelOpen(true)} aria-label="Settings">
                  <Settings size={16} />
                </IconButton>
              </Tooltip>
            </Authorized>
          </Stack>
        </Stack>

        {/* Settings side panel */}
        <Drawer anchor="right" open={settingsPanelOpen} onClose={() => setSettingsPanelOpen(false)} sx={{ '& .MuiDrawer-paper': { width: 400, p: 3, boxSizing: 'border-box' } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Settings — {env.name}
            </Typography>
            <IconButton size="small" onClick={() => setSettingsPanelOpen(false)} aria-label="Close settings">
              <X size={16} />
            </IconButton>
          </Stack>

          {/* MI Users section */}
          {componentType === 'MI' && (
            <>
              <Divider sx={{ my: 3 }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Runtime Users
                </Typography>
                <Tooltip title={miUsersError?.message === FILE_BASED_USER_STORE_ERROR ? 'User store not configured' : 'Add user'}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setNewUserId('');
                        setNewPassword('');
                        setNewDomain('primary');
                        setNewIsAdmin(false);
                        setCreateUserError(null);
                        setCreateUserDialogOpen(true);
                      }}
                      disabled={!activeRuntimeId || miUsersError?.message === FILE_BASED_USER_STORE_ERROR}
                      aria-label="Add user">
                      <UserPlus size={16} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

              {runtimes.length > 1 && (
                <Autocomplete
                  size="small"
                  options={runtimes}
                  getOptionLabel={(r) => r.runtimeId}
                  value={runtimes.find((r) => r.runtimeId === activeRuntimeId) ?? null}
                  onChange={(_, v) => setSelectedRuntimeId(v?.runtimeId ?? '')}
                  renderInput={(params) => <TextField {...params} label="Runtime" placeholder="Select runtime" />}
                  sx={{ mb: 2 }}
                />
              )}

              {runtimesError && (
                <Typography variant="body2" color="error">
                  Failed to load runtimes: {runtimesError.message}
                </Typography>
              )}

              {!runtimesError && !runtimesLoading && !activeRuntimeId && (
                <Typography variant="body2" color="text.secondary">
                  No runtimes available.
                </Typography>
              )}

              {activeRuntimeId && miUsersLoading && <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', mt: 2 }} />}

              {activeRuntimeId && !miUsersLoading && miUsersError && (
                <>
                  {miUsersError.message === FILE_BASED_USER_STORE_ERROR ? (
                    <Stack gap={1}>
                      <Typography variant="body2" color="text.secondary">
                        Your MI runtime does not have a user store configured. Users will appear here once configured.
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        See{' '}
                        <Link href="https://mi.docs.wso2.com/en/latest/install-and-setup/setup/user-stores/setting-up-a-userstore-in-mi/" target="_blank" rel="noopener noreferrer">
                          user store configuration documentation
                        </Link>
                        .
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="error">
                      Failed to load users: {miUsersError.message}
                    </Typography>
                  )}
                </>
              )}

              {activeRuntimeId && !miUsersLoading && !miUsersError && miUsers.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No users found.
                </Typography>
              )}

              {activeRuntimeId && !miUsersLoading && miUsers.length > 0 && (
                <List dense disablePadding>
                  {miUsers.map((u) => (
                    <ListItem
                      key={u.username}
                      disableGutters
                      secondaryAction={
                        <Tooltip title={u.username === 'admin' && u.domain === 'primary' ? 'Cannot delete the default admin user' : `Delete ${u.username}`}>
                          <span>
                            <IconButton size="small" color="error" onClick={() => setDeleteUserTarget({ username: u.username, domain: u.domain })} disabled={u.username === 'admin' && u.domain === 'primary'} aria-label={`Delete ${u.username}`}>
                              <Trash2 size={14} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      }>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" gap={1}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {u.username}
                            </Typography>
                            {u.domain !== 'primary' && (
                              <Tooltip title="User from a secondary user store">
                                <Chip label={u.domain} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                              </Tooltip>
                            )}
                            {u.isAdmin && <Chip label="Admin" size="small" color="primary" sx={{ fontSize: 10, height: 18 }} />}
                          </Stack>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}
        </Drawer>

        {/* Create MI User dialog */}
        <Dialog open={createUserDialogOpen} onClose={closeCreateUserDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Add Runtime User</DialogTitle>
          <DialogContent>
            {createUserError && (
              <Alert severity="error" onClose={() => setCreateUserError(null)} sx={{ mb: 2 }}>
                {createUserError}
              </Alert>
            )}
            <Stack gap={2} sx={{ mt: 1 }}>
              <TextField label="Username" required fullWidth size="small" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} autoFocus />
              <TextField label="Password" required type="password" fullWidth size="small" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <TextField
                label="Domain"
                fullWidth
                size="small"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                helperText="Only change this if you have a secondary user store configured in MI and want to create the user in that store."
                slotProps={{ formHelperText: { sx: { color: 'text.disabled', fontSize: '0.7rem' } } }}
              />
              <FormControlLabel control={<Checkbox size="small" checked={newIsAdmin} onChange={(e) => setNewIsAdmin(e.target.checked)} />} label="Admin user" sx={{ m: 0 }} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCreateUserDialog}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!newUserId.trim() || !newPassword.trim() || createMiUser.isPending}
              onClick={() => {
                setCreateUserError(null);
                createMiUser.mutate(
                  { componentId, runtimeId: activeRuntimeId, username: newUserId.trim(), password: newPassword, isAdmin: newIsAdmin, domain: newDomain.trim() || 'primary' },
                  {
                    onSuccess: closeCreateUserDialog,
                    onError: (err) => setCreateUserError(err.message ?? 'Failed to create user'),
                  },
                );
              }}>
              {createMiUser.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete MI User confirmation dialog */}
        <Dialog
          open={deleteUserTarget !== null}
          onClose={() => {
            setDeleteUserTarget(null);
            setDeleteUserError(null);
          }}
          maxWidth="xs"
          fullWidth>
          <DialogTitle>Delete User</DialogTitle>
          <DialogContent>
            {deleteUserError && (
              <Alert severity="error" onClose={() => setDeleteUserError(null)} sx={{ mb: 2 }}>
                {deleteUserError}
              </Alert>
            )}
            <DialogContentText>
              Are you sure you want to delete user <strong>{deleteUserTarget?.username}</strong> from the runtime? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setDeleteUserTarget(null);
                setDeleteUserError(null);
              }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={deleteMiUser.isPending}
              onClick={() => {
                if (!deleteUserTarget) return;
                deleteMiUser.mutate(
                  { componentId, runtimeId: activeRuntimeId, username: deleteUserTarget.username, domain: deleteUserTarget.domain },
                  {
                    onSuccess: () => {
                      setDeleteUserTarget(null);
                      setDeleteUserError(null);
                    },
                    onError: (err) => setDeleteUserError(err.message),
                  },
                );
              }}>
              {deleteMiUser.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Divider sx={{ my: 2 }} />
        {componentType === 'MI' && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row">
              <Button variant={viewMode === 'entryPoints' ? 'contained' : 'outlined'} size="small" startIcon={<ListFilter size={14} />} onClick={() => setViewMode('entryPoints')} sx={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
                Entry Points
              </Button>
              <Button variant={viewMode === 'allArtifacts' ? 'contained' : 'outlined'} size="small" startIcon={<LayoutGrid size={14} />} onClick={() => setViewMode('allArtifacts')} sx={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, ml: '-1px' }}>
                Supporting Artifacts
              </Button>
            </Stack>
          </Stack>
        )}
        {showModuleSurface && <EnvCardBody {...slotProps} onEntryPointChange={setCurrentEntryPoint} />}
        {componentType === 'MI' && viewMode === 'allArtifacts' && <ArtifactTypeSelector envId={env.id} componentId={componentId} onSelectArtifact={onSelectArtifact} />}
      </CardContent>
    </Card>
  );
}
