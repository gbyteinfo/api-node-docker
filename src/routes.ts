import { Router } from "express";
import { openDb } from "./database";
import { v4 as uuidv4 } from "uuid";
import { getMeasureValue } from "./geminiService";

const router = Router();

/**
 * POST - Endpoint /upload
 **/
router.post("/upload", async (req, res) => {
  const { image, customer_code, measure_datetime, measure_type } = req.body;

  // Validações básicas do payload
  if (!image || !customer_code || !measure_datetime || !measure_type) {
    return res.status(400).json({
      error_code: "INVALID_DATA",
      error_description: "Todos os campos são obrigatórios.",
    });
  }

  // Verificação de duplicatas no banco de dados
  const db = await openDb();
  const existingReading = await db.get(
    `SELECT * FROM readings WHERE customer_code = ? AND measure_type = ? AND strftime('%Y-%m', measure_datetime) = strftime('%Y-%m', ?)`,
    [customer_code, measure_type, measure_datetime]
  );

  if (existingReading) {
    return res.status(409).json({
      error_code: "DOUBLE_REPORT",
      error_description: "Leitura do mês já realizada.",
    });
  }

  // Chamada à API Gemini
  try {
    // Gerar GUID para leitura e salvar no banco de dados
    const measure_uuid = uuidv4();
    const image_url = `http://localhost:3000/src/images/${measure_uuid}`;

    const measure_value = await getMeasureValue(image, measure_uuid);

    await db.run(
      `INSERT INTO readings (measure_uuid, customer_code, measure_datetime, measure_type, has_confirmed, image_url) VALUES (?, ?, ?, ?, ?, ?)`,
      [measure_uuid, customer_code, measure_datetime, measure_type, false, image_url]
    );

    res.status(200).json({
      image_url,
      measure_value,
      measure_uuid,
    });
  } catch (error) {
    res.status(500).json({
      error_code: "GEMINI_API_ERROR",
      error_description: "Erro ao processar a imagem com a API Google Gemini.",
    });
  }
});

/**
 * PATCH - Endpoint /confirm
 */
router.patch("/confirm", async (req, res) => {
  const { measure_uuid, confirmed_value } = req.body;

  // Validações básicas do payload
  if (!measure_uuid || typeof confirmed_value !== "number") {
    return res.status(400).json({
      error_code: "INVALID_DATA",
      error_description: "UUID ou valor confirmado inválido.",
    });
  }

  const db = await openDb();

  // Verificação da UUID se existe ou não
  const reading = await db.get("SELECT * FROM readings WHERE measure_uuid = ?", [measure_uuid]);

  if (!reading) {
    return res.status(404).json({
      error_code: "MEASURE_NOT_FOUND",
      error_description: "Leitura não encontrada.",
    });
  }

  // Verificação da leitura, confirmada ou não
  if (reading.has_confirmed) {
    return res.status(409).json({
      error_code: "CONFIRMATION_DUPLICATE",
      error_description: "Leitura já confirmada.",
    });
  }

  // Atualização do valor confirmado e e marcação de confirmado
  await db.run(
    "UPDATE readings SET has_confirmed = ?, confirmed_value = ? WHERE measure_uuid = ?",
    [true, confirmed_value, measure_uuid]
  );

  res.status(200).json({
    success: true,
  });
});

/**
 * GET - Endpoint /:customer_code/list
 */
router.get("/:customer_code/list", async (req, res) => {
  const { customer_code } = req.params;
  const { measure_type } = req.query;

  const db = await openDb();

  // Validação do tipo de medida, se fornecido
  if (
    measure_type &&
    typeof measure_type === "string" &&
    !["WATER", "GAS"].includes(measure_type.toUpperCase())
  ) {
    return res.status(400).json({
      error_code: "INVALID_TYPE",
      error_description: "Tipo de medição não permitida. Use WATER ou GAS.",
    });
  }

  // Construir a query com ou sem filtro de tipo de medida
  let query = `SELECT * FROM readings WHERE customer_code = ?`;
  const queryParams = [customer_code];

  if (measure_type && typeof measure_type === "string") {
    query += ` AND measure_type = ?`;
    queryParams.push(measure_type.toUpperCase());
  }

  const readings = await db.all(query, queryParams);

  if (readings.length === 0) {
    return res.status(404).json({
      error_code: "MEASURES_NOT_FOUND",
      error_description: "Nenhuma leitura encontrada.",
    });
  }

  console.log("Retornando [ " + readings.length + " ] dados ");

  res.status(200).json({
    customer_code,
    measures: readings,
  });
});

/**
 * GET - Endpoint /readings
 
router.get("/readings", async (req, res) => {
  const db = await openDb();
  const readings = await db.all("SELECT * FROM readings");
  console.log("Retornando [ " + readings.length + " ] dados ");
  res.json(readings);
});*/

export default router;
