import { Request, Response } from "express";
import axios from 'axios'
import ApiKeys from "../models/apikey";
import path from "path";
import fs from 'fs'
import unzipper from 'unzipper';
import { flattenAudioFiles } from "../utlis/unzipAndFlatterRecording";
// import { v4 as uuidv4 } from "uuid";
import crypto from 'crypto';
import { uploadFilesInBatches } from "../helpers/vapi-file-upload.helper";
import { assistantObject } from "../utlis/assisstant-data";
import Vapi from "../models/vapi";

interface JobInfo {
	id: string;
	status: "queued" | "extracting" | "merging" | "uploading" | "completed" | "failed";
	message?: string;
}

const jobStore: Record<string, JobInfo> = {};


export const getAssistantById = async (req: Request, res: Response) => {
	try {
		const user = req.CurrentUser;
		const apikeys = await ApiKeys.findOne({
			where: {
			userId: user?.id
			},
			raw: true,
			attributes: ["vapiKey", "vapiAssistantId"]
		}) as any;

		const url: string = 'https://api.vapi.ai';
		const api: string = '/assistant';
		const methods: string = `/${apikeys.vapiAssistantId}`
		const completeUrl: string = url + api + methods;
		const { data } = await axios.get(completeUrl, {
			headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${apikeys.vapiKey}`
			}
		})
		console.log(data)

		return res.status(200).json({ data });
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

export const uploadFilesToVapi = async (req: Request, res: Response) => {
	try {
		const rootDir = path.resolve(process.cwd());
		const uploadDir = path.join(rootDir, 'uploads');
		const transcriptionsDir = path.join(rootDir, 'transcriptions');

		console.log("Deleting folders at:", { uploadDir, transcriptionsDir });

		if (fs.existsSync(uploadDir)) {
			console.log("Deleting existing uploads folder...");
			fs.rmSync(uploadDir, { recursive: true, force: true });
		}

		if (fs.existsSync(transcriptionsDir)) {
			console.log("Deleting existing transcriptions folder...");
			fs.rmSync(transcriptionsDir, { recursive: true, force: true });
		}

		if (!req.file) {
			return res.status(400).json({ message: "No file uploaded" });
		}

		const user = req.CurrentUser;
		const apiKey = await ApiKeys.findOne({ where: { userId: user?.id } }) as any;

		const io = req.app.get("io");
		const jobId = crypto.randomBytes(24).toString('hex');
		const zipPath = req.file.path;

		jobStore[jobId] = { id: jobId, status: "queued" };

		res.status(202).json({ jobId, status: "processing" });

		setImmediate(async () => {
			try {
				jobStore[jobId].status = "extracting";
				io.emit("jobUpdate", { jobId, status: "extracting" });

				const extractPath = path.join(uploadDir, "extracted", Date.now().toString());
				const mergedPath = path.join(uploadDir, "merged");
				fs.mkdirSync(extractPath, { recursive: true });
				fs.mkdirSync(mergedPath, { recursive: true });

				await fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: extractPath })).promise();

				jobStore[jobId].status = "merging";
				io.emit("jobUpdate", { jobId, status: "merging" });

				let allFiles = await flattenAudioFiles(extractPath, mergedPath);

				jobStore[jobId].status = "uploading";
				io.emit("jobUpdate", { jobId, status: "uploading", total: allFiles.length });

				allFiles = allFiles.slice(0, 10);

				const batchSize = 10;

				for (let i = 0; i < allFiles.length; i += batchSize) {
					const batch = allFiles.slice(i, i + batchSize);
					await uploadFilesInBatches(batch, apiKey.vapiKey, apiKey.elevenLabKey, apiKey.vapiAssistantId);
					io.emit("uploadProgress", { jobId, progress: Math.min(allFiles.length, i + batchSize) });
				}

				jobStore[jobId].status = "completed";
				io.emit("jobUpdate", { jobId, status: "completed" });

			} catch (err: any) {
				jobStore[jobId].status = "failed";
				jobStore[jobId].message = err.message;
				io.emit("jobUpdate", { jobId, status: "failed", error: err.message });
			}
		});
	} catch (error: any) {
		console.error(error);
		res.status(500).json({ message: error.message });
	}
};

export const upsertAssistant = async (req: Request, res: Response) => {
	try {
		const user = req.CurrentUser;
		const apiKeys = await ApiKeys.findOne({ where: { userId: user?.id } }) as any;
		const vapi = await Vapi.findOne({ where: { userId: user?.id } });
		if (vapi) {
			return res.status(400).json({ message: "Assistant Already Created..." });
		}

		const url: string = 'https://api.vapi.ai';
		const api: string = '/assistant';
		const completeUrl: string = url + api;
		const response = await axios.post(completeUrl, assistantObject, {
			headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKeys.vapiKey}`

			}
		})

		console.log("Response : ", response);

		if (response.status === 201) {
			await apiKeys.update({ vapiAssistantId: response.data.id })
			const assistant = await Vapi.create({
				vapiAssistantId: response.data.id,
				vapiAssistantName: assistantObject.name,
				userId: user?.id
			})
			return res.status(200).json({ message: "Assisstant Created Successfully..." })
		}

	} catch (error: any) {
		console.log("Error : ", error?.response?.data?.message)
		return res.status(500).json({ message: error.message })
	}
}

export const getAssistant = async (req: Request, res: Response) => {
	try {
		const user = req.CurrentUser;
		const vapi = await Vapi.findOne({
			attributes: ['vapiAssistantName'],
			where: { userId: user?.id },
			raw: true
		});
		return res.status(200).json({ vapi });
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

export const updateVapiAssistant = async (req:Request, res:Response) => {
	try {
		const user = req.CurrentUser;
		const assistant = req.body;
		delete assistant.id;
		delete assistant.orgId;
		delete assistant.createdAt;
		delete assistant.updatedAt;
		delete assistant.isServerUrlSecretSet;
		const apiKey = await ApiKeys.findOne({where:{userId:user?.id}}) as any
		if(!apiKey.vapiKey) {
			return res.status(404).json({message:'Vapi assitant is not yet created...'});
		} 
		const url: string = 'https://api.vapi.ai';
		const api: string = '/assistant/';
		const method: string = apiKey.vapiAssistantId 
		const completeUrl = url + api + method;
		const response = await axios.patch(completeUrl, assistant, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey.vapiKey}`
			}
		})
		if(response.status === 200) {
			return res.status(200).json({message:"Assistant Updated Successfully"})
		}
	} catch (error:any) {
		console.log("Error : " ,error.response.data.message)
		return res.status(500).json({message:error.message});
	}
}

export const callCustomerFromAssistant = async (req:Request,res:Response) => {
	try {
		const user = req.CurrentUser;
		const number = req.body;
		const apiKeys = await ApiKeys.findOne({where:{userId:user?.id}, raw:true}) as any;
		const vapi = await Vapi.findOne({where:{userId:user?.id}, raw:true}) as any;
		const payload = {
			assistantId:vapi.assistantId,
			phoneNumberId:vapi.phoneNumberId,
			customer: {
				number:number
			},
		}
		const url:string = 'https://api.vapi.ai';
		const api:string = '/call';
		const completeUrl:string = url + api;
		const response = await axios.post(completeUrl, payload, {
			headers:{
				Authorization:`Bearer ${apiKeys.vapiKey}`
			}
		})
		console.log(response);
		if(response.status === 201 ){
			return res.status(200).json({message:"You Call has been successfully initiated"})
		}
	} catch(error:any) {
		return res.status(500).json({message:error.message});
	}
}