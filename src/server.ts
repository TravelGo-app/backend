import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(`TravelGo corre en el puerto ${env.port}`);
});