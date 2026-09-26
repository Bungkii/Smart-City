import type { Telemetry } from "./model";

/** Hardware integration boundary. Map the device's actual payload into Telemetry only after obtaining its protocol contract. */
export interface DeviceAdapter<Raw> {
  parse(raw: Raw): Telemetry;
}

/** The HTTP receiver accepts the documented canonical telemetry schema directly. */
export const canonicalHttpAdapter: DeviceAdapter<unknown> = {
  parse(raw) {
    const { telemetrySchema } = require("./model") as typeof import("./model");
    return telemetrySchema.parse(raw);
  }
};

/** MQTT bridge contract: subscribe to device topics in a separate process, map payloads, then POST canonical events to /api/ingest. */
export interface MqttBridgeConfig<Raw> {
  brokerUrl: string;
  topics: string[];
  adapter: DeviceAdapter<Raw>;
  ingestUrl: string;
  ingestToken: string;
}

export async function forwardMqttMessage<Raw>(raw: Raw, config: MqttBridgeConfig<Raw>) {
  const event = config.adapter.parse(raw);
  const response = await fetch(config.ingestUrl, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${config.ingestToken}` }, body: JSON.stringify(event) });
  if (!response.ok) throw new Error(`Ingest failed: ${response.status}`);
}
