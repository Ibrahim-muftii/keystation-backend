import express from 'express'
import { verifyToken } from '../middleware/verify-token.middleware';
import { getAssistant, getAssistantById, updateVapiAssistant, uploadFilesToVapi, upsertAssistant } from '../controller/assistant.controller';
import multer from 'multer';
import path from 'path';
import { vapiWebhook } from '../webhooks/vapi.webhook';

const router = express.Router();
const upload = multer({
  dest: path.join(__dirname, "../../temp"),
  limits: { fileSize: 3 * 1024 * 1024 * 1024 }
});

router.get('/get-assistant',verifyToken, getAssistant);
router.get('/get-assistant-by-id',verifyToken, getAssistantById);
router.put('/start-uploading', verifyToken,upload.single("calls") ,uploadFilesToVapi)
router.post('/create-vapi-assistant',verifyToken, upsertAssistant);
router.put('/update-vapi-assistant', verifyToken, updateVapiAssistant);
router.post('/vapi/webhook', vapiWebhook);
export default router;