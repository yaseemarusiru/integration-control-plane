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

import { Box, CircularProgress, IconButton, ListingTable, TablePagination, Typography } from '@wso2/oxygen-ui';
import { CheckCircle2, ChevronRight, XCircle } from '@wso2/oxygen-ui-icons-react';
import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router';
import { resourceUrl, useScope } from '../../../nav';

/**
 * One run of an automation. Mirrors the fields devant's executions table renders,
 * which is also the contract a runtime would have to report for this table to
 * have rows: when the run started, when it finished, whether it succeeded, and
 * the commit it ran.
 */
export interface AutomationExecution {
  id: string;
  /** ISO timestamp of the run's start. */
  startTime: string;
  /** ISO timestamp of the run's completion; empty while still running. */
  completionTime: string;
  /** Succeeded | Failed | InProgress — a *run* status, not a runtime status. */
  status: string;
  commitId?: string;
}

function formatTriggeredAt(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (date.toDateString() === new Date().toDateString()) return `Today at ${time}`;
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at ${time}`;
}

function formatDuration(startIso: string, endIso: string): string {
  if (!startIso || !endIso) return '—';
  const diff = Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000);
  if (Number.isNaN(diff) || diff < 0) return '—';
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;
  if (minutes === 0) return `${seconds}s`;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function isInProgress(status: string): boolean {
  const value = status?.toLowerCase();
  return !(value === 'succeeded' || value === 'success' || value === 'failed' || value === 'failure');
}

function StatusIcon({ status }: { status: string }): JSX.Element {
  if (isInProgress(status)) return <CircularProgress size={18} />;
  const value = status.toLowerCase();
  if (value === 'succeeded' || value === 'success') return <CheckCircle2 size={18} color="green" />;
  return <XCircle size={18} color="red" />;
}

/**
 * The automation executions table, matching devant's: Status · Triggered At ·
 * Duration · Commit ID · Latest Logs, paginated 5 at a time.
 *
 * With no executions it renders devant's centered line rather than an empty
 * table, same as `AutomationExecutions.tsx:175` there.
 */
export default function AutomationExecutions({ executions }: { executions: AutomationExecution[] }): JSX.Element {
  const navigate = useNavigate();
  const scope = useScope();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  if (executions.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No execution data available.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          This runtime does not report execution history for automations.
        </Typography>
      </Box>
    );
  }

  const maxPage = Math.max(0, Math.ceil(executions.length / rowsPerPage) - 1);
  const safePage = Math.min(page, maxPage);
  const paged = executions.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);

  return (
    <ListingTable.Container>
      <ListingTable density="compact">
        <ListingTable.Head>
          <ListingTable.Row>
            <ListingTable.Cell>Status</ListingTable.Cell>
            <ListingTable.Cell>Triggered At</ListingTable.Cell>
            <ListingTable.Cell>Duration</ListingTable.Cell>
            <ListingTable.Cell>Commit ID</ListingTable.Cell>
            <ListingTable.Cell>Latest Logs</ListingTable.Cell>
            <ListingTable.Cell />
          </ListingTable.Row>
        </ListingTable.Head>
        <ListingTable.Body>
          {paged.map((execution) => (
            <ListingTable.Row key={execution.id} hover>
              <ListingTable.Cell>
                <StatusIcon status={execution.status} />
              </ListingTable.Cell>
              <ListingTable.Cell>{formatTriggeredAt(execution.startTime)}</ListingTable.Cell>
              <ListingTable.Cell>{formatDuration(execution.startTime, execution.completionTime)}</ListingTable.Cell>
              <ListingTable.Cell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {execution.commitId || '—'}
                </Typography>
              </ListingTable.Cell>
              <ListingTable.Cell>
                {/* ICP logs are per component + environment, not per execution, so this
                    opens the Logs page scoped to this integration rather than to the run. */}
                <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }} onClick={() => navigate(resourceUrl(scope, 'logs'))}>
                  View Logs
                </Typography>
              </ListingTable.Cell>
              <ListingTable.Cell>
                <IconButton size="small" aria-label={`Details for the run at ${formatTriggeredAt(execution.startTime)}`} onClick={() => navigate(resourceUrl(scope, 'logs'))}>
                  <ChevronRight size={16} />
                </IconButton>
              </ListingTable.Cell>
            </ListingTable.Row>
          ))}
        </ListingTable.Body>
      </ListingTable>
      <TablePagination
        component="div"
        count={executions.length}
        page={safePage}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25]}
        sx={{ borderTop: '1px solid', borderColor: 'divider' }}
      />
    </ListingTable.Container>
  );
}
