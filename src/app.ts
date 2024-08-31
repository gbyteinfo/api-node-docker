import express from "express";
import cors from "cors";
import routes from "./routes";
import { setupDatabase } from "./setupDatabase";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json({ limit: "19mb" })); // Aumentando o limite para 19MB
app.use(express.urlencoded({ limit: "19mb", extended: true })); // Aumentando o limite para 19MB
//OBs: limite na API é de 20mb sem usar o GoogleAIFileManager para enviar imagens

// pra verificar a base
const dbPath = "./src/database.db";

!fs.existsSync(dbPath)
  ? setupDatabase().catch((err) => console.error(err))
  : console.log("Iniciando ...");

// integro as rotas do express
app.use("/api", routes);

console.log("API OK!\nDataBase ok!\n");

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor na porta ${PORT}`);
});
