import { Request, response, Response } from "express";
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
import { getDuration } from "../helpers/assistant.helper";
import TwilioNumbers from "../models/twilioNumbers";

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
				console.log("ALL FILES LENGTH : ", allFiles.length)
				const batchSize = 10;

				for (let i = 0; i < allFiles.length; i += batchSize) {
					const batch = allFiles.slice(i, i + batchSize);
					console.log("BATCH : ",batch)
					await uploadFilesInBatches(batch, apiKey.vapiKey, apiKey.elevenLabKey,);
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

const createTool = async (toolData: any, vapiKey: string): Promise<string | null> => {
	try {
		const response = await axios.post('https://api.vapi.ai/tool', toolData, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${vapiKey}`
			}
		});

		if (response.status === 201 && response.data.id) {
			console.log(`✓ Tool created: ${toolData.function?.name || 'Unknown'} (${response.data.id})`);
			return response.data.id;
		}
		return null;
	} catch (error: any) {
		console.error(`✗ Failed to create tool: ${toolData.function?.name}`, error?.response?.data || error.message);
		return null;
	}
};

const createAllTools = async (vapiKey: string, userId: number): Promise<string[]> => {
	const toolIds: string[] = [];

	// Tool 1: getOrderStatus
	const orderStatusTool = {
		type: "function",
		async: false,
		messages: [
			{
				type: "request-start",
				content: "Let me check that order status for you..."
			},
			{
				type: "request-complete",
				content: "I've retrieved the order information."
			},
			{
				type: "request-failed",
				content: "I'm having trouble accessing the order information right now."
			}
		],
		function: {
			name: "getOrderStatus",
			description: "Get order status by order number. Customer provides order number.",
			parameters: {
				type: "object",
				properties: {
					orderNumber: {
						type: "string",
						description: "Order number provided by customer"
					},
					orderId: {
						type: "string",
						description: "Magento order ID if available"
					}
				}
			}
		},
		server: {
			url: 'https://prismatic-tamala-hidrotic.ngrok-free.dev/assistant/vapi/webhook'
		}
	};

	// Tool 2: searchProduct
	const searchProductTool = {
		type: "function",
		async: false,
		messages: [
			{
				type: "request-start",
				content: "Searching for products that match your criteria..."
			},
			{
				type: "request-complete",
				content: "I found some products for you."
			},
			{
				type: "request-failed",
				content: "I couldn't complete the product search right now."
			}
		],
		function: {
			name: "searchProduct",
			description: "Search products with multiple filters: name, SKU, category, BRAND (with brandId), price range. Extract brand from user's query and use corresponding brandId from the BRAND_ID_MAP. Use this when customer asks about products or mentions any vehicle brand.",
			parameters: {
				type: "object",
				properties: {
					name: {
						type: "string",
						description: "Product name or partial name (e.g., 'key', 'remote', 'fob')"
					},
					sku: {
						type: "string",
						description: "Product SKU"
					},
					productNumber: {
						type: "string",
						description: "Product number"
					},
					category: {
						type: "string",
						description: "Product category (e.g., 'keys', 'remotes', 'accessories')"
					},
					brand: {
						type: "string",
						description: "Vehicle brand name (e.g., 'BMW', 'Ford', 'Audi'). Must match BRAND_ID_MAP."
					},
					brandId: {
						type: "string",
						description: "Vehicle brand ID from BRAND_ID_MAP (e.g., '513' for BMW, '527' for Ford). REQUIRED when brand is provided."
					},
					priceMin: {
						type: "string",
						description: "Minimum price filter (e.g., '20', '50')"
					},
					priceMax: {
						type: "string",
						description: "Maximum price filter (e.g., '100', '200')"
					}
				}
			}
		},
		server: {
			url: 'https://prismatic-tamala-hidrotic.ngrok-free.dev/assistant/vapi/webhook'
		}
	};

	// Tool 3: checkAvailability
	const checkAvailabilityTool = {
		type: "function",
		async: false,
		messages: [
			{
				type: "request-start",
				content: "Checking product availability..."
			},
			{
				type: "request-complete",
				content: "I've checked the availability for you."
			},
			{
				type: "request-failed",
				content: "I couldn't check availability at this moment."
			}
		],
		function: {
			name: "checkAvailability",
			description: "Check if a specific product is in stock. Use when customer asks 'is [product] available?', 'do you have [product] in stock?'",
			parameters: {
				type: "object",
				properties: {
					productName: {
						type: "string",
						description: "Product name to check availability"
					},
					sku: {
						type: "string",
						description: "Product SKU to check availability"
					}
				}
			}
		},
		server: {
			url: 'https://prismatic-tamala-hidrotic.ngrok-free.dev/assistant/vapi/webhook'
		}
	};

	// Tool 4: transferCall - Fetch phone numbers from database
	let transferCallTool = null;

	try {
		const twilioNumbers = await TwilioNumbers.findAll({
			where: { userId: userId },
			attributes: ['phoneNumber']
		});

		if (twilioNumbers && twilioNumbers.length > 0) {
			// Build destinations array from database entries
			const destinations = twilioNumbers.map((entry: any) => ({
				type: "number",
				number: entry.phoneNumber,
				description: entry.description || entry.department || "Support Team",
				message: `Connecting you to ${entry.description || entry.department || 'our support team'}. Please stay on the line.`,
				transferPlan: {
					mode: "warm-transfer-wait-for-operator-to-speak-first-and-then-say-message",
					message: `Hello, this is a transfer from Keystation Assistant. The customer needs assistance with ${entry.description || entry.department || 'their inquiry'}.`,
					timeout: 30 // seconds to wait for operator to answer
				}
			}));

			transferCallTool = {
				type: "transferCall",
				async: false,
				messages: [
					{
						type: "request-start",
						content: "I've tried everything I can to help. Let me connect you with a specialist now. Please hold."
					},
					{
						type: "request-complete",
						content: "Successfully connected you to a specialist."
					},
					{
						type: "request-failed",
						content: "I'm having trouble transferring your call. Please try calling us directly."
					}
				],
				function: {
					name: "transferCall",
					description: "Transfer call to human specialist. ONLY use after multiple attempts to resolve the issue yourself. Must explain that you've exhausted all options before transferring.",
					parameters: {
						type: "object",
						properties: {
							destination: {
								type: "string",
								description: "The phone number to transfer to. Must be one of the configured destination numbers."
							},
							reason: {
								type: "string",
								description: "Specific reason for transfer after multiple resolution attempts (e.g., 'Unable to locate order after 3 attempts', 'Complex technical issue beyond assistant capabilities')"
							},
						},
						required: ["destination", "reason"]  
					}
				},
				server: {
					url: 'https://prismatic-tamala-hidrotic.ngrok-free.dev/assistant/vapi/webhook',
					timeoutSeconds: 30
				},
				destinations: destinations
			} as any;

			console.log(`✓ Transfer tool configured with ${destinations.length} destination(s):`,
				destinations.map(d => `${d.description}: ${d.number}`).join(', ')
			);
		} else {
			console.log("⚠ No Twilio numbers found for user. Transfer tool will not be created.");
		}
	} catch (error: any) {
		console.error("⚠ Error fetching Twilio numbers:", error.message);
		console.log("Transfer tool will not be created.");
	}
	// Create all tools
	const tools = [orderStatusTool, searchProductTool, checkAvailabilityTool];

	// Add transfer tool only if it was successfully created
	if (transferCallTool) {
		tools.push(transferCallTool);
	}

	console.log("TOOLS : ", tools)

	for (const tool of tools) {
		const toolId = await createTool(tool, vapiKey);
		if (toolId) {
			toolIds.push(toolId);
		}
	}

	console.log("TOOL CALL IDS : ", toolIds)

	return toolIds;
};

export const upsertAssistant = async (req: Request, res: Response) => {
	try {
		const user = req.CurrentUser;
		const apiKeys = await ApiKeys.findOne({ where: { userId: user?.id } }) as any;
		const vapi = await Vapi.findOne({ where: { userId: user?.id } });

		if (!apiKeys?.vapiKey) {
			return res.status(400).json({
				message: "VAPI API key not found. Please configure your VAPI key first."
			});
		}

		if (vapi) {
			return res.status(400).json({
				message: "Assistant Already Created..."
			});
		}

		console.log("🔧 Step 1: Creating tools via VAPI API...");

		// Create all tools first and get their IDs
		const toolIds = await createAllTools(apiKeys.vapiKey, parseInt(user!.id));

		if (toolIds.length === 0) {
			return res.status(500).json({
				message: "Failed to create any tools. Cannot proceed with assistant creation."
			});
		}

		console.log(`✓ Created ${toolIds.length} tools successfully`);
		console.log(`Tool IDs: ${toolIds.join(', ')}`);

		console.log("🤖 Step 2: Creating assistant with tool references...");

		// Create assistant with tool IDs
		const assistantData = {
			...assistantObject,
			model:{
				...assistantObject.model,
				toolIds:toolIds
			}
		}
		console.log("Assistant Data : ",assistantData);

		const response = await axios.post('https://api.vapi.ai/assistant', assistantData, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKeys.vapiKey}`
			}
		});

		console.log("✓ Assistant created successfully:", response.data.id);

		if (response.status === 201) {
			await apiKeys.update({ vapiAssistantId: response.data.id });

			await Vapi.create({
				vapiAssistantId: response.data.id,
				vapiAssistantName: response.data.name || assistantData.name,
				userId: user?.id
			});

			return res.status(200).json({
				message: "Assistant Created Successfully with Tools",
				assistantId: response.data.id,
				toolIds: toolIds,
				toolCount: toolIds.length
			});
		}

	} catch (error: any) {
		console.error("❌ Error:", error?.response?.data?.message || error.message);
		return res.status(500).json({
			message: error?.response?.data?.message || error.message
		});
	}
};

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

export const getAssistantCallLogs = async (req:Request, res:Response) => {
	try {
		const user = req.CurrentUser;
		const assistant = await ApiKeys.findOne({ where: { userId: user?.id }, attributes: ["vapiAssistantId", "vapiKey"], raw:true}) as any;
		if (!assistant.vapiAssistantId) {
			return res.status(404).json({message:"No assistant found, please configure assistant before preceeding further"});
		}
		const url: string = 'https://api.vapi.ai';
		const api: string = `/call?assistantId=${assistant.vapiAssistantId}`;
		const completeUrl:string = url + api;

		const response = await axios.get(completeUrl, {
			headers: {
				Authorization:`Bearer ${assistant.vapiKey}`
			}
		})
		let logs:any[] = [];
		if(response.data.length) {
			logs = response.data.map((log:any) => ({
				type:log.type,
				totalDuration: getDuration(log.startedAt, log.endedAt),
				totalCost:log.cost,
				recordingUrl:log.recordingUrl,
				status:log.status,
				messages:log.messages,
				summary:log.analysis.summary
			}))
		}
		return res.status(200).json({logs});		
	} catch (error:any) {
		console.log(error?.response?.data?.message)
		return res.status(500).json({message:error?.response?.data?.message})
	}
}