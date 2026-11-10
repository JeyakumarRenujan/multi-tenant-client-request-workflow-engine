import app from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`Workflow Engine API running at http://localhost:${env.PORT}`);
  console.log(`Health check: http://localhost:${env.PORT}/api/v1/health`);
});
