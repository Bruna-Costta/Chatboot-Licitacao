import { app } from "./app";
import { env } from "./env";

app.listen(env.API_PORT);

console.log(`API rodando em http://localhost:${env.API_PORT}`);
