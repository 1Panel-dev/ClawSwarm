import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";

import { createLogger } from "./logging/logger.js";
import { createChannelSurface } from "./app/channelSurface.js";

export default defineSetupPluginEntry(
    createChannelSurface({
        config: {},
        logger: createLogger(),
    }),
);
