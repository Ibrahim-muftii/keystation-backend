import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { createElevenLabClient } from "../configs/eleventLabs.config";

const VAPI_URL = "https://api.vapi.ai/file";


const uploadFileToVapi = async (filePath: string, vapiKey: string) => {
	try {
		const form = new FormData();
		form.append("file", fs.createReadStream(filePath));

		const response = await axios.post(VAPI_URL, form, {
			headers: {
				...form.getHeaders(),
				Authorization: `Bearer ${vapiKey}`,
			},
		});

		return {
			success: true,
			id: response.data?.id,
			name: path.basename(filePath),
		};
	} catch (err: any) {
		console.error(`❌ Upload failed for ${filePath}:`, err.message);
		return { success: false, name: path.basename(filePath) };
	}
};

export const transcribeFiles = async (filePath: string, elevenLabKey: string) => {
	try {
		const file = fs.createReadStream(filePath);
		const client = createElevenLabClient(elevenLabKey);

		const transcription = await client.speechToText.convert({
			file,
			modelId: "scribe_v1",
		}) as any;

		// ensure transcription folder exists
		const outputDir = path.resolve("transcriptions");
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		const outputPath = path.join(outputDir, `${path.parse(filePath).name}.txt`);
		fs.writeFileSync(outputPath, transcription.text, "utf-8");

		return {
			success: true,
			name: path.basename(filePath),
			outputPath,
		};
	} catch (error: any) {
		console.error(`❌ Error transcribing ${path.basename(filePath)}:`, error.message);
		return { success: false, name: path.basename(filePath) };
	}
};


export const uploadFilesInBatches = async (
	filePaths: string[],
	vapiKey: string,
	elevenLabKey: string,
	batchSize = 10
) => {
	const results: any[] = [];

	for (let i = 0; i < filePaths.length; i += batchSize) {
		const batch = filePaths.slice(i, i + batchSize);
		console.log(`🚀 Processing batch ${i / batchSize + 1} (${batch.length} files)...`);

		const transcriptions = await Promise.all(
			batch.map((filePath) => transcribeFiles(filePath, elevenLabKey))
		);

		const uploads = await Promise.all(
			transcriptions
				.filter((t) => t.success)
				.map((t) => uploadFileToVapi(t.outputPath!, vapiKey))
		);

		results.push(...uploads);
	}

	return results;
};