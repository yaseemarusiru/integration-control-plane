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

import EnvCardBody from '../_shared/bodies/FileEventBody';
import FileEventActions from '../_shared/FileEventActions';
import type { OverviewModule } from '../types';

/**
 * Event Integration module — components whose `displayType` is
 * `ballerinaEventHandler` / `miEventHandler` (Kafka, JMS, RabbitMQ, …).
 *
 * devant renders file and event integrations identically — the listening
 * artifact, its status and its start/stop control in the header, and the runtime
 * log stream as the whole body — so both types share `_shared/FileEventActions`
 * and `_shared/bodies/FileEventBody`.
 */
const eventIntegrationModule: OverviewModule = {
  EnvCardBody,
  EnvCardActions: FileEventActions,
};

export default eventIntegrationModule;
