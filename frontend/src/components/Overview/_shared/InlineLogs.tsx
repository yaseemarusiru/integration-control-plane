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

import { Box, Button, CircularProgress, Stack, Typography } from '@wso2/oxygen-ui';
import { ScrollText } from '@wso2/oxygen-ui-icons-react';
import { useMemo, type JSX } from 'react';
import { useNavigate } from 'react-router';
import { useInfiniteLogs, type LogsRequest } from '../../../api/logs';
import { resourceUrl, useScope } from '../../../nav';

const LEVEL_COLORS: Record<string, string> = { ERROR: '#e53935', WARN: '#f9a825', INFO: '#1e88e5', DEBUG: '#78909c' };
const AUTO_FETCH_INTERVAL = 10_000;
// Enough to fill the inline view; the full Logs page is one click away for more.
const INLINE_LIMIT = 50;

function levelColor(level: string): string {
  return LEVEL_COLORS[level?.toUpperCase()] ?? '#78909c';
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * A compact, read-only runtime-log stream for the env card — the inline view
 * devant gives file and event integrations, whose meaningful per-env signal is
 * the log output rather than a request contract.
 *
 * Deliberately not a reuse of the Runtime Logs page: no filters, no infinite
 * scroll, no level pickers. It shares only the data layer (`useInfiniteLogs` +
 * `LogsRequest`), so the wire shape stays consistent with that page, and links
 * out to it for anything more than a glance.
 */
export default function InlineLogs({ componentId, envId }: { componentId: string; envId: string }): JSX.Element {
  const navigate = useNavigate();
  const scope = useScope();

  // Last 24h, locked at mount so the query key stays stable across renders.
  // Auto-fetch surfaces newly-arrived lines within that window.
  const request = useMemo<LogsRequest | null>(() => {
    if (!componentId || !envId) return null;
    const now = Date.now();
    return {
      componentIdList: [componentId],
      environmentId: envId,
      environmentList: [envId],
      logLevels: [],
      startTime: new Date(now - 24 * 3600_000).toISOString(),
      endTime: new Date(now).toISOString(),
      limit: INLINE_LIMIT,
      sort: 'desc',
      region: 'US',
      searchPhrase: '',
    };
  }, [componentId, envId]);

  const { data, isLoading, error } = useInfiniteLogs(request, AUTO_FETCH_INTERVAL);
  const rows = useMemo(() => (data?.pages ?? []).flat(), [data]);

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
        <ScrollText size={14} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Runtime Logs
        </Typography>
        <Typography variant="caption" color="text.secondary">
          last 24 hours
        </Typography>
        <Button variant="text" size="small" onClick={() => navigate(resourceUrl(scope, 'logs'))} sx={{ textTransform: 'none', ml: 'auto' }}>
          View all logs
        </Button>
      </Stack>

      {isLoading ? (
        <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', py: 3 }} />
      ) : error ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          {/* The observability service is optional in an ICP deployment, so its absence is
              reported as an ordinary empty state rather than an error the user must act on. */}
          Logs are unavailable right now.
        </Typography>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No logs in the last 24 hours.
        </Typography>
      ) : (
        <Box sx={{ maxHeight: 260, overflowY: 'auto', bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 1 }}>
          {rows.map((row, i) => (
            <Stack key={`${row.timestamp}-${i}`} direction="row" gap={1} sx={{ py: 0.25, alignItems: 'baseline' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', flexShrink: 0 }}>
                {formatTime(row.timestamp)}
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: levelColor(row.level), width: 44, flexShrink: 0 }}>
                {row.level}
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {row.logLine}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}
    </Box>
  );
}
