/**
 * OpenTelemetry → OTel-Collector → Phoenix (+ Live-SSE-Gateway).
 *
 * MUSS als ALLERERSTER Import in index.ts geladen werden (vor agent.ts), damit
 * der @langchain/core-CallbackManager instrumentiert ist, bevor der erste
 * Agent-Run startet. Über diesen einen Hook werden ALLE Agenten, LLM-Calls
 * (Qwen), Tool-Calls und (Sub-)Graphen automatisch als verschachtelte Spans
 * erfasst — agent.ts/extract.ts/tools/* müssen davon nichts wissen.
 *
 * WICHTIG — Team-Vertrag (siehe compose.yaml/otel auf der Deploy-VM):
 * Spans gehen per OTLP/HTTP an den COLLECTOR auf :4318, NICHT direkt an Phoenix.
 * Der Collector fächert auf: → Phoenix (Audit-DB) UND → Gateway (Live-SSE-UI).
 * Direkt an Phoenix:6006 zu exportieren würde die Live-UI der Demo umgehen.
 *
 * Endpoint kommt aus der Standard-OTel-Env (die das Deployment bereits setzt):
 *   OTEL_EXPORTER_OTLP_ENDPOINT
 *     - in compose:        http://collector:4318
 *     - auf der Box/CLI:   http://127.0.0.1:4318
 *     - lokal vom Laptop:  ssh -L 4318:127.0.0.1:4318 ai-beavers  → localhost:4318
 *   Default, wenn nicht gesetzt: http://localhost:4318
 *
 * Abschalten: OTEL_SDK_DISABLED=true (Agent läuft normal weiter, ohne Tracing).
 */
import "dotenv/config";
import {
  NodeTracerProvider,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { LangChainInstrumentation } from "@arizeai/openinference-instrumentation-langchain";
import * as CallbackManagerModule from "@langchain/core/callbacks/manager";

if (process.env.OTEL_SDK_DISABLED === "true") {
  console.warn("[telemetry] OTEL_SDK_DISABLED=true — Tracing deaktiviert.");
} else {
  const endpoint = (
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318"
  ).replace(/\/$/, "");

  // OTLP/HTTP-protobuf an den Collector (Pfad /v1/traces).
  const exporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "nacharbeits-agent",
      // Phoenix gruppiert Traces nach diesem Attribut zu einem "Project".
      // (Überlebt den Collector-Hop; rein kosmetisch für die Audit-DB.)
      "openinference.project.name":
        process.env.PHOENIX_PROJECT_NAME ?? "nacharbeits-agent",
    }),
    // SimpleSpanProcessor: exportiert jeden Span sofort bei Ende — verlustfrei
    // auch bei kurzlebigen CLI-Runs (pnpm agent). Der Collector batcht ohnehin.
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  provider.register();

  const lc = new LangChainInstrumentation();
  // LangChain hat keine klassische Modulstruktur → manuell instrumentieren.
  lc.manuallyInstrument(CallbackManagerModule);

  console.log(`[telemetry] Tracing aktiv → ${endpoint} (OTel-Collector)`);
}
