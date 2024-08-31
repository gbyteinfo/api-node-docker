import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config(); // Carregando envs

const instanceAI = new GoogleGenerativeAI(`${process.env.GEMINI_API_KEY}`);
const AI = instanceAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function getMeasureValue(image: string, measure_uuid: string): Promise<string> {
  try {
    //Salva a imagem do arquivo temporario
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const tempFilePath = `${__dirname}\\images\\${measure_uuid}.jpg`;
    fs.writeFileSync(tempFilePath, buffer);

    const prompt =
      "Preciso que analise a imagem enviada, e encontre o consumo total, seja gáz ou agua, e retorne só o numero da medida de consumo total.";
    const mimeType = "image/jpeg";
    const result = await AI.generateContent([
      prompt,
      {
        inlineData: {
          data: Buffer.from(fs.readFileSync(`${__dirname}\\images\\${measure_uuid}.jpg`)).toString(
            "base64"
          ),
          mimeType,
        },
      },
    ]);
    const measure_value = result.response.text();
    console.log(measure_value);
    return measure_value.trim();
  } catch (error) {
    console.error("Erro ao chamar a API Google Gemini:", error);
    throw new Error("Erro ao processar a imagem com a API Google Gemini.");
  }
}
